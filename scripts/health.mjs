#!/usr/bin/env node
// ============================================
// SUI health check — measures adherence to the library vision
// (curried zero-config call sites, token-only theming, depth
// discipline, coverage) and RATCHETS: every metric may only get
// better. `scripts/health-baseline.json` records the current
// ceiling; CI fails if any metric regresses above it.
//
//   node scripts/health.mjs                    # report + ratchet check
//   node scripts/health.mjs --update-baseline  # accept current counts
//
// Metrics are deliberately mechanical (no judgment calls) so the
// numbers are reproducible. Sanctioned uses (var() fallbacks,
// doc-comment examples) are excluded by construction, not by
// allowlist.
// ============================================
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { run as runStyleRubric, runShowcases as runShowcaseRubric } from "./style-rubric.mjs";
import { run as runPropRubric } from "./prop-rubric.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASELINE_PATH = join(root, "scripts", "health-baseline.json");
const HISTORY_PATH = join(root, "scripts", "health-history.json");

const walk = (dir, pred) => {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p, pred));
    else if (pred(p)) out.push(p);
  }
  return out;
};

const lines = (file) => readFileSync(file, "utf8").split("\n");

const isCommentLine = (l) => {
  const t = l.trim();
  return t.startsWith("*") || t.startsWith("//") || t.startsWith("/*");
};

// A hex color that survives after removing every var(...) expression is
// "bare" — not a token fallback.
const bareHexIn = (l) =>
  /#[0-9a-fA-F]{3,8}\b/.test(l.replace(/var\([^)]*\)/g, ""));

const componentDirs = readdirSync(join(root, "src/components"), {
  withFileTypes: true,
})
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

// ── metric collectors ─────────────────────────────────────────────────

const hits = { bareHexCss: [], bareHexTsx: [], inlineStyleSrc: [] };

for (const f of walk(join(root, "src/components"), (p) => p.endsWith(".css"))) {
  lines(f).forEach((l, i) => {
    if (bareHexIn(l) && !isCommentLine(l))
      hits.bareHexCss.push(`${f.replace(root + "/", "")}:${i + 1}`);
  });
}

