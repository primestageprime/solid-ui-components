import { describe, it, expect, vi } from "vitest";
import { fireEvent, render } from "@solidjs/testing-library";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  ScrubChart,
  type ScrubChartContext,
  type ScrubChartHighlight,
} from "./ScrubChart";
import {
  DEFAULT_X_AXIS_HEIGHT,
  Y_FIT_BUTTON_SIZE,
  Y_FIT_COLUMN,
  Y_FIT_FOOTPRINT,
  Y_FIT_GUTTER,
  Y_FIT_HOVER_INSET,
  Y_FIT_INSET,
  Y_FIT_LEVEL_OFFSET,
  Y_LABEL_GAP,
  Y_LABEL_HALF_HEIGHT,
  clampLabelBaseline,
  yLabelFloor,
} from "./helpers";
import { ScrubChartYFitControl } from "./ScrubChartYFitControl";
import { dailyCells, type Cell } from "../DateAxis";
import { pointer, rectOf } from "../../test-utils";

// `cellAtClientX` reads exactly one field of this box — `left`, to convert a
// client coordinate into a plot-relative one. The 1200 that sets dayPitch does
// NOT come from here: chartWidth is seeded with DEFAULT_CHART_WIDTH (1200) and
// only moves when observeSize fires, and this file installs no ResizeObserver,
// so it never does. The width below is set to match only so the box is not a
// lie; changing it changes nothing, while changing `left` fails three tests.
//
// Assigned per-element rather than through installRects because each test stubs
// exactly one node and wants every other rect to stay jsdom-zero — a
// prototype-wide stub would hand the same box to the overlay and the frame
// alike, hiding which one the production code measures from.
const PLOT_RECT = rectOf({ left: 0, top: 0, width: 1200, height: 200 });

const d = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);

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
    overlay.getBoundingClientRect = () => PLOT_RECT;
    axisEl.scrollLeft = 0;

    // 31 cells across 1200 px → dayPitch ≈ 38.71. cellWidth = 60. So a 100-px
    // graph drag should scroll the axis by 100 * (60 / 38.71) ≈ 155 px.
    const drag = pointer(overlay);
    drag.down({ clientX: 600, clientY: 100 });
    drag.move({ clientX: 700, clientY: 100 });
    drag.up({ clientX: 700, clientY: 100 });

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
    frame.getBoundingClientRect = () => PLOT_RECT;

    // 31 cells across 1200 px → dayPitch ≈ 38.71. Cell 15's centre sits at
    // x ≈ 600; the pointer barely moves so the gesture stays under the 4-px
    // pan threshold and resolves as a click.
    const click = pointer(overlay);
    click.down({ clientX: 600, clientY: 100 });
    click.up({ clientX: 601, clientY: 100 });

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
    frame.getBoundingClientRect = () => PLOT_RECT;

    // Drag well past threshold, then release. Even if the release x lands
    // back near the start (zero net displacement), the pan flag is sticky.
    const pan = pointer(overlay);
    pan.down({ clientX: 600, clientY: 100 });
    pan.move({ clientX: 700, clientY: 100 });
    pan.up({ clientX: 600, clientY: 100 });

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
    pointer(frame).move({ clientX: 200, clientY: 30 });
    const layer = container.querySelector(".sui-scrub-chart__hover-layer");
    expect(layer).toBeTruthy();
    const idx = Number(
      layer!.querySelector("[data-testid=hover]")!.getAttribute("data-idx"),
    );
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(10);
    pointer(frame).leave();
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
    pointer(container.querySelector(".sui-scrub-chart__frame")!).move({
      clientX: 200,
      clientY: 30,
    });
    expect(container.querySelector(".sui-scrub-chart__hover-layer")).toBeNull();
  });

  it("reports no hover for a pointer outside the plot's horizontal span", () => {
    // The frame keeps the jsdom zero rect, so a clientX IS a frame-relative x.
    // A yDomain buys the y-axis column left of plotLeft, and rightGutter buys
    // the label gutter right of plotRight. Neither column holds a cell.
    const { container } = render(() => (
      <ScrubChart
        cells={cells10()}
        scrub={false}
        hover
        yDomain={[0, 100]}
        rightGutter={40}
        renderChart={() => <svg />}
        renderCell={() => <div />}
        renderHoverOverlay={(ctx) => (
          <div data-testid="hover" data-idx={String(ctx.hoverIndex)} />
        )}
      />
    ));
    const frame = container.querySelector(".sui-scrub-chart__frame")!;
    const layer = () =>
      container.querySelector(".sui-scrub-chart__hover-layer");
    // Inside the plot the readout appears.
    pointer(frame).move({ clientX: 600, clientY: 30 });
    expect(layer()).toBeTruthy();
    // Past plotRight: chartWidth is 1200 and the gutter is 40, so 1190 sits in
    // the gutter. The readout goes away instead of clamping to the last cell.
    pointer(frame).move({ clientX: 1190, clientY: 30 });
    expect(layer()).toBeNull();
    // Back inside — the readout returns, so the null is not sticky.
    pointer(frame).move({ clientX: 600, clientY: 30 });
    expect(layer()).toBeTruthy();
    // Left of plotLeft: x = 1 lands in the y-axis label column.
    pointer(frame).move({ clientX: 1, clientY: 30 });
    expect(layer()).toBeNull();
  });

  it("still clamps a click past the right edge to the last cell", () => {
    // The hover fix must not reach the click-to-scrub gesture, which keeps the
    // clamp: a click past the last cell still means the last cell.
    const onScrub = vi.fn();
    const cells = cells10();
    const { container } = render(() => (
      <ScrubChart
        cells={cells}
        selected={0}
        onScrub={onScrub}
        rightGutter={40}
        renderChart={() => <svg />}
        renderCell={() => <div />}
      />
    ));
    const overlay = container.querySelector(".sui-scrub-chart__overlay")!;
    const click = pointer(overlay);
    click.down({ clientX: 1190, clientY: 100 });
    click.up({ clientX: 1190, clientY: 100 });
    expect(onScrub).toHaveBeenCalledWith(9, cells[9]);
  });
});

