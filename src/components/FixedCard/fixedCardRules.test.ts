import { describe, it, expect } from "vitest";
import { isClipped, moreOf, type BoxMeasure } from "./fixedCardRules";

const box = (over: Partial<BoxMeasure> = {}): BoxMeasure => ({
  scrollWidth: 300,
  clientWidth: 300,
  scrollHeight: 200,
  clientHeight: 200,
  ...over,
});

describe("isClipped", () => {
  it("is false when the content fits the box exactly", () => {
    expect(isClipped(box())).toBe(false);
  });

  it("is true when the content is taller than the box", () => {
    expect(isClipped(box({ scrollHeight: 260 }))).toBe(true);
  });

  it("is true when the content is wider than the box", () => {
    expect(isClipped(box({ scrollWidth: 340 }))).toBe(true);
  });

  it("absorbs one pixel of sub-pixel rounding either way", () => {
    expect(isClipped(box({ scrollHeight: 201 }))).toBe(false);
    expect(isClipped(box({ scrollWidth: 301 }))).toBe(false);
    expect(isClipped(box({ scrollHeight: 202 }))).toBe(true);
  });

  it("is false for an unlaid-out box (every number zero, as in jsdom)", () => {
    expect(
      isClipped({
        scrollWidth: 0,
        clientWidth: 0,
        scrollHeight: 0,
        clientHeight: 0,
      }),
    ).toBe(false);
  });
});

describe("moreOf", () => {
  it("offers nothing when there is no detail and nothing is clipped", () => {
    expect(moreOf(false, false)).toBe("none");
  });

  it("offers the detail whenever the caller gave one, clipped or not", () => {
    expect(moreOf(true, false)).toBe("detail");
    expect(moreOf(true, true)).toBe("detail");
  });

  it("offers the card's own content in full when it is clipped and there is no detail", () => {
    expect(moreOf(false, true)).toBe("summary");
  });

  it("covers the whole 2x2 table with exactly three outcomes", () => {
    const outcomes = [false, true].flatMap((d) =>
      [false, true].map((c) => moreOf(d, c)),
    );
    expect(new Set(outcomes)).toEqual(new Set(["none", "detail", "summary"]));
  });
});
