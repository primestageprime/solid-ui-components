// ============================================
// Build-config guard — the tree-shaking pair
// ============================================
//
// `package.json` "sideEffects" and `vite.config.ts` output.preserveModules are
// a PAIR. Each is inert on its own, which is the trap: an agent auditing either
// setting in isolation will measure no effect and delete it as dead config.
// Deleting either one silently re-adds ~318 KB to every consumer bundle, with
// no test failure, no type error, and no visible symptom in this repo.
//
// This test is the tripwire. See docs/adr/0005-per-module-dist-and-sideeffects.md
// for the measurements and the reasoning.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const WHY = `
Both settings must be present TOGETHER. Neither does anything alone:
  • sideEffects alone      — the dist is one bundled index.js, so there is a
                             single module and it is always used. Nothing to drop.
  • preserveModules alone  — modules are split, but with no sideEffects
                             declaration the bundler must still evaluate each
                             one, dragging in its imports.
Together, a consumer's bundler deletes unused SUI modules outright, including
the module-scope katex / d3-dag imports that no amount of tree-shaking can
remove from a single-file bundle.

Measured on a consumer importing one Button:
  shipped without the pair ......... 332,999 B
  with the pair .................... 14,938 B

See docs/adr/0005-per-module-dist-and-sideeffects.md before changing either.
`;

// The SSR bundle needs the SAME pair, for the same reason. It was left as a
// single dist/server.js until 2026-08-03, so every SolidStart consumer resolving
// the "node" export condition kept the exact defect ADR 0005 fixed for the
// browser: a one-button SSR bundle carried inlined Kobalte popper/tooltip code
// plus unremovable bare `import "d3-dag"; import "katex"` statements.
//
// Measured on an SSR consumer importing one Button:
//   single dist/server.js .......... 129,330 B
//   per-module dist/server/ ............. 953 B
//
// Both builds must therefore set preserveModules — hence two assertions rather
// than one loose match, which a single-build regression would still satisfy.
const SERVER_WHY = `
The SERVER build lost output.preserveModules.

dist/server/ must stay one-file-per-module for the same reason dist/ does: it is
what lets a consumer's bundler drop unused modules and the heavyweight imports
(katex, d3-dag) they carry. As a single bundle those imports are structurally
unremovable — Rollup keeps the bare \`import "katex"\` even after correctly
discarding the only component that used it.

Measured on an SSR consumer importing one Button:
  single dist/server.js .......... 129,330 B
  per-module dist/server/ ............. 953 B

The "node" export condition points at ./dist/server/index.js, so this is the
path every SolidStart/SSR consumer actually resolves.

See docs/adr/0005-per-module-dist-and-sideeffects.md.
`;

