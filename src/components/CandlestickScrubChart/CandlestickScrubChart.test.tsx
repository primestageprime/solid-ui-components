import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { CandlestickScrubChart } from "./CandlestickScrubChart";
import { buildCandleCells, candleDomain } from "./helpers";
import type { CandlestickSample } from "./types";

const at = (iso: string): Date => new Date(iso);
const sample = (iso: string, value: number): CandlestickSample => ({
  at: at(iso),
  value,
});

describe("buildCandleCells — month granularity", () => {
  // Three populated days in January, with GAPS between them. The gap days must
  // never enter the OHLC math: if they were zero-filled, low would be 0.
  const january: CandlestickSample[] = [
    sample("2026-01-05T10:00:00Z", 40),
    sample("2026-01-05T15:00:00Z", 60), // day total 100 → the OPEN
    sample("2026-01-12T09:00:00Z", 250), // day total 250 → the HIGH
    sample("2026-01-27T09:00:00Z", 70), // day total 70 → the LOW and the CLOSE
  ];

  it("reduces OHLC over populated DAY totals, not raw samples", () => {
    const [cell] = buildCandleCells(january, "month");
    expect(cell.candle).toEqual(
      expect.objectContaining({ open: 100, close: 70, high: 250, low: 70 }),
    );
    expect(cell.subBucketCount).toBe(3);
    expect(cell.sampleCount).toBe(4);
  });

  it("mean averages the populated day totals only", () => {
    const [cell] = buildCandleCells(january, "month");
    // (100 + 250 + 70) / 3 — NOT divided by 31 calendar days.
    expect(cell.candle?.mean).toBeCloseTo(140, 6);
  });

  it("NEVER pins low to zero from an empty (gap-filled) day", () => {
    // The regression this component exists to avoid: a calendar-complete,
    // zero-filled day series would make every gappy month's low 0.
    const [cell] = buildCandleCells(january, "month");
    expect(cell.candle?.low).toBe(70);
    expect(cell.candle?.low).not.toBe(0);
  });

  it("keeps a cell for an EMPTY month but leaves its candle null", () => {
    const cells = buildCandleCells(
      [...january, sample("2026-03-04T09:00:00Z", 500)],
      "month",
    );
    expect(cells).toHaveLength(3); // Jan, Feb, Mar
    expect(cells[1].candle).toBeNull();
    expect(cells[1].sampleCount).toBe(0);
    // The empty month contributes nothing to the domain.
    expect(candleDomain(cells)[0]).toBeGreaterThan(0);
  });

  it("aggregates a sub-bucket with a caller-supplied reducer", () => {
    const maxOf = (vs: readonly number[]) => Math.max(...vs);
    const [cell] = buildCandleCells(january, "month", maxOf);
    // Jan 5 becomes max(40, 60) = 60 instead of the summed 100.
    expect(cell.candle?.open).toBe(60);
  });
});

describe("buildCandleCells — day granularity", () => {
  const oneDay: CandlestickSample[] = [
    sample("2026-02-02T08:00:00Z", 12),
    sample("2026-02-02T11:00:00Z", 31),
    sample("2026-02-02T16:00:00Z", 7),
    sample("2026-02-02T19:00:00Z", 20),
  ];

  it("reduces OHLC over the individual intra-day samples", () => {
    const [cell] = buildCandleCells(oneDay, "day");
    expect(cell.candle).toEqual(
      expect.objectContaining({ open: 12, close: 20, high: 31, low: 7 }),
    );
    expect(cell.subBucketCount).toBe(4);
  });

  it("orders sub-values by time even when samples arrive shuffled", () => {
    const shuffled = [oneDay[2], oneDay[0], oneDay[3], oneDay[1]];
    const [cell] = buildCandleCells(shuffled, "day");
    expect(cell.candle?.open).toBe(12);
    expect(cell.candle?.close).toBe(20);
  });

  it("renders a FLAT candle (no synthesized wick) for a date-only day", () => {
    // One sample per day — no intra-day distribution exists. The honest
    // result is open = close = high = low, not an invented wick.
    const [cell] = buildCandleCells([sample("2026-02-02T00:00:00Z", 42)], "day");
    expect(cell.candle).toEqual(
      expect.objectContaining({ open: 42, close: 42, high: 42, low: 42 }),
    );
    expect(cell.subBucketCount).toBe(1);
  });

  it("returns an empty strip for no samples", () => {
    expect(buildCandleCells([], "day")).toEqual([]);
    expect(candleDomain([])).toEqual([0, 1]);
  });
});

describe("CandlestickScrubChart", () => {
  const samples: CandlestickSample[] = [
    sample("2026-01-05T10:00:00Z", 40),
    sample("2026-01-05T15:00:00Z", 60),
    sample("2026-01-12T09:00:00Z", 250),
    sample("2026-02-27T09:00:00Z", 70),
  ];

  it("mounts and draws one candle group per populated period", () => {
    const { container } = render(() => (
      <CandlestickScrubChart samples={samples} granularity="month" />
    ));
    expect(
      container.querySelectorAll(".sui-candlestick-scrub-chart__candle"),
    ).toHaveLength(2);
  });

  it("survives a stale `selected` beyond the end of the strip", () => {
    // A day→month flip leaves `selected` pointing past the shorter strip;
    // clamping must keep it in range rather than indexing off the end.
    const { container } = render(() => (
      <CandlestickScrubChart
        samples={samples}
        granularity="month"
        selected={999}
      />
    ));
    expect(
      container.querySelector(".sui-candlestick-scrub-chart__chart"),
    ).toBeTruthy();
  });
});
