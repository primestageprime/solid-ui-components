import { describe, it, expect } from "vitest";
import { buildReferenceLine } from "./referenceLine";

describe("buildReferenceLine — geometry only, plain numbers", () => {
  it("spans x1 to x2 at a flat y", () => {
    const mark = buildReferenceLine({ y: 40, x1: 0, x2: 180 });
    expect(mark.line).toEqual({ x1: 0, x2: 180, y1: 40, y2: 40 });
  });

  it("omits the caption when the caller gives no text", () => {
    const mark = buildReferenceLine({ y: 40, x1: 0, x2: 180 });
    expect(mark.caption).toBeNull();
  });

  it("anchors the caption at the right end, inset by the default 4px", () => {
    const mark = buildReferenceLine({ y: 40, x1: 0, x2: 180, caption: "avg" });
    expect(mark.caption).toEqual({
      x: 176,
      y: 36,
      text: "avg",
      textAnchor: "end",
    });
  });

  it("honours an explicit caption inset", () => {
    const mark = buildReferenceLine({
      y: 40,
      x1: 0,
      x2: 180,
      caption: "avg",
      captionInset: 10,
    });
    expect(mark.caption).toEqual({
      x: 170,
      y: 30,
      text: "avg",
      textAnchor: "end",
    });
  });

  it("is pure: same geometry in, same mark out", () => {
    const geometry = { y: 12, x1: 3, x2: 97, caption: "x" };
    expect(buildReferenceLine(geometry)).toEqual(buildReferenceLine(geometry));
  });

  it("does arithmetic on whatever pixel space it is given — plot-local or frame-absolute", () => {
    // A ScrubChart adapter's x1/x2 start at plotLeft, not 0. The core does
    // not care: it only reads the numbers it is handed.
    const mark = buildReferenceLine({ y: 40, x1: 56, x2: 400, caption: "x" });
    expect(mark.line).toEqual({ x1: 56, x2: 400, y1: 40, y2: 40 });
    expect(mark.caption).toEqual({
      x: 396,
      y: 36,
      text: "x",
      textAnchor: "end",
    });
  });
});
