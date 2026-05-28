import { describe, it, expect, vi } from "vitest";
import { render } from "@solidjs/testing-library";
import { ScrubChart } from "./ScrubChart";
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
  // Attach the pointerId so handlers calling setPointerCapture work.
  Object.defineProperty(ev, "pointerId", { value: init.pointerId ?? 1 });
  el.dispatchEvent(ev);
};

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

describe("ScrubChart click-to-scrub on the chart", () => {
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
    // JSDOM doesn't compute layout — stub the frame's bounding rect so
    // (clientX − rect.left) gives a sensible chart-x.
    const frame = container.querySelector(".sui-scrub-chart__frame")! as HTMLDivElement;
    frame.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 880, height: 200, right: 880, bottom: 200, x: 0, y: 0, toJSON: () => "" }) as DOMRect;
    // Click at chart-x = chartWidth/2 → focused cell (15).
    firePointer(overlay, "pointerdown", { clientX: 440, clientY: 100 });
    firePointer(overlay, "pointerup", { clientX: 440, clientY: 100 });
    expect(onScrub).toHaveBeenCalledTimes(1);
    expect(onScrub.mock.calls[0][0]).toBe(15);
  });
});
