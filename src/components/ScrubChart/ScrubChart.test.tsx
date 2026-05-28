import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { ScrubChart } from "./ScrubChart";
import { dailyCells, type Cell } from "../DateAxis";

const d = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);

describe("ScrubChart static composition", () => {
  it("renders chart frame, gutter, and axis", () => {
    const cells: Cell[] = dailyCells(d("2026-05-01"), d("2026-05-31"));
    const { container } = render(() => (
      <ScrubChart
        cells={cells}
        selected={15}
        onScrub={() => {}}
        renderCell={(cell) => <span>{cell.start.getUTCDate()}</span>}
        renderChart={() => <svg data-testid="chart" />}
      />
    ));
    expect(container.querySelector(".sui-scrub-chart")).toBeTruthy();
    expect(container.querySelector(".sui-scrub-chart__frame")).toBeTruthy();
    expect(container.querySelector(".sui-scrub-chart__gutter")).toBeTruthy();
    expect(container.querySelector(".sui-date-axis")).toBeTruthy();
    expect(container.querySelector('[data-testid="chart"]')).toBeTruthy();
  });

  it("passes a context with cellToX, cellBounds, and visibleCells to renderChart", () => {
    let seenCtx: { selected: number; width: number; visibleCount: number } | null = null;
    const cells = dailyCells(d("2026-05-01"), d("2026-05-31"));
    render(() => (
      <ScrubChart
        cells={cells}
        selected={15}
        onScrub={() => {}}
        renderCell={(cell) => <span>{cell.start.getUTCDate()}</span>}
        renderChart={(ctx) => {
          seenCtx = { selected: ctx.selected, width: ctx.width, visibleCount: ctx.visibleCells.length };
          return <svg />;
        }}
      />
    ));
    expect(seenCtx).not.toBeNull();
    expect(seenCtx!.selected).toBe(15);
    expect(seenCtx!.width).toBeGreaterThan(0);
    // Default knobs (2/3 + 28) → 7 cells per side → 15 visible.
    expect(seenCtx!.visibleCount).toBe(15);
  });
});
