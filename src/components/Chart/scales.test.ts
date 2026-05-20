import { describe, it, expect } from "vitest";
import { scaleTime, linearScale } from "./scales";

describe("scaleTime", () => {
  it("maps domain start to range start and end to range end", () => {
    const t0 = new Date(2026, 0, 1).getTime();
    const t1 = new Date(2026, 0, 2).getTime();
    const s = scaleTime([new Date(t0), new Date(t1)], [0, 100]);
    expect(s(t0)).toBeCloseTo(0, 5);
    expect(s(t1)).toBeCloseTo(100, 5);
  });

  it("invert is the inverse of forward map", () => {
    const t0 = new Date(2026, 0, 1).getTime();
    const t1 = new Date(2026, 0, 2).getTime();
    const s = scaleTime([new Date(t0), new Date(t1)], [0, 100]);
    const mid = (t0 + t1) / 2;
    expect(s.invert(s(mid))).toBeCloseTo(mid, 5);
  });

  it("ticks returns ms epoch numbers spanning the domain", () => {
    const t0 = new Date(2026, 0, 1).getTime();
    const t1 = new Date(2026, 0, 8).getTime();
    const s = scaleTime([new Date(t0), new Date(t1)], [0, 100]);
    const ts = s.ticks(5);
    expect(ts.length).toBeGreaterThan(0);
    for (const t of ts) {
      expect(t).toBeGreaterThanOrEqual(t0);
      expect(t).toBeLessThanOrEqual(t1);
    }
  });

  it("exposes a tickFormat() helper", () => {
    const t0 = new Date(2026, 0, 1).getTime();
    const t1 = new Date(2026, 0, 8).getTime();
    const s = scaleTime([new Date(t0), new Date(t1)], [0, 100]);
    const fmt = s.tickFormat();
    expect(typeof fmt(t0)).toBe("string");
  });

  it("preserves the linearScale Scale interface shape (forward/invert/domain/range/ticks)", () => {
    const s = scaleTime([new Date(0), new Date(1000)], [0, 10]);
    const lin = linearScale([0, 1000], [0, 10]);
    expect(typeof s).toBe("function");
    expect(typeof lin).toBe("function");
    expect(s.domain.length).toBe(2);
    expect(s.range.length).toBe(2);
    expect(typeof s.invert).toBe("function");
    expect(typeof s.ticks).toBe("function");
  });

  it("scaleTime handles zero-length domain without dividing by zero", () => {
    const t = new Date(2026, 0, 1);
    const s = scaleTime([t, t], [0, 100]);
    // Should not throw; range endpoint behavior matches d3 (everything maps to range[0] or range[1])
    expect(Number.isFinite(s(t.getTime()))).toBe(true);
  });

  it("scaleTime handles reversed domain", () => {
    const t0 = new Date(2026, 0, 1).getTime();
    const t1 = new Date(2026, 0, 2).getTime();
    const s = scaleTime([new Date(t1), new Date(t0)], [0, 100]);
    // Reversed domain → invert direction. Just assert it doesn't throw + produces finite values.
    expect(Number.isFinite(s(t0))).toBe(true);
    expect(Number.isFinite(s(t1))).toBe(true);
  });
});

describe("linearScale degenerate domains", () => {
  it("linearScale handles zero-length domain without dividing by zero", () => {
    const s = linearScale([5, 5], [0, 100]);
    expect(Number.isFinite(s(5))).toBe(true);
  });

  it("linearScale handles reversed domain", () => {
    const s = linearScale([10, 0], [0, 100]);
    expect(Number.isFinite(s(0))).toBe(true);
    expect(Number.isFinite(s(10))).toBe(true);
  });
});