describe("ScrubChart gridlines", () => {
  const cells10 = (): Cell[] => dailyCells(d("2026-05-01"), d("2026-05-10"));

  const gridChart = (extra: { showGridlines?: boolean }) =>
    render(() => (
      <ScrubChart
        cells={cells10()}
        scrub={false}
        yDomain={[0, 100]}
        renderChart={() => <svg />}
        renderCell={() => <div />}
        {...extra}
      />
    ));

  it("draws no grid layer by default", () => {
    const { container } = gridChart({});
    expect(container.querySelector(".sui-scrub-chart__grid")).toBeNull();
    expect(container.querySelector(".sui-scrub-chart__grid-line")).toBeNull();
    // The 4px axis stubs are untouched — an opt-out consumer sees no change.
    expect(
      container.querySelectorAll(".sui-scrub-chart__tick").length,
    ).toBeGreaterThan(0);
  });

  it("draws one rule per y-axis tick when opted in", () => {
    const { container } = gridChart({ showGridlines: true });
    const lines = container.querySelectorAll(".sui-scrub-chart__grid-line");
    const labels = container.querySelectorAll(".sui-scrub-chart__label--y");
    expect(lines.length).toBeGreaterThan(0);
    // Same tick source as the axis labels, so a rule never sits label-less.
    expect(lines.length).toBe(labels.length);
  });

  it("spans the plot region and shares each label's y", () => {
    const { container } = gridChart({ showGridlines: true });
    const stubs = Array.from(
      container.querySelectorAll(".sui-scrub-chart__tick"),
    );
    const lines = Array.from(
      container.querySelectorAll(".sui-scrub-chart__grid-line"),
    );
    lines.forEach((line, i) => {
      // A stub ends AT plotLeft; the rule starts there and runs to plotRight
      // (chartWidth is the seeded 1200 — see PLOT_RECT's note).
      const plotLeft = Number(stubs[i].getAttribute("x2"));
      expect(Number(line.getAttribute("x1"))).toBeCloseTo(plotLeft, 3);
      expect(Number(line.getAttribute("x2"))).toBeCloseTo(1200, 3);
      // Horizontal, and level with the label it belongs to.
      expect(line.getAttribute("y1")).toBe(line.getAttribute("y2"));
      expect(line.getAttribute("y1")).toBe(stubs[i].getAttribute("y1"));
    });
  });

  it("draws nothing without a y-domain, even when opted in", () => {
    const { container } = render(() => (
      <ScrubChart
        cells={cells10()}
        scrub={false}
        showGridlines
        renderChart={() => <svg />}
        renderCell={() => <div />}
      />
    ));
    expect(container.querySelector(".sui-scrub-chart__grid")).toBeNull();
  });
});

describe("ScrubChart frame-sizing overrides", () => {
  const cells10 = (): Cell[] => dailyCells(d("2026-05-01"), d("2026-05-10"));

  it("regression: absent overrides leave plotRight at chartWidth and xAxisHeight at 22", () => {
    let seen: ScrubChartContext<Cell> | null = null;
    render(() => (
      <ScrubChart
        cells={cells10()}
        scrub={false}
        xTickCadence="week"
        renderChart={(ctx) => {
          seen = ctx;
          return <svg />;
        }}
        renderCell={() => <div />}
      />
    ));
    // chartWidth is the seeded DEFAULT_CHART_WIDTH (1200) — no ResizeObserver
    // fires under jsdom, so width() never moves off it.
    expect(seen!.width).toBe(1200);
    expect(seen!.plotRight).toBe(seen!.width);
    // height (200 default) minus plotBottom is the x-axis row's height.
    expect(seen!.height - seen!.plotBottom).toBe(22);
  });

  it("rightGutter narrows the plot by exactly its value and moves cellToX", () => {
    let plain: ScrubChartContext<Cell> | null = null;
    let gutter40: ScrubChartContext<Cell> | null = null;
    render(() => (
      <ScrubChart
        cells={cells10()}
        scrub={false}
        renderChart={(ctx) => {
          plain = ctx;
          return <svg />;
        }}
        renderCell={() => <div />}
      />
    ));
    render(() => (
      <ScrubChart
        cells={cells10()}
        scrub={false}
        rightGutter={40}
        renderChart={(ctx) => {
          gutter40 = ctx;
          return <svg />;
        }}
        renderCell={() => <div />}
      />
    ));
    expect(gutter40!.plotRight).toBeCloseTo(plain!.plotRight - 40, 3);
    expect(gutter40!.plotLeft).toBeCloseTo(plain!.plotLeft, 3);
    // A narrower plot moves every cell's centre left of where it sat without
    // the gutter.
    expect(gutter40!.cellToX(0)).toBeLessThan(plain!.cellToX(0));
  });

  it("xAxisExtraHeight raises plotBottom by exactly its value", () => {
    let plain: ScrubChartContext<Cell> | null = null;
    let extra14: ScrubChartContext<Cell> | null = null;
    render(() => (
      <ScrubChart
        cells={cells10()}
        scrub={false}
        renderChart={(ctx) => {
          plain = ctx;
          return <svg />;
        }}
        renderCell={() => <div />}
      />
    ));
    render(() => (
      <ScrubChart
        cells={cells10()}
        scrub={false}
        xAxisExtraHeight={14}
        renderChart={(ctx) => {
          extra14 = ctx;
          return <svg />;
        }}
        renderCell={() => <div />}
      />
    ));
    // No xTickCadence, so the base x-axis height is 0 in both cases —
    // xAxisExtraHeight still reserves its row (see the prop doc).
    expect(extra14!.plotBottom).toBeCloseTo(plain!.plotBottom - 14, 3);
    // Frame height is unaffected — plotBottom moves, height doesn't.
    expect(extra14!.height).toBe(plain!.height);
  });
});

