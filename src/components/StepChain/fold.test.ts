import { describe, expect, it } from "vitest";
import { type ChainMeasure, foldChain, foldedChainWidth, fullChainWidth } from "./fold";

/** n steps, each amount 50 wide and each arrow 20 wide; gap 5; head 100; ellipsis 30. */
const measure = (n: number, over: Partial<ChainMeasure> = {}): ChainMeasure => ({
  available: 10_000,
  head: 100,
  gap: 5,
  amounts: Array.from({ length: n }, () => 50),
  arrows: Array.from({ length: n }, () => 20),
  more: 30,
  ...over,
});

describe("foldChain", () => {
  it("full chain width is items plus gaps", () => {
    // 3 steps: 3*50 + 3*20 + 5 gaps*5
    expect(fullChainWidth(measure(3))).toBe(235);
  });

  it("case 1: head and chain fit on one line", () => {
    const f = foldChain(measure(3, { available: 100 + 5 + 235 }));
    expect(f).toEqual({ mode: "one", shown: [0, 1, 2], omitted: 0 });
  });

  it("case 2: one pixel short of one line, the chain fits alone", () => {
    const f = foldChain(measure(3, { available: 100 + 5 + 235 - 1 }));
    expect(f.mode).toBe("two");
    expect(f.shown).toEqual([0, 1, 2]);
    expect(f.omitted).toBe(0);
  });

  it("case 2 holds exactly at the chain's own width", () => {
    expect(foldChain(measure(3, { available: 235 })).mode).toBe("two");
  });

  it("case 3: the chain overflows its own line, first two + last, N = steps - 3", () => {
    const f = foldChain(measure(8, { available: 300 }));
    expect(f).toEqual({ mode: "fold", shown: [0, 1, 7], omitted: 5 });
  });

  it("case 3 begins exactly when the chain is one pixel too wide", () => {
    const full = fullChainWidth(measure(6));
    expect(foldChain(measure(6, { available: full })).mode).toBe("two");
    expect(foldChain(measure(6, { available: full - 1 })).mode).toBe("fold");
  });

  it("four steps fold to one omitted", () => {
    const f = foldChain(measure(4, { available: 100 }));
    expect(f).toEqual({ mode: "fold", shown: [0, 1, 3], omitted: 1 });
  });

  it("three steps that overflow have nothing to omit and stay on two lines", () => {
    const f = foldChain(measure(3, { available: 50 }));
    expect(f.mode).toBe("two");
    expect(f.omitted).toBe(0);
  });

  it("an empty or single-step chain never folds", () => {
    expect(foldChain(measure(0, { available: 10 })).mode).toBe("two");
    expect(foldChain(measure(1, { available: 10 })).mode).toBe("two");
  });

  it("the folded width is three amounts, four arrows, the ellipsis and seven gaps", () => {
    expect(foldedChainWidth(measure(8))).toBe(50 * 3 + 20 * 4 + 30 + 7 * 5);
  });

  it("re-folds as the width changes", () => {
    const widths = [1000, 300, 100].map((available) => foldChain(measure(8, { available })).mode);
    expect(widths).toEqual(["one", "fold", "fold"]);
    const mid = fullChainWidth(measure(8));
    expect(foldChain(measure(8, { available: mid })).mode).toBe("two");
  });
});
