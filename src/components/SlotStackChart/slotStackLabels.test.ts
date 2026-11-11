import { describe, expect, it } from "vitest";
import {
  type SlotBox,
  type SlotStackSeries,
  type SlotStackSlot,
  layoutSlots,
  placeSlots,
} from "./slotStackGeometry";
import {
  type LabelRect,
  type SlotLabel,
  labelledPeriods,
  placeSlotLabels,
  spreadCentres,
} from "./slotStackLabels";

const slot = (
  period: number,
  expected: number,
  filled: number,
  unfilled: number,
  overflow: number,
): SlotStackSlot => ({ period, expected, filled, unfilled, overflow });
const one = (id: string, ...slots: SlotStackSlot[]): SlotStackSeries => ({ id, label: id, slots });
const money = (v: number): string => `$${v}k`;

/** A plot of `width` x `height` at (50, 20) holding `periods` columns up to `top`. */
const stage = (width: number, height: number, periods: number, top: number, band = 0.45) => {
  const plot: LabelRect = { x: 50, y: 20, width, height };
  const per = width / periods;
  const xs = (v: number): number => plot.x + (v + 0.5) * per;
  const ys = (v: number): number => plot.y + height - (v / top) * height;
  const boxesOf = (series: readonly SlotStackSeries[]): readonly SlotBox[] =>
    layoutSlots(placeSlots(series), xs, ys, { band, gap: 2, thin: 1.5 });
  const labelsOf = (series: readonly SlotStackSeries[], only?: number): readonly SlotLabel[] => {
    const all = boxesOf(series);
    const labelled = only === undefined ? all : all.filter((b) => b.placed.slot.period === only);
    return placeSlotLabels(labelled, all, { plot, format: money });
  };
  return { plot, boxesOf, labelsOf };
};

const overlap = (a: LabelRect, b: LabelRect): boolean =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/** The three things no label may do. */
const sound = (labels: readonly SlotLabel[], boxes: readonly SlotBox[], plot: LabelRect): string[] => {
  const faults: string[] = [];
  labels.forEach((a, i) => {
    labels.slice(i + 1).forEach((b) => {
      if (overlap(a.box, b.box)) faults.push(`${a.text} overlaps ${b.text}`);
    });
    if (a.box.x < plot.x || a.box.x + a.box.width > plot.x + plot.width) faults.push(`${a.text} leaves the plot sideways`);
    if (a.box.y < plot.y || a.box.y + a.box.height > plot.y + plot.height) faults.push(`${a.text} leaves the plot vertically`);
    if (a.side !== null && !a.over)
      for (const other of boxes)
        if (other.placed.slot.period !== a.period) {
          const column = { x: other.x, y: plot.y, width: other.width, height: plot.height };
          if (overlap(a.box, column)) faults.push(`${a.text} reaches into column ${other.placed.slot.period}`);
        }
  });
  return faults;
};

const brief = (labels: readonly SlotLabel[]) => labels.map((l) => [l.text, l.kind, l.side, l.tone]);

describe("labelledPeriods", () => {
  it("labels the hovered column, every column, or none", () => {
    expect([0, 1, 2].filter(labelledPeriods("hover", 1))).toEqual([1]);
    expect([0, 1, 2].filter(labelledPeriods("hover", null))).toEqual([]);
    expect([0, 1, 2].filter(labelledPeriods("always", null))).toEqual([0, 1, 2]);
    expect([0, 1, 2].filter(labelledPeriods("never", 1))).toEqual([]);
  });
});

