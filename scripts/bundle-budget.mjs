#!/usr/bin/env node
// ============================================
// Bundle budget — measures what a CONSUMER actually ships
//
//   node scripts/bundle-budget.mjs                    # report + ratchet check
//   node scripts/bundle-budget.mjs --update-baseline  # lock in improvements ONLY
//   node scripts/bundle-budget.mjs --update-baseline=ssrTypicalKb --reason="..."
//                                                     # ...and permit those to RISE
//   node scripts/bundle-budget.mjs --skip-build       # reuse the existing dist
//
// WHY THIS EXISTS
//
// docs/adr/0005 hinges on two settings that are inert alone and load-bearing
// together. scripts/build-config.test.ts asserts they are still *written down*,
// which is cheap and catches deletion. It cannot catch the other half of the
// risk: SUI's own source growing a new eager import that drags a heavy dep back
// into every consumer. `sideEffects` and `preserveModules` would both still be
// present and the bundle would still be ruined.
//
// The only instrument that catches that is building a real consumer against the
// real dist and looking at what came out. That is what this does.
//
// It is deliberately NOT part of `npm test`: it needs a full library build plus
// six Vite builds. It belongs in CI as its own step, and in front of a release.
// ============================================
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, symlinkSync, statSync, lstatSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { classify, planBaselineUpdate } from "./health-ratchet.mjs";
import { toKb, HEAVY_DEPS, classifyContamination, rendersMarkup } from "./bundle-budget-rules.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURES = join(root, "scripts/__fixtures__/bundle-budget");
const WORK = join(root, ".bundle-budget");
const PKG = "@primestageprime/solid-ui-components";

const baselinePathArg = process.argv
  .find((a) => a.startsWith("--baseline-path="))
  ?.split("=")
  .slice(1)
  .join("=");
const BASELINE_PATH = baselinePathArg
  ? join(root, baselinePathArg)
  : join(root, "scripts/bundle-budget-baseline.json");

// Each fixture: which entry, which build mode, and which heavy deps legitimately
// belong in the result. `expect: []` means "this bundle must stay clean".
const FIXTURES_SPEC = [
  { key: "oneButtonKb", entry: "one-button", mode: "client", expect: [] },
  { key: "typicalAppKb", entry: "typical-app", mode: "client", expect: [] },
  { key: "mathKb", entry: "math", mode: "client", expect: ["katex"] },
  { key: "dagKb", entry: "dag", mode: "client", expect: ["d3-dag", "sugiyama"] },
  { key: "ssrOneButtonKb", entry: "ssr-one-button", mode: "ssr", expect: [] },
  { key: "ssrTypicalKb", entry: "ssr-typical", mode: "ssr", expect: [] },
];

// ---------- setup ----------

// A consumer must resolve SUI the way a real install does — through the
// `exports` map and its condition branches — or this measures nothing. A
// self-link inside our own node_modules is the cheapest faithful way to get
// that. It lives in gitignored node_modules and is recreated on demand.
function ensureSelfLink() {
  const scope = join(root, "node_modules/@primestageprime");
  const link = join(scope, "solid-ui-components");
  mkdirSync(scope, { recursive: true });
  // lstat, not exists: a BROKEN symlink reports false from existsSync but still
  // occupies the path, so symlinkSync would then fail with EEXIST.
  if (lstatSync(link, { throwIfNoEntry: false })) return;
  symlinkSync(root, link, "dir");
}

const VITE_CONFIG = `
import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import { resolve } from "path";
const ENTRY = process.env.BB_ENTRY;
const SSR = process.env.BB_MODE === "ssr";
export default defineConfig({
  plugins: [solidPlugin(SSR ? { ssr: true } : undefined)],
  logLevel: "error",
  // Pin the condition set so the two modes provably exercise the two different
  // dist entrypoints: dist/index.js (browser) vs dist/server/index.js (node).
  resolve: SSR ? { conditions: ["node", "import", "default"] } : undefined,
  ssr: SSR ? { noExternal: [${JSON.stringify(PKG)}], target: "node" } : undefined,
  build: {
    outDir: resolve(import.meta.dirname, "out", ENTRY),
    emptyOutDir: true,
    ssr: SSR,
    // Consumers minify; measuring unminified would overstate every number and
    // make the ratchet track whitespace.
    minify: "esbuild",
    rollupOptions: {
      input: resolve(${JSON.stringify(FIXTURES)}, ENTRY + ".jsx"),
      output: { entryFileNames: "bundle.js", inlineDynamicImports: true },
    },
  },
});
`;

