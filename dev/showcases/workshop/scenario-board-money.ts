/**
 * Scenario Board — one way to write a dollar.
 *
 * Peter, 2026-09-16: "amounts in abbreviated dollars everywhere — `$60k`,
 * `$8.5k`, `$1.2M`." Everywhere means the dials' readouts, the rails' captions,
 * the gauge's two callout lines and the brace between them, so it is one
 * function rather than a convention each surface keeps.
 *
 * IT IS NOT A NEW ROUNDING POLICY. `formatCompactNumber` is already the
 * library's canonical compact scaler — the one the charts' axes and
 * `ResponsiveMoney` are built on — and it gives exactly the tiers Peter asked
 * for: `8.5k`, `60k`, `1.2M`, `999`. This module adds the two things it has no
 * business knowing about, a currency symbol and a typographic minus, and
 * nothing else. Writing a fresh abbreviator here would have put a second
 * rounding policy in the codebase for the sake of a `$`.
 */
import { formatCompactNumber } from "../../../src/internal/format/number";

/**
 * A REAL minus sign (U+2212), not a hyphen. These are numbers, and a hyphen is
 * a different glyph at a different height — the same rule the dials' delta
 * labels already follow.
 */
export const MINUS = "−";

/**
 * An amount in abbreviated dollars — `$60k`, `$8.5k`, `$1.2M`, `$999`.
 *
 * The sign goes BEFORE the `$`, never between it and the digits: `−$8.5k`, not
 * `$−8.5k`. Zero is `$0`, unsigned, because a signed zero says a direction that
 * did not happen.
 */
export const abbreviateDollars = (amount: number): string =>
  `${amount < 0 ? MINUS : ""}$${formatCompactNumber(Math.abs(amount))}`;

/**
 * The same amount as a RATE — `$60k/yr`.
 *
 * Every figure on this board is dollars per year, so the unit is spelled once
 * here rather than concatenated at four call sites.
 */
export const dollarsPerYear = (amount: number): string =>
  `${abbreviateDollars(amount)}/yr`;

/**
 * A SIGNED rate — `+$20k/yr`, `−$40k/yr`.
 *
 * Distinct from `dollarsPerYear` because the plus is not decoration: a reading
 * that names a CHANGE has to say which way, and one that names an AMOUNT must
 * not, or `$60k/yr over breakeven` would read as `+$60k/yr over breakeven`.
 */
export const signedDollarsPerYear = (amount: number): string =>
  `${amount < 0 ? "" : "+"}${dollarsPerYear(amount)}`;

// ── The gauge's sentences ────────────────────────────────────────────────────
//
// `RateGauge` asks for WHOLE LINES now rather than formatted figures, and it
// supplies no words of its own around them — so these two functions are the
// board's wording, and they live here, beside the unit they are written in and
// under test, rather than inline in the bench where nothing could check them.

/**
 * Where a rate stands against break-even — `$60k/yr over breakeven`.
 *
 * Zero gets its own sentence. `$0/yr over breakeven` is true and unreadable;
 * "at breakeven" is what a person would say.
 */
export const againstBreakeven = (rate: number): string =>
  rate === 0
    ? "at breakeven"
    : `${dollarsPerYear(Math.abs(rate))} ${rate > 0 ? "over" : "below"} breakeven`;

/**
 * What the difference between the two needles MEANS — `$20k/yr to payroll`.
 *
 * THE SIGN IS FLIPPED, deliberately: the gauge hands over `value − baseline`,
 * a change in the RATE, and a rate that falls is payroll that rises. So a
 * negative delta is money going TO payroll and a positive one is money coming
 * OFF it. The words carry the direction, which is why there is no `+` or `−`
 * here — a sign would say it twice and, on this line, say it backwards.
 */
export const payrollShift = (rateDelta: number): string =>
  rateDelta === 0
    ? "no change to payroll"
    : `${dollarsPerYear(Math.abs(rateDelta))} ${rateDelta < 0 ? "to" : "off"} payroll`;
