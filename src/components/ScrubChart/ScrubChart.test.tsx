import { describe, it, expect, vi } from "vitest";
import { render } from "@solidjs/testing-library";
import { ScrubChart, type ScrubChartContext } from "./ScrubChart";
import { dailyCells, type Cell } from "../DateAxis";

const d = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);

/**
 * Dispatch a pointer-flavoured event with reliable clientX/clientY.
 * JSDOM's PointerEvent constructor ignores clientX in its init dict, so we
 * build a MouseEvent (which JSDOM honours) with the pointerXXX event type.
 */
const firePointer = (
  el: Element,
  type: "pointerdown" | "pointermove" | "pointerup" | "pointercancel",
  init: { clientX: number; clientY: number; pointerId?: number },
): void => {
  const ev = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: init.clientX,
    clientY: init.clientY,
  });
  Object.defineProperty(ev, "pointerId", { value: init.pointerId ?? 1 });
  el.dispatchEvent(ev);
};

describe("ScrubChart composition", () => {
  it("renders the chart frame, window overlay, and inner DateAxis", () => {
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
    expect(container.querySelector(".sui-scrub-chart__window")).toBeTruthy();
    expect(container.querySelector(".sui-scrub-chart__overlay")).toBeTruthy();
    expect(container.querySelector(".sui-date-axis")).toBeTruthy();
    expect(container.querySelector('[data-testid="chart"]')).toBeTruthy();
  });

  it("passes a linear cellToX + cellBounds to renderChart", () => {
    let seen: ScrubChartContext<Cell> | null = null;
    const cells = dailyCells(d("2026-05-01"), d("2026-05-31"));
    render(() => (
      <ScrubChart
        cells={cells}
        selected={15}
        onScrub={() => {}}
        renderCell={(cell) => <span>{cell.start.getUTCDate()}</span>}
        renderChart={(ctx) => {
          seen = ctx;
          return <svg />;
        }}
      />
    ));
    expect(seen).not.toBeNull();
    expect(seen!.selected).toBe(15);
    expect(seen!.cells.length).toBe(31);
    // Default chart width is 1200; with 31 cells → ~38.7 px per day.
    const pitch = seen!.dayPitch;
    expect(pitch).toBeGreaterThan(38);
    expect(pitch).toBeLessThan(39);
    // Cell 0's centre sits half a pitch from the left edge.
    expect(seen!.cellToX(0)).toBeCloseTo(pitch / 2, 3);
    // Bounds are pitch-wide and contiguous.
    const b0 = seen!.cellBounds(0);
    const b1 = seen!.cellBounds(1);
    expect(b0[1]).toBeCloseTo(b1[0], 3);
    expect(b0[1] - b0[0]).toBeCloseTo(pitch, 3);
  });

  it("exposes windowCells / windowBounds for the visible axis slice", () => {
    let seen: ScrubChartContext<Cell> | null = null;
    const cells = dailyCells(d("2026-05-01"), d("2026-05-31"));
    render(() => (
      <ScrubChart
        cells={cells}
        selected={0}
        onScrub={() => {}}
        renderCell={(cell) => <span>{cell.start.getUTCDate()}</span>}
        renderChart={(ctx) => {
          seen = ctx;
          return <svg />;
        }}
      />
    ));
    // JSDOM reports clientWidth = 0, so the initial window collapses to
    // [0, 0]. The signal stays reactive — in a real browser the
    // scrollableRef wires it to the axis viewport.
    expect(seen!.windowCells).toEqual([0, 0]);
    expect(seen!.windowBounds[0]).toBe(0);
  });
});

describe("ScrubChart click-to-scrub", () => {
  it("calls onScrub with the cell under the pointer when the overlay is clicked", () => {
    const onScrub = vi.fn();
    const cells = dailyCells(d("2026-05-01"), d("2026-05-31"));
    const { container } = render(() => (
      <ScrubChart
        cells={cells}
        selected={15}
        onScrub={onScrub}
        renderCell={(cell) => <span>{cell.start.getUTCDate()}</span>}
        renderChart={() => <svg />}
      />
    ));
    const overlay = container.querySelector(".sui-scrub-chart__overlay")! as HTMLDivElement;
    overlay.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 1200, height: 200, right: 1200, bottom: 200, x: 0, y: 0, toJSON: () => "" }) as DOMRect;
    // 31 cells across 1200 px → pitch ≈ 38.71. Cell 15 spans x ∈ [580.6, 619.4);
    // x = 600 lands solidly inside it.
    firePointer(overlay, "pointerdown", { clientX: 600, clientY: 100, pointerId: 1 });
    firePointer(overlay, "pointerup", { clientX: 600, clientY: 100, pointerId: 1 });
    expect(onScrub).toHaveBeenCalled();
    expect(onScrub.mock.calls[0][0]).toBe(15);
  });
});

describe("ScrubChart drag scrub", () => {
  it("emits new onScrub calls as the pointer moves across cells", () => {
    const onScrub = vi.fn();
    const cells = dailyCells(d("2026-05-01"), d("2026-05-31"));
    const { container } = render(() => (
      <ScrubChart
        cells={cells}
        selected={15}
        onScrub={onScrub}
        renderCell={(cell) => <span>{cell.start.getUTCDate()}</span>}
        renderChart={() => <svg />}
      />
    ));
    const overlay = container.querySelector(".sui-scrub-chart__overlay")! as HTMLDivElement;
    overlay.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 1200, height: 200, right: 1200, bottom: 200, x: 0, y: 0, toJSON: () => "" }) as DOMRect;
    firePointer(overlay, "pointerdown", { clientX: 580, clientY: 100, pointerId: 1 });
    firePointer(overlay, "pointermove", { clientX: 800, clientY: 100, pointerId: 1 });
    firePointer(overlay, "pointerup", { clientX: 800, clientY: 100, pointerId: 1 });
    // Down committed cell 15; move-over crossed into cell ~20 → another emit.
    expect(onScrub.mock.calls.length).toBeGreaterThanOrEqual(2);
    const lastCall = onScrub.mock.calls.at(-1)!;
    expect(lastCall[0]).toBeGreaterThan(15);
  });
});
