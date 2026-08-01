import { describe, expect, it } from "vitest";
import { extentDomainOf, p95DomainOf, percentileOf } from "./domain";

describe("percentileOf", () => {
  it("interpolates between samples", () => {
    // p50 of [0,10,20,30] sits between 10 and 20.
    expect(percentileOf(0.5, [0, 10, 20, 30])).toBe(15);
  });

  it("returns the extremes at 0 and 1", () => {
    expect(percentileOf(0, [5, 1, 9])).toBe(1);
    expect(percentileOf(1, [5, 1, 9])).toBe(9);
  });

  it("does not care about input order", () => {
    expect(percentileOf(0.25, [30, 0, 20, 10])).toBe(
      percentileOf(0.25, [0, 10, 20, 30]),
    );
  });

  it("is 0 for an empty sample rather than NaN", () => {
    expect(percentileOf(0.5, [])).toBe(0);
  });
});

describe("p95DomainOf", () => {
  it("excludes the extremes so one spike cannot set the scale", () => {
    const quiet = Array.from({ length: 100 }, () => 50);
    const [, hi] = p95DomainOf([quiet, [50, 50, 1000]]);
    // The spike is way outside the returned domain — that is the point.
    expect(hi).toBeLessThan(1000);
  });

  it("pools across every series, not just the first", () => {
    const [lo, hi] = p95DomainOf([
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [100, 100, 100, 100, 100, 100, 100, 100, 100, 100],
    ]);
    expect(lo).toBeLessThan(0);
    expect(hi).toBeGreaterThan(100);
  });

  it("pads the band so the widest series is not flush to the edge", () => {
    const values = Array.from({ length: 101 }, (_, i) => i);
    const banded = percentileOf(0.95, values) - percentileOf(0.05, values);
    const [lo, hi] = p95DomainOf([values]);
    expect(hi - lo).toBeCloseTo(banded * 1.36, 5); // 18% each side
  });

  it("gives a usable domain when every sample is identical", () => {
    const [lo, hi] = p95DomainOf([[7, 7, 7]]);
    expect(hi).toBeGreaterThan(lo);
  });

  it("gives a usable domain for no data at all", () => {
    const [lo, hi] = p95DomainOf([]);
    expect(hi).toBeGreaterThan(lo);
  });

  it("honours a custom band and pad", () => {
    const values = Array.from({ length: 101 }, (_, i) => i);
    const [lo, hi] = p95DomainOf([values], [0.25, 0.75], 0);
    expect(lo).toBeCloseTo(25, 5);
    expect(hi).toBeCloseTo(75, 5);
  });
});

describe("extentDomainOf", () => {
  it("keeps the true extremes, so nothing is ever clipped", () => {
    expect(extentDomainOf([[50, 50], [50, 1000]])).toEqual([50, 1000]);
  });

  it("gives a usable domain when every sample is identical", () => {
    const [lo, hi] = extentDomainOf([[7, 7]]);
    expect(hi).toBeGreaterThan(lo);
  });
});
