import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseTokens } from "../../themes/__tests__/_contrastMath";
import { parseRules } from "../../themes/__tests__/_cssRules";

// STYLESHEET CONTRACT (Peter, 2026-10-16): a bucket's rows start at least 2px
// right of the header LABEL's left edge, in every theme, dense and legacy, and
// at every GroupedBucketQueue depth. Nothing leads the label (no dot, no
// chevron — BucketHeader.tsx), so the label's left edge IS the header's
// padding-left, and a row's text edge IS the row's padding-left (renderItem
// output is unpadded by contract). jsdom applies no stylesheets, so this
// resolves the declarations by hand: var() against the theme's tokens (or the
// fallback, for a legacy theme that declares no dense tokens) and a px-only
// calc(). Deliberately narrow — if a rule starts using units this cannot
// evaluate, it fails loudly rather than passing blind.
const here = dirname(fileURLToPath(import.meta.url));
const bqCss = readFileSync(join(here, "BucketQueue.css"), "utf8");
const gbqCss = readFileSync(join(here, "../GroupedBucketQueue/GroupedBucketQueue.css"), "utf8");
const themeDir = join(here, "../../themes");

type Vars = Record<string, string>;

/** Resolve var()/calc() in a px-only expression to a number of px. */
function px(expr: string, vars: Vars): number {
  let s = expr.trim();
  // var(--name, fallback) — innermost first; fallback may itself be a var().
  for (let guard = 0; guard < 16 && /var\(/.test(s); guard++) {
    s = s.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*((?:[^()]|\([^()]*\))*))?\)/g, (_m, name, fb) => {
      const v = vars[name];
      if (v !== undefined) return v;
      if (fb !== undefined) return fb;
      throw new Error(`unresolved ${name} and no fallback in: ${expr}`);
    });
  }
  s = s.replace(/calc\(/g, "(").replace(/px/g, "");
  if (!/^[\d\s.+*/()-]+$/.test(s)) throw new Error(`cannot evaluate: ${expr} -> ${s}`);
  // biome-ignore lint/security/noGlobalEval: arithmetic on a vetted px-only string, test-only
  return Number(eval(s));
}

/** `padding-left` of the LAST matching rule, falling back to the shorthand. */
function paddingLeft(css: string, selector: string, vars: Vars): number {
  const rules = parseRules(css).filter((r) => r.selector === selector);
  if (rules.length === 0) throw new Error(`no rule ${selector}`);
  let value: string | undefined;
  for (const r of rules) {
    if (r.decls.padding) {
      const parts = r.decls.padding.split(/\s+(?![^(]*\))/);
      value = parts[1] ?? parts[0];
    }
    if (r.decls["padding-left"]) value = r.decls["padding-left"];
  }
  if (!value) throw new Error(`${selector}: no padding-left`);
  return px(value, vars);
}

const themeVars = (file: string): Vars => parseTokens(readFileSync(join(themeDir, file), "utf8"));
const CASES: Record<string, Vars> = {
  hud: themeVars("hud.css"),
  default: themeVars("default.css"),
  // A theme that declares none of the dense tokens: every var() takes its fallback.
  legacy: {},
};

for (const [name, vars] of Object.entries(CASES)) {
  describe(`row indent contract: ${name}`, () => {
    it("BucketQueue: row text >= 2px right of the header label", () => {
      const label = paddingLeft(bqCss, ".bucket-queue__header", vars);
      const row = paddingLeft(bqCss, ".bucket-queue__row", vars);
      const empty = paddingLeft(bqCss, ".bucket-queue__empty", vars);
      expect(row - label, `row ${row} vs label ${label}`).toBeGreaterThanOrEqual(2);
      expect(empty - label, `empty ${empty} vs label ${label}`).toBeGreaterThanOrEqual(2);
    });
    it("CompactBucketQueue: same rule", () => {
      const label = paddingLeft(bqCss, ".bucket-queue--compact .bucket-queue__header", vars);
      const row = paddingLeft(bqCss, ".bucket-queue--compact .bucket-queue__row", vars);
      expect(row - label, `row ${row} vs label ${label}`).toBeGreaterThanOrEqual(2);
    });
    for (const depth of [0, 1, 2, 3]) {
      it(`GroupedBucketQueue depth ${depth}: rows and empty strip >= 2px past the label`, () => {
        const v = { ...vars, "--gbq-depth": String(depth) };
        const label = paddingLeft(gbqCss, ".grouped-bucket-queue__header", v);
        const row = paddingLeft(gbqCss, ".grouped-bucket-queue__body .bucket-queue__row", v);
        const empty = paddingLeft(gbqCss, ".grouped-bucket-queue__empty", v);
        expect(row - label, `row ${row} vs label ${label}`).toBeGreaterThanOrEqual(2);
        expect(empty - label, `empty ${empty} vs label ${label}`).toBeGreaterThanOrEqual(2);
        // And a child group's label sits past its parent's label (the depth step).
        if (depth > 0) {
          const parent = paddingLeft(gbqCss, ".grouped-bucket-queue__header", {
            ...vars,
            "--gbq-depth": String(depth - 1),
          });
          expect(label - parent).toBeGreaterThanOrEqual(2);
        }
      });
    }
  });
}
