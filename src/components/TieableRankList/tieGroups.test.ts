import { describe, it, expect } from "vitest";
import {
  moveBy,
  ranksOf,
  retie,
  splitAll,
  tieAll,
  toTiers,
  toggleTie,
} from "./tieGroups";

describe("tie groups", () => {
  const order = ["a", "b", "c", "d"];
  it("groups runs of ties into tiers and dense ranks", () => {
    expect(toTiers(order, [true, false, true])).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
    expect(toTiers(order, [true, true, true])).toEqual([order]);
    expect(ranksOf(order, [true, false, false])).toEqual({
      a: 1,
      b: 1,
      c: 2,
      d: 3,
    });
  });
  it("toggles one gap, ties all, splits all", () => {
    expect(toggleTie([false, false, false], 1)).toEqual([false, true, false]);
    expect(tieAll(4)).toEqual([true, true, true]);
    expect(splitAll(4)).toEqual([false, false, false]);
    expect(tieAll(0)).toEqual([]);
  });
  it("retie keeps a tie only between neighbours that shared a tier", () => {
    // a=b, c, d → drag c between a and b: c splits the a=b tie
    expect(retie(order, [true, false, false], ["a", "c", "b", "d"])).toEqual([
      false,
      false,
      false,
    ]);
    // a=b=c, d → drag a to the end: b=c stays tied, a leaves its group
    expect(retie(order, [true, true, false], ["b", "c", "d", "a"])).toEqual([
      true,
      false,
      false,
    ]);
    // a=b=c, d → swap within the tier: still one tier
    expect(retie(order, [true, true, false], ["c", "a", "b", "d"])).toEqual([
      true,
      true,
      false,
    ]);
  });
  it("moveBy swaps with a neighbour and re-ties; out of range is a no-op", () => {
    expect(moveBy(order, [false, true, false], 3, -1)).toEqual({
      order: ["a", "b", "d", "c"],
      ties: [false, false, false],
    });
    expect(moveBy(order, [false, false, false], 0, -1)).toEqual({
      order,
      ties: [false, false, false],
    });
  });
});
