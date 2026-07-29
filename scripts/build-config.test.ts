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
