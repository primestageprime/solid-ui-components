// ============================================
// formatMoneyLadder — the candidate ladder for ResponsiveMoney: given a cents
// value, produce every dollar rendering from widest to narrowest so a
// container can pick the widest one that still fits. Built on
// formatGroupedNumber (this module's grouped-digit primitive) rather than
// formatCompactNumber, because the k/m tiers here intentionally round to
// coarser precision (0 fraction digits at k, 1 at m) than formatCompactNumber's
// single "best" tier — this is a shrink ladder, not a one-shot magnitude pick.
// ============================================
import { formatGroupedNumber } from "./number";

/**
 * Ordered (widest → narrowest) dollar-string candidates for a cents value.
 * Sign is rendered once, before the `$`, so it never collides with the
 * grouped digits (`-$1,234`, not `$-1,234`).
 *
 * Tiers, added only once the magnitude clears their threshold:
 *   full  — always present, e.g. `$330,285`
 *   k     — |dollars| >= 1,000, e.g. `$330k` (0 fraction digits)
 *   m     — |dollars| >= 1,000,000, e.g. `$0.3m` (1 fraction digit)
 */
export const formatMoneyLadder = (cents: number): string[] => {
  const dollars = cents / 100;
  const sign = dollars < 0 ? "-" : "";
  const abs = Math.abs(dollars);

  const ladder = [`${sign}$${formatGroupedNumber(abs)}`];
  if (abs < 1_000) return ladder;

  ladder.push(`${sign}$${formatGroupedNumber(abs / 1_000)}k`);
  if (abs < 1_000_000) return ladder;

  ladder.push(`${sign}$${formatGroupedNumber(abs / 1_000_000, 1)}m`);
  return ladder;
};
