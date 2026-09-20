/**
 * THE OTHER BOARD'S SHAPE, kept as a fixture so the kit can still be proved
 * generic after the board itself is gone.
 *
 * ── WHY THIS FILE EXISTS ────────────────────────────────────────────────────
 *
 * `model.test.ts` is the test that distinguishes a kit from a rename: it drives
 * the kit's functions from a config shaped like the SCENARIO Board — one axis,
 * `side: "expense"`, `unit: "yr"`, a quarterly grain — and asserts that board's
 * own published calibration table. Until 2026-09-19 that table was IMPORTED
 * from the bench's own `scenario-board-rate.ts` rather than retyped, which is
 * what made the proof independent: the numbers came from the other board's
 * source, not from a literal a kit author could have quietly bent.
 *
 * Peter retired the Scenario Board bench on 2026-09-19 ("you can delete
 * scenario board. It's already been promoted and implemented"). Keeping
 * `scenario-board-rate.ts` alive as the fixture was the obvious move and is a
 * trap: it imports `Person` and `payChangeAt` from `scenario-board-people.ts`,
 * so keeping the rate file keeps ~1,400 lines of the retired bench standing.
 *
 * So the CALIBRATION HALF is lifted here verbatim — the constants and the
 * function that COMPUTES the table — and the composite-rate half, which is what
 * needed `Person`, stays deleted (the kit's own `averageRate`/`accruedOver`
 * replaced it and `hourly.config.test.ts` covers them).
 *
 * `rateBandTable()` is still a COMPUTATION, not a retyped literal: bend any of
 * the constants below and the table bends with them, which is exactly the
 * independence the import used to give.
 *
 * ⚠ SOURCE: `dev/showcases/workshop/scenario-board-rate.ts` as of commit
 * `362a025ac803856789bc086a475f82794a6b5f6a` (last commit to touch that file
 * before its deletion). Every constant, comment and expectation below is
 * byte-identical to that revision. This is a FIXTURE, not live code — nothing
 * that ships reads it, and it is not a second home for the kit's own money or
 * rate vocabulary.
 */

/**
 * What the company nets per YEAR before the scenario's changes — its surplus,
 * not its revenue, which is why it is small beside a payroll of six salaries.
 *
 * EVERY figure on this board is $/yr: pay, the bands, the rate, the gauge's
 * domain. One unit throughout means no conversion can be got wrong, and it is
 * the unit a salary is quoted in.
 */
export const RATE_BASELINE = 60_000;

/**
 * The comfortable gain. The gauge splits its gain half here: at or above it
 * the band lights green, below it yellow. Below ZERO is red, and that split is
 * the gauge's own, not ours.
 */
export const COMFORTABLE = 30_000;

/** The gauge's domain. Wide enough to hold every reading in the table above. */
export const RATE_DOMAIN: readonly [number, number] = [-240_000, 120_000];

/**
 * The size of a "plausible raise" the calibration is solved around, in $/yr.
 *
 * Pay is a CONTINUOUS dollar amount — a drag can land anywhere — so this is
 * not a quantum and nothing snaps to it. It is the raise size the four
 * readings below are computed at, so that "three raises" names a definite
 * point on the dial rather than an arbitrary one.
 */
export const RAISE_STEP = 20_000;

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
export const HEADCOUNT = 2;

/**
 * What ONE person moving from their role's floor to its ceiling costs, in
 * $/yr — `200,000 − 80,000` for the engineers the board opens with.
 *
 * The red reading is the only one that is not a multiple of `RAISE_STEP`, and
 * that is the point of naming it: "both at the ceiling" is a place on the dial
 * a reader can actually drag to, not a number of notional raises.
 */
export const CEILING_RAISE = 120_000;

/**
 * The calibration, as data — AT THE START OF THE YEAR.
 *
 * Every row below is a change made at the domain's own left edge, where the
 * weight is 1 and the average equals the instantaneous rate. That is the one
 * moment at which the table is a statement about the constants rather than
 * about a date, which is why it is the moment the table fixes.
 */
export const rateBandTable = (): RateRow[] => {
  const rows = [0, 1, HEADCOUNT].map((raises) => ({
    raises,
    payChange: raises * RAISE_STEP,
    rate: rateForRaises(raises),
    band: bandOfRate(rateForRaises(raises)),
  }));
  // The last row is not a count of raises but a POSITION: everybody dragged to
  // the top of their band. `raises` carries the headcount so the row still
  // reads as "both of them", and `payChange` is what that actually costs.
  const ceiling = HEADCOUNT * CEILING_RAISE;
  return [
    ...rows,
    {
      raises: HEADCOUNT,
      payChange: ceiling,
      rate: rateFromPayChange(ceiling),
      band: bandOfRate(rateFromPayChange(ceiling)),
    },
  ];
};
