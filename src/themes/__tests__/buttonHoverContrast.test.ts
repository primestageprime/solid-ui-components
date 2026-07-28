import { describe, it, expect } from "vitest";
import baselineCss from "../_baseline.css?raw";
import { THEMES } from "../manifest";
import {
  contrastRatio,
  over,
  parseColor,
  parseTokens,
  type RGB,
  type RGBA,
  type Tokens,
} from "./_contrastMath";
import {
  isCompound,
  parseRules,
  requiredClasses,
  specificity,
  type CssRule,
} from "./_cssRules";

// ============================================================================
// Button :hover contrast contract
// ============================================================================
// `contrast.test.ts` checks *token pairs* and explicitly exempts --sui-accent
// from passing as text, because it is a fill colour. That contract cannot see
// the bug this file guards against: --sui-accent being used as *text*, by
// cascade accident, on top of a fill.
//
// The accident: `.sui-btn:hover` sets `color: var(--sui-accent)` for every
// button. A variant hover rule sits at the same specificity (0,3,0) and wins
// only for the properties it declares. So a variant that changes `background`
// on hover but not `color` gets the generic accent text — on its own accent
// fill. That is how `--primary` hover reached 1.05:1 (label invisible).
//
// Two layers:
//   1. A structural invariant on the source CSS — token-independent, and the
//      layer that actually stops recurrence.
//   2. The resolved cascade, measured. Catches bad colour *choices*, which
//      layer 1 is blind to.
// ============================================================================

const VARIANTS = [
  "default",
  "primary",
  "secondary",
  "danger",
  "warning",
  "ghost",
  "outlined",
  "text",
  "icon-only",
] as const;

/** Every stylesheet that may declare `.sui-btn*` hover rules. */
const SOURCES: ReadonlyArray<{ name: string; css: string }> = [
  { name: "_baseline.css", css: baselineCss },
  ...Object.values(THEMES).map((t) => ({ name: `${t.id}.css`, css: t.css })),
];

const isButtonHoverRule = (r: CssRule) =>
  /\.sui-btn/.test(r.selector) && /:hover/.test(r.selector);

const declaresBackground = (r: CssRule) =>
  "background" in r.decls || "background-color" in r.decls;

// ---------------------------------------------------------------------------
// Layer 1 — structural invariant
// ---------------------------------------------------------------------------
// "A :hover rule that changes `background` must also state `color`."
//
// Without this, every variant silently inherits `.sui-btn:hover`'s accent text
// over its own fill. The next filled variant added would have the same bug and
// nothing would catch it.

// Exemptions are decisions, not silencers. Each entry must say why inheriting
// the generic accent hover colour is the *intended* look for that variant.
const HOVER_COLOR_EXEMPT: ReadonlyArray<{ selector: string; why: string }> = [
  {
    // A translucent 8–12% accent wash under accent-coloured text IS the ghost
    // hover look. Declaring a colour here would change three themes' visuals
    // for no accessibility gain — the wash composites to ~the page surface.
    selector: ".sui-btn--ghost:hover:not(:disabled)",
    why: "translucent accent wash; accent text is the intended ghost hover",
  },
];

const isExempt = (selector: string) =>
  HOVER_COLOR_EXEMPT.some((e) => e.selector === selector);

// A green suite that scanned nothing proves nothing. `_baseline.css` is the
// one file guaranteed to carry the full button rule set, so pin it: if the
// scanner ever stops finding rules, this fails instead of everything passing
// vacuously.
it("the rule scanner finds _baseline.css's button hover rules", () => {
  const found = parseRules(baselineCss).filter(isButtonHoverRule);
  expect(found.map((r) => r.selector)).toContain(
    ".sui-btn--primary:hover:not(:disabled)",
  );
  expect(found.filter(declaresBackground).length).toBeGreaterThanOrEqual(5);
});

// One test per stylesheet rather than per rule: several themes legitimately
// declare no button hover rules at all, and reporting every violation in a file
// together beats discovering them one CI run at a time.
it.each(SOURCES)(
  "$name: every button :hover rule that sets a background also sets a color",
  ({ name, css }) => {
    const offenders = parseRules(css)
      .filter(isButtonHoverRule)
      .filter(declaresBackground)
      .filter((r) => !("color" in r.decls))
      .filter((r) => !isExempt(r.selector))
      .map((r: CssRule) => r.selector);

    expect(
      offenders,
      `${name}: ${offenders.join(", ")} set a background but no color, so they ` +
        `inherit .sui-btn:hover's accent text over their own fill. Declare an ` +
        `explicit hover color, or add a justified entry to HOVER_COLOR_EXEMPT.`,
    ).toEqual([]);
  },
);

// ---------------------------------------------------------------------------
// Layer 2 — resolved hover contrast
// ---------------------------------------------------------------------------
// Build the effective stylesheet the way the browser sees it: every theme
// `@import`s `_baseline.css` first, so baseline is the earlier origin and the
// theme overrides it. Resolve `color` and `background` for each variant's
// hover state by specificity then document order, then measure.

const TRANSPARENT: RGBA = [0, 0, 0, 0];

function resolveColor(raw: string | undefined, tokens: Tokens): RGBA | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  if (v === "transparent" || v === "none") return TRANSPARENT;
  return parseColor(raw, tokens);
}

/** Class set of `<button class="sui-btn sui-btn--<variant>">`. */
function classesFor(variant: string): Set<string> {
  return variant === "default"
    ? new Set(["sui-btn"])
    : new Set(["sui-btn", `sui-btn--${variant}`]);
}