describe("ScrubChart highlight bands", () => {
  // 10 cells across the seeded 1200px frame with no y-axis column → the plot
  // starts at 0 and a cell is exactly 120px wide. Every x/width below is read
  // against that pitch.
  const PITCH = 120;
  const cells10 = (): Cell[] => dailyCells(d("2026-05-01"), d("2026-05-10"));

  const bandChart = (extra: {
    highlights?: ScrubChartHighlight[];
    showGridlines?: boolean;
    yDomain?: [number, number];
  }) =>
    render(() => (
      <ScrubChart
        cells={cells10()}
        scrub={false}
        renderChart={() => <svg data-testid="series" />}
        renderCell={() => <div />}
        {...extra}
      />
    ));

  const bands = (container: HTMLElement): Element[] =>
    Array.from(container.querySelectorAll(".sui-scrub-chart__highlight"));

  it("draws no highlight layer by default", () => {
    const { container } = bandChart({});
    expect(container.querySelector(".sui-scrub-chart__highlights")).toBeNull();
  });

  it("draws one rect per band, spanning the full cells of an inclusive range", () => {
    const { container } = bandChart({
      highlights: [
        { from: 2, to: 4 },
        { from: 7, to: 7 },
      ],
    });
    const rects = bands(container);
    expect(rects.length).toBe(2);
    // from 2 → to 4 covers cells 2, 3 and 4 entirely: three pitches wide.
    expect(Number(rects[0].getAttribute("x"))).toBeCloseTo(2 * PITCH, 3);
    expect(Number(rects[0].getAttribute("width"))).toBeCloseTo(3 * PITCH, 3);
    // A one-cell band still spans that cell's whole width.
    expect(Number(rects[1].getAttribute("x"))).toBeCloseTo(7 * PITCH, 3);
    expect(Number(rects[1].getAttribute("width"))).toBeCloseTo(PITCH, 3);
  });

  it("spans the plot height, not the x-axis row", () => {
    const { container } = bandChart({
      highlights: [{ from: 0, to: 1 }],
      yDomain: [0, 100],
    });
    const rect = bands(container)[0];
    const axisLine = container.querySelector(".sui-scrub-chart__axis-line")!;
    // The y-axis line runs plotTop → plotBottom; the band shares both ends.
    expect(Number(rect.getAttribute("y"))).toBeCloseTo(
      Number(axisLine.getAttribute("y1")),
      3,
    );
    expect(
      Number(rect.getAttribute("y")) + Number(rect.getAttribute("height")),
    ).toBeCloseTo(Number(axisLine.getAttribute("y2")), 3);
  });

  it("clamps a range that runs past the cells and swaps a reversed one", () => {
    const { container } = bandChart({
      highlights: [
        { from: -5, to: 99 },
        { from: 6, to: 3 },
      ],
    });
    const rects = bands(container);
    // Clamped to the whole cell range — never outside the plot.
    expect(Number(rects[0].getAttribute("x"))).toBeCloseTo(0, 3);
    expect(Number(rects[0].getAttribute("width"))).toBeCloseTo(10 * PITCH, 3);
    // Reversed ends describe the same band as the ordered pair.
    expect(Number(rects[1].getAttribute("x"))).toBeCloseTo(3 * PITCH, 3);
    expect(Number(rects[1].getAttribute("width"))).toBeCloseTo(4 * PITCH, 3);
  });

  it("adds a per-band class alongside the shared base class", () => {
    const { container } = bandChart({
      highlights: [
        { from: 1, to: 2, class: "my-gap" },
        { from: 5, to: 6 },
      ],
    });
    const rects = bands(container);
    expect(rects[0].getAttribute("class")).toBe(
      "sui-scrub-chart__highlight my-gap",
    );
    // A band without a class carries the base class alone — no trailing space.
    expect(rects[1].getAttribute("class")).toBe("sui-scrub-chart__highlight");
  });

  it("carries its default fill as a presentation attribute, not a CSS rule", () => {
    // A base RULE and a caller's class are both single-class selectors, so the
    // winner would be settled by stylesheet order — and the library's CSS
    // loading last would flatten every band to the same neutral. A presentation
    // attribute loses to any author rule, so the caller's class always wins.
    const { container } = bandChart({ highlights: [{ from: 1, to: 2 }] });
    const rect = bands(container)[0];
    expect(rect.getAttribute("fill")).toContain(
      "--sui-scrub-chart-highlight-fill",
    );
    expect(rect.getAttribute("opacity")).toContain(
      "--sui-scrub-chart-highlight-opacity",
    );
    const css = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "ScrubChart.css"),
      "utf8",
    );
    expect(css).not.toMatch(/\.sui-scrub-chart__highlight\s*\{/);
  });

  it("paints beneath the gridlines and the series", () => {
    const { container } = bandChart({
      highlights: [{ from: 1, to: 2 }],
      showGridlines: true,
      yDomain: [0, 100],
    });
    const frame = container.querySelector(".sui-scrub-chart__frame")!;
    const order = Array.from(frame.children);
    const at = (selector: string) =>
      order.findIndex((el) => el.matches(selector));
    expect(at(".sui-scrub-chart__highlights")).toBe(0);
    expect(at(".sui-scrub-chart__highlights")).toBeLessThan(
      at(".sui-scrub-chart__grid"),
    );
    expect(at(".sui-scrub-chart__grid")).toBeLessThan(
      at('[data-testid="series"]'),
    );
  });
});

