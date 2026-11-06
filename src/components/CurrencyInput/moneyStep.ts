// lastReviewedAt: 2026-11-06
// ============================================
// moneyStep — the ↑/↓/▲▼ step for a money amount, at the amount's scale
// Tags: data:scalar, shows:money
// Pure. Composes nothing; CurrencyInput's step variants read it.
//
// Peter, 2026-11-06: "if we're dealing in 10's of thousands, individual
// thousands should be the scale. But if we're dealing in hundreds, 1's should
// be the scale." The rule that meets both anchors: two significant figures
// from $1,000 up, with a $1 floor below that, never cents (a +1¢ arrow edit
// was thorcasting's phantom Harbor Shop change, #4358). Typing still enters
// cents; the step only governs the arrows.
//
//   |amount|            step       Shift (10×)
//   $0 – $999.99        $1         $10
//   $1,000 – $9,999.99  $100       $1,000
//   $10,000 – $99,999   $1,000     $10,000
//   $100,000 – $999,999 $10,000    $100,000
//   $1M – $9.99M        $100,000   $1M
//   and on: 10^(whole-dollar digits − 2)
// ============================================

/** Below this many whole dollars the step is the $1 floor. */
const FLOOR_BELOW_DOLLARS = 1_000;
/** The floor step, in cents ($1). */
const FLOOR_STEP_CENTS = 100;
/** Shift multiplies the step by this. */
export const MONEY_SHIFT_MULTIPLIER = 10;

/**
 * The arrow step, in CENTS, for an amount in CENTS. Sign is ignored; a
 * non-finite amount gets the floor.
 *
 * @example
 *   stepForAmount(45_000)     // $450      → 100 ($1)
 *   stepForAmount(2_500_000)  // $25,000   → 100_000 ($1,000)
 */
export const stepForAmount = (cents: number): number => {
  if (!Number.isFinite(cents)) return FLOOR_STEP_CENTS;
  const dollars = Math.floor(Math.abs(cents) / 100);
  if (dollars < FLOOR_BELOW_DOLLARS) return FLOOR_STEP_CENTS;
  const digits = String(dollars).length;
  return 10 ** (digits - 2) * 100;
};

/** Which way an arrow moves the value. */
export type StepDirection = 1 | -1;

/**
 * The step, in DOLLARS, for a field holding `dollars` and moving in
 * `direction` — the shape `ThemedNumberInput`'s `stepFor` takes. Moving TOWARD
 * zero reads the scale of the amount one cent nearer zero, so every boundary
 * is symmetric: $9,900 ↑ → $10,000 and $10,000 ↓ → $9,900 (not $9,000).
 */
export const moneyStepFor = (
  dollars: number,
  direction: StepDirection,
): number => {
  const cents = Math.round((Number.isFinite(dollars) ? dollars : 0) * 100);
  const towardZero = cents !== 0 && Math.sign(cents) !== direction;
  const magnitude = towardZero ? Math.abs(cents) - 1 : Math.abs(cents);
  return stepForAmount(magnitude) / 100;
};
