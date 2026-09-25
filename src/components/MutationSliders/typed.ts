// ============================================
// MutationSliders typed amounts — pure, headless, no Solid, no DOM.
//
// What a figure TYPED into a dial's amount becomes (Peter, 2026-09-24: click
// the amount under a dial to edit it in place). `SliderField` owns the typing
// — Enter and blur commit, Escape reverts — and hands the raw text over; this
// file owns the meaning: parse, round to the precision, clamp to the dial's
// range. Everything here prints as a table (typed.test.ts).
// ============================================
import { clamp } from "../../internal/math/clamp";

/**
 * Round to a power of ten: `precision: 2` rounds to 0.01, `0` to whole units,
 * `-3` to the thousand.
 *
 * Through the exponent string rather than `value * 10 ** precision`, which
 * rounds `1.005` down (the product is 100.49999…). A `-0` comes back as `0`,
 * so a reader never sees a signed zero.
 */
export const roundToPrecision = (value: number, precision: number): number => {
  const rounded = Number(
    `${Math.round(Number(`${value}e${precision}`))}e${-precision}`,
  );
  // A value already in exponent form (1e21) makes the string trick NaN; such a
  // figure is past any grid a dial draws, so it stands as it is.
  if (!Number.isFinite(rounded)) return value;
  return rounded === 0 ? 0 : rounded;
};

/** The limits a typed amount lands inside. */
export interface TypedLimits {
  readonly min: number;
  readonly max: number;
  readonly precision: number;
}

const SUFFIX: Readonly<Record<string, number>> = { k: 1_000, m: 1_000_000 };

/**
 * The number a person typed, or `null` for nothing a commit should act on.
 *
 * Forgiving about what a money figure is written with — `$`, thousands
 * commas, spaces, and a trailing `k` or `m` the compact readout itself prints
 * — and strict about the empty field: `Number("")` is `0`, and an emptied
 * field must not commit a real zero.
 */
export const parseTyped = (text: string): number | null => {
  const bare = text.replace(/[$,\s]/g, "").toLowerCase();
  const unit = SUFFIX[bare.slice(-1)];
  const digits = unit === undefined ? bare : bare.slice(0, -1);
  if (digits === "" || digits === "-") return null;
  const value = Number(digits) * (unit ?? 1);
  return Number.isFinite(value) ? value : null;
};

/**
 * A typed figure settled: parsed, ROUNDED, then CLAMPED — `null` when there is
 * nothing to commit.
 *
 * Round first and clamp second, the order `settle` uses for a drag: rounding
 * a figure already at the ceiling could otherwise carry it past the range
 * (115,500 at `precision: -3` is 116,000), and the range is the one limit a
 * dial never breaks. At an edge that is not on the grid the edge itself wins.
 */
export const settleTyped = (
  text: string,
  limits: TypedLimits,
): number | null => {
  const value = parseTyped(text);
  return value === null
    ? null
    : clamp(roundToPrecision(value, limits.precision), limits.min, limits.max);
};
