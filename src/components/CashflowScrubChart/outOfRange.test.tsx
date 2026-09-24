// Out-of-range markers — the pure decision printed as a table, then the chart
// drawing it at both edges for lines AND the cone's lower (fill baseline) edge.
import { describe, expect, it } from "vitest";
import { render } from "@solidjs/testing-library";
import {
  EDGE_LABEL_INSET,
  edgeLabelX,
  outOfRange,
  outOfRangeTable,
  type RangePoint,
} from "./outOfRange";
import { CashflowScrubChart, type CashflowCell } from "./CashflowScrubChart";
import { dailyCells } from "../DateAxis";

// Plot from y=10 (top) to y=110 (bottom); value v maps to y = 110 - v.
const pt = (x: number, value: number): RangePoint => ({ x, y: 110 - value, value });

describe("outOfRange (pure)", () => {
  it("names the peak past the top and the trough past the bottom", () => {
    const points = [pt(0, 50), pt(10, 130), pt(20, 180), pt(30, -20), pt(40, -60)];
    const result = outOfRange(points, 10, 110);
    expect(outOfRangeTable(result)).toBe(
      [
        "edge         x       value",
        "top         20         180",
        "bottom      40         -60",
      ].join("\n"),
    );
  });

  it("marks nothing when every point is on the plot, edges included (half-pixel eps)", () => {
    const result = outOfRange([pt(0, 0), pt(5, 100), { x: 9, y: 9.6, value: 100.4 }], 10, 110);
    expect(result).toEqual({ top: null, bottom: null });
    expect(outOfRangeTable(result)).toContain("top          —           —");
  });

  it("keeps the existing top-only behaviour when nothing clips below", () => {
    const result = outOfRange([pt(0, 150), pt(1, 20)], 10, 110);
    expect(result.top).toEqual({ x: 0, value: 150 });
    expect(result.bottom).toBeNull();
  });

  it("holds a label inside the plot's horizontal span", () => {
    expect(edgeLabelX(0, 0, 500)).toBe(EDGE_LABEL_INSET);
    expect(edgeLabelX(499, 0, 500)).toBe(500 - EDGE_LABEL_INSET);
    expect(edgeLabelX(250, 0, 500)).toBe(250);
  });
});

const d = (iso: string): Date => new Date(`${iso}T00:00:00Z`);
const cells: CashflowCell[] = dailyCells(d("2026-05-01"), d("2026-05-08")).map(
  (cell, i) => ({ ...cell, cashflowCents: 0, balanceCents: 50_000 + i * 1_000 }),
);

describe("CashflowScrubChart out-of-range markers (fixed range)", () => {
  const markers = (container: HTMLElement) => ({
    top: container.querySelector(
      ".sui-cashflow-scrub-chart__overtop:not(.sui-cashflow-scrub-chart__overtop--bottom) .sui-cashflow-scrub-chart__overtop-label",
    )?.textContent,
    bottom: container.querySelector(
      ".sui-cashflow-scrub-chart__overtop--bottom .sui-cashflow-scrub-chart__overtop-label",
    )?.textContent,
  });

  it("marks a balance line that drops below a fixed floor", () => {
    const { container } = render(() => (
      <CashflowScrubChart
        cells={cells}
        scrub={false}
        yMin={0}
        yMax={100_000}
        balanceSeries={[
          { id: "dip", balanceCents: (_c, i) => (i === 3 ? -250_000 : 10_000) },
        ]}
      />
    ));
    expect(markers(container)).toEqual({ top: undefined, bottom: "−$2.5k" });
  });

  it("marks the cone's lower edge (a fill baseline) as well as its upper edge", () => {
    const { container } = render(() => (
      <CashflowScrubChart
        cells={cells}
        scrub={false}
        yMin={0}
        yMax={100_000}
        balanceSeries={[
          {
            id: "cone-hi",
            balanceCents: () => 400_000_000,
            fill: { baseline: () => -300_000 },
          },
        ]}
      />
    ));
    const m = markers(container);
    expect(m.top).toBe("$4M");
    expect(m.bottom).toBe("−$3k");
  });
});