for (const f of walk(
  join(root, "src/components"),
  (p) => /\.tsx?$/.test(p) && !p.includes(".test.") && !p.endsWith(".d.ts"),
)) {
  lines(f).forEach((l, i) => {
    if (isCommentLine(l)) return;
    const rel = `${f.replace(root + "/", "")}:${i + 1}`;
    if (/["'`]#[0-9a-fA-F]{3,8}\b/.test(l.replace(/var\([^)]*\)/g, "")))
      hits.bareHexTsx.push(rel);
    if (f.endsWith(".tsx") && l.includes("style={{"))
      hits.inlineStyleSrc.push(rel);
  });
}

// Workshop benches count too (Peter ruling 2026-07-15): benches use the
// curried SUI vocabulary like any showcase — inline styles there are
// only for genuinely dynamic experiment geometry.
hits.inlineStyleShowcases = [];
for (const f of walk(join(root, "dev/showcases"), (p) => p.endsWith(".tsx")))
  lines(f).forEach((l, i) => {
    if (l.includes("style={{"))
      hits.inlineStyleShowcases.push(`${f.replace(root + "/", "")}:${i + 1}`);
  });

// Dot-operator chains (Peter ruling 2026-07-18): method chaining is
// antithetical to function composition — the fix is `fn.pipe` with named
// data-last steps. Mechanical definition: a chained collection-method call,
// i.e. `.map(`/`.filter(`/… whose RECEIVER is itself a call expression
// (`)` immediately before, across whitespace/newlines). Every link of
// `xs().map(f).filter(g)` counts; a lone `arr.map(f)` on an identifier does
// not — single calls were ruled acceptable where a pipe adds noise.
const CHAIN_METHODS =
  "map|filter|reduce|reduceRight|flatMap|forEach|some|every|find|findIndex|findLast|sort|toSorted|slice|join|concat|reverse|toReversed";
const CHAIN_LINK = new RegExp(`\\)\\s*\\.(?:${CHAIN_METHODS})\\(`, "g");

const stripComments = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .split("\n")
    .map((l) => (isCommentLine(l) ? "" : l))
    .join("\n");

// Every collection-method CALL SITE, chained or not (Peter ruling
// 2026-07-18: function-first `map(f, arr)` over `arr.map(f)` — the
// convention wins because humans aren't typing most of the code). The fix
// is the fn helper (direct form outside pipes, curried inside). `src/fn/`
// is excluded by construction — its thin wrappers are the one sanctioned
// home for the native calls. Restricted to the unambiguous array-iteration
// methods (join/slice/concat/reverse are common string ops and would be
// noise here; they still count as chain links above).
const ITERATION_METHODS =
  "map|filter|reduce|reduceRight|flatMap|forEach|some|every|find|findIndex|findLast|sort|toSorted";
const METHOD_CALL = new RegExp(`\\.(?:${ITERATION_METHODS})\\(`, "g");

hits.dotChains = [];
hits.collectionMethodCalls = [];
for (const f of walk(
  join(root, "src"),
  (p) => /\.tsx?$/.test(p) && !p.includes(".test.") && !p.endsWith(".d.ts"),
)) {
  const text = stripComments(readFileSync(f, "utf8"));
  const rel = f.replace(root + "/", "");
  for (const m of text.matchAll(CHAIN_LINK)) {
    const line = text.slice(0, m.index).split("\n").length;
    hits.dotChains.push(`${rel}:${line}`);
  }
  if (rel.startsWith("src/fn/")) continue;
  for (const m of text.matchAll(METHOD_CALL)) {
    const line = text.slice(0, m.index).split("\n").length;
    hits.collectionMethodCalls.push(`${rel}:${line}`);
  }
}

const foldersWithoutTests = componentDirs.filter(
  (d) =>
    !readdirSync(join(root, "src/components", d)).some((f) =>
      f.includes(".test."),
    ),
);

const componentsDoc = readFileSync(join(root, "COMPONENTS.md"), "utf8");
const undocumented = componentDirs.filter(
  (d) => !new RegExp(`\\b${d}\\b`).test(componentsDoc),
);

const missingDepth = [];
for (const f of walk(
  join(root, "src/components"),
  (p) =>
    p.endsWith(".tsx") &&
    !p.includes(".test.") &&
    /\/[A-Z][^/]*\.tsx$/.test(p),
)) {
  if (!/Depth [0-9]/.test(readFileSync(f, "utf8")))
    missingDepth.push(f.replace(root + "/", ""));
}

// Rubric linter (scripts/style-rubric.mjs): count of a+b+c violations — a
// src/components inline style={{ that is un-manifested, uses a property outside
// its rubric categories, or carries a pure static-literal value. Expected 0.
const styleRubric = runStyleRubric();
const styleRubricHits = styleRubric.violations.map(
  (v) => `${v.file}:${v.line} [${v.kind}] ${v.prop} — ${v.detail}`,
);

// Prop rubric linter (scripts/prop-rubric.mjs): count of geometry/paint props
// whose declared type admits a raw CSS string (`width?: string`,
// `maxHeight?: string`, `height?: number | string`). This guards the public
// contract — a curried component's interface is specific typed properties,
// never raw CSS. Caller-owned identity paint is whitelisted in
// scripts/prop-rubric.json. Expected 0.
const propRubric = runPropRubric();
const propRubricHits = propRubric.violations.map(
  (v) => `${v.file}:${v.line} ${v.prop}: ${v.type}`,
);

// Showcase rubric linter (same engine over dev/showcases, `showcases` manifest
// section). dev/showcases is the teaching surface — agents copy what they see —
// so a static-literal inline style there is a violation just as in src/. Only
// genuinely-dynamic demo geometry/data is manifested. Expected 0.
const showcaseRubric = runShowcaseRubric();
const showcaseRubricHits = showcaseRubric.violations.map(
  (v) => `${v.file}:${v.line} [${v.kind}] ${v.prop} — ${v.detail}`,
);

const metrics = {
  bareHexCss: hits.bareHexCss.length,
  bareHexTsx: hits.bareHexTsx.length,
  inlineStyleSrc: hits.inlineStyleSrc.length,
  inlineStyleShowcases: hits.inlineStyleShowcases.length,
  styleRubricViolations: styleRubric.violations.length,
  showcaseStyleRubricViolations: showcaseRubric.violations.length,
  cssTypedProps: propRubric.violations.length,
  dotChains: hits.dotChains.length,
  collectionMethodCalls: hits.collectionMethodCalls.length,
  foldersWithoutTests: foldersWithoutTests.length,
  undocumentedComponents: undocumented.length,
  missingDepthHeaders: missingDepth.length,
};

// ── report + ratchet ──────────────────────────────────────────────────

const updateBaseline = process.argv.includes("--update-baseline");
const verbose = process.argv.includes("--verbose");
const baseline = existsSync(BASELINE_PATH)
  ? JSON.parse(readFileSync(BASELINE_PATH, "utf8"))
  : null;

const detail = {
  bareHexCss: hits.bareHexCss,
  bareHexTsx: hits.bareHexTsx,
  inlineStyleSrc: hits.inlineStyleSrc,
  inlineStyleShowcases: hits.inlineStyleShowcases,
  styleRubricViolations: styleRubricHits,
  showcaseStyleRubricViolations: showcaseRubricHits,
  cssTypedProps: propRubricHits,
  dotChains: hits.dotChains,
  collectionMethodCalls: hits.collectionMethodCalls,
  foldersWithoutTests,
  undocumentedComponents: undocumented,
  missingDepthHeaders: missingDepth,
};

// Every run whose metrics differ from the last recorded entry appends to
// health-history.json — the iteration log that scripts/kpi-table.mjs renders.
const history = existsSync(HISTORY_PATH)
  ? JSON.parse(readFileSync(HISTORY_PATH, "utf8"))
  : [];
const last = history[history.length - 1];
if (JSON.stringify(last?.metrics) !== JSON.stringify(metrics)) {
  history.push({
    at: new Date().toISOString(),
    metrics,
    baseline: baseline ?? undefined,
  });
  writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2) + "\n");
}

