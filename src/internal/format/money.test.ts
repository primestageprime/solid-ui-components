import { describe, expect, it } from "vitest";
import { formatMoneyLadder } from "./money";

describe("formatMoneyLadder", () => {
  it("sub-thousand values have only a full tier", () => {
    expect(formatMoneyLadder(99_900)).toEqual(["$999"]);
    expect(formatMoneyLadder(0)).toEqual(["$0"]);
  });

  it("thousands get a full tier + a 0-decimal k tier", () => {
    expect(formatMoneyLadder(33_028_500)).toEqual(["$330,285", "$330k"]);
  });

  it("millions get full + k + a 1-decimal m tier", () => {
    expect(formatMoneyLadder(1_234_567_00)).toEqual([
      "$1,234,567",
      "$1,235k",
      "$1.2m",
    ]);
  });

  it("keeps the sign before the $, not between it and the digits", () => {
    expect(formatMoneyLadder(-33_028_500)).toEqual(["-$330,285", "-$330k"]);
  });

  it("ladder is always ordered widest to narrowest", () => {
    for (const cents of [500, 33_028_500, 1_234_567_00]) {
      const ladder = formatMoneyLadder(cents);
      const widths = ladder.map((s) => s.length);
      expect(widths).toEqual([...widths].sort((a, b) => b - a));
    }
  });
});
