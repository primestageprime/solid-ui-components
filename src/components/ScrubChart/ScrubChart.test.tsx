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

describe("ScrubChart window-band boundary (regression)", () => {
  // Repro for the "window band scrolls off the right edge" bug: when the axis
  // renders cells WIDER than the `cellWidth` prop, the old scroll→index math
  // (`floor(scrollLeft / cellWidth)`, unclamped) let `first` overrun the last
  // index, pushing the band past plotRight. The fix derives the per-cell width
  // from the axis's real scrollWidth and clamps both ends to [0, n-1].
  const setup = (scrollWidth: number) => {
    let seen: ScrubChartContext<Cell> | null = null;
    const cells = dailyCells(d("2026-05-01"), d("2026-05-31")); // 31 cells
    const { container } = render(() => (
      <ScrubChart
        cells={cells}
        selected={0}
        onScrub={() => {}}
        cellWidth={60} // deliberately smaller than the real 90px/cell below
        renderCell={(cell) => <span>{cell.start.getUTCDate()}</span>}
        renderChart={(ctx) => {
          seen = ctx;
          return <svg />;
        }}
      />
    ));
    const axisEl = container.querySelector(".sui-date-axis") as HTMLDivElement;
    // 31 cells × 90px = 2790: the real per-cell width (90) exceeds cellWidth(60).
    Object.defineProperty(axisEl, "scrollWidth", {
      value: scrollWidth,
      configurable: true,
    });
    const scrollTo = (left: number) => {
      axisEl.scrollLeft = left;
      axisEl.dispatchEvent(new Event("scroll"));
    };
    return { cells, seen: () => seen!, plotRight: 1200, scrollTo };
  };

  it("keeps the window band within the chart when cells are wider than cellWidth", () => {
    const { cells, seen, plotRight, scrollTo } = setup(31 * 90);
    // A scroll offset that, under the old cellWidth(60) assumption, computes
    // first = floor(2190 / 60) = 36 — well past the last index (30).
    scrollTo(2190);
    const [first, last] = seen().windowCells;
    expect(first).toBeLessThanOrEqual(cells.length - 1);
    expect(last).toBeLessThanOrEqual(cells.length - 1);
    // Band right edge must never spill past the plot's right edge.
    expect(seen().windowBounds[1]).toBeLessThanOrEqual(plotRight + 0.001);
  });

  it("pins the band's right edge to plotRight at max scroll (last cell)", () => {
    const { cells, seen, plotRight, scrollTo } = setup(31 * 90);
    scrollTo(31 * 90); // scroll fully right
    const [, last] = seen().windowCells;
    expect(last).toBe(cells.length - 1);
    expect(seen().windowBounds[1]).toBeCloseTo(plotRight, 3);
  });
});

describe("ScrubChart chart-frame drag", () => {
  it("pans the inner axis viewport instead of changing selection", () => {
    const onScrub = vi.fn();
    const cells = dailyCells(d("2026-05-01"), d("2026-05-31"));
    const { container } = render(() => (
      <ScrubChart
        cells={cells}
        selected={15}
        onScrub={onScrub}
        cellWidth={60}
        renderCell={(cell) => <span>{cell.start.getUTCDate()}</span>}
        renderChart={() => <svg />}
      />
    ));
    const overlay = container.querySelector(
      ".sui-scrub-chart__overlay",
    )! as HTMLDivElement;
    const axisEl = container.querySelector(".sui-date-axis")! as HTMLDivElement;
    overlay.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        width: 1200,
        height: 200,
        right: 1200,
        bottom: 200,
        x: 0,
        y: 0,
        toJSON: () => "",
      }) as DOMRect;
    axisEl.scrollLeft = 0;

    // 31 cells across 1200 px → dayPitch ≈ 38.71. cellWidth = 60. So a 100-px
    // graph drag should scroll the axis by 100 * (60 / 38.71) ≈ 155 px.
    firePointer(overlay, "pointerdown", {
      clientX: 600,
      clientY: 100,
      pointerId: 1,
    });
    firePointer(overlay, "pointermove", {
      clientX: 700,
      clientY: 100,
      pointerId: 1,
    });
    firePointer(overlay, "pointerup", {
      clientX: 700,
      clientY: 100,
      pointerId: 1,
    });

    expect(onScrub).not.toHaveBeenCalled();
    expect(axisEl.scrollLeft).toBeGreaterThan(140);
    expect(axisEl.scrollLeft).toBeLessThan(170);
  });
});

