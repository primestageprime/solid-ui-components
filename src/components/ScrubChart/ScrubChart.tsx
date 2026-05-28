// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// ScrubChart — Composite (Depth 2).
// Linear-scale chart paired with a DateAxis (overview + detail).
//
//   ┌─ chart frame (renderChart slot) ───────────────────────────────┐
//   │  user-drawn line/series at linear scale across all cells       │
//   │  + ScrubChart-drawn window band over the slice currently       │
//   │    visible in the DateAxis viewport                            │
//   └────────────────────────────────────────────────────────────────┘
//   ┌─ DateAxis ─────────────────────────────────────────────────────┐
//   │  horizontally scrollable cell ribbon                           │
//   └────────────────────────────────────────────────────────────────┘
//
// Replaces the original fisheye implementation (selectedFraction /
// sideCompression / gutter / pointer-anchored drag). The linear scale is
// uniform across all cells — `cellToX(i)` is just `(i + 0.5) × dayPitch`
// — and the DateAxis's scroll position drives the window-band overlay so
// the chart serves as a minimap.
// ============================================

import {
  type Component,
  type JSX,
  Show,
  createMemo,
  createSignal,
  mergeProps,
  onCleanup,
  onMount,
} from "solid-js";
import { DateAxis, type Cell, type DateAxisCellContext } from "../DateAxis";
import "./ScrubChart.css";

/** Context passed to the consumer's `renderChart`. */
export interface ScrubChartContext<C extends Cell> {
  /** Centre x in chart pixels for the cell at `index`. Linear. */
  cellToX(index: number): number;
  /** [leftX, rightX] in chart pixels for the cell at `index`. */
  cellBounds(index: number): [number, number];
  /** Width of one cell in chart pixels (`width / cells.length`). */
  dayPitch: number;
  /** Selected cell's index. */
  selected: number;
  /** Full cell array, for iteration + payload access. */
  cells: C[];
  /** [firstIndex, lastIndex] of cells currently visible in the axis viewport. */
  windowCells: [number, number];
  /** [leftX, rightX] in chart pixels covering the visible-window cells. */
  windowBounds: [number, number];
  width: number;
  height: number;
}

export interface ScrubChartProps<C extends Cell> {
  cells: C[];
  selected: number;
  onScrub: (index: number, cell: C) => void;
  renderChart: (ctx: ScrubChartContext<C>) => JSX.Element;
  renderCell: (cell: C, ctx: DateAxisCellContext) => JSX.Element;

  /** Chart drawing-area height in px. Default 200. */
  chartHeight?: number;
  /** Width of one axis cell in px. Default 40. */
  cellWidth?: number;
  /** `today` Date forwarded to the inner DateAxis. */
  today?: Date;
}

const DEFAULT_CHART_WIDTH = 1200;
const DEFAULT_CHART_HEIGHT = 200;
const DEFAULT_CELL_WIDTH = 40;