describe("placeSlotLabels: nested when the part can hold its amount", () => {
  /* 600 x 200 plot, six 100px periods, 44px columns, 1k = 2px. */
  const { plot, boxesOf, labelsOf } = stage(600, 200, 6, 100);

  it("nests a tall, wide part: dark on solid, light inside the dashed rest, signed", () => {
    const labels = labelsOf([one("a", slot(0, 60, 48, 12, 0))]);
    expect(brief(labels)).toEqual([
      ["−$12k", "nested", null, "on-open"],
      ["$48k", "nested", null, "on-solid"],
    ]);
    // Centred on the column (78..122) and on its own part.
    expect(labels.map((l) => [l.x, l.anchor, l.chip, l.leader])).toEqual([
      [100, "middle", null, null],
      [100, "middle", null, null],
    ]);
  });

  it("an empty container states its expectation plainly: no minus", () => {
    expect(brief(labelsOf([one("a", slot(0, 75, 0, 75, 0))]))).toEqual([["$75k", "nested", null, "on-open"]]);
  });

  it("a nested overflow is light figures on a chip, with a plus", () => {
    const [over] = labelsOf([one("a", slot(0, 65, 65, 0, 14))]);
    expect([over.text, over.kind, over.tone]).toEqual(["+$14k", "nested", "on-stripes"]);
    // The chip is the text plus 4px each side, one line tall.
    expect(over.chip).toEqual({ x: over.box.x - 4, y: over.box.y, width: over.box.width + 8, height: 13 });
  });

  it("a part under 15px tall, or narrower than its text plus 8px, takes a callout", () => {
    // 14px tall (7k): too short. "$58.5k" is 39px + 8 > 44px: too wide.
    expect(brief(labelsOf([one("a", slot(0, 7, 7, 0, 0))]))).toEqual([["$7k", "callout", "right", "callout"]]);
    expect(brief(labelsOf([one("a", slot(0, 58.5, 58.5, 0, 0))]))).toEqual([
      ["$58.5k", "callout", "right", "callout"],
    ]);
    // 15px tall (7.5k) is enough.
    expect(labelsOf([one("a", slot(0, 7.5, 7.5, 0, 0))])[0].kind).toBe("nested");
  });

  it("labels a status split part by part", () => {
    const labels = labelsOf([
      one("a", { ...slot(0, 60, 60, 0, 0), filledByClass: { invoiced: 30, confirmed: 20, planned: 10 } }),
    ]);
    expect(brief(labels)).toEqual([
      ["$10k", "nested", null, "on-open"],
      ["$20k", "nested", null, "on-open"],
      ["$30k", "nested", null, "on-solid"],
    ]);
  });

  it("stress: a $1.2k overflow on a $60k column gets a callout with a leader from the sliver", () => {
    const series = [one("a", slot(0, 60, 60, 0, 1.2), slot(1, 40, 40, 0, 0))];
    const labels = labelsOf(series, 0);
    expect(brief(labels)).toEqual([
      ["$60k", "nested", null, "on-solid"],
      ["+$1.2k", "callout", "right", "callout"],
    ]);
    const callout = labels[1];
    // The text starts 10px right of the column (edge 122) and stays clear of column 1 (from 178).
    expect([callout.x, callout.anchor]).toEqual([132, "start"]);
    expect(callout.box.x + callout.box.width).toBeLessThanOrEqual(176);
    // The leader leaves the column at the sliver's own height.
    expect(callout.leader?.startsWith("123,")).toBe(true);
    expect(sound(labels, boxesOf(series), plot)).toEqual([]);
  });

  it("stress: three thin slivers in one column fan out a line apart, in order, never overlapping", () => {
    // $40k solid, then +$1.2k, a $3k fill under a $9k gap, and a $2k type on top.
    const series = [
      one("r", slot(2, 40, 40, 0, 1.2)),
      one("c", slot(2, 12, 3, 9, 0)),
      one("d", slot(2, 2, 2, 0, 0)),
    ];
    const labels = labelsOf(series);
    // Nested first (top part first), then the callouts, top part first.
    expect(brief(labels)).toEqual([
      ["−$9k", "nested", null, "on-open"],
      ["$40k", "nested", null, "on-solid"],
      ["$2k", "callout", "right", "callout"],
      ["$3k", "callout", "right", "callout"],
      ["+$1.2k", "callout", "right", "callout"],
    ]);
    const centres = labels.filter((l) => l.kind === "callout").map((l) => l.box.y);
    expect(centres[1] - centres[0]).toBeGreaterThanOrEqual(13);
    expect(centres[2] - centres[1]).toBeGreaterThanOrEqual(13);
    expect(sound(labels, boxesOf(series), plot)).toEqual([]);
  });

  it("stress: the last column, at the plot's right edge, flips its callouts to the left", () => {
    const series = [one("a", slot(4, 40, 40, 0, 0), slot(5, 60, 60, 0, 1.2))];
    const labels = labelsOf(series, 5);
    const callout = labels.find((l) => l.kind === "callout");
    expect([callout?.side, callout?.anchor, callout?.text]).toEqual(["left", "end", "+$1.2k"]);
    // 10px left of the column's left edge (578), and clear of column 4 (ends 522).
    expect(callout?.x).toBe(568);
    expect(callout?.box.x).toBeGreaterThanOrEqual(524);
    expect(callout?.leader?.startsWith("577,")).toBe(true);
    expect(sound(labels, boxesOf(series), plot)).toEqual([]);
  });

  it("with every column labelled, a gap already taken by the column before is not a gap", () => {
    // Column 4's sliver calls out to the right, into the gap. Column 5 (the
    // last) finds that gap taken and no room at the plot edge, so its
    // callout goes over its neighbour, on a chip, and still clear of
    // column 4's own figure.
    const series = [one("a", slot(4, 40, 40, 0, 1.2), slot(5, 60, 60, 0, 1.2))];
    const labels = labelsOf(series);
    expect(labels.filter((l) => l.kind === "callout").map((l) => [l.period, l.side, l.over, l.chip !== null])).toEqual([
      [4, "right", false, false],
      [5, "left", true, true],
    ]);
    expect(sound(labels, boxesOf(series), plot)).toEqual([]);
  });

  it("keeps a floor callout inside the plot: pushed up from the baseline", () => {
    const labels = labelsOf([one("a", slot(0, 1, 1, 0, 0)), one("b", slot(0, 1, 1, 0, 0))]);
    expect(labels.map((l) => l.kind)).toEqual(["callout", "callout"]);
    expect(sound(labels, [], plot)).toEqual([]);
  });
});