describe("ScrubChart y-fit toggle", () => {
  const cells10 = (): Cell[] => dailyCells(d("2026-05-01"), d("2026-05-10"));

  // Recover the effective y-domain from the ctx. `yToPlot` is linear and maps
  // the domain onto [plotBottom, plotTop], so two samples state the whole map.
  const domainOf = (ctx: ScrubChartContext<Cell>): [number, number] => {
    const at0 = ctx.yToPlot!(0);
    const slope = ctx.yToPlot!(1) - at0;
    return [(ctx.plotBottom - at0) / slope, (ctx.plotTop - at0) / slope];
  };

  // The control is ONE button. It shows the action a click performs, so its
  // accessible name is the assertion that pins the glyph-shows-action rule.
  const fitButton = (container: HTMLElement): HTMLElement =>
    container.querySelector<HTMLElement>(".sui-scrub-chart__y-fit-btn")!;

  // jsdom runs no layout and loads no stylesheet, so the sizes live only in
  // the CSS file. The test reads that file, the way the highlight-fill test
  // above does, and pins the numbers helpers.ts mirrors.
  const chartCss = (): string =>
    readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "ScrubChart.css"),
      "utf8",
    );

  /** The body of the FIRST rule whose selector starts with `selector`. */
  const ruleBody = (css: string, selector: string): string =>
    css.slice(css.indexOf(`${selector} {`)).split("}")[0];

  it("keeps a 26px hit target under a smaller hover border", () => {
    const { container } = render(() => (
      <ScrubChart
        cells={cells10()}
        yFitDomain={() => [10, 90]}
        renderChart={() => <svg />}
        renderCell={() => <div />}
      />
    ));
    // The target is a real button, so a pointer and a keyboard both reach it.
    const btn = fitButton(container);
    expect(btn.tagName).toBe("BUTTON");
    expect(btn.getAttribute("type")).toBe("button");

    // The shared corner class carries the look; the `__y-fit-btn` name stays
    // on the same element as the public hook for this one button.
    expect(btn.classList.contains("sui-scrub-chart__corner-btn")).toBe(true);
    expect(btn.classList.contains("sui-scrub-chart__y-fit-btn")).toBe(true);

    const css = chartCss();
    const rest = ruleBody(css, ".sui-scrub-chart__corner-btn");
    // The button holds the full target at rest, and draws NO border there.
    for (const prop of ["width", "height", "min-width", "min-height"]) {
      expect(rest).toContain(`${prop}: ${Y_FIT_BUTTON_SIZE}px;`);
    }
    expect(rest).toContain("border: 0;");
    expect(rest).toContain("background: none;");

    // A pseudo-element carries the hover border, inset on every side, so the
    // border is SMALLER than the target it sits in.
    const ring = ruleBody(css, ".sui-scrub-chart__corner-btn::after");
    expect(ring).toContain(`inset: ${Y_FIT_HOVER_INSET}px;`);
    expect(ring).toContain("border: 1px solid transparent;");
    const borderSize = Y_FIT_BUTTON_SIZE - 2 * Y_FIT_HOVER_INSET;
    expect(borderSize).toBeGreaterThan(0);
    expect(borderSize).toBeLessThan(Y_FIT_BUTTON_SIZE);

    // Hover paints that border. Focus keeps a ring, so the affordance is not
    // hover-only.
    expect(
      ruleBody(css, ".sui-scrub-chart__corner-btn:hover:not(:disabled)::after"),
    ).toContain("border-color: var(--sui-accent);");
    expect(
      ruleBody(css, ".sui-scrub-chart__corner-btn:focus-visible"),
    ).toContain("outline: 2px solid var(--sui-accent);");
  });

  it("colours the glyph with the series line's token", () => {
    // The showcase strokes its series with `--sui-accent`. The glyph takes the
    // same custom property, so the control names the line it rescales.
    expect(ruleBody(chartCss(), ".sui-scrub-chart__corner-btn")).toContain(
      "color: var(--sui-accent);",
    );
  });

  it("renders no fit toggle without yFitDomain", () => {
    const { container } = render(() => (
      <ScrubChart
        cells={cells10()}
        yDomain={[0, 100]}
        renderChart={() => <svg />}
        renderCell={() => <div />}
      />
    ));
    expect(container.querySelector(".sui-scrub-chart__y-fit")).toBeNull();
    expect(container.querySelector(".sui-scrub-chart__y-fit-btn")).toBeNull();
  });

  it("asks the callback for the visible window in visible mode", () => {
    const asked: [number, number][] = [];
    const { container } = render(() => (
      <ScrubChart
        cells={cells10()}
        yFitDomain={(from, to) => {
          asked.push([from, to]);
          return [10, 90];
        }}
        renderChart={() => <svg />}
        renderCell={() => <div />}
      />
    ));
    expect(container.querySelector(".sui-scrub-chart__y-fit")).toBeTruthy();
    // jsdom reports a zero-width axis viewport, so the visible window is the
    // first cell alone — which is exactly what tells the two modes apart.
    expect(asked[0]).toEqual([0, 0]);
  });

  it("asks the callback for every cell in series mode", () => {
    const asked: [number, number][] = [];
    render(() => (
      <ScrubChart
        cells={cells10()}
        yScaleMode="series"
        yFitDomain={(from, to) => {
          asked.push([from, to]);
          return [10, 90];
        }}
        renderChart={() => <svg />}
        renderCell={() => <div />}
      />
    ));
    expect(asked[0]).toEqual([0, 9]);
  });

  it("reports a click through onYScaleModeChange as the other mode", () => {
    const onChange = vi.fn();
    const { container } = render(() => (
      <ScrubChart
        cells={cells10()}
        yScaleMode="visible"
        onYScaleModeChange={onChange}
        yFitDomain={() => [10, 90]}
        renderChart={() => <svg />}
        renderCell={() => <div />}
      />
    ));
    fireEvent.click(fitButton(container));
    expect(onChange).toHaveBeenCalledWith("series");
  });

  it("starts uncontrolled at visible and switches on click", () => {
    const asked: [number, number][] = [];
    const { container } = render(() => (
      <ScrubChart
        cells={cells10()}
        yFitDomain={(from, to) => {
          asked.push([from, to]);
          return [10, 90];
        }}
        renderChart={() => <svg />}
        renderCell={() => <div />}
      />
    ));
    expect(asked[0]).toEqual([0, 0]);
    fireEvent.click(fitButton(container));
    expect(asked[asked.length - 1]).toEqual([0, 9]);
  });

  it("keeps yDomain working on its own", () => {
    let seen: ScrubChartContext<Cell> | null = null;
    const { container } = render(() => (
      <ScrubChart
        cells={cells10()}
        yDomain={[0, 100]}
        renderChart={(ctx) => {
          seen = ctx;
          return <svg />;
        }}
        renderCell={() => <div />}
      />
    ));
    expect(
      container.querySelectorAll(".sui-scrub-chart__label--y").length,
    ).toBeGreaterThan(0);
    const [low, high] = domainOf(seen!);
    expect(low).toBeCloseTo(0, 6);
    expect(high).toBeCloseTo(100, 6);
  });

  it("falls back to yDomain when the callback returns null", () => {
    let seen: ScrubChartContext<Cell> | null = null;
    render(() => (
      <ScrubChart
        cells={cells10()}
        yDomain={[0, 100]}
        yFitDomain={() => null}
        renderChart={(ctx) => {
          seen = ctx;
          return <svg />;
        }}
        renderCell={() => <div />}
      />
    ));
    const [low, high] = domainOf(seen!);
    expect(low).toBeCloseTo(0, 6);
    expect(high).toBeCloseTo(100, 6);
  });

  it("renders a pinned min exactly while the max still snaps", () => {
    let seen: ScrubChartContext<Cell> | null = null;
    render(() => (
      <ScrubChart
        cells={cells10()}
        yFitPin={{ min: 0 }}
        yFitDomain={() => [10, 90]}
        renderChart={(ctx) => {
          seen = ctx;
          return <svg />;
        }}
        renderCell={() => <div />}
      />
    ));
    const [low, high] = domainOf(seen!);
    // No margin below the pin: the floor is the number the caller stated.
    expect(low).toBeCloseTo(0, 6);
    // The free end takes the margin (90 → 96.4) and then the nice() snap.
    expect(high).toBeCloseTo(100, 6);
  });

  it("labels the top gridline at the nice bound above a pinned floor", () => {
    // The unit tests state the domain. This one states what the reader sees:
    // the free end lands on a round number, and the axis names it. The tween
    // is off, so the domain on screen is the settled one.
    const { container } = render(() => (
      <ScrubChart
        cells={cells10()}
        yFitPin={{ min: 0 }}
        yFitTransition={false}
        yFitDomain={() => [4, 6400]}
        formatYLabel={(v) => v.toLocaleString("en-US")}
        renderChart={() => <svg />}
        renderCell={() => <div />}
      />
    ));
    const labels = [
      ...container.querySelectorAll(".sui-scrub-chart__label--y"),
    ].map((n) => n.textContent);
    expect(labels[0]).toBe("0");
    expect(labels.at(-1)).toBe("7,000");
  });

  it("lets a mode pin override the shared pin for that mode only", () => {
    let seen: ScrubChartContext<Cell> | null = null;
    const chart = (mode: "visible" | "series") => (
      <ScrubChart
        cells={cells10()}
        yScaleMode={mode}
        yFitPin={{ min: 0, series: { min: -100 } }}
        yFitDomain={() => [10, 90]}
        renderChart={(ctx) => {
          seen = ctx;
          return <svg />;
        }}
        renderCell={() => <div />}
      />
    );
    render(() => chart("visible"));
    expect(domainOf(seen!)[0]).toBeCloseTo(0, 6);
    render(() => chart("series"));
    expect(domainOf(seen!)[0]).toBeCloseTo(-100, 6);
  });

  it("drops the floor to a yFitBounds min the fit never reached", () => {
    let seen: ScrubChartContext<Cell> | null = null;
    render(() => (
      <ScrubChart
        cells={cells10()}
        yScaleMode="series"
        yFitBounds={{ series: { min: 0 } }}
        yFitDomain={() => [300, 900]}
        renderChart={(ctx) => {
          seen = ctx;
          return <svg />;
        }}
        renderCell={() => <div />}
      />
    ));
    const [low, high] = domainOf(seen!);
    // The bound runs after the margin and the snap, so the floor is exact.
    expect(low).toBeCloseTo(0, 6);
    // The free end keeps the snap it had.
    expect(high).toBeCloseTo(1000, 6);
  });

  it("keeps a fitted floor that already sits below the yFitBounds min", () => {
    // The bound INCLUDES, it never overrides. A pin would clip the -50 cell
    // off the plot; the bound leaves it visible.
    let seen: ScrubChartContext<Cell> | null = null;
    render(() => (
      <ScrubChart
        cells={cells10()}
        yScaleMode="series"
        yFitBounds={{ series: { min: 0 } }}
        yFitDomain={() => [-50, 900]}
        renderChart={(ctx) => {
          seen = ctx;
          return <svg />;
        }}
        renderCell={() => <div />}
      />
    ));
    expect(domainOf(seen!)[0]).toBeLessThanOrEqual(-50);
  });

  it("gives each y-scale mode its own bound", () => {
    let seen: ScrubChartContext<Cell> | null = null;
    const chart = (mode: "visible" | "series") => (
      <ScrubChart
        cells={cells10()}
        yScaleMode={mode}
        yFitBounds={{ series: { min: 0 } }}
        yFitDomain={() => [300, 900]}
        renderChart={(ctx) => {
          seen = ctx;
          return <svg />;
        }}
        renderCell={() => <div />}
      />
    );
    render(() => chart("series"));
    expect(domainOf(seen!)[0]).toBeCloseTo(0, 6);
    // "visible" names no bound, so that mode keeps the domain it fitted.
    render(() => chart("visible"));
    expect(domainOf(seen!)[0]).toBeGreaterThan(0);
  });

  it("hosts the toggle in the x-axis row, reserving no row of its own", () => {
    let withToggle: ScrubChartContext<Cell> | null = null;
    let without: ScrubChartContext<Cell> | null = null;
    render(() => (
      <ScrubChart
        cells={cells10()}
        xTickCadence="month"
        yFitDomain={() => [10, 90]}
        renderChart={(ctx) => {
          withToggle = ctx;
          return <svg />;
        }}
        renderCell={() => <div />}
      />
    ));
    render(() => (
      <ScrubChart
        cells={cells10()}
        xTickCadence="month"
        yDomain={[10, 90]}
        renderChart={(ctx) => {
          without = ctx;
          return <svg />;
        }}
        renderCell={() => <div />}
      />
    ));
    // jsdom runs no layout, so the test states the CONTRACT instead of the
    // pixels. The toggle sits in the axis origin corner and takes NO row of
    // its own: the x-axis row grows from the label row to the button's
    // footprint, and no further. Every px below plotBottom is that one row.
    expect(without!.height - without!.plotBottom).toBe(DEFAULT_X_AXIS_HEIGHT);
    expect(withToggle!.height - withToggle!.plotBottom).toBe(Y_FIT_FOOTPRINT);
    expect(withToggle!.height).toBe(without!.height);
    // The button hangs from plotBottom in the y-axis column, so the column
    // must hold it: the effective width covers the footprint AND the gutter
    // that moves the labels right of the button.
    expect(withToggle!.plotLeft).toBeGreaterThanOrEqual(Y_FIT_COLUMN);
  });

  it("holds the left margin open for the toggle when labels are narrow", () => {
    let fitted: ScrubChartContext<Cell> | null = null;
    let plain: ScrubChartContext<Cell> | null = null;
    let explicit: ScrubChartContext<Cell> | null = null;
    // "0" through "4" measure far narrower than the 26px button.
    const labels = (v: number) => String(v);
    render(() => (
      <ScrubChart
        cells={cells10()}
        yFitPin={{ min: 0, max: 4 }}
        yFitDomain={() => [0, 4]}
        formatYLabel={labels}
        renderChart={(ctx) => {
          fitted = ctx;
          return <svg />;
        }}
        renderCell={() => <div />}
      />
    ));
    render(() => (
      <ScrubChart
        cells={cells10()}
        yDomain={[0, 4]}
        formatYLabel={labels}
        renderChart={(ctx) => {
          plain = ctx;
          return <svg />;
        }}
        renderCell={() => <div />}
      />
    ));
    // The labels alone ask for a column narrower than the control. With the
    // control present the DEFAULT column grows to the button's footprint, so
    // the button neither overflows the frame's left edge nor reaches into
    // the plot.
    expect(plain!.plotLeft).toBeLessThan(Y_FIT_COLUMN);
    expect(fitted!.plotLeft).toBe(Y_FIT_COLUMN);
    // The gutter is the whole difference between the column and the row.
    expect(Y_FIT_COLUMN - Y_FIT_FOOTPRINT).toBe(Y_FIT_GUTTER);

    render(() => (
      <ScrubChart
        cells={cells10()}
        yAxisWidth={12}
        yFitPin={{ min: 0, max: 4 }}
        yFitDomain={() => [0, 4]}
        formatYLabel={labels}
        renderChart={(ctx) => {
          explicit = ctx;
          return <svg />;
        }}
        renderCell={() => <div />}
      />
    ));
    // An explicit width is used AS GIVEN. The caller owns the column, even
    // when the width clips the control.
    expect(explicit!.plotLeft).toBe(12);
  });

  it("reports the picked mode from the control on its own", () => {
    const picked: string[] = [];
    const { container } = render(() => (
      <ScrubChartYFitControl
        mode={() => "visible"}
        onSelect={(m) => picked.push(m)}
      />
    ));
    // Mounted directly, so the control answers for its own markup: one
    // button, and a click reports the OTHER mode.
    expect(
      container.querySelectorAll(".sui-scrub-chart__y-fit-btn"),
    ).toHaveLength(1);
    fireEvent.click(fitButton(container));
    expect(picked).toEqual(["series"]);
  });

  // The button depicts what a click DOES, not the mode it is in. The name and
  // the glyph must agree, so a reader who reads the label and a reader who
  // reads the icon reach the same expectation.
  it("names the ACTION a click performs, per mode", () => {
    const visible = render(() => (
      <ScrubChartYFitControl mode={() => "visible"} onSelect={() => {}} />
    ));
    expect(fitButton(visible.container).getAttribute("aria-label")).toBe(
      "Fit to all",
    );

    const series = render(() => (
      <ScrubChartYFitControl mode={() => "series"} onSelect={() => {}} />
    ));
    expect(fitButton(series.container).getAttribute("aria-label")).toBe(
      "Fit to visible",
    );
  });

  it("reports the other mode from series too", () => {
    const picked: string[] = [];
    const { container } = render(() => (
      <ScrubChartYFitControl
        mode={() => "series"}
        onSelect={(m) => picked.push(m)}
      />
    ));
    fireEvent.click(fitButton(container));
    expect(picked).toEqual(["visible"]);
  });

  it("re-measures the y-axis column when the mode widens the labels", () => {
    let seen: ScrubChartContext<Cell> | null = null;
    // "visible" fits cell 0 alone in jsdom (the axis viewport reports zero
    // width), so the two modes hand back domains with very different label
    // widths: "6" against "8,000".
    const { container } = render(() => (
      <ScrubChart
        cells={cells10()}
        yFitPin={{ min: 0 }}
        // Tween off, so the 8,000 label is on screen the frame the mode
        // changes. With the tween on, that tick starts above the plot and
        // slides in — the domain-tween tests below cover that path.
        yFitTransition={false}
        yFitDomain={(_from, to) => (to === 0 ? [0, 6] : [0, 8000])}
        formatYLabel={(v) => v.toLocaleString("en-US")}
        renderChart={(ctx) => {
          seen = ctx;
          return <svg />;
        }}
        renderCell={() => <div />}
      />
    ));
    const narrow = seen!.plotLeft;
    fireEvent.click(fitButton(container));
    const wide = seen!.plotLeft;
    // The reserved column tracks the EFFECTIVE domain, not the `yDomain`
    // prop, so a mode switch widens it. Left of plotLeft is the only space
    // the label has; a stale column clips "8,000" at the frame edge.
    expect(wide).toBeGreaterThan(narrow);
    const label = [
      ...container.querySelectorAll(".sui-scrub-chart__label--y"),
    ].find((n) => n.textContent === "8,000");
    expect(label).toBeTruthy();
    expect(Number(label!.getAttribute("x"))).toBeLessThan(wide);
    expect(Number(label!.getAttribute("x"))).toBeGreaterThan(0);
  });

  it("keeps an explicit yAxisWidth across a mode switch", () => {
    let seen: ScrubChartContext<Cell> | null = null;
    const { container } = render(() => (
      <ScrubChart
        cells={cells10()}
        yAxisWidth={44}
        yFitPin={{ min: 0 }}
        yFitDomain={(_from, to) => (to === 0 ? [0, 6] : [0, 8000])}
        formatYLabel={(v) => v.toLocaleString("en-US")}
        renderChart={(ctx) => {
          seen = ctx;
          return <svg />;
        }}
        renderCell={() => <div />}
      />
    ));
    expect(seen!.plotLeft).toBe(44);
    fireEvent.click(fitButton(container));
    // The caller's width wins in both modes — measurement never overrides it.
    expect(seen!.plotLeft).toBe(44);
  });

  it("renders two pinned ends as exactly that domain", () => {
    let seen: ScrubChartContext<Cell> | null = null;
    render(() => (
      <ScrubChart
        cells={cells10()}
        yFitPin={{ min: -5, max: 5 }}
        yFitDomain={() => [10, 90]}
        renderChart={(ctx) => {
          seen = ctx;
          return <svg />;
        }}
        renderCell={() => <div />}
      />
    ));
    const [low, high] = domainOf(seen!);
    expect(low).toBeCloseTo(-5, 6);
    expect(high).toBeCloseTo(5, 6);
  });
});

