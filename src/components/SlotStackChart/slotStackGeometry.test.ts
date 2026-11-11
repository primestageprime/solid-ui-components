import { describe, expect, it } from "vitest";
import {
  type SlotStackSeries,
  type SlotStackSlot,
  SLOT_STACK_TOTAL_INDEX,
  SLOT_STACK_WORDS,
  hoveredPeriod,
  layoutSlots,
  placeSlots,
  slotPartTitle,
  slotStackAxisTo,
  slotStackChrome,
  slotStackRows,
  slotStackTallest,
  visibleSlots,
} from "./slotStackGeometry";

const slot = (
  period: number,
  expected: number,
  filled: number,
  unfilled: number,
  overflow: number,
): SlotStackSlot => ({ period, expected, filled, unfilled, overflow });

const one = (id: string, ...slots: SlotStackSlot[]): SlotStackSeries => ({
  id,
  label: id,
  slots,
});

/* The mockup's mixed March (scenario 5, treatment B): Remodels $15k over,
   Cabinets $12k under, Deck Builds on target. */
const MARCH: readonly SlotStackSeries[] = [
  one("Remodels", slot(0, 40, 40, 0, 15)),
  one("Cabinets", slot(0, 30, 18, 12, 0)),
  one("Deck Builds", slot(0, 20, 20, 0, 0)),
];

/* 1 data unit = 100px across, 1 value = 2px up from y 300. */
const xs = (v: number): number => 100 + v * 100;
const ys = (v: number): number => 300 - v * 2;
const OPTIONS = { band: 0.6, gap: 2, thin: 1.5 };
const boxes = (series: readonly SlotStackSeries[]) =>
  layoutSlots(placeSlots(series), xs, ys, OPTIONS);

describe("placeSlots", () => {
  it("stacks a column's slots in series order, each as tall as its three parts", () => {
    expect(slotStackRows(MARCH)).toEqual([
      { series: "Remodels", period: 0, expected: 40, filled: 40, unfilled: 0, overflow: 15, base: 0, top: 55 },
      { series: "Cabinets", period: 0, expected: 30, filled: 18, unfilled: 12, overflow: 0, base: 55, top: 85 },
      { series: "Deck Builds", period: 0, expected: 20, filled: 20, unfilled: 0, overflow: 0, base: 85, top: 105 },
    ]);
    expect(slotStackTallest(MARCH)).toBe(105);
  });

  it("states where the fill and the container end inside the slot", () => {
    const [remodels, cabinets] = placeSlots(MARCH);
    expect([remodels.fillTop, remodels.expectedTop, remodels.top]).toEqual([40, 40, 55]);
    expect([cabinets.fillTop, cabinets.expectedTop, cabinets.top]).toEqual([73, 85, 85]);
  });

  it("keeps each period its own column and leaves an empty slot out", () => {
    const placed = placeSlots([
      one("a", slot(0, 10, 10, 0, 0), slot(1, 0, 0, 0, 0)),
      one("b", slot(0, 5, 0, 5, 0), slot(1, 8, 0, 8, 0)),
    ]);
    expect(placed.map((p) => [p.seriesId, p.slot.period, p.base, p.top, p.last])).toEqual([
      ["a", 0, 0, 10, false],
      ["b", 0, 10, 15, true],
      ["b", 1, 0, 8, true],
    ]);
  });

  it("holds nothing for no data", () => {
    expect(placeSlots([])).toEqual([]);
    expect(slotStackTallest([])).toBe(0);
  });
});