describe("placeSlotLabels, stress: a 130px plot with narrow columns", () => {
  /* The panel's real size: a 252 x 108 plot, six 42px periods, 26px columns
     (band 0.62) with 16px gaps: no callout fits beside a column. */
  const { plot, boxesOf, labelsOf } = stage(252, 108, 6, 120, 0.62);
  const RUN = [
    one("r", slot(0, 30, 30, 0, 0), slot(1, 40, 28, 12, 0), slot(2, 40, 40, 0, 15), slot(3, 35, 35, 0, 0), slot(5, 40, 0, 40, 0)),
    one("c", slot(0, 20, 20, 0, 0), slot(1, 20, 20, 0, 0), slot(2, 30, 18, 12, 0), slot(5, 20, 0, 20, 0)),
    one("d", slot(0, 10, 10, 0, 0), slot(1, 10, 10, 0, 4), slot(2, 20, 20, 0, 0), slot(5, 25, 0, 25, 0)),
  ];

  it("lays the hovered column's amounts over its neighbours, on chips, and never over the column itself", () => {
    const labels = labelsOf(RUN, 2);
    // 26px columns hold no 26px text plus 8px, so nothing nests; and no 16px
    // gap holds a callout, so every amount is a callout over the neighbours.
    expect(brief(labels).filter((l) => l[1] !== "callout" || l[2] !== "right")).toEqual([]);
    expect(labels.every((l) => l.over && l.chip !== null && l.leader !== null)).toBe(true);
    expect(labels.map((l) => l.text)).toEqual(["$20k", "−$12k", "$18k", "+$15k", "$40k"]);
    // A line apart, top part first.
    const tops = labels.map((l) => l.box.y);
    expect(tops.slice(1).every((y, i) => y - tops[i] >= 13)).toBe(true);
    // The column's own parts stay in view: no figure or chip covers them.
    const column = boxesOf(RUN).filter((b) => b.placed.slot.period === 2)[0];
    for (const l of labels) expect(l.chip?.x).toBeGreaterThanOrEqual(column.x + column.width);
    expect(sound(labels, boxesOf(RUN), plot)).toEqual([]);
  });

  it("holds every column's amounts inside the plot: the last column's go to the left", () => {
    for (const period of [0, 1, 2, 3, 5]) expect(sound(labelsOf(RUN, period), boxesOf(RUN), plot)).toEqual([]);
    expect(new Set(labelsOf(RUN, 5).map((l) => l.side))).toEqual(new Set(["left"]));
  });

  it("uses an empty neighbouring column's room: May holds nothing, so April's amounts go beside it", () => {
    const labels = labelsOf(RUN, 3);
    expect(brief(labels)).toEqual([["$35k", "callout", "right", "callout"]]);
    expect(sound(labels, boxesOf(RUN), plot)).toEqual([]);
  });
});

describe("spreadCentres", () => {
  it("leaves room-y centres alone, pushes crowded ones down, then back up off the floor", () => {
    expect(spreadCentres([40, 80, 120], 0, 200)).toEqual([40, 80, 120]);
    expect(spreadCentres([50, 52, 54], 0, 200)).toEqual([50, 63, 76]);
    expect(spreadCentres([190, 195, 199], 0, 200)).toEqual([167.5, 180.5, 193.5]);
    expect(spreadCentres([2], 0, 200)).toEqual([6.5]);
  });
});