console.log("SUI health check (lower is better; 0 is the goal)\n");
const regressions = [];
for (const [k, v] of Object.entries(metrics)) {
  const base = baseline?.[k];
  const status =
    base === undefined
      ? "  (no baseline)"
      : v > base
        ? `  ✗ REGRESSED (baseline ${base})`
        : v < base
          ? `  ✓ improved (baseline ${base})`
          : "  = at baseline";
  if (base !== undefined && v > base) regressions.push({ k, base, v });
  console.log(`  ${k.padEnd(24)} ${String(v).padStart(4)}${status}`);
}
const regressed = regressions.length > 0;

if (verbose) {
  for (const [k, list] of Object.entries(detail)) {
    if (!list.length) continue;
    console.log(`\n${k}:`);
    for (const item of list) console.log(`  ${item}`);
  }
}

if (updateBaseline) {
  writeFileSync(BASELINE_PATH, JSON.stringify(metrics, null, 2) + "\n");
  console.log(`\nBaseline updated: ${BASELINE_PATH}`);
} else if (regressed) {
  // Offenders in locally-changed files are almost always the culprits of a
  // regression, so surface those first; fall back to a capped full list.
  let changedFiles = [];
  try {
    const { execSync } = await import("node:child_process");
    changedFiles = execSync(
      "git diff --name-only @{upstream} 2>/dev/null || git diff --name-only HEAD",
      { cwd: root, encoding: "utf8", shell: "/bin/sh" },
    )
      .split("\n")
      .filter(Boolean);
  } catch {
    /* not a repo / no upstream — fall through to the capped list */
  }

  console.error("\n✗ Health regressed above baseline:");
  const CAP = 25;
  for (const { k, base, v } of regressions) {
    console.error(`\n  ${k}: ${base} → ${v} (+${v - base})`);
    const list = detail[k] ?? [];
    const inChanged = list.filter((item) =>
      changedFiles.some((f) => item.startsWith(f)),
    );
    const show = inChanged.length ? inChanged : list.slice(0, CAP);
    if (inChanged.length)
      console.error(`  offending lines in files changed since upstream:`);
    for (const item of show) console.error(`    ${item}`);
    if (!inChanged.length && list.length > CAP)
      console.error(`    …and ${list.length - CAP} more (--verbose for all)`);
  }
  console.error(
    "\nFix the regression, or if the increase is deliberate and justified, run `npm run health -- --update-baseline` and commit the result.",
  );
  process.exit(1);
} else {
  console.log("\n✓ No regressions.");
  if (
    baseline &&
    Object.entries(metrics).some(([k, v]) => v < (baseline[k] ?? Infinity))
  )
    console.log(
      "  Metrics improved — run `npm run health -- --update-baseline` to lock in the new ceiling.",
    );
}
