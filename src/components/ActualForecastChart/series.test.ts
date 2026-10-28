import { describe, expect, it } from "vitest";
import type { CashflowCell } from "../CashflowScrubChart";
import {
  ACTUAL_FORECAST_CLASS,
  DEFAULT_ACTUAL_FORECAST_LABELS,
  actualForecastSeries,
  anchorMarker,
} from "./series";

const cell = (i: number): CashflowCell => ({
  start: new Date(Date.UTC(2026, 9, 1 + i)),
  end: new Date(Date.UTC(2026, 9, 2 + i)),
  cashflowCents: 0,
  balanceCents: 1_000 * (i + 1),
});
const cells = Array.from({ length: 7 }, (_, i) => cell(i));
const ANCHOR = 3;

const byId = (anchorIndex = ANCHOR, extra = {}) =>
  Object.fromEntries(
    actualForecastSeries({
      anchorIndex,
      labels: DEFAULT_ACTUAL_FORECAST_LABELS,
      range: (c) => ({
        minCents: c.balanceCents - 100,
        maxCents: c.balanceCents + 100,
      }),
      ...extra,
    }).map((s) => [s.id, s]),
  );

describe("actualForecastSeries", () => {
  it("draws the actual half through the anchor and nothing after it", () => {
    const s = byId();
    expect(cells.map((c, i) => s.actual.balanceCents(c, i))).toEqual([
      1000,
      2000,
      3000,
      4000,
      null,
      null,
      null,
    ]);
  });

  it("draws the forecast half from the anchor on, so the halves meet", () => {
    const s = byId();
    expect(cells.map((c, i) => s.forecast.balanceCents(c, i))).toEqual([
      null,
      null,
      null,
      4000,
      5000,
      6000,
      7000,
    ]);
    expect(s.forecast.class).toBe(ACTUAL_FORECAST_CLASS.forecast);
    expect(s.actual.class).toBe(ACTUAL_FORECAST_CLASS.actual);
  });

  it("draws the range cone only after the anchor, filled from max to min", () => {
    const s = byId();
    expect(cells.map((c, i) => s["range-min"].balanceCents(c, i))).toEqual([
      null,
      null,
      null,
      null,
      4900,
      5900,
      6900,
    ]);
    expect(cells.map((c, i) => s["range-max"].balanceCents(c, i))).toEqual([
      null,
      null,
      null,
      null,
      5100,
      6100,
      7100,
    ]);
    expect(s["range-max"].fill?.baseline?.(cells[5], 5)).toBe(5900);
    expect(s["range-max"].fill?.positiveClass).toBe(
      ACTUAL_FORECAST_CLASS.rangeBand,
    );
    expect(s["range-max"].fill?.negativeClass).toBe(
      ACTUAL_FORECAST_CLASS.rangeBand,
    );
  });

  it("breaks the cone where the range callback returns null", () => {
    const s = byId(ANCHOR, {
      range: (_c: CashflowCell, i: number) =>
        i === 5 ? null : { minCents: 1, maxCents: 2 },
    });
    expect(cells.map((c, i) => s["range-max"].balanceCents(c, i))).toEqual([
      null,
      null,
      null,
      null,
      2,
      null,
      2,
    ]);
  });

  it("omits the cone and the rules that are not stated", () => {
    const ids = actualForecastSeries({
      anchorIndex: ANCHOR,
      labels: DEFAULT_ACTUAL_FORECAST_LABELS,
    }).map((s) => s.id);
    expect(ids).toEqual(["actual", "forecast"]);
  });

  it("paints the flat rules first and the balance halves last", () => {
    const series = actualForecastSeries({
      anchorIndex: ANCHOR,
      labels: DEFAULT_ACTUAL_FORECAST_LABELS,
      range: () => ({ minCents: 0, maxCents: 1 }),
      openingBalanceCents: 4000,
      floorCents: 0,
    });
    expect(series.map((s) => s.id)).toEqual([
      "opening-balance",
      "floor",
      "range-min",
      "range-max",
      "actual",
      "forecast",
    ]);
    expect(series[0].balanceCents(cells[0], 0)).toBe(4000);
    expect(series[0].label).toBe("Opening balance");
    expect(series[1].balanceCents(cells[6], 6)).toBe(0);
    expect(series[1].label).toBe("Cash floor");
  });

  it("uses the labels it is given", () => {
    const s = byId(ANCHOR, {
      labels: { ...DEFAULT_ACTUAL_FORECAST_LABELS, forecast: "Baseline" },
    });
    expect(s.forecast.label).toBe("Baseline");
  });
});

describe("anchorMarker", () => {
  it("stands a labelled rule on the anchor cell with a dot on its balance", () => {
    expect(anchorMarker(cells, ANCHOR, "Today")).toEqual({
      index: ANCHOR,
      variant: "rule",
      label: "Today",
      valueCents: 4000,
    });
  });
});