function matches(rule: CssRule, classes: Set<string>): boolean {
  if (!isCompound(rule.selector)) return false;
  // Attribute-gated rules (e.g. [aria-pressed="true"]) are a different state
  // than plain hover and are measured by their own contract, not this one.
  if (/\[/.test(rule.selector)) return false;
  const req = requiredClasses(rule.selector);
  return req.length > 0 && req.every((c) => classes.has(c));
}

/** Last declaration wins at equal-or-greater specificity, in document order. */
function cascade(
  rules: readonly CssRule[],
  props: readonly string[],
): string | undefined {
  let best: string | undefined;
  let bestSpec = -1;
  for (const rule of rules) {
    const value = props.map((p) => rule.decls[p]).find((v) => v !== undefined);
    if (value === undefined) continue;
    const s = specificity(rule.selector);
    if (s >= bestSpec) {
      best = value;
      bestSpec = s;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Recorded palette debt
// ---------------------------------------------------------------------------
// Escape hatch for a (theme, variant) pair that sits below 4.5:1 for a
// *colour-choice* reason the team has decided not to fix yet. Currently EMPTY —
// every variant clears 4.5:1 in every theme, and it should stay that way.
//
// Adding an entry is a decision, not a silencer, and the contract is two-sided:
// the pair may not silently get worse than its recorded ratio, and once a
// palette change lifts it past 4.5:1 the test fails until the entry is deleted.
// So the list shrinks and never rots. `cause` must say what would have to
// change to clear it, not merely restate the number.

interface PaletteDebt {
  readonly theme: string;
  readonly variant: string;
  /** Ratio measured when this entry was recorded (2 dp). A floor, not a target. */
  readonly measured: number;
  /** What would have to change to clear this. */
  readonly cause: string;
}

const PALETTE_DEBT: readonly PaletteDebt[] = [];

const debtFor = (theme: string, variant: string) =>
  PALETTE_DEBT.find((d) => d.theme === theme && d.variant === variant);

// Recorded ratios are rounded to 2 dp, so a pair measuring exactly its recorded
// value can land a hair under it.
const ROUNDING = 0.01;

// Both states are measured. Rest matters as much as hover here: the label
// colours are per-theme tokens now (--sui-on-accent, --sui-on-warning), and a
// variant whose label is readable on hover but not at rest is still unreadable
// — it just fails in the state users spend most of their time in.
const STATES = ["rest", "hover"] as const;
type State = (typeof STATES)[number];

describe.each(Object.values(THEMES))("button contrast: $id", (theme) => {
  const tokens = parseTokens(theme.css);
  const effective = parseRules(`${baselineCss}\n${theme.css}`);
  const pageBg = resolveColor(tokens["--sui-bg-primary"], tokens);

  it("has a resolvable --sui-bg-primary", () => {
    expect(pageBg).not.toBeNull();
  });

  const cases = STATES.flatMap((state) =>
    VARIANTS.map((variant) => ({ state, variant })),
  );

  it.each(cases)("--$variant $state label is readable", ({ state, variant }: { state: State; variant: string }) => {
    if (!pageBg) throw new Error(`${theme.id}: --sui-bg-primary did not resolve`);
    const surface = over(pageBg, [0, 0, 0]);
    const classes = classesFor(variant);

    const applicable = effective.filter((r) => matches(r, classes));
    const rest = applicable.filter(
      (r) => !/:hover|:disabled|--active/.test(r.selector),
    );
    const hover = applicable.filter((r) => /:hover/.test(r.selector));

    // `:hover` only overrides what it names, so an unnamed property falls back
    // to the rest cascade.
    const pick = (props: readonly string[]) =>
      state === "rest"
        ? cascade(rest, props)
        : (cascade(hover, props) ?? cascade(rest, props));

    const colorRaw = pick(["color"]);
    const bgRaw = pick(["background", "background-color"]);

    const fgColor = resolveColor(colorRaw, tokens);
    const bgColor = resolveColor(bgRaw, tokens);
    if (!fgColor || !bgColor) {
      throw new Error(
        `${theme.id} --${variant} (${state}): could not resolve ` +
          `color=${colorRaw ?? "<none>"} background=${bgRaw ?? "<none>"}`,
      );
    }

    // Alpha compositing is mandatory: most hover fills are rgba(..., 0.1), and
    // treating them as opaque produces false failures on the wash variants.
    const bgRgb: RGB = over(bgColor, surface);
    const fgRgb: RGB = over(fgColor, bgRgb);
    const ratio = contrastRatio(fgRgb, bgRgb);
    const where =
      `${theme.id} .sui-btn--${variant} (${state}) = ${ratio.toFixed(2)}:1 — ` +
      `color [${colorRaw}] on background [${bgRaw}]`;

    const debt = debtFor(theme.id, variant);
    if (!debt) {
      expect(ratio, `${where}, needs >= 4.5:1`).toBeGreaterThanOrEqual(4.5);
      return;
    }

    // Recorded debt: may not get worse, and may not stay recorded once fixed.
    expect(
      ratio,
      `${where}, but PALETTE_DEBT records ${debt.measured}:1 — this pair got ` +
        `WORSE. Cause on record: ${debt.cause}`,
    ).toBeGreaterThanOrEqual(debt.measured - ROUNDING);

    expect(
      ratio,
      `${where} — this now clears 4.5:1, so its PALETTE_DEBT entry is stale. ` +
        `Delete the { theme: "${theme.id}", variant: "${variant}" } entry.`,
    ).toBeLessThan(4.5);
  });
});
