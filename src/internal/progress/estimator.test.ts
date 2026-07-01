import { describe, it, expect } from "vitest";
import {
  createModel,
  foldSample,
  fit,
  estimateMs,
  residualStd,
  easeRunning,
  easeSnap,
  P_KNEE,
  SNAP_MS,
} from "./estimator";

describe("regression model", () => {
  it("is non-singular from the prior alone (batch #1 isn't garbage)", () => {
    const m = createModel();
    const { base, perRow } = fit(m);
    expect(Number.isFinite(base)).toBe(true);
    expect(Number.isFinite(perRow)).toBe(true);
    // Prior is (1, 2200) and (10000, 4700): perRow ≈ (4700-2200)/9999 ≈ 0.25.
    expect(perRow).toBeGreaterThan(0.2);
    expect(perRow).toBeLessThan(0.3);
  });

  it("converges toward the true law as real samples fold in", () => {
    // Truth: T = 2000 + 0.30·rows. Feed many clean samples.
    const m = createModel();
    for (let rows = 1000; rows <= 20000; rows += 500) {
      foldSample(m, rows, 2000 + 0.3 * rows);
    }
    const { base, perRow } = fit(m);
    // The prior's weight is tiny against ~40 clean samples → close to truth.
    expect(perRow).toBeGreaterThan(0.28);
    expect(perRow).toBeLessThan(0.32);
    expect(base).toBeGreaterThan(1700);
    expect(base).toBeLessThan(2300);
  });

  it("estimateMs is always positive even for degenerate rows", () => {
    const m = createModel();
    expect(estimateMs(m, 0)).toBeGreaterThan(0);
    expect(estimateMs(m, -5)).toBeGreaterThan(0);
  });

  it("residualStd is ~0 for a perfectly linear dataset and grows with noise", () => {
    const clean = createModel();
    for (let r = 1000; r <= 10000; r += 1000)
      foldSample(clean, r, 2000 + 0.3 * r);
    const noisy = createModel();
    for (let r = 1000; r <= 10000; r += 1000) {
      foldSample(noisy, r, 2000 + 0.3 * r + (r % 2 ? 800 : -800));
    }
    expect(residualStd(noisy)).toBeGreaterThan(residualStd(clean));
  });
});

describe("easing", () => {
  it("race is near-linear and reaches P_KNEE exactly at the estimate", () => {
    expect(easeRunning(0, 1000, 0)).toBeCloseTo(0, 5);
    expect(easeRunning(500, 1000, 0)).toBeCloseTo(P_KNEE * 0.5, 5);
    expect(easeRunning(1000, 1000, 0)).toBeCloseTo(P_KNEE, 5);
  });

  it("creep decelerates past the estimate and NEVER self-reaches 1.0", () => {
    const T = 1000;
    const sigma = 100;
    // Way past the estimate — still strictly below 1.
    const pFar = easeRunning(T * 100, T, sigma);
    expect(pFar).toBeGreaterThan(P_KNEE);
    expect(pFar).toBeLessThan(1);
    // Monotonic and decelerating: equal time-steps add less and less.
    const a = easeRunning(T + 200, T, sigma);
    const b = easeRunning(T + 400, T, sigma);
    const c = easeRunning(T + 600, T, sigma);
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
    expect(b - a).toBeGreaterThan(c - b); // deceleration
  });

  it("snap tweens from where the bar sat to 1.0 over SNAP_MS", () => {
    expect(easeSnap(0.7, 0)).toBeCloseTo(0.7, 5);
    expect(easeSnap(0.7, SNAP_MS / 2)).toBeCloseTo(0.7 + 0.3 * 0.5, 5);
    expect(easeSnap(0.7, SNAP_MS)).toBe(1);
    expect(easeSnap(0.7, SNAP_MS * 5)).toBe(1);
  });
});