function measure({ entry, mode, expect }) {
  // execFileSync throws an Error carrying stdout/stderr as raw Buffers, which
  // Node prints as pages of byte arrays. A fixture failing to BUILD is a normal
  // outcome of this harness (it is what a broken export map or a bad import
  // looks like), so it has to read as a diagnosis, not a core dump.
  try {
    execFileSync("npx", ["vite", "build", "--config", join(WORK, "vite.config.mjs")], {
      cwd: WORK,
      env: { ...process.env, BB_ENTRY: entry, BB_MODE: mode },
      stdio: "pipe",
    });
  } catch (err) {
    console.error(`\n✗ Fixture "${entry}" (${mode}) failed to BUILD:\n`);
    console.error(String(err.stderr ?? err.message).trim());
    console.error(`
A fixture that cannot build is a failure of the package, not of the harness —
the consumer it simulates could not have built either. Usual causes:
  • the "." exports map no longer resolves for this condition set
    (client -> dist/index.js, ssr -> dist/server/index.js)
  • a component named in the fixture was renamed or unexported
  • dist/ is stale — re-run without --skip-build`);
    process.exit(1);
  }
  const out = join(WORK, "out", entry, "bundle.js");
  const text = readFileSync(out, "utf8");
  const found = HEAVY_DEPS.filter((d) => text.includes(d));
  const { leaked, starved } = classifyContamination(found, expect);

  // SSR fixtures print their markup; a bundle that no longer renders has not
  // got smaller, it has broken.
  let renders = null;
  if (mode === "ssr") {
    const stdout = execFileSync("node", [out], { encoding: "utf8" });
    renders = rendersMarkup(stdout);
  }
  return { bytes: statSync(out).size, leaked, starved, renders };
}

// ---------- run ----------

const skipBuild = process.argv.includes("--skip-build");
if (!skipBuild) {
  console.log("Building the library (use --skip-build to reuse dist/)…");
  execFileSync("npm", ["run", "build"], { cwd: root, stdio: "pipe" });
} else if (!existsSync(join(root, "dist/index.js"))) {
  console.error("✗ --skip-build given but dist/index.js is missing. Run npm run build.");
  process.exit(1);
}

ensureSelfLink();
rmSync(WORK, { recursive: true, force: true });
mkdirSync(WORK, { recursive: true });
writeFileSync(join(WORK, "package.json"), JSON.stringify({ name: "bundle-budget", private: true, type: "module" }));
writeFileSync(join(WORK, "vite.config.mjs"), VITE_CONFIG);

console.log("\nSUI bundle budget — what one consumer actually ships\n");

const results = new Map();
for (const spec of FIXTURES_SPEC) {
  results.set(spec.key, { ...spec, ...measure(spec) });
}

const metrics = Object.fromEntries([...results].map(([k, r]) => [k, toKb(r.bytes)]));
const baseline = existsSync(BASELINE_PATH) ? JSON.parse(readFileSync(BASELINE_PATH, "utf8")) : null;
const { regressions, improvements } = classify(metrics, baseline);
const regressed = new Set(regressions.map((r) => r.k));
const improved = new Set(improvements.map((r) => r.k));

for (const [key, r] of results) {
  const kb = toKb(r.bytes);
  const base = baseline?.[key];
  const status = base === undefined ? "  (new)" : regressed.has(key) ? `  ✗ over ceiling ${base} KB` : improved.has(key) ? `  ↓ under ceiling ${base} KB` : "  = at ceiling";
  const carries = r.leaked.length || r.starved.length ? "" : r.expect.length ? `  carries ${r.expect.join("+")}` : "  clean";
  console.log(`  ${key.padEnd(16)} ${String(kb).padStart(4)} KB  ${String(r.bytes).padStart(7)} B${status}${carries}`);
}

