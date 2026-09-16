/**
 * Scenario Board — the rate model, as plain functions.
 *
 * Lives beside the bench rather than inside it so the calibration can be
 * asserted without a browser or a render (precedent: `workshop-layout.ts` +
 * `workshop-layout.test.ts`). The bench imports these; nothing here imports
 * Solid, so the test is arithmetic only.
 *
 * ── THE CALIBRATION ────────────────────────────────────────────────────────
 *
 * Peter's requirement (2026-09-16): the board opens near the baseline with a
 * single small raise showing green; raising THREE people drives the rate into
 * the yellow band; raising EVERYONE drives it red, below zero.
 *
 * Pay is an OUTFLOW, so a raise LOWERS the company's rate:
 *
 *     rate = BASELINE − total pay increase
 *
 * With BASELINE = 24,000, COMFORTABLE = 12,000 and a raise of $5,000/yr,
 * every one of those four readings falls out of the same line:
 *
 *     raises   pay change     rate      band     why
 *     ------   ----------   --------   ------    ------------------------------
 *        0             0     24,000    green     at the baseline
 *        1         5,000     19,000    green     ≥ 12,000, just below baseline
 *        3        15,000      9,000    yellow    0 < 9,000 < 12,000
 *        6        30,000     −6,000    red       below zero
 *
 * The three constants are not independent — they are the solution to four
 * inequalities, which is why they are derived here and not picked:
 *
 *     BASELINE − 1×5,000 ≥ COMFORTABLE      one raise must stay green
 *     BASELINE − 3×5,000 <  COMFORTABLE     three must fall under it
 *     BASELINE − 3×5,000 >  0               …but not all the way to red
 *     BASELINE − 6×5,000 <  0               everyone must cross zero
 *
 * which give 15,000 < BASELINE < 30,000 and BASELINE − 15,000 < COMFORTABLE ≤
 * BASELINE − 5,000. 24,000 and 12,000 sit in the middle of both ranges, so the
 * readings are not balanced on a knife edge — every band has room either side.
 * `rateBandTable()` prints exactly the table above, and the test asserts it.
 */

/**
 * What the company nets per YEAR before the scenario's changes — its surplus,
 * not its revenue, which is why it is small beside a payroll of six salaries.
 *
 * EVERY figure on this board is $/yr: pay, the bands, the rate, the gauge's
 * domain. One unit throughout means no conversion can be got wrong, and it is
 * the unit a salary is quoted in.
 */
export const RATE_BASELINE = 24_000;

/**
 * The comfortable gain. The gauge splits its gain half here: at or above it
 * the band lights green, below it yellow. Below ZERO is red, and that split is
 * the gauge's own, not ours.
 */
export const COMFORTABLE = 12_000;

/** The gauge's domain. Wide enough to hold every reading in the table above. */
export const RATE_DOMAIN: readonly [number, number] = [-30_000, 30_000];

/**
 * The size of a "plausible raise" the calibration is solved around, in $/yr.
 *
 * Pay is a CONTINUOUS dollar amount — a drag can land anywhere — so this is
 * not a quantum and nothing snaps to it. It is the raise size the four
 * readings below are computed at, so that "three raises" names a definite
 * point on the dial rather than an arbitrary one.
 */
export const RAISE_STEP = 5_000;

/** Which band a rate falls in. The gauge draws this; we name it for the table. */
export type RateBand = "red" | "yellow" | "green";

/**
 * The band a rate reads as. Mirrors the gauge's own split so the headless
 * table and the drawn dial cannot disagree: below zero is a loss (red), below
 * the comfortable gain is a gain that is not yet enough (yellow), and at or
 * above it is green.
 */
export const bandOfRate = (rate: number): RateBand => {
  if (rate < 0) return "red";
  if (rate < COMFORTABLE) return "yellow";
  return "green";
};

/** The company's rate, given what the scenario's pay changes cost per month. */
export const rateFromPayChange = (payChange: number): number =>
  RATE_BASELINE - payChange;

/** The rate after `raises` people each move up one level. The calibration model. */
export const rateForRaises = (raises: number): number =>
  rateFromPayChange(raises * RAISE_STEP);

/** One row of the calibration table. */
export interface RateRow {
  readonly raises: number;
  readonly payChange: number;
  readonly rate: number;
  readonly band: RateBand;
}

/** How many people the board's fixture starts with. */
export const HEADCOUNT = 6;

/**
 * The calibration, as data: no raises, the one the board opens with, the three
 * that should reach yellow, and everyone. Printed by the bench's DEBUG table
 * and asserted by the test, so the numbers are checkable without a browser.
 */
export const rateBandTable = (): RateRow[] =>
  [0, 1, 3, HEADCOUNT].map((raises) => ({
    raises,
    payChange: raises * RAISE_STEP,
    rate: rateForRaises(raises),
    band: bandOfRate(rateForRaises(raises)),
  }));
