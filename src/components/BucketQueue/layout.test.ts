import { describe, it, expect } from "vitest";
import { allocateHeights } from "./layout";

// natural[i] models header(34) + count*row(54) + border(2); empty = 36.
const natural = (counts: number[]) => counts.map((c) => (c === 0 ? 36 : 34 + c * 54 + 2));
const weights = [1, 1, 2];

describe("allocateHeights — the progression water-fill", () => {
  it("collapses empty buckets to their summary line and populated ones shrink-wrap when they fit", () => {
    const counts = [4, 0, 0]; // one populated, two empty
    const out = allocateHeights({ natural: natural(counts), counts, weights, available: 900, gap: 8 });
    expect(out[0]).toBe(252); // 34 + 4*54 + 2 — shrink-wrapped to content
    expect(out[1]).toBe(36); // empty → summary line
    expect(out[2]).toBe(36);
  });

  it("all populated + fitting → each shrink-wraps (no stretch, leftover falls outside)", () => {
    const counts = [4, 3, 5];
    const out = allocateHeights({ natural: natural(counts), counts, weights, available: 900, gap: 8 });
    expect(out).toEqual([252, 198, 306]);
  });

  it("overflow → the populated buckets share the space 1:1:2", () => {
    const counts = [8, 8, 24]; // each overflows its share
    const available = 917;
    const out = allocateHeights({ natural: natural(counts), counts, weights, available, gap: 8 });
    // pool = 917 − 16 gap = 901; shares 1:1:2 → 225.25 / 225.25 / 450.5, all
    // under their content, so distributed as-is.
    expect(out[0]).toBeCloseTo(225.25, 1);
    expect(out[1]).toBeCloseTo(225.25, 1);
    expect(out[2]).toBeCloseTo(450.5, 1);
    expect(out[0] + out[1] + out[2]).toBeCloseTo(available - 16, 1);
  });

  it("a bucket that shrinks under its share hands the surplus to the others", () => {
    // transient has only 4 rows (content 252) — well under its 2-weight share;
    // the two heavy terminals (20 rows each) absorb the surplus 1:1.
    const counts = [20, 20, 4];
    const available = 1075;
    const out = allocateHeights({ natural: natural(counts), counts, weights, available, gap: 8 });
    expect(out[2]).toBe(252); // transient capped at its content
    expect(out[0]).toBeCloseTo(out[1], 0); // the two terminals split the rest evenly
    expect(out[0]).toBeGreaterThan(252);
  });
});
