// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// ScrubChart — Composite (Depth 2).
// Linear-scale chart paired with a DateAxis (overview + detail).
//
//   ┌─ chart frame (renderChart slot) ───────────────────────────────┐
//   │  optional y-axis │  user-drawn line/series at linear scale     │
//   │  labels (left)   │  across all cells + ScrubChart-drawn        │
//   │                  │  window band over the slice currently       │
//   │                  │  visible in the DateAxis viewport           │
//   │                  ├──────────────────────────────────────────── │
//   │                  │  optional x-axis ticks (week / month)       │
//   └────────────────────────────────────────────────────────────────┘
//   ┌─ DateAxis ─────────────────────────────────────────────────────┐
//   │  horizontally scrollable cell ribbon                           │
//   └────────────────────────────────────────────────────────────────┘
//
// Replaces the original fisheye implementation (selectedFraction /
// sideCompression / gutter / pointer-anchored drag). The linear scale is
// uniform across all cells — `cellToX(i)` is just `plotLeft + (i + 0.5) ×
// dayPitch` — and the DateAxis's scroll position drives the window-band
// overlay so the chart serves as a minimap.
// ============================================

import {
  type Component,
  type JSX,
  For,
  Show,
  createMemo,
  createSignal,
  mergeProps,
  onCleanup,
  onMount,
} from "solid-js";
import { scaleLinear } from "d3-scale";
import { DateAxis, type Cell, type DateAxisCellContext } from "../DateAxis";
import "./ScrubChart.css";

/** Cadence at which to emit x-axis ticks. Cells whose `start` matches the
 *  cadence's anchor get a labelled tick. `"auto"` picks the finest cadence
 *  whose candidate count fits under `xMaxTicks` — week → month → quarter →
 *  year, falling back to a strided coarsest cadence for very long ranges. */
export type ScrubChartXTickCadence =
  | "none"
  | "auto"
  | "week"
  | "month"
  | "quarter"
  | "year";

/** Context passed to the consumer's `renderChart`. */
export interface ScrubChartContext<C extends Cell> {
  /** Centre x in chart pixels for the cell at `index`. Linear, offset by `plotLeft`. */
  cellToX(index: number): number;
  /** [leftX, rightX] in chart pixels for the cell at `index`, offset by `plotLeft`. */
  cellBounds(index: number): [number, number];
  /** Width of one cell in chart pixels (`plotWidth / cells.length`). */
  dayPitch: number;
  /** Selected cell's index. */
  selected: number;
  /** Full cell array, for iteration + payload access. */
  cells: C[];
  /** [firstIndex, lastIndex] of cells currently visible in the axis viewport. */
  windowCells: [number, number];
  /** [leftX, rightX] in chart pixels covering the visible-window cells, offset by `plotLeft`. */
  windowBounds: [number, number];
  /** Full chart frame width in px (includes y-axis margin). */
  width: number;
  /** Full chart frame height in px (includes x-axis margin). */
  height: number;
  /** Inner plot region — area where the chart series should be drawn. */
  plotLeft: number;
  plotTop: number;
  plotRight: number;
  plotBottom: number;
  plotWidth: number;
  plotHeight: number;
  /** Maps a y-domain value to a pixel y inside the plot region. Present
   *  only when `yDomain` was supplied. */
  yToPlot: ((value: number) => number) | null;
}

export interface ScrubChartProps<C extends Cell> {
  cells: C[];
  selected: number;
  onScrub: (index: number, cell: C) => void;
  renderChart: (ctx: ScrubChartContext<C>) => JSX.Element;
  renderCell: (cell: C, ctx: DateAxisCellContext) => JSX.Element;

  /** Chart drawing-area height in px. Default 200. Includes any reserved
   *  x-axis margin. */
  chartHeight?: number;
  /** Width of one axis cell in px. Default 40. */
  cellWidth?: number;
  /** `today` Date forwarded to the inner DateAxis. */
  today?: Date;

  // ── Y-axis (optional) ────────────────────────────────────────────────

