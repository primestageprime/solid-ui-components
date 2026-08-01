// ============================================
// DistributionSparkline — domain helpers (Depth 0, pure).
// Deriving a shared y-domain for a SET of series. Offered, never imposed:
// what counts as "the set" is a modelling decision the client owns (all
// sources? the filtered ones? one source over time?), and the component takes
// whatever domain falls out of it. These are the two rules we reach for most,
// the way `trendOf` ships with TrendSparkline and `domainOf` with Chart — not
// the only rules worth having.
// ============================================
import { length, sortBy } from "../../fn";

const ascending = (values: readonly number[]): number[] =>
  sortBy((v: number) => v, values);

/** Linear-interpolated percentile of an already-pooled sample, `p` in 0..1. */
export const percentileOf = (p: number, values: readonly number[]): number => {
  const sorted = ascending(values);
  if (length(sorted) === 0) return 0;
  const at = (length(sorted) - 1) * p;
  const lo = Math.floor(at);
  const hi = Math.ceil(at);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (at - lo);
};

/**
 * A shared domain from the pooled percentile band of `series`, plus breathing
 * room so the widest series does not sit flush against the plot edge.
 *
 * Deliberately NOT the true extremes: one spike in one series would otherwise
 * squash every other series into a hairline, which is the failure this whole
 * encoding exists to avoid. Samples outside the returned domain are clipped by
 * the sparkline rather than allowed to rescale it.
 *
 *   const axis = p95DomainOf(map(prop("series"), sources));
 */
export const p95DomainOf = (
  series: readonly (readonly number[])[],
  band: [number, number] = [0.05, 0.95],
  pad = 0.18,
): [number, number] => {
  const pooled = series.flat();
  if (length(pooled) === 0) return [0, 1];
  const lo = percentileOf(band[0], pooled);
  const hi = percentileOf(band[1], pooled);
  const span = hi - lo;
  // A degenerate band (every sample identical) would give a zero-height plot;
  // fall back to a unit of room around the value.
  if (span === 0) return [lo - 0.5, hi + 0.5];
  return [lo - span * pad, hi + span * pad];
};

/**
 * A shared domain from the true extremes of `series` — nothing is ever
 * clipped. Right when the outliers ARE the story and legibility of the middle
 * matters less.
 */
export const extentDomainOf = (
  series: readonly (readonly number[])[],
): [number, number] => {
  const pooled = series.flat();
  if (length(pooled) === 0) return [0, 1];
  const lo = Math.min(...pooled);
  const hi = Math.max(...pooled);
  return lo === hi ? [lo - 0.5, hi + 0.5] : [lo, hi];
};
