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