describe("layoutSlots", () => {
  it("lands every edge on a whole pixel and leaves ground between slots", () => {
    const [remodels, cabinets, decks] = boxes(MARCH);
    // period 0 spans 50..150px; 60% band leaves a 20px inset each side.
    expect([remodels.x, remodels.width]).toEqual([70, 60]);
    // Remodels: floor 300, container top 220, overflow top 190 + 2px gap.
    expect([remodels.bottom, remodels.fillTop, remodels.expectedTop, remodels.top]).toEqual([300, 220, 220, 192]);
    // Cabinets: floor 190, fill top 154, container top 130 + 2px gap.
    expect([cabinets.bottom, cabinets.fillTop, cabinets.expectedTop, cabinets.top]).toEqual([190, 154, 132, 132]);
    // The column's last slot keeps its top.
    expect([decks.bottom, decks.top]).toEqual([130, 90]);
  });

  it("an empty container is a dashed outline all the way round", () => {
    const [empty] = boxes([one("a", slot(0, 40, 0, 40, 0))]);
    expect(empty.fills).toEqual([]);
    expect(empty.solid).toBeNull();
    // Nothing fills it, so there is no fill to open onto: it closes (Z).
    expect(empty.dashed).toBe("M70.75 220.75V299.25H129.25V220.75Z");
  });

  it("a part-filled container: solid sides and floor, dashed sides and top, no line where the fill ends", () => {
    const [part] = boxes([one("a", slot(0, 40, 28, 12, 0))]);
    expect(part.fills).toEqual([
      { part: "filled", status: null, paint: "solid", value: 28, y: 244, height: 56 },
    ]);
    expect(part.solid).toBe("M70.75 244V299.25H129.25V244");
    expect(part.dashed).toBe("M70.75 244V220.75H129.25V244");
  });

  it("a full container closes its solid border and draws no dash", () => {
    const [full] = boxes([one("a", slot(0, 40, 40, 0, 0))]);
    expect(full.solid).toBe("M70.75 220.75V299.25H129.25V220.75Z");
    expect(full.dashed).toBeNull();
  });

  it("overflow continues the container: no line at the join and no border of its own", () => {
    const [over] = boxes([one("a", slot(0, 40, 40, 0, 12))]);
    expect(over.fills).toEqual([
      { part: "filled", status: null, paint: "solid", value: 40, y: 220, height: 80 },
      { part: "overflow", status: null, paint: "hatch", value: 12, y: 196, height: 24 },
    ]);
    // The fill's border stays open at the top, where the stripes begin.
    expect(over.solid).toBe("M70.75 220V299.25H129.25V220");
    expect(over.dashed).toBeNull();
    // The box states two border paths and no third: nothing outlines stripes.
    expect(Object.keys(over).filter((k) => !["placed", "fills"].includes(k)).sort()).toEqual(
      ["bottom", "dashed", "expectedTop", "fillTop", "solid", "top", "width", "x"],
    );
  });

  it("money with no expectation is all overflow: stripes from the floor, no path at all", () => {
    const [late] = boxes([one("a", slot(0, 0, 0, 0, 46))]);
    expect(late.fills.map((f) => [f.paint, f.y, f.height])).toEqual([["hatch", 208, 92]]);
    expect(late.solid).toBeNull();
    expect(late.dashed).toBeNull();
  });

  it("splits a part by status, bottom-up, and paints what the split leaves as the plain part", () => {
    const [split] = boxes([
      one("a", {
        ...slot(0, 40, 30, 10, 20),
        filledByClass: { invoiced: 10, confirmed: 10, planned: 5 },
        overflowByClass: { invoiced: 0, confirmed: 20, planned: 0 },
      }),
    ]);
    expect(split.fills.map((f) => [f.part, f.status, f.paint, f.value, f.y, f.height])).toEqual([
      ["filled", "invoiced", "solid", 10, 280, 20],
      ["filled", "confirmed", "tint", 10, 260, 20],
      ["filled", "planned", "light", 5, 250, 10],
      ["filled", null, "solid", 5, 240, 10],
      ["overflow", "confirmed", "hatch-tint", 20, 180, 40],
    ]);
  });

  it("never lets a status split leave its part", () => {
    const [split] = boxes([
      one("a", {
        ...slot(0, 20, 20, 0, 0),
        filledByClass: { invoiced: 15, confirmed: 15, planned: 15 },
      }),
    ]);
    expect(split.fills.map((f) => [f.status, f.y, f.height])).toEqual([
      ["invoiced", 270, 30],
      ["confirmed", 260, 10],
    ]);
  });

  it("keeps a sliver of a slot one pixel tall", () => {
    const [sliver] = boxes([one("a", slot(0, 0.1, 0.1, 0, 0))]);
    expect(sliver.bottom - sliver.top).toBe(1);
  });
});