  /** Domain (data-units) of the y-axis. When set, ScrubChart reserves a
   *  left margin, draws ticks + labels, and exposes `yToPlot` in the ctx. */
  yDomain?: [number, number];
  /** Format y-axis tick values for display. Default: locale number. */
  formatYLabel?: (value: number) => string;
  /** Approximate number of y-axis ticks. Default 5. d3-scale picks the
   *  nearest "nice" count. */
  yTickCount?: number;
  /** Distance in px from the container's left edge to the y-axis line.
   *  Defaults to the narrowest width that fits the longest formatted label
   *  (computed via canvas text measurement, with an 8px gap to the axis
   *  line). Set explicitly only when you need two charts' y-axes to align
   *  to the same column. No effect unless `yDomain` is set. */
  yAxisWidth?: number;

  // ── X-axis (optional) ────────────────────────────────────────────────

  /** Cadence at which to emit labelled x-axis ticks. Default "none". */
  xTickCadence?: ScrubChartXTickCadence;
  /** Maximum number of x-axis ticks to render. Default 12. Used by the
   *  `"auto"` cadence to pick a coarse-enough unit, and to stride non-auto
   *  cadences whose raw candidate count is too high. */
  xMaxTicks?: number;
  /** Format an x-axis tick label. Receives the anchor cell and the cadence
   *  finally chosen (useful when `xTickCadence="auto"` — formatter can vary
   *  output by unit). Default: per-cadence sensible label. */
  formatXLabel?: (cell: C, cadence: ResolvedXTickCadence) => string;
  /** Pixel height reserved at the bottom for x-axis labels. Default 22
   *  when `xTickCadence !== "none"`; otherwise 0. */
  xAxisHeight?: number;
}

/** Resolved cadence — never `"auto"` or `"none"`, just the unit actually used. */
export type ResolvedXTickCadence = "week" | "month" | "quarter" | "year";

const DEFAULT_CHART_WIDTH = 1200;
const DEFAULT_CHART_HEIGHT = 200;
const DEFAULT_CELL_WIDTH = 40;
const DEFAULT_X_AXIS_HEIGHT = 22;
const DEFAULT_Y_TICK_COUNT = 5;
const DEFAULT_X_MAX_TICKS = 12;
const Y_LABEL_GAP = 8; // px between the longest label and the axis line
const Y_LABEL_FONT = "10px system-ui, -apple-system, sans-serif";

// Reuse a single offscreen 2D context for label-width measurement. Falls
// back to a per-character estimate when canvas is unavailable (SSR / test
// stubs).
let _measureCtx: CanvasRenderingContext2D | null | undefined;
const measureLabelWidth = (text: string): number => {
  if (_measureCtx === undefined) {
    _measureCtx = null;
    if (typeof document !== "undefined") {
      try {
        const c = document.createElement("canvas");
        const ctx = c.getContext("2d");
        if (ctx) {
          ctx.font = Y_LABEL_FONT;
          _measureCtx = ctx;
        }
      } catch {
        // jsdom etc. — canvas unavailable; fall through to the estimate.
      }
    }
  }
  if (_measureCtx) {
    const w = _measureCtx.measureText(text).width;
    if (w > 0) return w;
  }
  return text.length * 6.5; // sans-serif-ish digit estimate
};

const defaultFormatY = (v: number): string =>
  v.toLocaleString("en-US", { maximumFractionDigits: 0 });

// Per-cadence default labels chosen to stay short enough to fit on a
// ~60-100px tick column without clipping.
const defaultFormatX = <C extends Cell>(
  c: C,
  cadence: ResolvedXTickCadence,
): string => {
  const start = c.start;
  const yyShort = String(start.getUTCFullYear()).slice(-2);
  if (cadence === "year") return String(start.getUTCFullYear());
  if (cadence === "quarter") {
    const q = Math.floor(start.getUTCMonth() / 3) + 1;
    return `Q${q} '${yyShort}`;
  }
  if (cadence === "month") {
    const mon = start.toLocaleDateString("en-US", {
      month: "short",
      timeZone: "UTC",
    });
    // January gets the year so the reader can pin down which year we're in
    // when the axis spans multiple years.
    return start.getUTCMonth() === 0 ? `${mon} '${yyShort}` : mon;
  }
  // week
  return start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
};