// ── Y-label clipping ─────────────────────────────────────────────────────
// A y-tick label is centred on its gridline. A tick on the domain end lands
// on `plotTop` or on `plotBottom`, so the label's outer half falls outside
// the frame and the frame clips it. See `clampLabelBaseline` in helpers.ts.
describe("ScrubChart y-label clipping", () => {
  const cells10 = (): Cell[] => dailyCells(d("2026-05-01"), d("2026-05-10"));

  it("leaves a label with room on both sides where it is", () => {
    expect(clampLabelBaseline(100, 200)).toBe(100);
  });

  it("moves a label on the top edge down by its half height", () => {
    expect(clampLabelBaseline(0, 200)).toBe(Y_LABEL_HALF_HEIGHT);
  });

  it("moves a label on the bottom edge up by its half height", () => {
    expect(clampLabelBaseline(200, 200)).toBe(200 - Y_LABEL_HALF_HEIGHT);
  });

  it("centres a label in a frame shorter than one label", () => {
    expect(clampLabelBaseline(0, 8)).toBe(4);
  });

  // The floor is the whole collision fix. Without the y-fit control it is the
  // frame; with the control it rises to the button's top edge.
  it("floors a label on the frame without the y-fit control", () => {
    expect(yLabelFloor(200, 172, false)).toBe(200);
  });

  it("floors a label on the button's top edge with the control", () => {
    expect(yLabelFloor(200, 172, true)).toBe(172 + Y_FIT_LEVEL_OFFSET);
    // The button starts ABOVE `plotBottom`, because it centres on the x tick
    // labels and is taller than the drop to their centre line.
    expect(Y_FIT_LEVEL_OFFSET).toBeLessThan(0);
    // It still ends inside the frame the footprint reserves.
    expect(Y_FIT_LEVEL_OFFSET + Y_FIT_BUTTON_SIZE).toBeLessThanOrEqual(
      Y_FIT_FOOTPRINT,
    );
  });

  // The gutter moves the y labels right. The lowest label therefore clears
  // the button in BOTH axes, and the vertical floor still holds on its own.
  it("keeps the lowest y label clear of the button after the gutter", () => {
    // Horizontally: a y label ends `Y_LABEL_GAP` left of `plotLeft`, and the
    // DEFAULT column is at least `Y_FIT_COLUMN` wide, so the label's RIGHT
    // edge sits right of the button's RIGHT edge.
    const buttonRight = Y_FIT_INSET + Y_FIT_BUTTON_SIZE;
    expect(Y_FIT_COLUMN - Y_LABEL_GAP).toBeGreaterThanOrEqual(buttonRight);
    // The gutter is what buys that clearance: without it the label would end
    // over the button.
    expect(Y_FIT_COLUMN - Y_LABEL_GAP - Y_FIT_GUTTER).toBeLessThan(buttonRight);
    // Vertically: the floor still bounds the label by the button's top edge,
    // and a label held there keeps its whole line box above the button.
    const floor = yLabelFloor(200, 172, true);
    expect(floor).toBe(172 + Y_FIT_LEVEL_OFFSET);
    expect(
      clampLabelBaseline(172, floor) + Y_LABEL_HALF_HEIGHT,
    ).toBeLessThanOrEqual(floor);
  });

  it("keeps the top rule and the floor from fighting", () => {
    // A floor under one whole label leaves no band. The label then centres in
    // what room there is, so neither rule wins over the other.
    expect(clampLabelBaseline(0, Y_LABEL_HALF_HEIGHT * 2)).toBe(
      Y_LABEL_HALF_HEIGHT,
    );
  });

  it("draws the top and the bottom y label fully inside the frame", () => {
    // `nice()` puts a tick on each end of [0, 100], and this chart reserves
    // no x-axis row and no fit row, so both ticks sit on a frame edge.
    const { container } = render(() => (
      <ScrubChart
        cells={cells10()}
        chartHeight={200}
        yDomain={[0, 100]}
        showGridlines
        renderChart={() => <svg />}
        renderCell={() => <div />}
      />
    ));
    const labels = [
      ...container.querySelectorAll(".sui-scrub-chart__label--y"),
    ];
    const yOf = (text: string): number =>
      Number(
        labels.find((n) => n.textContent === text)?.getAttribute("y") ?? NaN,
      );
    // Both edge ticks DRAW. `nice()` puts one on `plotTop` and one on
    // `plotBottom`, and the axis must withhold neither.
    expect(labels.map((n) => n.textContent)).toEqual([
      "0",
      "20",
      "40",
      "60",
      "80",
      "100",
    ]);
    expect(yOf("100")).toBe(Y_LABEL_HALF_HEIGHT);
    expect(yOf("0")).toBe(200 - Y_LABEL_HALF_HEIGHT);
    // Every label keeps its whole line box inside the frame.
    for (const label of labels) {
      const y = Number(label.getAttribute("y"));
      expect(y).toBeGreaterThanOrEqual(Y_LABEL_HALF_HEIGHT);
      expect(y).toBeLessThanOrEqual(200 - Y_LABEL_HALF_HEIGHT);
    }
    // The GRIDLINES stay on the ticks — only the text moves.
    const rules = [
      ...container.querySelectorAll(".sui-scrub-chart__grid-line"),
    ].map((n) => Number(n.getAttribute("y1")));
    expect(rules).toContain(0);
    expect(rules).toContain(200);
  });

  // The collision: the y-fit button holds the origin corner, and the lowest
  // tick sits ON `plotBottom`. A label centred there loses its lower half
  // behind the button. The assertions read the FLOOR the fix exposes, not a
  // pixel — jsdom runs no layout and measures no text.
  it("lifts the lowest y label clear of the y-fit button", () => {
    let ctx: ScrubChartContext<Cell> | null = null;
    const { container } = render(() => (
      <ScrubChart
        cells={cells10()}
        chartHeight={200}
        xTickCadence="month"
        yFitPin={{ min: 0, max: 100 }}
        yFitDomain={() => [0, 100]}
        renderChart={(seen) => {
          ctx = seen;
          return <svg />;
        }}
        renderCell={() => <div />}
      />
    ));
    const labels = [
      ...container.querySelectorAll(".sui-scrub-chart__label--y"),
    ];
    const yOf = (text: string): number =>
      Number(
        labels.find((n) => n.textContent === text)?.getAttribute("y") ?? NaN,
      );
    const floor = yLabelFloor(200, ctx!.plotBottom, true);
    // The label's whole line box sits above the button's top edge, and so
    // above `plotBottom` as well.
    expect(yOf("0")).toBe(floor - Y_LABEL_HALF_HEIGHT);
    expect(yOf("0") + Y_LABEL_HALF_HEIGHT).toBeLessThanOrEqual(ctx!.plotBottom);
    // The GRIDLINE stays on the tick — only the text moves.
    const stubs = [...container.querySelectorAll(".sui-scrub-chart__tick")].map(
      (n) => Number(n.getAttribute("y1")),
    );
    expect(stubs).toContain(ctx!.plotBottom);
  });

  // The two clamp rules are pinned TOGETHER: lifting the lowest label must
  // not push the top one out through the frame's top edge.
  it("keeps the top y label inside the frame while the floor lifts", () => {
    let ctx: ScrubChartContext<Cell> | null = null;
    const { container } = render(() => (
      <ScrubChart
        cells={cells10()}
        chartHeight={200}
        xTickCadence="month"
        yFitPin={{ min: 0, max: 100 }}
        yFitDomain={() => [0, 100]}
        renderChart={(seen) => {
          ctx = seen;
          return <svg />;
        }}
        renderCell={() => <div />}
      />
    ));
    const labels = [
      ...container.querySelectorAll(".sui-scrub-chart__label--y"),
    ];
    const floor = yLabelFloor(200, ctx!.plotBottom, true);
    // The top tick sits on `plotTop`, so the top rule moves it down by half a
    // label. Every label holds BOTH bounds at once.
    const top = labels.find((n) => n.textContent === "100");
    expect(Number(top?.getAttribute("y"))).toBe(Y_LABEL_HALF_HEIGHT);
    for (const label of labels) {
      const y = Number(label.getAttribute("y"));
      expect(y).toBeGreaterThanOrEqual(Y_LABEL_HALF_HEIGHT);
      expect(y).toBeLessThanOrEqual(floor - Y_LABEL_HALF_HEIGHT);
    }
  });
});

