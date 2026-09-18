import { describe, expect, it } from "vitest";
import { every, filter, map, sum } from "../../fn";
import { linearScale } from "./scales";
import {
  type StackSegment,
  type StackedBand,
  type StackedSeries,
  buildStackedArea,
  stackSegments,
  transitionWidth,
} from "./stackedArea";

// The showcase fixture, so the printed table IS the picture in the gallery:
// three step series over a year (months as the x unit), one of them dropping
// to zero part-way.
const DOMAIN: readonly [number, number] = [0, 12];
const FIXTURE: readonly StackedSeries[] = [
  {
    id: "a",
    label: "A",
    points: [
      { at: 0, value: 12 },
      { at: 3, value: 18 },
      { at: 8, value: 14 },
    ],
  },
  {
    id: "b",
    label: "B",
    points: [
      { at: 0, value: 8 },
      { at: 5, value: 8 },
      { at: 8, value: 16 },
    ],
  },
  {
    id: "c",
    label: "C",
    points: [
      { at: 0, value: 6 },
      { at: 5, value: 0 },
      { at: 9, value: 9 },
    ],
  },
];

const X = linearScale(DOMAIN, [0, 600]);
const Y = linearScale([0, 50], [300, 0]);
const geometryOf = (
  series: readonly StackedSeries[] = FIXTURE,
  curve: "smoothStep" | "linear" = "smoothStep",
) => buildStackedArea(series, X, Y, DOMAIN, curve);

const round = (n: number): number => Math.round(n * 100) / 100;

describe("stackSegments", () => {
  it("cuts one segment per stretch where every series holds one value", () => {
    const segments = stackSegments(FIXTURE, DOMAIN);
    expect(map((s: StackSegment) => s.from, segments)).toEqual([0, 3, 5, 8, 9]);
    expect(segments[segments.length - 1].to).toBe(12);
  });

  it("sums exactly — the top level IS the total, at every segment", () => {
    for (const segment of stackSegments(FIXTURE, DOMAIN)) {
      expect(segment.levels[0]).toBe(0);
      expect(segment.levels[segment.levels.length - 1]).toBe(
        sum(segment.values),
      );
      // Each level is its band's own floor plus its own value.
      for (const [index, value] of segment.values.entries()) {
        expect(segment.levels[index + 1] - segment.levels[index]).toBe(value);
      }
    }
  });

  it("never lets one band overlap the next — levels ascend", () => {
    for (const segment of stackSegments(FIXTURE, DOMAIN)) {
      for (let index = 1; index < segment.levels.length; index += 1) {
        expect(segment.levels[index]).toBeGreaterThanOrEqual(
          segment.levels[index - 1],
        );
      }
    }
  });

  it("holds a value forward and contributes nothing before the first point", () => {
    const late: StackedSeries[] = [
      { id: "late", points: [{ at: 6, value: 5 }] },
    ];
    const segments = stackSegments(late, DOMAIN);
    expect(map((s: StackSegment) => s.values[0], segments)).toEqual([0, 5]);
  });

  it("is empty for no series and for a collapsed domain", () => {
    expect(stackSegments([], DOMAIN)).toEqual([]);
    expect(stackSegments(FIXTURE, [4, 4])).toEqual([]);
  });
});

describe("buildStackedArea", () => {
  it("collapses a series at zero onto a shared edge, leaving the stack whole", () => {
    const segments = geometryOf().segments;
    const dropped = filter((s: StackSegment) => s.from === 5, segments)[0];
    expect(dropped.values[2]).toBe(0);
    // The collapsed band's floor and top are the same level: zero area.
    expect(dropped.levels[3]).toBe(dropped.levels[2]);
    // …and the total is still the sum of what is left.
    expect(dropped.levels[3]).toBe(sum(dropped.values));
  });

  it("shares every transition point between two adjacent bands", () => {
    const geometry = geometryOf();
    // Band k's top edge IS band k+1's floor — one array, built once, so two
    // neighbours cannot disagree about where they meet.
    for (let index = 0; index < geometry.bands.length - 1; index += 1) {
      expect(geometry.bands[index + 1].floor).toBe(geometry.bands[index].edge);
      expect(geometry.bands[index + 1].floor).not.toBe("");
    }
  });

  it("puts the total top edge exactly on the highest band's edge", () => {
    const geometry = geometryOf();
    expect(geometry.totalEdge).toBe(
      geometry.bands[geometry.bands.length - 1].edge,
    );
  });

  it("curves a change with a cubic, and lands it square when linear", () => {
    expect(geometryOf().bands[0].path).toContain("C ");
    expect(geometryOf(FIXTURE, "linear").bands[0].path).not.toContain("C ");
  });

  it("clamps the transition to the plot's own width", () => {
    expect(transitionWidth(600)).toBe(28);
    expect(transitionWidth(100)).toBe(10);
    expect(transitionWidth(400)).toBe(20);
  });

  it("is NaN-free, in every path it emits", () => {
    const geometry = geometryOf();
    const paths = [
      geometry.totalEdge,
      ...map((band: StackedBand) => band.path, geometry.bands),
      ...map((band: StackedBand) => band.edge, geometry.bands),
    ];
    expect(every((path: string) => !path.includes("NaN"), paths)).toBe(true);
    expect(
      every((path: string) => !path.includes("Infinity"), paths),
    ).toBe(true);
  });

  it("draws nothing for no series", () => {
    const geometry = buildStackedArea([], X, Y, DOMAIN);
    expect(geometry.bands).toEqual([]);
    expect(geometry.totalEdge).toBe("");
  });

  it("prints the table a reader checks the shape against", () => {
    const geometry = geometryOf();
    console.table(
      map(
        (segment: StackSegment) => ({
          from: segment.from,
          to: segment.to,
          A: segment.values[0],
          B: segment.values[1],
          C: segment.values[2],
          total: sum(segment.values),
          topPx: round(Y(segment.levels[3])),
        }),
        geometry.segments,
      ),
    );
    console.table([{ field: "transition px", value: geometry.transition }]);
    console.table(
      map(
        (band: StackedBand) => ({
          band: band.id,
          slot: band.index + 1,
          edgeStart: band.edge.slice(0, 22),
          pathLength: band.path.length,
        }),
        geometry.bands,
      ),
    );
    expect(geometry.bands).toHaveLength(3);
  });
});