const matchesCadence = (d: Date, cadence: ResolvedXTickCadence): boolean => {
  if (cadence === "week") return d.getUTCDay() === 1; // Monday
  const dom1 = d.getUTCDate() === 1;
  if (cadence === "month") return dom1;
  if (cadence === "quarter") return dom1 && d.getUTCMonth() % 3 === 0;
  return dom1 && d.getUTCMonth() === 0; // year
};

const CADENCE_LADDER: ResolvedXTickCadence[] = [
  "week",
  "month",
  "quarter",
  "year",
];

export const ScrubChart = <C extends Cell>(
  props: ScrubChartProps<C>,
): JSX.Element => {
  const chartHeight = () => props.chartHeight ?? DEFAULT_CHART_HEIGHT;
  const cellWidth = () => props.cellWidth ?? DEFAULT_CELL_WIDTH;

  // ── Axis-chrome geometry ──────────────────────────────────────────────
  const xAxisHeight = () =>
    (props.xTickCadence ?? "none") !== "none"
      ? (props.xAxisHeight ?? DEFAULT_X_AXIS_HEIGHT)
      : 0;

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

  // Vertical plot region — independent of y-axis width.
  const plotTop = () => 0;
  const plotBottom = () => chartHeight() - xAxisHeight();
  const plotHeight = () => Math.max(0, plotBottom() - plotTop());

  // ── Y-scale + ticks (defined before plotLeft because the y-axis column
  //    width is derived from the formatted tick label widths). ────────────
  const yScale = createMemo(() => {
    const dom = props.yDomain;
    if (!dom) return null;
    return scaleLinear().domain(dom).range([plotBottom(), plotTop()]).nice();
  });

  const yTicks = createMemo<{ value: number; y: number }[]>(() => {
    const s = yScale();
    if (!s) return [];
    return s
      .ticks(props.yTickCount ?? DEFAULT_Y_TICK_COUNT)
      .map((v) => ({ value: v, y: s(v) }));
  });

  // Auto-sized y-axis column: just wide enough to fit the longest formatted
  // tick label plus the gap to the axis line. Manual override accepted for
  // alignment use cases (e.g. two charts in the same panel).
  const yAxisWidth = createMemo<number>(() => {
    if (!props.yDomain) return 0;
    if (props.yAxisWidth != null) return Math.max(0, props.yAxisWidth);
    const ticks = yTicks();
    if (ticks.length === 0) return 0;
    const fmt = props.formatYLabel ?? defaultFormatY;
    const widest = ticks.reduce(
      (max, t) => Math.max(max, measureLabelWidth(fmt(t.value))),
      0,
    );
    return Math.ceil(widest + Y_LABEL_GAP);
  });

  // Horizontal plot region — depends on the auto-sized y-axis column.
  const plotLeft = () => yAxisWidth();
  const plotRight = () => chartWidth();
  const plotWidth = () => Math.max(0, plotRight() - plotLeft());

  // Linear day pitch — cells span the plot region only.
  const dayPitch = createMemo(() =>
    props.cells.length > 0 ? plotWidth() / props.cells.length : 0,
  );
  const indexToX = (i: number): number => plotLeft() + (i + 0.5) * dayPitch();
  const indexBounds = (i: number): [number, number] => [
    plotLeft() + i * dayPitch(),
    plotLeft() + (i + 1) * dayPitch(),
  ];

  // ── X-ticks ──────────────────────────────────────────────────────────
  // Two-stage selection: (1) pick a cadence from the user-supplied unit, or
  // walk the week→year ladder under `"auto"` until candidate count fits;
  // (2) stride within the chosen cadence if it still exceeds the cap.
  const candidatesForCadence = (cadence: ResolvedXTickCadence): number[] => {
    const out: number[] = [];
    for (let i = 0; i < props.cells.length; i += 1) {
      if (matchesCadence(props.cells[i].start, cadence)) out.push(i);
    }
    return out;
  };

  const xTicks = createMemo<{ x: number; label: string }[]>(() => {
    const cadProp = props.xTickCadence ?? "none";
    if (cadProp === "none" || props.cells.length === 0) return [];
    const maxTicks = props.xMaxTicks ?? DEFAULT_X_MAX_TICKS;
    const fmt = (props.formatXLabel ?? defaultFormatX) as (
      c: C,
      cadence: ResolvedXTickCadence,
    ) => string;

    const ladder: ResolvedXTickCadence[] =
      cadProp === "auto" ? CADENCE_LADDER : [cadProp];

    let chosen: ResolvedXTickCadence = ladder[ladder.length - 1];
    let indices: number[] = [];
    for (const cad of ladder) {
      const cands = candidatesForCadence(cad);
      if (cands.length === 0) continue;
      chosen = cad;
      indices = cands;
      if (cands.length <= maxTicks) break;
    }
    // Stride the chosen cadence's candidates if still over the cap.
    if (indices.length > maxTicks) {
      const stride = Math.ceil(indices.length / maxTicks);
      indices = indices.filter((_, i) => i % stride === 0);
    }
    return indices.map((i) => ({
      x: indexToX(i),
      label: fmt(props.cells[i], chosen),
    }));
  });

  // ── Track the inner DateAxis's scroll position + viewport width so we
  //    can render the window-band overlay over the slice of overview data
  //    currently visible in the axis.
  const [axisScrollLeft, setAxisScrollLeft] = createSignal(0);
  const [axisViewportWidth, setAxisViewportWidth] = createSignal(0);
  let axisScrollEl: HTMLDivElement | undefined;
  const handleAxisRef = (el: HTMLDivElement) => {
    axisScrollEl = el;
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
    return [
      plotLeft() + first * dayPitch(),
      plotLeft() + (last + 1) * dayPitch(),
    ];
  });

  const yToPlot = (v: number): number => {
    const s = yScale();
    return s ? s(v) : v;
  };

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
    plotLeft: plotLeft(),
    plotTop: plotTop(),
    plotRight: plotRight(),
    plotBottom: plotBottom(),
    plotWidth: plotWidth(),
    plotHeight: plotHeight(),
    yToPlot: yScale() ? yToPlot : null,
  });

  // ── Pointer-driven pan / click on the chart frame ────────────────────
  // Click without drag → scrubs the selection to the cell under the
  // pointer (the chart is the overview; pointing at a point on the line
  // is the natural way to ask "what day is that?"). Click + drag past
  // CHART_PAN_THRESHOLD_PX → pans the inner DateAxis viewport at a 1:1
  // cell ratio (`axisScrollLeft += dx * cellWidth / dayPitch`), so the
  // window-band slides under the user's finger and the cells under the
  // axis slide with it.
  //
  // Capture is deferred until the threshold is crossed; a pointerup that
  // never crossed it resolves as a click. Selection is unchanged by
  // panning — only single clicks (here) and axis cell taps (handled by
  // DateAxis) move the selected day.
  const CHART_PAN_THRESHOLD_PX = 4;
  const cellAtClientX = (clientX: number): number | null => {
    if (!frameEl || props.cells.length === 0) return null;
    const pitch = dayPitch();
    if (pitch <= 0) return null;
    const rect = frameEl.getBoundingClientRect();
    const xInPlot = clientX - rect.left - plotLeft();
    return Math.max(
      0,
      Math.min(props.cells.length - 1, Math.floor(xInPlot / pitch)),
    );
  };
  let chartGesture:
    | {
        startClientX: number;
        startScrollLeft: number;
        pointerId: number;
        panActive: boolean;
      }
    | null = null;
  const handlePointerDown = (e: PointerEvent) => {
    if (!axisScrollEl || props.cells.length === 0 || e.button !== 0) return;
    chartGesture = {
      startClientX: e.clientX,
      startScrollLeft: axisScrollEl.scrollLeft,
      pointerId: e.pointerId,
      panActive: false,
    };
  };
  const handlePointerMove = (e: PointerEvent) => {
    if (!chartGesture || !axisScrollEl) return;
    const dx = e.clientX - chartGesture.startClientX;
    if (!chartGesture.panActive) {
      if (Math.abs(dx) < CHART_PAN_THRESHOLD_PX) return;
      chartGesture.panActive = true;
      (e.currentTarget as Element).setPointerCapture?.(chartGesture.pointerId);
    }
    const pitch = dayPitch();
    if (pitch <= 0) return;
    axisScrollEl.scrollLeft =
      chartGesture.startScrollLeft + dx * (cellWidth() / pitch);
  };
  const handlePointerUp = (e: PointerEvent) => {
    if (!chartGesture) return;
    const wasPan = chartGesture.panActive;
    if (wasPan) {
      try {
        (e.currentTarget as Element).releasePointerCapture?.(
          chartGesture.pointerId,
        );
      } catch {
        /* not captured */
      }
    }
    chartGesture = null;
    // Below-threshold pointerup that isn't a cancel resolves as a click —
    // scrub to the cell at the pointer x.
    if (!wasPan && e.type !== "pointercancel") {
      const idx = cellAtClientX(e.clientX);
      if (idx !== null) props.onScrub(idx, props.cells[idx]);
    }
  };

  const fmtY = (): ((v: number) => string) =>
    props.formatYLabel ?? defaultFormatY;

  return (
    <div class="sui-scrub-chart">
      <div
        class="sui-scrub-chart__frame"
        style={{ height: `${chartHeight()}px` }}
        ref={(el) => (frameEl = el)}
      >
        <Show when={chartWidth() > 0}>{props.renderChart(ctx())}</Show>
        {/* Axis chrome — drawn after the chart so labels sit on top of any
            line bleed but the lines themselves can still be clipped to the
            plot region by the consumer. Pointer-events disabled so the
            gesture overlay above still captures clicks/drags. */}
        <Show when={chartWidth() > 0 && (yScale() || xTicks().length > 0)}>
          <svg
            class="sui-scrub-chart__axes"
            viewBox={`0 0 ${chartWidth()} ${chartHeight()}`}
            preserveAspectRatio="none"
          >
            <Show when={yScale()}>
              <line
                class="sui-scrub-chart__axis-line"
                x1={plotLeft()}
                x2={plotLeft()}
                y1={plotTop()}
                y2={plotBottom()}
              />
              <For each={yTicks()}>
                {(tick) => (
                  <>
                    <line
                      class="sui-scrub-chart__tick"
                      x1={plotLeft() - 4}
                      x2={plotLeft()}
                      y1={tick.y}
                      y2={tick.y}
                    />
                    <text
                      class="sui-scrub-chart__label sui-scrub-chart__label--y"
                      x={plotLeft() - 6}
                      y={tick.y}
                      text-anchor="end"
                      dominant-baseline="central"
                    >
                      {fmtY()(tick.value)}
                    </text>
                  </>
                )}
              </For>
            </Show>
            <Show when={xTicks().length > 0}>
              <line
                class="sui-scrub-chart__axis-line"
                x1={plotLeft()}
                x2={plotRight()}
                y1={plotBottom()}
                y2={plotBottom()}
              />
              <For each={xTicks()}>
                {(tick) => (
                  <>
                    <line
                      class="sui-scrub-chart__tick"
                      x1={tick.x}
                      x2={tick.x}
                      y1={plotBottom()}
                      y2={plotBottom() + 4}
                    />
                    <text
                      class="sui-scrub-chart__label sui-scrub-chart__label--x"
                      x={tick.x}
                      y={plotBottom() + 6}
                      text-anchor="middle"
                      dominant-baseline="hanging"
                    >
                      {tick.label}
                    </text>
                  </>
                )}
              </For>
            </Show>
          </svg>
        </Show>
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
              y={plotTop()}
              width={windowBounds()[1] - windowBounds()[0]}
              height={plotHeight()}
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
 * time. Just the sizing knobs; everything else is data or a callback.
 */
export type ScrubChartOverrides<C extends Cell> = Pick<
  ScrubChartProps<C>,
  "chartHeight" | "cellWidth" | "yAxisWidth" | "xAxisHeight"
>;

/** Props that remain available to consumers of a curried ScrubChart variant. */
export type ScrubChartDataProps<C extends Cell> = Omit<
  ScrubChartProps<C>,
  keyof ScrubChartOverrides<C>
>;

/**
 * Factory that returns a curried ScrubChart with the sizing knobs baked in.
 * Per STYLE_GUIDE.md "Variant Surface: keep it minimal", no concrete named
 * variant ships yet — defaults handle the only known use case. Add one when
 * a second emerges.
 */
export function createScrubChart<C extends Cell = Cell>(
  defaults: Partial<ScrubChartOverrides<C>>,
): Component<ScrubChartDataProps<C>> {
  return (props) => (
    <ScrubChart<C> {...(mergeProps(defaults, props) as ScrubChartProps<C>)} />
  );
}
