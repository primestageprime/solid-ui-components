import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  contrastRatio,
  over,
  parseColor,
  parseTokens,
} from "../../themes/__tests__/_contrastMath";
import { parseRules } from "../../themes/__tests__/_cssRules";
import { THEMES } from "../../themes/manifest";

// The bucket tone lives on the CountChip (BucketQueue.css): a 1px outline in
// the tone and an 8% wash of it behind the chip's own text. Two things must
// hold in EVERY theme, and jsdom cannot tell us either, so this reads the
// stylesheets and does the arithmetic (same method as themes/__tests__/
// contrast.test.ts):
//   1. the outline reads against the panel it sits on: >= 3:1 (WCAG non-text);
//   2. the wash never costs the numerals legibility: text-primary (count > 0,
//      the state that carries information) stays >= 4.5:1 over wash-over-panel;
//      text-muted (a zero count, dimmed BY DESIGN and below 4.5:1 on the bare
//      panel in several themes already) stays >= 3:1 and loses under 20% of
//      what it has on the bare panel.
// A theme that cannot clear (1) with the raw tone overrides the outline colour
// in its own stylesheet (stax: accent -> --sui-accent-dim), which this test
// honours by applying the theme's own `.bucket-queue__count--<tone>` rule.
const here = dirname(fileURLToPath(import.meta.url));
const themeDir = join(here, "../../themes");
const componentCss = readFileSync(join(here, "BucketQueue.css"), "utf8");

const TONES = ["success", "danger", "warning", "accent"] as const;
const PANELS = ["--sui-bg-primary", "--sui-bg-secondary", "--sui-bg-elevated"];

function chipDecls(css: string, tone: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of parseRules(css)) {
    if (r.selector.includes(`.bucket-queue__count--${tone}`)) Object.assign(out, r.decls);
  }
  return out;
}

for (const [id, theme] of Object.entries(THEMES)) {
  describe(`BucketQueue tone chip: ${id}`, () => {
    const themeCss = readFileSync(join(themeDir, `${theme.id}.css`), "utf8");
    const tokens = parseTokens(themeCss);
    const bgPrimary = parseColor(tokens["--sui-bg-primary"], tokens);
    expect(bgPrimary).not.toBeNull();
    const panels = PANELS.map((t) => {
      const c = parseColor(tokens[t], tokens);
      if (!c) throw new Error(`${id}: ${t} unparsable`);
      return { token: t, rgb: over(c, over(bgPrimary!, [0, 0, 0])) };
    });

    for (const tone of TONES) {
      // Component rule first, the theme's own override on top.
      const decls = { ...chipDecls(componentCss, tone), ...chipDecls(themeCss, tone) };
      it(`${tone}: outline >= 3:1 on every panel`, () => {
        const border = parseColor(decls["border-color"], tokens);
        expect(border, `${tone} border-color`).not.toBeNull();
        for (const p of panels) {
          const ratio = contrastRatio(over(border!, p.rgb), p.rgb);
          expect(ratio, `${tone} outline on ${p.token}: ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(3);
        }
      });
      it(`${tone}: wash keeps the numerals >= 4.5:1`, () => {
        const wash = parseColor(decls.background, tokens);
        expect(wash, `${tone} background`).not.toBeNull();
        const primary = parseColor(tokens["--sui-text-primary"], tokens);
        const muted = parseColor(tokens["--sui-text-muted"], tokens);
        expect(primary).not.toBeNull();
        expect(muted).not.toBeNull();
        for (const p of panels) {
          const surface = over(wash!, p.rgb);
          const onWash = contrastRatio(over(primary!, surface), surface);
          expect(
            onWash,
            `${tone}: text-primary over wash on ${p.token}: ${onWash.toFixed(2)}:1`,
          ).toBeGreaterThanOrEqual(4.5);
          const mutedWash = contrastRatio(over(muted!, surface), surface);
          const mutedBare = contrastRatio(over(muted!, p.rgb), p.rgb);
          expect(
            mutedWash,
            `${tone}: text-muted over wash on ${p.token}: ${mutedWash.toFixed(2)}:1 (bare ${mutedBare.toFixed(2)}:1)`,
          ).toBeGreaterThanOrEqual(Math.max(3, mutedBare * 0.8));
        }
      });
    }
  });
}
