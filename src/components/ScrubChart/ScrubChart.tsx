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
  Show,
  createEffect,
  createMemo,
  createSignal,
  mergeProps,
  onCleanup,
  onMount,
} from "solid-js";
import { scaleLinear } from "d3-scale";
import { insetSpan } from "../../internal/geometry/insetSpan";
import { clamp } from "../../internal/math/clamp";
import { DateAxis, type Cell } from "../DateAxis";
import { ScrubChartAxes } from "./ScrubChartAxes";
import {
  CADENCE_LADDER,
  DEFAULT_CELL_WIDTH,
  DEFAULT_CHART_HEIGHT,
  DEFAULT_CHART_WIDTH,
  DEFAULT_X_AXIS_HEIGHT,
  DEFAULT_X_MAX_TICKS,
  DEFAULT_Y_TICK_COUNT,
  Y_LABEL_GAP,
  defaultFormatX,
  defaultFormatY,
  matchesCadence,
  measureLabelWidth,
} from "./helpers";
import type {
  ResolvedXTickCadence,
  ScrubChartContext,
  ScrubChartDataProps,
  ScrubChartOverrides,
  ScrubChartProps,
} from "./types";
import "./ScrubChart.css";

export type {
  ScrubChartContext,
  ScrubChartProps,
  ScrubChartOverrides,
  ScrubChartDataProps,
  ScrubChartXTickCadence,
  ResolvedXTickCadence,
} from "./types";