export const ScrubChart = <C extends Cell>(
  props: ScrubChartProps<C>,
): JSX.Element => {
  const chartHeight = () => props.chartHeight ?? DEFAULT_CHART_HEIGHT;
  const cellWidth = () => props.cellWidth ?? DEFAULT_CELL_WIDTH;

  // Chart pixel width is measured via ResizeObserver on the frame.
  const [chartWidth, setChartWidth] = createSignal(DEFAULT_CHART_WIDTH);
  let frameEl: HTMLDivElement | undefined;
  onMount(() => {
    if (!frameEl) return;
    if (typeof ResizeObserver === "undefined") return;
    const obs = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setChartWidth(entry.contentRect.width);
    });
    obs.observe(frameEl);
    onCleanup(() => obs.disconnect());
  });

  // Linear day pitch.
  const dayPitch = createMemo(() =>
    props.cells.length > 0 ? chartWidth() / props.cells.length : 0,
  );
  const indexToX = (i: number): number => (i + 0.5) * dayPitch();
  const indexBounds = (i: number): [number, number] => [
    i * dayPitch(),
    (i + 1) * dayPitch(),
  ];
  const xToIndex = (x: number): number => {
    if (props.cells.length === 0) return 0;
    const pitch = dayPitch();
    if (pitch <= 0) return 0;
    return Math.max(0, Math.min(props.cells.length - 1, Math.floor(x / pitch)));
  };

  // ── Track the inner DateAxis's scroll position + viewport width so we
  //    can render the window-band overlay over the slice of overview data
  //    currently visible in the axis.
  const [axisScrollLeft, setAxisScrollLeft] = createSignal(0);
  const [axisViewportWidth, setAxisViewportWidth] = createSignal(0);
  const handleAxisRef = (el: HTMLDivElement) => {
    setAxisViewportWidth(el.clientWidth);
    setAxisScrollLeft(el.scrollLeft);
    el.addEventListener(
      "scroll",
      () => setAxisScrollLeft(el.scrollLeft),
      { passive: true },
    );
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => setAxisViewportWidth(el.clientWidth));
      ro.observe(el);
      onCleanup(() => ro.disconnect());
    }
  };

  const windowCells = createMemo<[number, number]>(() => {
    const w = cellWidth();
    if (w <= 0 || props.cells.length === 0) return [0, 0];
    const first = Math.max(0, Math.floor(axisScrollLeft() / w));
    const last = Math.min(
      props.cells.length - 1,
      Math.ceil((axisScrollLeft() + axisViewportWidth()) / w) - 1,
    );
    return [first, Math.max(first, last)];
  });
  const windowBounds = createMemo<[number, number]>(() => {
    const [first, last] = windowCells();
    return [first * dayPitch(), (last + 1) * dayPitch()];
  });

  const ctx = (): ScrubChartContext<C> => ({
    cellToX: indexToX,
    cellBounds: indexBounds,
    dayPitch: dayPitch(),
    selected: props.selected,
    cells: props.cells,
    windowCells: windowCells(),
    windowBounds: windowBounds(),
    width: chartWidth(),
    height: chartHeight(),
  });

  // ── Pointer-driven scrub on the chart. Linear pitch means every move
  //    maps directly to a cell index — no anchored layout, no tween.
  let dragging = false;
  const clampIdx = (i: number): number =>
    Math.max(0, Math.min(props.cells.length - 1, i));
  const handlePointerDown = (e: PointerEvent) => {
    if (!frameEl || props.cells.length === 0) return;
    const rect = frameEl.getBoundingClientRect();
    const idx = clampIdx(xToIndex(e.clientX - rect.left));
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    dragging = true;
    props.onScrub(idx, props.cells[idx]);
  };
  const handlePointerMove = (e: PointerEvent) => {
    if (!dragging || !frameEl) return;
    const rect = frameEl.getBoundingClientRect();
    const idx = clampIdx(xToIndex(e.clientX - rect.left));
    if (idx !== props.selected) props.onScrub(idx, props.cells[idx]);
  };
  const handlePointerUp = (e: PointerEvent) => {
    if (!dragging) return;
    try {
      (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
    } catch {
      /* not captured; nothing to release */
    }
    dragging = false;
  };

  return (
    <div class="sui-scrub-chart">
      <div
        class="sui-scrub-chart__frame"
        style={{ height: `${chartHeight()}px` }}
        ref={(el) => (frameEl = el)}
      >
        <Show when={chartWidth() > 0}>{props.renderChart(ctx())}</Show>
        {/* Window-band overlay — owned by ScrubChart so consumers don't
            have to draw it themselves. Translucent rect over the slice of
            cells currently visible in the axis viewport. */}
        <Show when={props.cells.length > 0}>
          <svg
            class="sui-scrub-chart__window"
            viewBox={`0 0 ${chartWidth()} ${chartHeight()}`}
            preserveAspectRatio="none"
          >
            <rect
              x={windowBounds()[0]}
              y={0}
              width={windowBounds()[1] - windowBounds()[0]}
              height={chartHeight()}
              fill="var(--sui-scrub-chart-window-fill, rgba(88,166,255,0.14))"
              stroke="var(--sui-scrub-chart-window-stroke, rgba(88,166,255,0.55))"
              stroke-width={1}
            />
          </svg>
        </Show>
        <div
          class="sui-scrub-chart__overlay"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      </div>

      <DateAxis<C>
        cells={props.cells}
        selected={props.selected}
        today={props.today}
        cellWidth={cellWidth()}
        onCellClick={(idx, cell) => props.onScrub(idx, cell)}
        renderCell={props.renderCell}
        scrollableRef={handleAxisRef}
      />
    </div>
  );
};

// ── Override / Data split + factory ───────────────────────────────────────

/**
 * Props that are visual / structural overrides — locked at variant-definition
 * time. Just the two sizing knobs; everything else is data or a callback.
 */
export type ScrubChartOverrides<C extends Cell> = Pick<
  ScrubChartProps<C>,
  "chartHeight" | "cellWidth"
>;

/** Props that remain available to consumers of a curried ScrubChart variant. */
export type ScrubChartDataProps<C extends Cell> = Omit<
  ScrubChartProps<C>,
  keyof ScrubChartOverrides<C>
>;

/**
 * Factory that returns a curried ScrubChart with `chartHeight` and / or
 * `cellWidth` baked in. Per STYLE_GUIDE.md "Variant Surface: keep it
 * minimal", no concrete named variant ships yet — defaults handle the only
 * known use case. Add one when a second emerges.
 */
export function createScrubChart<C extends Cell = Cell>(
  defaults: Partial<ScrubChartOverrides<C>>,
): Component<ScrubChartDataProps<C>> {
  return (props) => (
    <ScrubChart<C> {...(mergeProps(defaults, props) as ScrubChartProps<C>)} />
  );
}