describe("visibleSlots: a column is its total, or its series", () => {
  /* Two months. March is the mixed column: per type it stacks to 105, while
     its own two values (expected 90, actual 93) stand 93 tall. April is
     expectation only. */
  const SERIES: readonly SlotStackSeries[] = [
    one("Remodels", slot(0, 40, 40, 0, 15), slot(1, 35, 0, 35, 0)),
    one("Cabinets", slot(0, 30, 18, 12, 0), slot(1, 30, 0, 30, 0)),
    one("Deck Builds", slot(0, 20, 20, 0, 0)),
  ];
  const TOTALS = [slot(0, 90, 90, 0, 3), slot(1, 65, 0, 65, 0)];
  const shown = (...args: Parameters<typeof visibleSlots>) =>
    visibleSlots(...args).map((p) => [p.seriesLabel, p.seriesIndex, p.slot.period, p.base, p.top]);

  it("at rest every column is ONE slot: its own expected and actual, with no series", () => {
    expect(shown(SERIES, TOTALS, "hover", null, "Total")).toEqual([
      ["Total", SLOT_STACK_TOTAL_INDEX, 0, 0, 93],
      ["Total", SLOT_STACK_TOTAL_INDEX, 1, 0, 65],
    ]);
  });

  it("the hovered column, and only it, is its per-series slots; its height is not held", () => {
    expect(shown(SERIES, TOTALS, "hover", 0, "Total")).toEqual([
      ["Remodels", 0, 0, 0, 55],
      ["Cabinets", 1, 0, 55, 85],
      ["Deck Builds", 2, 0, 85, 105],
      ["Total", SLOT_STACK_TOTAL_INDEX, 1, 0, 65],
    ]);
  });

  it("expand 'never' ignores the pointer; 'always' ignores the totals", () => {
    expect(shown(SERIES, TOTALS, "never", 0, "Total")).toEqual(shown(SERIES, TOTALS, "hover", null, "Total"));
    expect(visibleSlots(SERIES, TOTALS, "always", null, "Total")).toEqual(placeSlots(SERIES));
  });

  it("with no totals there is one state: every column is its series, whatever expand says", () => {
    for (const expand of ["hover", "never", "always"] as const)
      expect(visibleSlots(SERIES, undefined, expand, null, "Total")).toEqual(placeSlots(SERIES));
  });

  it("the axis holds the taller of the two states, so only the bar moves", () => {
    expect(slotStackTallest(SERIES)).toBe(105);
    expect(slotStackTallest(SERIES, TOTALS)).toBe(105);
    expect(slotStackTallest(SERIES, [slot(0, 90, 90, 0, 40)])).toBe(130);
  });

  it("the table states both: the series' slots, then each column's total", () => {
    expect(slotStackRows(SERIES, TOTALS).map((r) => [r.series, r.period, r.top])).toEqual([
      ["Remodels", 0, 55],
      ["Remodels", 1, 35],
      ["Cabinets", 0, 85],
      ["Cabinets", 1, 65],
      ["Deck Builds", 0, 105],
      ["Total", 0, 93],
      ["Total", 1, 65],
    ]);
  });
});

describe("hoveredPeriod", () => {
  it("is the period whose band holds the pointer, or none", () => {
    expect(hoveredPeriod(null, [0, 1, 2])).toBeNull();
    expect(hoveredPeriod(0.49, [0, 1, 2])).toBe(0);
    expect(hoveredPeriod(0.51, [0, 1, 2])).toBe(1);
    expect(hoveredPeriod(-0.4, [0, 1, 2])).toBe(0);
    expect(hoveredPeriod(3.2, [0, 1, 2])).toBeNull();
  });
});

