// ============================================
// Self-estimating progress — pure logic (no Solid/DOM).
//
// Everything "smart" about the extraction progress bar lives here:
//
//  • An ONLINE LINEAR REGRESSION (one model per board instance) that learns
//    how long a batch of N rows takes — T̂(rows) = base + perRow·rows — from
//    the wall-clock durations SUI itself measures as batches resolve.
//  • The EASING curve (race → creep → snap) that turns "elapsed ms in this
//    batch" into a 0..1 fill fraction that confidently approaches the estimate
//    but only ever reaches 1.0 on a real completion event.
//
// The consumer never sees any of this. It passes declarative batch states
// (`pending | running | done`); SUI observes the lifecycle, measures the
// durations, folds them into the model, and eases the fill.
//
// All constants below are ENCAPSULATED — not configurable from the call site.
// ============================================

/** Knee of the easing curve: the race arrives here at the estimate T̂. */
export const P_KNEE = 0.9;
/** Snap-to-100% tween duration once a batch flips to `done` (ms). */
export const SNAP_MS = 180;

/** Low-weight prior so batch #1 isn't garbage and the denominator is never
 *  singular. Two pseudo-points, each folded `PRIOR_WEIGHT` times. */
const PRIOR_WEIGHT = 2;
const PRIOR_POINTS: ReadonlyArray<readonly [rows: number, durMs: number]> = [
  [1, 2200],
  [10_000, 4700],
];

/**
 * Online ordinary-least-squares for `dur = base + perRow·rows`, kept as the
 * five running sums so each new sample folds in O(1). Residual spread σ is
 * tracked from running Σ(dur²) against the live fit.
 */
export interface RegressionModel {
  n: number;
  sx: number;
  sy: number;
  sxx: number;
  sxy: number;
  /** Σ(dur²) — for the residual-spread (σ) estimate. */
  syy: number;
}

/** A fresh model, seeded with the low-weight prior. */
export function createModel(): RegressionModel {
  const m: RegressionModel = { n: 0, sx: 0, sy: 0, sxx: 0, sxy: 0, syy: 0 };
  for (const [rows, dur] of PRIOR_POINTS) {
    for (let i = 0; i < PRIOR_WEIGHT; i++) foldSample(m, rows, dur);
  }
  return m;
}

/** Fold one observed `(rows, durationMs)` sample into the model. */
export function foldSample(m: RegressionModel, rows: number, durMs: number): void {
  m.n += 1;
  m.sx += rows;
  m.sy += durMs;
  m.sxx += rows * rows;
  m.sxy += rows * durMs;
  m.syy += durMs * durMs;
}

/** Live fit. The denominator is never singular thanks to the prior's two
 *  distinct x-values, but we still guard against degenerate inputs. */
export function fit(m: RegressionModel): { base: number; perRow: number } {
  const denom = m.n * m.sxx - m.sx * m.sx;
  if (denom === 0 || m.n === 0) {
    // Degenerate — fall back to a flat mean (or the prior's base).
    return { base: m.n > 0 ? m.sy / m.n : 2200, perRow: 0 };
  }
  const perRow = (m.n * m.sxy - m.sx * m.sy) / denom;
  const base = (m.sy - perRow * m.sx) / m.n;
  return { base, perRow };
}

/** Live point estimate for a batch of `rows` rows (ms), floored at a small
 *  positive value so easing math never divides by zero or goes negative. */
export function estimateMs(m: RegressionModel, rows: number): number {
  const { base, perRow } = fit(m);
  return Math.max(1, base + perRow * rows);
}

/** Running residual standard deviation: sqrt(mean((dur − T̂)²)), computed from
 *  the running sums against the live linear fit. Floored at 0. */
export function residualStd(m: RegressionModel): number {
  if (m.n === 0) return 0;
  const { base, perRow } = fit(m);
  // mean((y − (a + b·x))²)
  //   = (Σy² − 2a·Σy − 2b·Σxy + n·a² + 2ab·Σx + b²·Σxx) / n
  const a = base;
  const b = perRow;
  const sse =
    m.syy -
    2 * a * m.sy -
    2 * b * m.sxy +
    m.n * a * a +
    2 * a * b * m.sx +
    b * b * m.sxx;
  return Math.sqrt(Math.max(0, sse / m.n));
}

/**
 * The easing fraction (0..1) for a running batch, given the elapsed ms in the
 * batch, the model's estimate for it, and the model's residual spread.
 *
 *  • Race  (e ≤ T̂):  p = P_KNEE · (e / T̂)            — near-linear to ~90% at T̂.
 *  • Creep (e > T̂):  p = 1 − (1 − P_KNEE)·exp(−(e−T̂)/τ),  τ = max(0.35·T̂, 1.5·σ).
 *
 * NEVER reaches 1.0 on its own — the creep asymptotes below it, so a real
 * `done` event (the snap) is always required to complete the bar.
 */
export function easeRunning(elapsedMs: number, estMs: number, sigmaMs: number): number {
  const e = Math.max(0, elapsedMs);
  const T = Math.max(1, estMs);
  if (e <= T) {
    return P_KNEE * (e / T);
  }
  const tau = Math.max(0.35 * T, 1.5 * sigmaMs, 1);
  const p = 1 - (1 - P_KNEE) * Math.exp(-(e - T) / tau);
  // The creep asymptotes below 1.0 mathematically, but for large (e−T)/τ the
  // exp() underflows to 0 in float64 and p would round to exactly 1. Cap just
  // below 1 so a real `done` snap is ALWAYS required to complete the bar.
  return Math.min(p, 1 - 1e-4);
}

/**
 * The snap tween: from the fraction `pFrom` where the bar sat at the moment of
 * completion, linearly toward 1.0 over SNAP_MS. `snapElapsed` is ms since the
 * `done` event was first observed.
 */
export function easeSnap(pFrom: number, snapElapsedMs: number): number {
  if (snapElapsedMs >= SNAP_MS) return 1;
  const k = Math.max(0, snapElapsedMs) / SNAP_MS;
  return pFrom + (1 - pFrom) * k;
}