// ---------- contamination is a hard failure, never a ratchet ----------
//
// Deliberately not baselined: there is no such thing as an acceptable amount of
// leaked katex. A ceiling would let someone bless it once and lose the property
// permanently, which is exactly how the health baseline got misused before.
const leaks = [...results].filter(([, r]) => r.leaked.length);
const starved = [...results].filter(([, r]) => r.starved.length);
const broken = [...results].filter(([, r]) => r.renders === false);

if (leaks.length) {
  console.error("\n✗ Heavy dependencies leaked into bundles that never use them:");
  for (const [k, r] of leaks) console.error(`    ${k}: ${r.leaked.join(", ")}`);
  console.error(`
This is the ADR 0005 failure mode returning. The usual cause is NOT the build
config (build-config.test.ts would have caught that) but a new eager import in
SUI's own source — a barrel re-export, or a shared util that now pulls in a
component which imports the heavy dep at module scope.

Find it with:  npx vite build  then grep the emitted module for the dep.
See docs/adr/0005-per-module-dist-and-sideeffects.md.`);
  process.exit(1);
}

if (starved.length) {
  console.error("\n✗ Bundles are MISSING a dependency they genuinely need:");
  for (const [k, r] of starved) console.error(`    ${k}: ${r.starved.join(", ")}`);
  console.error("\nThe component will render wrong at runtime. A smaller bundle that\ndropped code it needs is a correctness bug, not a win.");
  process.exit(1);
}

if (broken.length) {
  console.error("\n✗ SSR bundles built but rendered no markup:");
  for (const [k] of broken) console.error(`    ${k}`);
  console.error("\nSize means nothing if the bundle does not render. Run the fixture\ndirectly under node to see what it produced.");
  process.exit(1);
}

// ---------- size ratchet ----------

const baselineArg = process.argv.find((a) => a.startsWith("--update-baseline"));
if (baselineArg !== undefined) {
  const raisable = new Set((baselineArg.split("=")[1] ?? "").split(",").filter(Boolean));
  const reason = process.argv.find((a) => a.startsWith("--reason="))?.slice("--reason=".length);
  const plan = planBaselineUpdate({ metrics, baseline, raisable, reason });
  if (plan.error) {
    const { kind, detail } = plan.error;
    if (kind === "unknown-metric") console.error(`\n✗ --update-baseline names unknown metric(s): ${detail.join(", ")}`);
    else if (kind === "missing-reason") console.error("\n✗ Raising a ceiling requires --reason=\"why this bundle legitimately grew\".");
    else console.error(`\n✗ Ceiling(s) rose that were not named: ${detail.map((d) => `${d.k} ${d.base}→${d.v}`).join(", ")}`);
    process.exit(1);
  }
  writeFileSync(BASELINE_PATH, `${JSON.stringify(plan.next, null, 2)}\n`);
  console.log(`\nBaseline updated: ${BASELINE_PATH}`);
  for (const { k, v } of plan.lowered ?? []) console.log(`  ↓ ${k}: ${baseline[k]} → ${v} KB (locked in)`);
  for (const { k, v } of plan.raised ?? []) console.log(`  ↑ ${k}: ${baseline[k]} → ${v} KB (raised, as named)`);
  process.exit(0);
}

if (regressions.length) {
  console.error(`\n✗ Bundle size regressed:\n${regressions.map((r) => `    ${r.k}: ${r.base} → ${r.v} KB`).join("\n")}`);
  console.error(`\nIf the growth is deliberate, name it:\n  node scripts/bundle-budget.mjs --update-baseline=${regressions.map((r) => r.k).join(",")} --reason="..."`);
  process.exit(1);
}
if (improvements.length) {
  console.error(`\n✗ Bundles got smaller than their ceiling:\n${improvements.map((r) => `    ${r.k}: ${r.base} → ${r.v} KB`).join("\n")}`);
  console.error("\nTighten the ceiling so the gain cannot be lost:\n  node scripts/bundle-budget.mjs --update-baseline\nThen commit scripts/bundle-budget-baseline.json.");
  process.exit(1);
}

console.log("\n✓ No leaks, every bundle renders, and every ceiling is tight.");