export const ScrubChart = <C extends Cell>(
  props: ScrubChartProps<C>,
): JSX.Element => {
  const chartHeight = () => props.chartHeight ?? DEFAULT_CHART_HEIGHT;
  const cellWidth = () => props.cellWidth ?? DEFAULT_CELL_WIDTH;
  // Scrub layer on/off — gates the DateAxis ribbon, the window band, and the
  // pointer gestures together (see the prop doc).
  const scrubOn = () => props.scrub !== false;
  const selectedIdx = () => props.selected ?? -1;
  const emitScrub = (index: number, cell: C) => props.onScrub?.(index, cell);

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
  const vSpan = () => insetSpan(chartHeight(), 0, xAxisHeight());
  const plotTop = () => vSpan().start;
  const plotBottom = () => vSpan().end;
  const plotHeight = () => vSpan().size;

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
  const hSpan = () => insetSpan(chartWidth(), yAxisWidth(), 0);
  const plotLeft = () => hSpan().start;
  const plotRight = () => hSpan().end;
  const plotWidth = () => hSpan().size;

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
    el.addEventListener("scroll", () => setAxisScrollLeft(el.scrollLeft), {
      passive: true,
    });
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => setAxisViewportWidth(el.clientWidth));
      ro.observe(el);
      onCleanup(() => ro.disconnect());
    }
  };

  // Recenter request — scroll the axis so the requested cell is centered.
  // Runs whenever the centerOn OBJECT changes (fresh object per request).
  createEffect(() => {
    const req = props.centerOn;
    if (!req || !scrubOn()) return;
    const el = axisScrollEl;
    if (!el) return;
    const n = props.cells.length;
    // Use the measured per-cell width (see windowCells) and clamp the target to
    // the scrollable range, so centering on the last cell pins it to the right
    // edge instead of overshooting.
    const w = n > 0 && el.scrollWidth > 0 ? el.scrollWidth / n : cellWidth();
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    const target = Math.min(
      maxScroll,
      Math.max(0, (req.index + 0.5) * w - el.clientWidth / 2),
    );
    el.scrollTo({ left: target, behavior: "smooth" });
  });

  // Map the axis's scroll window onto cell indices using the axis's ACTUAL
  // rendered geometry (scrollWidth), not the `cellWidth` prop. Custom cells
  // render content-sized, so the real per-cell width can differ from
  // `cellWidth`; trusting the prop let `first` overrun the last index and the
  // window band slid past the right edge. Both ends are clamped to the valid
  // index range, so the band is always within [plotLeft, plotRight] and the
  // last cell pins the band's right edge to plotRight.
  const windowCells = createMemo<[number, number]>(() => {
    const n = props.cells.length;
    if (n === 0) return [0, 0];
    // Plain mode has no axis viewport — the whole range counts as visible.
    if (!scrubOn()) return [0, n - 1];
    // Read the tracked scroll/viewport signals so this re-runs on scroll and
    // resize; measure the live scroll content width off the same element.
    const scrollLeft = axisScrollLeft();
    const viewport = axisViewportWidth();
    const scrollWidth = axisScrollEl ? axisScrollEl.scrollWidth : 0;
    // Real per-cell width from measured geometry; fall back to the prop hint
    // before first layout (scrollWidth === 0).
    const w = scrollWidth > 0 ? scrollWidth / n : cellWidth();
    if (w <= 0) return [0, n - 1];
    const first = clamp(Math.floor(scrollLeft / w), 0, n - 1);
    const last = clamp(
      Math.ceil((scrollLeft + viewport) / w) - 1,
      first,
      n - 1,
    );
    return [first, last];
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
    selected: selectedIdx(),
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
  // cell ratio (`scrollLeft += dx * axisCellWidth / dayPitch`, axisCellWidth
  // measured from real geometry), so the window-band slides under the user's
  // finger and the cells under the axis slide with it.
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
  let chartGesture: {
    startClientX: number;
    startScrollLeft: number;
    pointerId: number;
    panActive: boolean;
  } | null = null;
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
    // Pan the axis at a 1:1 cell ratio using the measured per-cell width, so
    // the window band tracks the pointer even when cells render wider or
    // narrower than the `cellWidth` prop. scrollLeft is clamped by the browser.
    const n = props.cells.length;
    const w =
      n > 0 && axisScrollEl.scrollWidth > 0
        ? axisScrollEl.scrollWidth / n
        : cellWidth();
    axisScrollEl.scrollLeft = chartGesture.startScrollLeft + dx * (w / pitch);
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
      if (idx !== null) emitScrub(idx, props.cells[idx]);
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
          <ScrubChartAxes
            chartWidth={chartWidth}
            chartHeight={chartHeight}
            plotLeft={plotLeft}
            plotTop={plotTop}
            plotRight={plotRight}
            plotBottom={plotBottom}
            yScaleActive={() => yScale() != null}
            yTicks={yTicks}
            xTicks={xTicks}
            formatY={fmtY}
          />
        </Show>
        {/* Window-band overlay — owned by ScrubChart so consumers don't
            have to draw it themselves. Translucent rect over the slice of
            cells currently visible in the axis viewport. Part of the scrub
            layer: composed off entirely in plain mode. */}
        <Show when={scrubOn() && props.cells.length > 0}>
          <svg
            class="sui-scrub-chart__window"
            role="img"
            aria-label="Scrub window"
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
        {/* Pointer gestures (pan + click-to-scrub) — scrub layer only. */}
        <Show when={scrubOn()}>
          <div
            class="sui-scrub-chart__overlay"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />
        </Show>
        {/* Consumer overlay layer — ABOVE the gesture overlay so its
            interactive decorations (plotline markers) receive clicks. */}
        <Show when={props.renderChartOverlay && chartWidth() > 0}>
          {props.renderChartOverlay!(ctx())}
        </Show>
      </div>

      {/* The detail ribbon (day-cell filmstrip) — scrub layer only. Plain
          mode renders just the chart frame above. */}
      <Show when={scrubOn()}>
        <DateAxis<C>
          cells={props.cells}
          selected={selectedIdx()}
          today={props.today}
          cellWidth={cellWidth()}
          onCellClick={(idx, cell) => emitScrub(idx, cell)}
          renderCell={props.renderCell}
          scrollableRef={handleAxisRef}
        />
      </Show>
    </div>
  );
};

// ── Factory ───────────────────────────────────────────────────────────────
// The ScrubChartOverrides / ScrubChartDataProps types this factory relies on
// live in ./types (and are re-exported above so the public surface is
// unchanged).

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