describe("build config: the tree-shaking pair", () => {
  it("package.json declares sideEffects", () => {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    expect(pkg.sideEffects, WHY).toBeDefined();
    // CSS must stay listed as side-effectful: those imports are what pull each
    // component's stylesheet into the build. A bare `false` would let a
    // bundler drop them and ship unstyled components.
    expect(pkg.sideEffects, WHY).toContain("**/*.css");
  });

  it("vite.config.ts emits one file per module in the client build", () => {
    const cfg = readFileSync(join(root, "vite.config.ts"), "utf8");
    expect(cfg, WHY).toMatch(/preserveModules:\s*true/);
    // Without the root, every emitted path is prefixed with `src/`, which
    // breaks the "." export mapping to ./dist/index.js.
    expect(cfg, WHY).toMatch(/preserveModulesRoot:\s*["']src["']/);
  });

  // Counting, rather than a second bare `toMatch`, is the point: one loose
  // match is satisfied by EITHER build, so deleting the setting from the server
  // build alone would leave the suite green — which is exactly how the SSR side
  // went two ADRs without it.
  it("BOTH the client and server builds set preserveModules", () => {
    const cfg = readFileSync(join(root, "vite.config.ts"), "utf8");
    const occurrences = cfg.match(/preserveModules:\s*true/g) ?? [];
    expect(occurrences.length, SERVER_WHY).toBe(2);
  });

  it("the node export condition resolves to the per-module server entry", () => {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    // A stale "./dist/server.js" here silently re-ships the 129 KB bundle even
    // with preserveModules on, because nothing would import the new entry.
    expect(pkg.exports["."].node, SERVER_WHY).toBe("./dist/server/index.js");
  });
});

// ============================================
// KaTeX fonts must not be inlined
// ============================================
//
// Vite's library mode inlines every referenced asset as a base64 `data:` URI
// regardless of size — `assetsInlineLimit` is ignored there (verified: setting
// it to 0 changed nothing). A plain `import "katex/dist/katex.min.css"` in a
// component therefore embedded all 60 KaTeX font files into dist/index.css:
// 1,436,824 bytes, 78.5% of the stylesheet, downloaded eagerly by every
// consumer — four of the five render no formulas at all.
//
// Three pieces cooperate, and removing any one silently restores ~1.4 MB:
//   stubKatexCss()       — blanks the import in the LIBRARY build only, so
//                          dev/serve and source-linked consumers keep styling
//   copyKatexAssets()    — ships katex.min.css + fonts/ as real files
//   prependKatexImport() — wires dist/katex.css into dist/index.css so
//                          existing consumers need no changes
const KATEX_WHY = `
KaTeX font inlining guard — see docs/adr/0006-katex-css-fonts-not-inlined.md.

Vite lib mode inlines ALL assets as base64 regardless of assetsInlineLimit.
Without the stub + copy + prepend trio, dist/index.css goes from 375,755 B
back to 1,831,489 B (brotli: 68,761 B -> 883,432 B), and the fonts stop being
lazy: inlined data: URIs download unconditionally, in all three formats, even
for consumers that never render a formula.
`;

describe("build config: KaTeX fonts stay external", () => {
  const cfg = readFileSync(join(root, "vite.config.ts"), "utf8");

  it("stubs the katex CSS import in library builds only", () => {
    expect(cfg, KATEX_WHY).toMatch(/function stubKatexCss/);
    // Must NOT apply during `vite serve` — the dev gallery and source-linked
    // consumers need the real stylesheet or formulas render unstyled.
    expect(cfg, KATEX_WHY).toMatch(/!isServe\s*&&\s*stubKatexCss\(\)/);
  });

  it("ships katex.css and its fonts as real files", () => {
    expect(cfg, KATEX_WHY).toMatch(/function copyKatexAssets/);
    expect(cfg, KATEX_WHY).toMatch(/function prependKatexImport/);
  });

  it("MathFormula still imports the stylesheet for dev/source consumers", () => {
    const src = readFileSync(
      join(root, "src/components/MathFormula/MathFormula.tsx"),
      "utf8",
    );
    expect(src, KATEX_WHY).toMatch(/import ["']katex\/dist\/katex\.min\.css["']/);
  });
});

// ============================================
// `prepare` builds; CI installs with --ignore-scripts
// ============================================
//
// These two look like each other's workaround — `prepare` runs a full build on
// every root install, and every workflow then opts out of it. The tempting
// "real fix" is to move the build to `prepack`. Do not: `prepack` does NOT run
// for `npm link` or for git-dependency installs, so that change silently ships
// an empty package to both. npm's own documentation is wrong on the git-dep
// row; it was measured with a probe package. See
// docs/adr/0007-prepare-keeps-the-build-ci-ignores-scripts.md.
const LIFECYCLE_WHY = `
See docs/adr/0007-prepare-keeps-the-build-ci-ignores-scripts.md.

Verified npm hook matrix (measured, not from the docs — the docs are wrong):

                                   prepare   prepack
  root npm install / npm ci           yes       no
  npm link (inside SUI)               yes       no
  git-dependency install              yes       no
  npm pack / npm publish              yes      yes

So \`prepare\` is the ONLY hook that produces dist/ for \`npm link\` and for
consumers pinning a git tag. Moving the build to \`prepack\` breaks both with no
error — they just resolve an empty package.

And because \`prepare\` fires on every root install, CI must opt out per-call or
it pays a ~33s build in front of every job. Measured: 464s -> 265s of runner
time per CI run, and the publish job stopped building SUI three times.
`;

describe("build config: install-time build lifecycle", () => {
  it("prepare still runs the build", () => {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    expect(pkg.scripts?.prepare, LIFECYCLE_WHY).toMatch(/npm run build/);
  });

  it("CI installs never trigger it", () => {
    const ci = readFileSync(join(root, ".github/workflows/ci.yml"), "utf8");
    // Every `npm ci` must carry the flag — a job added later without it
    // silently reintroduces the build for that job alone. Match `run:`
    // invocations only; both workflows discuss these commands in comments.
    const installs = ci.match(/run:\s*npm ci\b[^\n]*/g) ?? [];
    expect(installs.length, LIFECYCLE_WHY).toBeGreaterThan(0);
    for (const line of installs) {
      expect(line, LIFECYCLE_WHY).toContain("--ignore-scripts");
    }
  });

  it("publish installs and packs without re-triggering it", () => {
    const pub = readFileSync(join(root, ".github/workflows/publish.yml"), "utf8");
    const cmds = pub.match(/run:\s*npm (ci|publish)\b[^\n]*/g) ?? [];
    expect(cmds.length, LIFECYCLE_WHY).toBe(2);
    for (const line of cmds) {
      expect(line, LIFECYCLE_WHY).toContain("--ignore-scripts");
    }
    // With --ignore-scripts on publish, the explicit Build step is the only
    // thing populating dist/. This guard step is what turns "someone deleted
    // the Build step" into a failed publish instead of an empty package.
    expect(pub, LIFECYCLE_WHY).toMatch(/Verify build output before packing/);
  });
});