// ── Y-domain tween ───────────────────────────────────────────────────────
// The rAF loop itself is not exercised here: jsdom's frame timing is not
// worth asserting on. yDomainTween.test.ts drives the loop through an
// injected clock, and these tests cover what ScrubChart wires around it.
describe("ScrubChart y-domain tween", () => {
  const cells10 = (): Cell[] => dailyCells(d("2026-05-01"), d("2026-05-10"));
  // The control is ONE button. It shows the action a click performs, so its
  // accessible name is the assertion that pins the glyph-shows-action rule.
  const fitButton = (container: HTMLElement): HTMLElement =>
    container.querySelector<HTMLElement>(".sui-scrub-chart__y-fit-btn")!;
  const domainOf = (ctx: ScrubChartContext<Cell>): [number, number] => {
    const at0 = ctx.yToPlot!(0);
    const slope = ctx.yToPlot!(1) - at0;
    return [(ctx.plotBottom - at0) / slope, (ctx.plotTop - at0) / slope];
  };
  // Two modes, two very different domains — the mode click is the jump.
  // ScrubChart pads the free end and snaps it, so [0, 100] draws as
  // [0, 120] and [0, 8000] draws as [0, 10000]. See fitYDomain.
  const fit = (_from: number, to: number): [number, number] =>
    to === 0 ? [0, 100] : [0, 8000];
  const VISIBLE_MAX = 120;
  const SERIES_MAX = 10000;

  const renderChart = (props: {
    transition?: number | false;
  }): { container: HTMLElement; ctx: () => ScrubChartContext<Cell> } => {
    let seen: ScrubChartContext<Cell> | null = null;
    const { container } = render(() => (
      <ScrubChart
        cells={cells10()}
        yFitPin={{ min: 0 }}
        yFitTransition={props.transition}
        yFitDomain={fit}
        formatYLabel={(v) => v.toLocaleString("en-US")}
        renderChart={(ctx) => {
          seen = ctx;
          return <svg />;
        }}
        renderCell={() => <div />}
      />
    ));
    return { container, ctx: () => seen! };
  };

  it("shows the target domain at once when the tween is off", () => {
    const chart = renderChart({ transition: false });
    fireEvent.click(fitButton(chart.container));
    expect(domainOf(chart.ctx())[1]).toBeCloseTo(SERIES_MAX, 6);
  });

  it("skips the tween for a reader who asks for less motion", () => {
    const real = window.matchMedia;
    window.matchMedia = ((query: string) =>
      ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
        addListener: () => {},
        removeListener: () => {},
      }) as unknown as MediaQueryList) as typeof window.matchMedia;
    try {
      // The default transition applies, and the domain still arrives on the
      // same frame as the click — the tween is skipped, not shortened.
      const chart = renderChart({});
      fireEvent.click(fitButton(chart.container));
      expect(domainOf(chart.ctx())[1]).toBeCloseTo(SERIES_MAX, 6);
    } finally {
      window.matchMedia = real;
    }
  });

  it("holds the old domain for the series while the tween runs", () => {
    const chart = renderChart({});
    fireEvent.click(fitButton(chart.container));
    // `yToPlot` maps through the domain ON SCREEN, so the caller's series
    // moves WITH the axis instead of jumping ahead of it.
    expect(domainOf(chart.ctx())[1]).toBeCloseTo(VISIBLE_MAX, 6);
  });

  it("measures the label column from the TARGET domain", () => {
    const chart = renderChart({});
    const narrow = chart.ctx().plotLeft;
    fireEvent.click(fitButton(chart.container));
    // The column answers "8,000" the same frame, though the axis still shows
    // the old domain. A column measured per frame would resize all the way.
    expect(chart.ctx().plotLeft).toBeGreaterThan(narrow);
  });

  // The regression: a settled domain whose MAX is a tick showed every label
  // but that one. The axis withholds a target tick the domain on screen does
  // not hold yet, which is right while the tween runs and wrong once it
  // lands. The assertions read the RENDERED labels, so they outlive any
  // rewrite of the withholding rule.
  it("renders the max tick's label once the tween settles", async () => {
    const chart = renderChart({});
    const values = (): (string | null)[] =>
      [...chart.container.querySelectorAll(".sui-scrub-chart__label--y")].map(
        (n) => n.textContent,
      );
    fireEvent.click(fitButton(chart.container));
    await vi.waitFor(() => expect(values()).toContain("10,000"), {
      timeout: 3000,
    });
    // Every tick of the settled domain draws, the max one included.
    expect(values()).toEqual([
      "0",
      "2,000",
      "4,000",
      "6,000",
      "8,000",
      "10,000",
    ]);
    // The max tick sits on `plotTop`, so its label clamps into the frame.
    const top = [
      ...chart.container.querySelectorAll(".sui-scrub-chart__label--y"),
    ].find((n) => n.textContent === "10,000");
    expect(Number(top?.getAttribute("y"))).toBe(Y_LABEL_HALF_HEIGHT);
  });

  // The destination, not the journey: the screen scale and the target scale
  // must hold the SAME domain at rest. A tween that aimed at the padded
  // domain, or at any other pre-snap value, would settle short of the target
  // and report arrival at the wrong number.
  it("settles the screen domain on the axis's target domain", async () => {
    const chart = renderChart({});
    fireEvent.click(fitButton(chart.container));
    // `domainOf` reads the SCREEN scale through `yToPlot`.
    await vi.waitFor(
      () => expect(domainOf(chart.ctx())[1]).toBeCloseTo(SERIES_MAX, 6),
      { timeout: 3000 },
    );
    const [low, high] = domainOf(chart.ctx());
    expect(low).toBeCloseTo(0, 6);
    // 8640 is the padded max of [0, 8000]. The snap lifts it to 10000, and
    // the tween stops on the snapped number.
    expect(high).toBeCloseTo(SERIES_MAX, 6);
  });

  // The browser defect a jsdom test missed. A HIDDEN document runs no
  // animation frame, so the tween stopped where it stood and the axis
  // withheld every tick the stopped domain missed — the max label among
  // them — for as long as the tab stayed in the background.
  it("shows the whole axis at once while the document is hidden", () => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    try {
      const chart = renderChart({});
      fireEvent.click(fitButton(chart.container));
      // No frame runs, so the domain and every label must land this frame.
      expect(domainOf(chart.ctx())[1]).toBeCloseTo(SERIES_MAX, 6);
      const values = [
        ...chart.container.querySelectorAll(".sui-scrub-chart__label--y"),
      ].map((n) => n.textContent);
      expect(values).toEqual([
        "0",
        "2,000",
        "4,000",
        "6,000",
        "8,000",
        "10,000",
      ]);
    } finally {
      Reflect.deleteProperty(document, "visibilityState");
    }
  });

  it("renders the max tick's label at once when the tween is off", () => {
    const chart = renderChart({ transition: false });
    fireEvent.click(fitButton(chart.container));
    const values = [
      ...chart.container.querySelectorAll(".sui-scrub-chart__label--y"),
    ].map((n) => n.textContent);
    expect(values).toContain("10,000");
  });

  it("takes its tick VALUES from the target domain", () => {
    const chart = renderChart({});
    const values = () =>
      [...chart.container.querySelectorAll(".sui-scrub-chart__label--y")].map(
        (n) => n.textContent,
      );
    expect(values()).toContain("120");
    fireEvent.click(fitButton(chart.container));
    // The ticks now come from the TARGET domain [0, 10000]. Only its zero
    // tick is inside the domain on screen, which still reaches 120, so the
    // rest wait above the plot and slide in as the tween runs. A per-frame
    // recompute would answer 30, 60, 90, 120 here instead.
    expect(values()).toEqual(["0"]);
  });
});
