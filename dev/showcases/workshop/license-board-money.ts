/**
 * License Board — the board's WORDING for money. No Solid, no DOM.
 *
 * The board sells LICENSES, so every sentence here is revenue-side, exactly as
 * the Hourly Board's are: a number that goes UP is a number that reads better.
 * What differs from that board is only the UNIT — licenses bill MONTHLY, so
 * every figure is $/MO and there is no week anywhere in the words.
 *
 * IT DOES NOT FORK THE ROUNDING POLICY. `abbreviateDollars` is imported from
 * `scenario-board-money` rather than rewritten, because `$5.9k` / `$60k` /
 * `$1.2M` is one decision for the whole workshop and a second abbreviator here
 * would be a second policy that can disagree with the first. What this module
 * adds is the two REVENUE sentences the gauge asks for, and the MONTHLY unit.
 *
 * Money words stay OUT of `src/` (SUI ships no currency): `RateGauge` documents
 * `formatAgainst` and `formatDelta` as sentence builders, so these ARE the
 * gauge's callout lines, written and tested here where something can check them.
 */
import { abbreviateDollars } from "./scenario-board-money";

export { abbreviateDollars };

/**
 * The same amount as a RATE — `$5.9k/mo`.
 *
 * A licence has a MONTHLY fee, so the moment a count is multiplied by a fee the
 * answer is monthly revenue — no ×12 — and the gauge, each product's summary
 * line and the DEBUG tables all read in it. The unit is spelled once here
 * rather than concatenated at four call sites.
 */
export const dollarsPerMonth = (amount: number): string =>
  `${abbreviateDollars(amount)}/mo`;

/**
 * A SIGNED rate — `+$1.3k/mo`, `−$440/mo`. For the DEBUG tables only.
 *
 * Distinct from `dollarsPerMonth` because the plus is not decoration: a reading
 * that names a CHANGE has to say which way, and one that names an AMOUNT must
 * not, or `$1.3k/mo over breakeven` would read as `+$1.3k/mo over breakeven`.
 */
export const signedDollarsPerMonth = (amount: number): string =>
  `${amount < 0 ? "" : "+"}${dollarsPerMonth(amount)}`;

// ── The gauge's two sentences ────────────────────────────────────────────────

/**
 * Where a rate stands against break-even — `$1.3k/mo over breakeven`.
 *
 * NO SIGN FLIP: the rate IS monthly recurring revenue less the fixed monthly
 * cost, so up is over and down is below, and the sentence says exactly what the
 * number does. (The Scenario Board's sentence of the same name runs the other
 * way, because pay is an outflow.)
 *
 * Zero gets its own line. `$0/mo over breakeven` is true and unreadable; "at
 * breakeven" is what a person would say.
 */
export const againstBreakeven = (rate: number): string =>
  rate === 0
    ? "at breakeven"
    : `${dollarsPerMonth(Math.abs(rate))} ${rate > 0 ? "over" : "below"} breakeven`;

/**
 * What the difference between the two needles MEANS — `$1.1k/mo more revenue`.
 *
 * The gauge hands over `value − baseline`: the scenario's rate against the rate
 * the board already runs at, both in $/mo. Both are MRR less the same fixed
 * monthly cost, so the fixed half cancels and the difference IS a difference in
 * revenue — which is why the words can say "revenue" without qualifying it.
 *
 * The direction rides in the words, so there is no `+` or `−` here: a sign would
 * say it twice.
 */
export const revenueShift = (rateDelta: number): string =>
  rateDelta === 0
    ? "no change to revenue"
    : `${dollarsPerMonth(Math.abs(rateDelta))} ${rateDelta > 0 ? "more" : "less"} revenue`;

// ── The dials' two units ─────────────────────────────────────────────────────

/**
 * A licence COUNT, as the Licenses dial reads it — `120`.
 *
 * Whole licences: the axis snaps to 1, and half a seat is not a thing anybody
 * bills for. No unit word — the axis is already labelled "Licenses", and `120
 * licenses` under a dial labelled Licenses says it twice.
 */
export const formatLicenses = (count: number): string =>
  String(Math.round(count));

/**
 * A monthly fee, as the $/mo dial reads it — `$49`, `$400`.
 *
 * NOT `abbreviateDollars`: a per-seat fee lives in the tens and hundreds, where
 * the compact scaler would print the same digits anyway — but the intent
 * differs, and a fee that one day ran to four figures should read `$1,200`, not
 * `$1.2k`. Grouped, not abbreviated. The same call the Hourly Board's `$/hr`
 * dial makes, for the same reason.
 */
export const formatFee = (fee: number): string =>
  `$${Math.round(fee).toLocaleString("en-US")}`;
