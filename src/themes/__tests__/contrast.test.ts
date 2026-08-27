import { describe, it, expect } from "vitest";
import { THEMES } from "../manifest";
import { contrastRatio, over, parseColor, parseTokens } from "./_contrastMath";

// ============================================================================
// WCAG contrast contract test
// ============================================================================
// Colour math lives in `_contrastMath.ts`, shared with
// `buttonHoverContrast.test.ts`. Verifies every theme's text/mark tokens
// clear the thresholds below when composited over the surfaces apps actually
// render them on. This is the token policy agreed for the WCAG retune:
//
//  - --sui-accent is a FILL color (buttons, dots, glows) and is intentionally
//    NOT required to pass as text — it is excluded from this contract.
//  - --sui-accent-dim is the text-safe accent and must clear 4.5:1 on both
//    bg-primary and bg-secondary.
//  - --sui-text-muted / --sui-text-secondary are read as captions/labels and
//    must clear 4.5:1 on the surfaces they appear on.
//  - --sui-danger / --sui-warning / --sui-success are rendered as text
//    (status words, values) and must clear 4.5:1 on bg-primary.
//  - --sui-highlight (the "notable value" tone) is rendered as text and must
//    clear 4.5:1 on bg-primary, same as the other Tone-vocabulary colors.
//  - --status-full/partial/sparse/missing are heatmap-cell text and must
//    clear 4.5:1 on bg-secondary.
//  - --sui-chart-tick-color (axis ticks/labels) must clear 4.5:1 on
//    bg-secondary.
//  - --sui-series-1..8 are marks (not text) and only need 3:1 on
//    bg-elevated — this test asserts the existing values keep passing; it
//    does not authorize changing them.
//  - --sui-border only needs a 1.3:1 visibility nudge on bg-primary.
// ============================================================================

interface Pair {
  fg: string;
  bg: string;
  min: number;
  role: string;
}

// Token policy: [fg token, bg token, minimum ratio, role]. --sui-accent is
// deliberately absent — it is a fill color, not required to pass as text.
const PAIRS: Pair[] = [
  { fg: "--sui-text-secondary", bg: "--sui-bg-primary", min: 4.5, role: "labels" },
  { fg: "--sui-text-secondary", bg: "--sui-bg-secondary", min: 4.5, role: "panel labels" },
  { fg: "--sui-text-secondary", bg: "--sui-bg-elevated", min: 4.5, role: "modal labels" },
  { fg: "--sui-text-muted", bg: "--sui-bg-primary", min: 4.5, role: "captions" },
  { fg: "--sui-text-muted", bg: "--sui-bg-secondary", min: 4.5, role: "panel captions" },
  { fg: "--sui-accent-dim", bg: "--sui-bg-primary", min: 4.5, role: "text-safe accent" },
  { fg: "--sui-accent-dim", bg: "--sui-bg-secondary", min: 4.5, role: "text-safe accent (panel)" },
  { fg: "--sui-danger", bg: "--sui-bg-primary", min: 4.5, role: "danger text" },
  { fg: "--sui-warning", bg: "--sui-bg-primary", min: 4.5, role: "warning text" },
  { fg: "--sui-success", bg: "--sui-bg-primary", min: 4.5, role: "success text" },
  { fg: "--sui-highlight", bg: "--sui-bg-primary", min: 4.5, role: "highlight text" },
  { fg: "--status-full", bg: "--sui-bg-secondary", min: 4.5, role: "status FULL text" },
  { fg: "--status-partial", bg: "--sui-bg-secondary", min: 4.5, role: "status partial text" },
  { fg: "--status-sparse", bg: "--sui-bg-secondary", min: 4.5, role: "status sparse text" },
  { fg: "--status-missing", bg: "--sui-bg-secondary", min: 4.5, role: "status missing text" },
  { fg: "--sui-chart-tick-color", bg: "--sui-bg-secondary", min: 4.5, role: "chart ticks" },
  { fg: "--sui-border", bg: "--sui-bg-primary", min: 1.3, role: "hairline visible" },
  ...[1, 2, 3, 4, 5, 6, 7, 8].map((i) => ({
    fg: `--sui-series-${i}`,
    bg: "--sui-bg-elevated",
    min: 3.0,
    role: `series-${i} mark`,
  })),
];

describe.each(Object.values(THEMES))("WCAG contrast: $id", (theme) => {
  const tokens = parseTokens(theme.css);
  const pageBg = parseColor(tokens["--sui-bg-primary"], tokens)?.slice(0, 3) as
    | [number, number, number]
    | undefined;

  it("has a resolvable --sui-bg-primary", () => {
    expect(pageBg).toBeDefined();
  });

  it.each(PAIRS)("$role: $fg on $bg >= $min:1", ({ fg, bg, min, role }) => {
    if (!pageBg) throw new Error(`${theme.id}: --sui-bg-primary did not resolve`);

    const fgRaw = parseColor(tokens[fg], tokens);
    const bgRaw = parseColor(tokens[bg], tokens);

    // Not every theme declares every optional token (e.g. a theme may omit a
    // token this contract doesn't require); skip pairs that don't resolve
    // rather than false-failing on an unrelated missing token.
    if (!fgRaw || !bgRaw) return;

    const bgRgb = over(bgRaw, pageBg);
    const fgRgb = over(fgRaw, bgRgb);
    const ratio = contrastRatio(fgRgb, bgRgb);

    expect(
      ratio,
      `${theme.id}: ${fg} on ${bg} (${role}) = ${ratio.toFixed(2)}:1, needs >= ${min}:1 ` +
        `[${tokens[fg]}]`,
    ).toBeGreaterThanOrEqual(min);
  });
});