describe("ScrubChart chart-frame click", () => {
  it("scrubs to the cell under the pointer on a click (no drag)", () => {
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
    const frame = container.querySelector(
      ".sui-scrub-chart__frame",
    )! as HTMLDivElement;
    const overlay = container.querySelector(
      ".sui-scrub-chart__overlay",
    )! as HTMLDivElement;
    // Stub the chart frame's bounding box (cellAtClientX measures from it,
    // not from the overlay).
    frame.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        width: 1200,
        height: 200,
        right: 1200,
        bottom: 200,
        x: 0,
        y: 0,
        toJSON: () => "",
      }) as DOMRect;

    // 31 cells across 1200 px → dayPitch ≈ 38.71. Cell 15's centre sits at
    // x ≈ 600; the pointer barely moves so the gesture stays under the 4-px
    // pan threshold and resolves as a click.
    firePointer(overlay, "pointerdown", {
      clientX: 600,
      clientY: 100,
      pointerId: 1,
    });
    firePointer(overlay, "pointerup", {
      clientX: 601,
      clientY: 100,
      pointerId: 1,
    });

    expect(onScrub).toHaveBeenCalledTimes(1);
    expect(onScrub.mock.calls[0][0]).toBe(15);
  });

  it("does not fire onScrub when a drag ends on the same spot it started", () => {
    const onScrub = vi.fn();
    const cells = dailyCells(d("2026-05-01"), d("2026-05-31"));
    const { container } = render(() => (
      <ScrubChart
        cells={cells}
        selected={0}
        onScrub={onScrub}
        renderCell={(cell) => <span>{cell.start.getUTCDate()}</span>}
        renderChart={() => <svg />}
      />
    ));
    const frame = container.querySelector(
      ".sui-scrub-chart__frame",
    )! as HTMLDivElement;
    const overlay = container.querySelector(
      ".sui-scrub-chart__overlay",
    )! as HTMLDivElement;
    frame.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        width: 1200,
        height: 200,
        right: 1200,
        bottom: 200,
        x: 0,
        y: 0,
        toJSON: () => "",
      }) as DOMRect;

    // Drag well past threshold, then release. Even if the release x lands
    // back near the start (zero net displacement), the pan flag is sticky.
    firePointer(overlay, "pointerdown", {
      clientX: 600,
      clientY: 100,
      pointerId: 1,
    });
    firePointer(overlay, "pointermove", {
      clientX: 700,
      clientY: 100,
      pointerId: 1,
    });
    firePointer(overlay, "pointerup", {
      clientX: 600,
      clientY: 100,
      pointerId: 1,
    });

    expect(onScrub).not.toHaveBeenCalled();
  });
});

describe("ScrubChart hover plumbing", () => {
  const cells10 = (): Cell[] => dailyCells(d("2026-05-01"), d("2026-05-10"));

  it("renders the hover layer with the hovered index on pointer-move, clears on leave", () => {
    const { container } = render(() => (
      <ScrubChart
        cells={cells10()}
        scrub={false}
        hover
        yDomain={[0, 100]}
        renderChart={() => <svg />}
        renderCell={() => <div />}
        renderHoverOverlay={(ctx) => (
          <div data-testid="hover" data-idx={String(ctx.hoverIndex)} />
        )}
      />
    ));
    const frame = container.querySelector(".sui-scrub-chart__frame")!;
    // No hover layer before any pointer activity.
    expect(container.querySelector(".sui-scrub-chart__hover-layer")).toBeNull();
    firePointer(frame, "pointermove", { clientX: 200, clientY: 30 });
    const layer = container.querySelector(".sui-scrub-chart__hover-layer");
    expect(layer).toBeTruthy();
    const idx = Number(
      layer!.querySelector("[data-testid=hover]")!.getAttribute("data-idx"),
    );
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(10);
    frame.dispatchEvent(new MouseEvent("pointerleave", { bubbles: true }));
    expect(container.querySelector(".sui-scrub-chart__hover-layer")).toBeNull();
  });

  it("does not render the hover layer when hover is off", () => {
    const { container } = render(() => (
      <ScrubChart
        cells={cells10()}
        scrub={false}
        yDomain={[0, 100]}
        renderChart={() => <svg />}
        renderCell={() => <div />}
        renderHoverOverlay={() => <div data-testid="hover" />}
      />
    ));
    firePointer(
      container.querySelector(".sui-scrub-chart__frame")!,
      "pointermove",
      { clientX: 200, clientY: 30 },
    );
    expect(container.querySelector(".sui-scrub-chart__hover-layer")).toBeNull();
  });
});
