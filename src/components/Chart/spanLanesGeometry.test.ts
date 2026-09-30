import { describe, expect, it } from "vitest";
import { layoutSpans, packSpans, spanExtent, spanRowCount } from "./spanLanesGeometry";

const span = (id: string, ...segs: [number, number, string][]) => ({
  id,
  segments: segs.map(([start, end, kind]) => ({ start, end, kind })),
});

describe("spanExtent", () => {
  it("runs from the earliest segment start to the latest segment end", () => {
    expect(
      spanExtent(span("a", [5, 8, "work"], [2, 4, "work"], [8, 11, "wait"])),
    ).toEqual({ start: 2, end: 11 });
  });

  it("is null for a span with no segments", () => {
    expect(spanExtent(span("a"))).toBeNull();
  });
});

describe("packSpans", () => {
  it("puts spans that do not overlap on one row, and opens a row only for an overlap", () => {
    const packed = packSpans([
      span("a", [0, 4, "w"]),
      span("b", [4, 7, "w"]), // touches a: shares its row
      span("c", [2, 6, "w"]), // overlaps a and b
      span("d", [7, 9, "w"]),
    ]);
    expect(Object.fromEntries(packed.map((p) => [p.datum.id, p.row]))).toEqual({
      a: 0,
      b: 0,
      c: 1,
      d: 0,
    });
  });

  it("orders by start, then by end, so the result does not depend on input order", () => {
    const a = packSpans([span("x", [3, 5, "w"]), span("y", [0, 2, "w"])]);
    expect(a.map((p) => p.datum.id)).toEqual(["y", "x"]);
  });

  it("skips spans with no segments", () => {
    expect(
      packSpans([span("empty"), span("a", [0, 1, "w"])]).map((p) => p.datum.id),
    ).toEqual(["a"]);
  });
});

describe("spanRowCount", () => {
  it("counts the rows the packing needs, at least one", () => {
    expect(spanRowCount([span("a", [0, 4, "w"]), span("c", [2, 6, "w"])])).toBe(
      2,
    );
    expect(spanRowCount([])).toBe(1);
  });
});

describe("layoutSpans", () => {
  const x = (v: number) => v * 10; // 1 data unit = 10px

  it("boxes each span on its row and lays its segments as fractions of the box", () => {
    const [a] = layoutSpans(
      packSpans([span("a", [0, 4, "work"], [4, 5, "wait"], [5, 10, "work"])]),
      x,
      {
        rowHeight: 30,
        barHeight: 0.8,
      },
    );
    expect(a.box).toEqual({ x: 0, y: 3, width: 100, height: 24 });
    expect(a.segments.map((s) => [s.from, s.to, s.segment.kind])).toEqual([
      [0, 0.4, "work"],
      [0.4, 0.5, "wait"],
      [0.5, 1, "work"],
    ]);
  });

  it("places the second row one row height down", () => {
    const out = layoutSpans(
      packSpans([span("a", [0, 4, "w"]), span("b", [2, 6, "w"])]),
      x,
      { rowHeight: 30, barHeight: 0.8 },
    );
    expect(out.find((o) => o.datum.id === "b")?.box.y).toBe(33);
  });

  it("keeps a zero-length span at least one unit wide", () => {
    const [a] = layoutSpans(packSpans([span("a", [3, 3, "w"])]), x, {
      rowHeight: 30,
      barHeight: 0.8,
    });
    expect(a.box.width).toBe(1);
  });
});
