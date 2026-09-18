/**
 * Hourly Board — the board's WORDING for money. No Solid, no DOM.
 *
 * The board sells HOURS, so every sentence here is revenue-side: a number that
 * goes UP is a number that reads better, which is the exact opposite of the
 * Scenario Board's payroll sentences and the reason this file exists at all.
 *
 * IT DOES NOT FORK THE ROUNDING POLICY. `abbreviateDollars` is imported from
 * `scenario-board-money` rather than rewritten, because `$8.5k` / `$60k` /
 * `$1.2M` is one decision for the whole workshop and a second abbreviator here
 * would be a second policy that can disagree with the first. What this module
 * adds is the two REVENUE sentences the gauge asks for, and the WEEKLY unit.
 *
 * Money words stay OUT of `src/` (SUI ships no currency): `RateGauge` documents
 * `formatAgainst` and `formatDelta` as sentence builders, so these ARE the
 * gauge's callout lines, written and tested here where something can check them.
 */
import { abbreviateDollars } from "./scenario-board-money";

export { abbreviateDollars };

/**
 * The same amount as a RATE — `$4.9k/wk`.
 *
 * Peter, 2026-09-18: "Hourly people tend to think of it that way." Hours are
 * quoted per week and rates per hour, so the moment the two are multiplied the
 * answer is WEEKLY revenue — no ×52 — and the gauge, the summary line and the
 * DEBUG tables all read in it. The unit is spelled once here rather than
 * concatenated at four call sites.
 */
export const dollarsPerWeek = (amount: number): string =>
  `${abbreviateDollars(amount)}/wk`;

/**
 * A SIGNED rate — `+$1.3k/wk`, `−$309/wk`. For the DEBUG tables only.
 *
 * Distinct from `dollarsPerWeek` because the plus is not decoration: a reading
 * that names a CHANGE has to say which way, and one that names an AMOUNT must
 * not, or `$1.3k/wk over breakeven` would read as `+$1.3k/wk over breakeven`.
 */
export const signedDollarsPerWeek = (amount: number): string =>
  `${amount < 0 ? "" : "+"}${dollarsPerWeek(amount)}`;

// ── The gauge's two sentences ────────────────────────────────────────────────

/**
 * Where a rate stands against break-even — `$1.3k/wk over breakeven`.
 *
 * NO SIGN FLIP, and that is the whole difference from the payroll board's
 * sentence of the same name: there, pay was an outflow and the gauge's arithmetic
 * ran backwards from the words. Here the rate IS revenue less fixed costs, so up
 * is over and down is below, and the sentence says exactly what the number does.
 *
 * Zero gets its own line. `$0/wk over breakeven` is true and unreadable; "at
 * breakeven" is what a person would say.
 */
export const againstBreakeven = (rate: number): string =>
  rate === 0
    ? "at breakeven"
    : `${dollarsPerWeek(Math.abs(rate))} ${rate > 0 ? "over" : "below"} breakeven`;

/**
 * What the difference between the two needles MEANS — `$1.1k/wk more revenue`.
 *
 * The gauge hands over `value − baseline`: the scenario's rate against the rate
 * the board already runs at, both in $/wk. Both are revenue less the same fixed costs, so the
 * fixed half cancels and the difference IS a difference in revenue — which is
 * why the words can say "revenue" without qualifying it.
 *
 * The direction rides in the words, so there is no `+` or `−` here: a sign would
 * say it twice.
 */
export const revenueShift = (rateDelta: number): string =>
  rateDelta === 0
    ? "no change to revenue"
    : `${dollarsPerWeek(Math.abs(rateDelta))} ${rateDelta > 0 ? "more" : "less"} revenue`;

// ── The dials' two units ─────────────────────────────────────────────────────

/**
 * Hours a week, as the Hrs/wk dial reads them — `20h`.
 *
 * Whole hours: the axis snaps to 1, so a fraction is a figure the dial cannot
 * emit and printing one would promise a precision the control does not have.
 */
export const formatHours = (hours: number): string => `${Math.round(hours)}h`;

/**
 * Dollars an hour, as the $/hr dial reads them — `$150`.
 *
 * NOT `abbreviateDollars`: an hourly rate lives in the hundreds, where the
 * compact scaler would print `$150` anyway for every value the axis admits — but
 * the intent differs, and a rate that one day ran to four figures should read
 * `$1,200`, not `$1.2k`. Grouped, not abbreviated.
 */
export const formatRate = (rate: number): string =>
  `$${Math.round(rate).toLocaleString("en-US")}`;
