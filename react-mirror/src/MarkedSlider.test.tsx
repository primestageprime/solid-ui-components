import { describe, expect, it } from "vitest";
import { deltaLines, numberText, thumbOffset } from "./MarkedSlider.tsx";

describe("thumbOffset", () => {
  it("is Kobalte's calc() of the value's share of the domain", () => {
    expect(thumbOffset([0, 200_000], 63_000)).toBe("calc(31.5%)");
    expect(thumbOffset([100, 200], 100)).toBe("calc(0%)");
  });
});

describe("numberText", () => {
  it("groups digits the way Kobalte's decimal formatter does", () => {
    expect(numberText(63_000, "en-US")).toBe("63,000");
  });
});

describe("deltaLines", () => {
  it("is no lines for no label and the plain text for one line", () => {
    expect(deltaLines(null)).toEqual([]);
    expect(deltaLines("+$1K")).toEqual([{ dy: undefined, text: "+$1K" }]);
  });
  it("centres a multi-line label on its line", () => {
    expect(deltaLines("a\nb")).toEqual([
      { dy: "-0.6em", text: "a" },
      { dy: "1.2em", text: "b" },
    ]);
    expect(deltaLines("a\nb\nc")[0]?.dy).toBe("-1.2em");
  });
});