describe("slotPartTitle", () => {
  const [, cabinets] = placeSlots(MARCH);
  const [remodels] = placeSlots(MARCH);
  const label = () => "Mar";
  const money = (v: number) => `$${v}k`;

  it("names the series, the period, the amount and the expectation", () => {
    expect(slotPartTitle(cabinets, "filled", 18, null, label, money, SLOT_STACK_WORDS)).toBe(
      "Cabinets · Mar: $18k filled ($30k expected)",
    );
    expect(slotPartTitle(cabinets, "unfilled", 12, null, label, money, SLOT_STACK_WORDS)).toBe(
      "Cabinets · Mar: $12k not yet filled ($30k expected)",
    );
    expect(slotPartTitle(remodels, "overflow", 15, null, label, money, SLOT_STACK_WORDS)).toBe(
      "Remodels · Mar: $15k above expected",
    );
  });

  it("adds the status, in the caller's words", () => {
    const words = { ...SLOT_STACK_WORDS, filled: "arrived", confirmed: "signed" };
    expect(slotPartTitle(cabinets, "filled", 8, "confirmed", label, money, words)).toBe(
      "Cabinets · Mar: $8k arrived, signed ($30k expected)",
    );
  });
});

describe("slotStackAxisTo: an exact top", () => {
  it("ends the axis exactly at the top, ticking the round steps that fit under it", () => {
    const rows = [26000, 680000, 10, 24, 5, 4, 1.5, 30000].map((top) => {
      const axis = slotStackAxisTo(top);
      return [top, axis.top, axis.ticks];
    });
    expect(rows).toEqual([
      [26000, 26000, [0, 10000, 20000]],
      [680000, 680000, [0, 200000, 400000, 600000]],
      [10, 10, [0, 5, 10]],
      [24, 24, [0, 10, 20]],
      [5, 5, [0, 2, 4]],
      [4, 4, [0, 1, 2, 3, 4]],
      [1.5, 1.5, [0, 0.5, 1, 1.5]],
      [30000, 30000, [0, 10000, 20000, 30000]],
    ]);
  });

  it("gives an empty or negative top the unit axis", () => {
    expect(slotStackAxisTo(0)).toEqual({ top: 1, ticks: [0, 1] });
    expect(slotStackAxisTo(-5)).toEqual({ top: 1, ticks: [0, 1] });
  });

  it("keeps the grid on the labels' own steps when the top is not a multiple", () => {
    // 26,000 over 10,000s: three grid steps (the last a part one), not two.
    const chrome = slotStackChrome({ width: 560, height: 300 }, slotStackAxisTo(26000), 6);
    expect([chrome.yTicks, chrome.gridSteps]).toEqual([[0, 10000, 20000], 3]);
    expect(slotStackChrome({ width: 560, height: 300 }, slotStackAxisTo(30000), 6).gridSteps).toBe(3);
  });
});

describe("slotStackChrome", () => {
  const axis = { top: 120, ticks: [0, 40, 80, 120] };

  it("a full-size box keeps the axis's ticks and every label", () => {
    const chrome = slotStackChrome({ width: 560, height: 300 }, axis, 12);
    expect([chrome.short, chrome.narrow, chrome.xLabelStep]).toEqual([false, false, 1]);
    expect(chrome.yTicks).toEqual([0, 40, 80, 120]);
  });

  it("a small panel keeps four y labels, with a tighter inset", () => {
    const chrome = slotStackChrome({ width: 300, height: 130 }, axis, 6);
    expect(chrome.yTicks).toEqual([0, 40, 80, 120]);
    expect([chrome.xLabelStep, chrome.margin.left]).toEqual([1, 44]);
  });

  it("a small panel with more than four y labels keeps every other one, on the grid's own steps", () => {
    const six = { top: 100, ticks: [0, 20, 40, 60, 80, 100] };
    const chrome = slotStackChrome({ width: 300, height: 130 }, six, 6);
    expect(chrome.yTicks).toEqual([0, 40, 80]);
    expect(chrome.gridSteps).toBe(5);
    expect(slotStackChrome({ width: 560, height: 300 }, six, 6).yTicks).toEqual(six.ticks);
  });

  it("thins the period labels only when a narrow box holds more than six", () => {
    expect(slotStackChrome({ width: 300, height: 130 }, axis, 12).xLabelStep).toBe(2);
  });

  it("lets the caller's margin win, field by field", () => {
    expect(slotStackChrome({ width: 560, height: 300 }, axis, 6, { left: 30 }).margin).toEqual({
      top: 12,
      right: 12,
      bottom: 26,
      left: 30,
    });
  });
});
