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
  createUniqueId,
  mergeProps,
  onCleanup,
  onMount,
} from "solid-js";
import { observeSize } from "../../internal/dom/observeSize";
import { insetSpan } from "../../internal/geometry/insetSpan";
import { clamp } from "../../internal/math/clamp";
import { safeSetPointerCapture } from "../../internal/pointer/safeSetPointerCapture";
import { DateAxis, type Cell } from "../DateAxis";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { ScrubChartExpandControl } from "./ScrubChartExpandControl";
import { ScrubChartMinimizedBar } from "./ScrubChartMinimizedBar";
import {
  DEFAULT_TOP_ACTION_ICON,
  DEFAULT_TOP_ACTION_LABEL,
  ScrubChartTopActionControl,
} from "./ScrubChartTopActionControl";
import { ScrubChartYFitControl } from "./ScrubChartYFitControl";
import { ScrubChartYAxisModeControl } from "./ScrubChartYAxisModeControl";
import { ScrubChartYRangeEditor } from "./ScrubChartYRangeEditor";
import {
  ScrubChartAxes,
  ScrubChartGrid,
  ScrubChartHighlights,
} from "./ScrubChartAxes";
import {
  AXIS_LAYOUT_FRAMES,
  CADENCE_LADDER,
  DEFAULT_CELL_WIDTH,
  DEFAULT_CHART_HEIGHT,
  DEFAULT_CHART_WIDTH,
  DEFAULT_X_AXIS_HEIGHT,
  DEFAULT_X_MAX_TICKS,
  defaultYTickCount,
  CORNER_FOOTPRINT,
  CORNER_LEVEL_OFFSET,
  Y_AXIS_MODE_COLUMN,
  Y_FIT_COLUMN,
  defaultFormatX,
  defaultFormatY,
  matchesCadence,
  minimizedSummary,
} from "./helpers";
import { createYAxisScales } from "./yAxis";
import {
  DEFAULT_EXPAND_TRANSITION_MS,
  createChartHeightTween,
} from "./chartHeightTween";
import { DEFAULT_Y_FIT_TRANSITION_MS } from "./yDomainTween";
import type {
  ResolvedXTickCadence,
  ScrubChartClip,
  ScrubChartContext,
  ScrubChartDataProps,
  ScrubChartOverrides,
  ScrubChartProps,
  ScrubChartTopAction,
  ScrubChartYRange,
} from "./types";
import {
  DEFAULT_Y_FIT_MARGIN,
  type ScrubChartYScaleMode,
  fitCellRange,
  fitYDomain,
  widenToYFitBounds,
} from "./yScaleMode";
import "./ScrubChart.css";
import { map, filter } from "../../fn";

export type {
  ScrubChartClip,
  ScrubChartContext,
  ScrubChartHighlight,
  ScrubChartMarker,
  ScrubChartMinimizedContext,
  ScrubChartProps,
  ScrubChartOverrides,
  ScrubChartDataProps,
  ScrubChartTopAction,
  ScrubChartXTickCadence,
  ResolvedXTickCadence,
  ScrubChartYFitBound,
  ScrubChartYFitPin,
  ScrubChartYScaleMode,
  ScrubChartYAxisMode,
  ScrubChartYRange,
} from "./types";

export const ScrubChart = <C extends Cell>(
  props: ScrubChartProps<C>,
): JSX.Element => {
  // ── Frame height + the expand control ────────────────────────────────
  // `chartHeightExpanded` is the master switch. Without it the frame simply
  // takes `chartHeight`, the chevron never renders, and the tween never runs.
  // FILL MODE: the container owns the height, so the frame measures itself and
  // every span derives from that instead of from a number. The measurement
  // cannot feed back into the box — the frame is `height:100%` of its parent
  // and the svg inside is `height:100%` of the frame, so nothing the viewBox
  // says can change the height it was measured from. (Contrast the WIDTH of a
  // `max-content` box, where exactly that cycle closes.)
  const filling = () => props.chartHeight === "fill";
  const [measuredHeight, setMeasuredHeight] = createSignal(0);
  const collapsedHeight = () => {
    if (!filling())
      return (props.chartHeight as number) ?? DEFAULT_CHART_HEIGHT;
    // Until the first ResizeObserver callback lands there is no measurement to
    // use, and a frame of 0 would divide by zero downstream.
    return measuredHeight() > 0 ? measuredHeight() : DEFAULT_CHART_HEIGHT;
  };
  // The chevron moves the frame between two PIXEL heights, which says nothing
  // when the container owns the height.
  const expandable = () =>
    !filling() && props.chartHeightExpanded !== undefined;
  // `chrome: "frame"` hands every control to the frame above: the chart
  // still FOLLOWS `expanded`/`yAxisMode`/the domain, it just draws no
  // control for them. `"own"` (the default) is unchanged.
  const ownChrome = () => props.chrome !== "frame";
  const expandControl = () => ownChrome() && expandable();
  const [ownedExpanded, setOwnedExpanded] = createSignal(false);
  // Controlled when the caller passes `expanded`; owned otherwise — the same
  // split `yScaleMode` takes.
  const expanded = () => props.expanded ?? ownedExpanded();
  const toggleExpanded = (next: boolean) => {
    if (props.expanded === undefined) setOwnedExpanded(next);
    props.onExpandedChange?.(next);
  };
  const targetHeight = () =>
    (expanded() ? props.chartHeightExpanded : undefined) ?? collapsedHeight();
  // The reader's motion preference reads REACTIVELY, so a change during the
  // session takes effect at once.
  const prefersReducedMotion = useMediaQuery(
    "(prefers-reduced-motion: reduce)",
  );
  // ONE height accessor drives the plot span, the axis rows, the window band
  // and the `viewBox`, so the whole chart follows the frame frame by frame.
  const chartHeight = createChartHeightTween({
    target: targetHeight,
    // A caller who moves `chartHeight` itself keeps the jump it has always
    // had: the tween is off until the master switch turns it on.
    transitionMs: () =>
      expandable() && (props.expandTransition ?? DEFAULT_EXPAND_TRANSITION_MS),
    reducedMotion: prefersReducedMotion,
  });
  // ── The top-right control + the minimized bar ────────────────────────
  // `topAction` is the master switch. `true` and an object both ask for the
  // button; only an object changes it. The chart minimizes itself unless the
  // caller states an `onClick`, in which case the button is the caller's and
  // the chart never leaves the frame.
  const topAction = (): ScrubChartTopAction | null => {
    if (!ownChrome()) return null;
    if (props.topAction === undefined || props.topAction === false) return null;
    return props.topAction === true ? {} : props.topAction;
  };
  const [ownedMinimized, setOwnedMinimized] = createSignal(false);
  // Controlled when the caller passes `minimized`; owned otherwise — the same
  // split `expanded` and `yScaleMode` take. It is its OWN axis: the frame's
  // height signals are untouched, so a chart minimized while expanded comes
  // back expanded.
  const minimized = () =>
    topAction() !== null && (props.minimized ?? ownedMinimized());
  const setMinimized = (next: boolean) => {
    if (props.minimized === undefined) setOwnedMinimized(next);
    props.onMinimizedChange?.(next);
  };
  const topActionIcon = () => topAction()?.icon ?? DEFAULT_TOP_ACTION_ICON;
  const topActionLabel = () => topAction()?.label ?? DEFAULT_TOP_ACTION_LABEL;
  const runTopAction = () => {
    const own = topAction()?.onClick;
    if (own) own();
    else setMinimized(true);
  };
  // The line the bar shows. The caller's slot wins; the derived date span is
  // the fallback, and the slot gets it too so a caller can print its own
  // value beside it.
  const minimizedLine = (): JSX.Element => {
    const summary = minimizedSummary(props.cells);
    return (
      props.renderMinimized?.({
        cells: props.cells,
        selected: selectedIdx(),
        summary,
      }) ?? summary
    );
  };
  const cellWidth = () => props.cellWidth ?? DEFAULT_CELL_WIDTH;
  // Scrub layer on/off — gates the DateAxis ribbon, the window band, and the
  // pointer gestures together (see the prop doc).
  const scrubOn = () => props.scrub !== false;
  const selectedIdx = () => props.selected ?? -1;
  const emitScrub = (index: number, cell: C) => props.onScrub?.(index, cell);

  // ── Axis-chrome geometry ──────────────────────────────────────────────
  // xAxisHeight prop SETS the base row height (tick-cadence-gated);
  // xAxisExtraHeight ADDS to it unconditionally — the extra row is for a
  // caller-owned layer below the axis (e.g. CashflowScrubChart's below-zone
  // labels), which needs its space whether or not ticks are drawn.
  // The x-axis row also HOSTS the y-fit control, in the corner where the two
  // axes meet. The 26px button is taller than the 22px label row, so the row
  // grows to the control's footprint — 6px, against the whole row this
  // control used to take below the labels. The button then centres on the
  // tick labels. `xTickCadence="none"` draws no labels and no row, and the
  // footprint becomes the whole row. Either way the button also reaches a
  // little ABOVE `plotBottom`, and `yLabelFloor` lifts the lowest y label
  // clear of it.
  const xAxisHeight = () =>
    Math.max(
      ((props.xTickCadence ?? "none") !== "none"
        ? (props.xAxisHeight ?? DEFAULT_X_AXIS_HEIGHT)
        : 0) + (props.xAxisExtraHeight ?? 0),
      yFitFootprint(),
    );

  // The height the CORNER controls ask of the x-axis row, or 0 without them.
  // Both corners hang from the same row and take the same footprint, so one
  // control or two ask for the same number. The DEFAULT y-axis column asks
  // for `Y_FIT_COLUMN` instead: the column carries a gutter that moves the y
  // labels right of the y-fit button, and the row needs no such gutter.
  const yFitFootprint = () =>
    originCorner() || expandControl() ? CORNER_FOOTPRINT : 0;

  // ── The origin corner ────────────────────────────────────────────────
  // ONE control holds the corner where the axes meet. `yAxisMode` (the
  // three-segment switch) wins it when set; `yFitDomain` alone keeps the
  // y-fit button. Either way the corner's guarantees — row footprint, column
  // width, label floor — follow `originCorner()`, so no caller can get a
  // control without the room it needs.
  const axisModeOn = () => ownChrome() && props.yAxisMode !== undefined;
  const yFitControl = () => ownChrome() && props.yFitDomain != null;
  const originCorner = () => axisModeOn() || yFitControl();
  const originColumn = () =>
    axisModeOn() ? Y_AXIS_MODE_COLUMN : yFitControl() ? Y_FIT_COLUMN : 0;

  // Chart pixel width is measured via ResizeObserver on the frame.
  const [chartWidth, setChartWidth] = createSignal(DEFAULT_CHART_WIDTH);
  // Passive hover readout — the nearest cell under the pointer. Null unless
  // `hover` is on and the pointer is over the frame (and not mid-pan).
  const [hoverIndex, setHoverIndex] = createSignal<number | null>(null);
  let frameEl: HTMLDivElement | undefined;
  // The measurement attaches PER MOUNT of the frame, not once per component.
  // `minimized` unmounts the frame, so a component-level `onMount` would read
  // the first frame's box, observe that element, and then watch a detached
  // node for the rest of the session — a restored chart would keep whatever
  // width it had when the reader minimized it, and a resize in between would
  // never reach it.
  //
  // The `onMount` stays INSIDE the ref: a ref fires while the element is
  // still detached, where `getBoundingClientRect` reads zeros, and the note
  // below depends on the read landing after insertion. Solid registers this
  // effect and its cleanup on the owner of the branch the frame renders in,
  // so both re-run each time the bar gives the frame back.
  const attachFrame = (el: HTMLDivElement) => {
    frameEl = el;
    onMount(() => {
      // First frame. The seed is 1200; the SVGs state a `viewBox` in chart
      // units with `preserveAspectRatio="none"`, so a first paint at the seed
      // stretches 1200 units over the real frame width and the fixed pixel
      // reservations (y-axis column, right gutter) draw scaled for one frame,
      // then snap. onMount runs after DOM insertion and before that paint, so
      // one synchronous read puts the real width on the first frame. A zero
      // width means the frame has no layout box yet (display: none, a detached
      // host, jsdom); the seed stays until the observer reports a real size.
      const box = el.getBoundingClientRect();
      const width = Math.round(box.width);
      if (width > 0) {
        setChartWidth(width);
        // Reported from the two measurements only — the seed is a guess.
        props.onChartWidthChange?.(width);
      }
      // The HEIGHT needs the same synchronous first read, and for a second
      // reason on top of the first-frame one. `observeSize` defers through
      // `requestAnimationFrame`, and a browser SUSPENDS rAF for a document that
      // is not visible — so in a hidden or backgrounded tab the frame's CSS box
      // stretches (plain layout) while a height that arrived only through the
      // observer stays at its fallback forever. The drawing then reads as
      // stretched, and nothing corrects it until the tab is shown. Measuring
      // here removes the dependency: the observer handles only CHANGES.
      if (filling()) {
        const height = Math.round(box.height);
        if (height > 0) setMeasuredHeight(height);
      }
      // observeSize change-guards and rAF-defers the write. Setting chartWidth
      // synchronously inside the observer dispatch re-rendered the chart (and the
      // page around it) mid-delivery, which re-queued this same observer and made
      // the browser emit "ResizeObserver loop completed with undelivered
      // notifications" during a window drag. See internal/dom/observeSize.
      onCleanup(
        observeSize(el, (size) => {
          setChartWidth(size.width);
          props.onChartWidthChange?.(size.width);
          // Only in fill mode: in the numeric path the height is the caller's
          // and measuring it would be a second, contradicting source of truth.
          //
          // A ZERO IS NOT A MEASUREMENT — it is the layout saying "not yet",
          // or "this is inside `display: none`". Storing it would throw away a
          // good height the moment a card is hidden, and the chart would come
          // back at the fallback rather than at the size it had. Keep the last
          // real one.
          if (filling() && size.height > 0) setMeasuredHeight(size.height);
        }),
      );
    });
  };

  // Vertical plot region — independent of y-axis width.
  const vSpan = () => insetSpan(chartHeight(), 0, xAxisHeight());
  const plotTop = () => vSpan().start;
  const plotBottom = () => vSpan().end;
  const plotHeight = () => vSpan().size;
  // The y tick count follows the plot height the chart MOVES TOWARD, not the
  // height on screen: the count then changes once per expand, and the
  // y-domain tween carries the resnapped fit beside the height tween. A
  // count read from the tweened height would retarget the fit on every
  // frame the count crossed a step. See `defaultYTickCount`.
  const yTickCount = () =>
    props.yTickCount ??
    defaultYTickCount(insetSpan(targetHeight(), 0, xAxisHeight()).size);

  // ── Track the inner DateAxis's scroll position + viewport width so we
  //    can render the window-band overlay over the slice of overview data
  //    currently visible in the axis.
  const [axisScrollLeft, setAxisScrollLeft] = createSignal(0);
  const [axisViewportWidth, setAxisViewportWidth] = createSignal(0);
  let axisScrollEl: HTMLDivElement | undefined;
  /**
   * Put a freshly mounted ribbon back at `left`.
   *
   * The ribbon UNMOUNTS while the chart is minimized, and a new scroll
   * container starts at 0 — so a restore parked the reader at the first cell,
   * with the window band and the selection out of step. The offset itself
   * survives in `axisScrollLeft`, because only the element went away.
   *
   * A fresh container is not scrollable for a frame or two, and a write
   * against `scrollWidth === clientWidth` clamps to 0 and is lost. That is
   * the same wait `centerOn` handles below, so this write retries until the
   * cells have laid out. `left <= 0` is the first mount, where there is
   * nothing to restore.
   */
  const restoreAxisScroll = (
    el: HTMLDivElement,
    left: number,
    attempt: number,
  ) => {
    if (left <= 0) return;
    if (el.scrollWidth <= el.clientWidth && attempt < AXIS_LAYOUT_FRAMES) {
      if (typeof requestAnimationFrame === "function")
        requestAnimationFrame(() => restoreAxisScroll(el, left, attempt + 1));
      return;
    }
    el.scrollLeft = left;
  };
  const handleAxisRef = (el: HTMLDivElement) => {
    axisScrollEl = el;
    // BEFORE the reads below: they would overwrite the remembered offset with
    // the fresh element's 0. The programmatic write fires a `scroll` event, so
    // the signal catches up once the ribbon has laid out.
    restoreAxisScroll(el, axisScrollLeft(), 0);
    setAxisViewportWidth(el.clientWidth);
    setAxisScrollLeft(el.scrollLeft);
    el.addEventListener("scroll", () => setAxisScrollLeft(el.scrollLeft), {
      passive: true,
    });
    // Re-measure clientWidth (NOT the observed content box) so the scrollbar
    // accounting is unchanged; observeSize only governs when this runs.
    onCleanup(observeSize(el, () => setAxisViewportWidth(el.clientWidth)));
  };

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

  // ── Y-fit mode + the fitted domain ───────────────────────────────────
  // The toggle picks WHICH CELL RANGE sets the y extent: the visible window,
  // or the whole series. Both states are fits. `yFitDomain` supplies the
  // extent, because `renderChart` is a slot and ScrubChart never sees the
  // values. See yScaleMode.ts for the pipeline and for why the pin is a prop.
  const [ownedMode, setOwnedMode] =
    createSignal<ScrubChartYScaleMode>("visible");
  // Controlled when the caller passes `yScaleMode`; owned otherwise.
  const yScaleMode = (): ScrubChartYScaleMode =>
    props.yScaleMode ?? ownedMode();
  const selectYScaleMode = (mode: ScrubChartYScaleMode) => {
    if (props.yScaleMode === undefined) setOwnedMode(mode);
    props.onYScaleModeChange?.(mode);
  };

  // Memoized, so the domain recomputes when the window moves — not on every
  // pointer event. A pan writes axisScrollLeft, windowCells narrows to new
  // indices, and only then does the callback run again.
  const fittedDomain = createMemo<[number, number] | null>(() => {
    const fit = props.yFitDomain;
    if (!fit) return null;
    const mode = yScaleMode();
    const [from, to] = fitCellRange(mode, windowCells(), props.cells.length);
    const extent = fit(from, to);
    // A null return means the caller has no extent for that range; fall back
    // to `yDomain` (see the prop docs for the precedence).
    if (!extent) return null;
    // The bound widens the fitted domain, so it runs after the margin and the
    // snap — see widenToYFitBounds for why that order states the edge exactly.
    return widenToYFitBounds(
      fitYDomain(
        extent,
        mode,
        props.yFitPin,
        props.yFitMargin ?? DEFAULT_Y_FIT_MARGIN,
        yTickCount(),
      ),
      mode,
      props.yFitBounds,
    );
  });

  // Declared here because the axis column measures the formatted labels.
  const fmtY = (): ((v: number) => string) =>
    props.formatYLabel ?? defaultFormatY;

  // ── Y-scale + ticks (built before plotLeft because the y-axis column
  //    width is derived from the formatted tick label widths). ────────────
  // ONE effective domain drives the ticks, the labels, `yToPlot`, the axis
  // width and the gridlines: the fitted domain when `yFitDomain` returns one,
  // else `yDomain`, else no y-axis at all. The FITTED domain also tweens
  // toward each new target — see yAxis.ts for the two scales that takes, and
  // yDomainTween.ts for the loop.
  const yAxis = createYAxisScales({
    fittedDomain,
    staticDomain: () => props.yDomain,
    plotTop,
    plotBottom,
    tickCount: yTickCount,
    formatLabel: fmtY,
    axisWidth: () => props.yAxisWidth,
    minWidth: originColumn,
    transitionMs: () => props.yFitTransition ?? DEFAULT_Y_FIT_TRANSITION_MS,
  });
  const yScale = yAxis.scale;
  const yTicks = yAxis.ticks;
  const yAxisWidth = yAxis.width;

  // Horizontal plot region — depends on the auto-sized y-axis column and
  // the caller-reserved right gutter (0 unless `rightGutter` is set).
  const hSpan = () =>
    insetSpan(chartWidth(), yAxisWidth(), props.rightGutter ?? 0);
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
      indices = filter((_, i) => i % stride === 0, indices);
    }
    return map(
      (i) => ({
        x: indexToX(i),
        label: fmt(props.cells[i], chosen),
      }),
      indices,
    );
  });

  // Recenter request — scroll the axis so the requested cell is centered.
  // Runs whenever the centerOn OBJECT changes (fresh object per request).
  createEffect(() => {
    const req = props.centerOn;
    if (!req || !scrubOn()) return;
    const el = axisScrollEl;
    if (!el) return;
    const n = props.cells.length;
    if (n === 0) return;
    // A centerOn requested on first mount can fire BEFORE the ribbon has laid
    // out its cells, when `scrollWidth` is still 0 (or equals clientWidth). At
    // that point maxScroll clamps to 0 and the recenter collapses to a no-op —
    // the ribbon stays parked at the first cell. Defer to the next frame(s)
    // until the content is measurably scrollable, then position instantly
    // (a long smooth animation from a cold offset looks janky); once laid out,
    // an explicit recenter animates smoothly.
    const canDefer = typeof requestAnimationFrame === "function";
    const applyScroll = (attempt: number) => {
      // Content not yet wider than the viewport → layout not ready; retry.
      if (el.scrollWidth <= el.clientWidth && attempt < AXIS_LAYOUT_FRAMES) {
        if (canDefer) requestAnimationFrame(() => applyScroll(attempt + 1));
        return;
      }
      // Use the measured per-cell width (see windowCells) and clamp the target
      // to the scrollable range, so centering on the last cell pins it to the
      // right edge instead of overshooting.
      const w = el.scrollWidth > 0 ? el.scrollWidth / n : cellWidth();
      const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
      const target = Math.min(
        maxScroll,
        Math.max(0, (req.index + 0.5) * w - el.clientWidth / 2),
      );
      el.scrollTo({
        left: target,
        behavior: attempt === 0 ? "smooth" : "auto",
      });
    };
    applyScroll(0);
  });

  const windowBounds = createMemo<[number, number]>(() => {
    const [first, last] = windowCells();
    return [
      plotLeft() + first * dayPitch(),
      plotLeft() + (last + 1) * dayPitch(),
    ];
  });

  // Highlight bands → pixels. Both ends are inclusive and cover the whole
  // cell, so the right edge is `(to + 1) * dayPitch` — the same arithmetic
  // windowBounds uses. Ends are clamped to the cell range and swapped when a
  // caller passes them the other way round, so a band computed from live data
  // can never draw outside the plot. A band is kept even at zero width; the
  // rect simply paints nothing, and dropping it would make the layer's list
  // disagree with the caller's array for no gain.
  const highlightBands = createMemo<
    { x: number; width: number; class?: string }[]
  >(() => {
    const bands = props.highlights;
    const n = props.cells.length;
    if (!bands || bands.length === 0 || n === 0) return [];
    const pitch = dayPitch();
    return map((band) => {
      const lo = clamp(Math.min(band.from, band.to), 0, n - 1);
      const hi = clamp(Math.max(band.from, band.to), 0, n - 1);
      return {
        x: plotLeft() + lo * pitch,
        width: (hi - lo + 1) * pitch,
        class: band.class,
      };
    }, bands);
  });

  // ── The inline range editor (fixed mode) ─────────────────────────────
  // In FIXED mode with `onYRangeChange` set, the y-axis label column is a
  // button: a click opens a small Max / Min editor over the plot's top-left.
  // The hit zone runs from `plotTop` down to the corner control's top edge,
  // so it never covers the mode switch. The editor is seeded from the domain
  // on screen and closes on apply, cancel, or leaving fixed mode.
  const rangeEditable = () =>
    ownChrome() &&
    props.yAxisMode === "fixed" &&
    props.onYRangeChange !== undefined &&
    yScale() != null;
  const [rangeEditorOpen, setRangeEditorOpen] = createSignal(false);
  // Leaving fixed mode (or losing the callback) closes the editor, so coming
  // back to fixed does not find it open over the plot.
  createEffect(() => {
    if (!rangeEditable()) setRangeEditorOpen(false);
  });
  const shownRange = (): ScrubChartYRange => {
    const [a, b] = yScale()?.domain() ?? [0, 1];
    return { min: Math.min(a, b), max: Math.max(a, b) };
  };
  const axisHitStyle = (): JSX.CSSProperties => ({
    top: `${plotTop()}px`,
    width: `${plotLeft()}px`,
    height: `${Math.max(0, plotBottom() + CORNER_LEVEL_OFFSET - plotTop())}px`,
  });
  const rangeEditorStyle = (): JSX.CSSProperties => ({
    top: `${plotTop() + 4}px`,
    left: `${plotLeft() + 4}px`,
  });

  const yToPlot = (v: number): number => {
    const s = yScale();
    return s ? s(v) : v;
  };

  // Unique clipPath id per instance — two charts on one page each have their
  // own plot geometry and must not share a rect. `createUniqueId` keeps the id
  // stable across server/client renders.
  const clipId = `sui-scrub-chart-clip-${createUniqueId()}`;
  const clip: ScrubChartClip = { plotPathUrl: `url(#${clipId})` };

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
    hoverIndex: null,
    // The signal's own getter, not a call — every slot gets the SAME
    // accessor, so a consumer that calls it inside its own memo subscribes
    // straight to the signal instead of to this (non-reactive) ctx snapshot.
    liveHoverIndex: hoverIndex,
    clip,
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
  // `cellAtClientX` CLAMPS a coordinate outside the plot to the nearest cell.
  // The pan gesture and the click-to-scrub gesture both want that: a drag or a
  // click that ends past an edge still means the edge cell. The hover readout
  // wants the opposite, so it calls `cellUnderClientX` below.
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
  /**
   * The cell under a client x, or `null` when the pointer is outside the plot.
   *
   * The hover readout calls this one. A readout NAMES the cell under the
   * pointer, and two columns of the frame hold no cell: the y-axis label column
   * left of `plotLeft`, and the caller-reserved gutter right of `plotRight`
   * (where CashflowScrubChart parks its right-zone labels). The clamping
   * `cellAtClientX` answered the last cell there, so a full-height crosshair
   * and a tooltip for the last day appeared at the right edge while the reader
   * only pointed at a label.
   */
  const cellUnderClientX = (clientX: number): number | null => {
    if (!frameEl) return null;
    const xInFrame = clientX - frameEl.getBoundingClientRect().left;
    if (xInFrame < plotLeft() || xInFrame > plotRight()) return null;
    return cellAtClientX(clientX);
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
      safeSetPointerCapture(e.currentTarget as Element, chartGesture.pointerId);
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

  const handleHoverMove = (e: PointerEvent) => {
    if (!props.hover) return;
    // A pan drag owns the pointer — don't fight it with a crosshair.
    if (chartGesture?.panActive) {
      setHoverIndex(null);
      return;
    }
    // Outside the plot there is no cell to read out — see cellUnderClientX.
    setHoverIndex(cellUnderClientX(e.clientX));
  };
  const handleHoverLeave = () => {
    if (props.hover) setHoverIndex(null);
  };

  return (
    <div
      class="sui-scrub-chart"
      // FILL MODE GIVES WAY TO THE BAR. The modifier hands the root the
      // container's whole height, which is right for a chart and wrong for one
      // line — the bar would stretch down the container with the restore
      // button floating in the middle of it. While the bar is up the root
      // sizes from its content, like every other minimized chart.
      classList={{ "sui-scrub-chart--fill": filling() && !minimized() }}
    >
      <Show
        when={!minimized()}
        fallback={
          // The bar REPLACES the frame and the ribbon. Both unmount, which is
          // the whole point of the control that raised it: the page gets the
          // height back. `attachFrame` re-measures when the frame returns.
          <ScrubChartMinimizedBar onRestore={() => setMinimized(false)}>
            {minimizedLine()}
          </ScrubChartMinimizedBar>
        }
      >
        <div
          class="sui-scrub-chart__frame"
          // In fill mode the HEIGHT IS THE STYLESHEET'S: the modifier gives the
          // root a height and the frame `flex:1`, so the frame takes what the
          // container has left after the ribbon. An inline `height:100%` here
          // resolved against a root with no height of its own — computing to
          // `auto`, sizing from content, and feeding the fallback straight back
          // into the measurement.
          style={filling() ? undefined : { height: `${chartHeight()}px` }}
          ref={attachFrame}
          onPointerMove={handleHoverMove}
          onPointerLeave={handleHoverLeave}
        >
          {/* Highlight bands — opt-in shaded rects over cell ranges. The
            BOTTOM layer of the frame: the gridlines and the series both
            paint over them, because a band is background. Its CSS states
            `z-index: -1` to hold that place — see the note on
            `.sui-scrub-chart__grid`. */}
          <Show when={chartWidth() > 0 && highlightBands().length > 0}>
            <ScrubChartHighlights
              chartWidth={chartWidth}
              chartHeight={chartHeight}
              plotTop={plotTop}
              plotHeight={plotHeight}
              bands={highlightBands}
            />
          </Show>
          {/* Gridlines — opt-in horizontal rules at the y-axis ticks. They sit
            BENEATH the series so the data paints over the chrome, unlike the
            axes below (drawn after so the labels stay legible). Document
            order does NOT settle that on its own: the consumer's chart <svg>
            is static, so this absolute layer would paint over it. The CSS
            states `z-index: -1` — read the note there before moving either. */}
          <Show
            when={props.showGridlines && chartWidth() > 0 && yScale() != null}
          >
            <ScrubChartGrid
              chartWidth={chartWidth}
              chartHeight={chartHeight}
              plotLeft={plotLeft}
              plotRight={plotRight}
              yTicks={yTicks}
            />
          </Show>
          <Show when={chartWidth() > 0}>{props.renderChart(ctx())}</Show>
          {/* Clip host — ScrubChart owns no <svg> around `renderChart` (the
            consumer supplies its own), so the plot-rect <clipPath> lives in a
            zero-size <svg> of its own. A clipPath paints nothing itself, and
            `userSpaceOnUse` resolves against the REFERENCING element, so the
            host's size is irrelevant. No vertical inflation: a series past the
            domain clips hard at `plotTop`.

            It renders AFTER `renderChart` on purpose: this host is
            UNCONDITIONAL, so placing it first would put a zero-size <svg> ahead
            of the consumer's chart in every ScrubChart ever rendered.
            `url(#id)` resolves document-wide, so a reference from the earlier
            <svg> still finds this clipPath.

            This does NOT make `frame.querySelector("svg")` reach the
            consumer's chart. `ScrubChartHighlights` and `ScrubChartGrid` each
            render their own <svg> before `renderChart` too. They are opt-in;
            this host is not, which is the whole reason it moved.

            `width`/`height` are attributes as well as CSS. Without the
            stylesheet — SSR's first paint, or a consumer build that strips
            component CSS — a bare inline <svg> falls back to 300x150 and
            would push the consumer's chart down. */}
          <Show when={chartWidth() > 0}>
            <svg
              class="sui-scrub-chart__defs"
              width="0"
              height="0"
              aria-hidden="true"
            >
              <defs>
                <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
                  <rect
                    x={plotLeft()}
                    y={plotTop()}
                    width={Math.max(0, plotRight() - plotLeft())}
                    height={Math.max(0, plotBottom() - plotTop())}
                  />
                </clipPath>
              </defs>
            </svg>
          </Show>
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
              yFitCorner={originCorner}
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
          {/* Y-fit toggle — rendered only when `yFitDomain` is set. It sits in
            the axis origin corner: `plotBottom` puts it level with the x-axis
            tick labels, and the y-axis column holds it left of the plot, so
            it covers no gridline, no label and no data. It comes LAST in the
            frame so it stacks above the gesture overlay and answers its own
            clicks. See ScrubChartYFitControl.tsx for the markup. */}
          <Show when={axisModeOn()}>
            <ScrubChartYAxisModeControl
              mode={() => props.yAxisMode ?? "auto"}
              onSelect={(mode) => props.onYAxisModeChange?.(mode)}
              axisTop={plotBottom}
            />
          </Show>
          {/* The y-axis as a button, fixed mode only — after the gesture
            overlay so it answers its own clicks, like the corner controls. */}
          <Show when={rangeEditable()}>
            <button
              type="button"
              class="sui-scrub-chart__y-axis-hit"
              aria-label="Edit y-axis range"
              aria-expanded={rangeEditorOpen()}
              style={axisHitStyle()}
              onClick={() => setRangeEditorOpen(!rangeEditorOpen())}
            />
          </Show>
          <Show when={rangeEditable() && rangeEditorOpen()}>
            <div class="sui-scrub-chart__y-range-anchor" style={rangeEditorStyle()}>
              <ScrubChartYRangeEditor
                initial={shownRange()}
                field={props.yRangeField}
                onApply={(range) => {
                  setRangeEditorOpen(false);
                  props.onYRangeChange?.(range);
                }}
                onCancel={() => setRangeEditorOpen(false)}
              />
            </div>
          </Show>
          <Show when={!axisModeOn() && yFitControl()}>
            <ScrubChartYFitControl
              mode={yScaleMode}
              onSelect={selectYScaleMode}
              axisTop={plotBottom}
            />
          </Show>
          {/* Expand chevron — rendered only when `chartHeightExpanded` is set.
            It mirrors the y-fit button across the frame: same size, same
            inset, same level on the x-axis row, pinned to the RIGHT edge, so
            a chart that shows both keeps the two apart. */}
          <Show when={expandControl()}>
            <ScrubChartExpandControl
              expanded={expanded}
              onToggle={toggleExpanded}
              axisTop={plotBottom}
            />
          </Show>
          {/* Top-right control — rendered only when `topAction` is set. It
            joins the corner family whole but takes the corner OPPOSITE the
            origin, where there is no axis gutter, so it floats over the top
            right of the plot on its scrim. It comes after the gesture overlay
            for the same reason the other two do: the button must answer its
            own clicks. See ScrubChartTopActionControl.tsx. */}
          <Show when={topAction() !== null}>
            <ScrubChartTopActionControl
              icon={topActionIcon}
              label={topActionLabel}
              onClick={runTopAction}
            />
          </Show>
          {/* Hover readout layer — above all chrome, pointer-events:none so it
            never blocks the gesture overlay beneath. Only this slot gets the
            live hoverIndex, so renderChart doesn't redraw on pointer move. */}
          <Show
            when={
              props.hover &&
              props.renderHoverOverlay &&
              chartWidth() > 0 &&
              hoverIndex() !== null
            }
          >
            <div class="sui-scrub-chart__hover-layer">
              {props.renderHoverOverlay!({
                ...ctx(),
                hoverIndex: hoverIndex(),
              })}
            </div>
          </Show>
        </div>

        {/* The detail ribbon (day-cell filmstrip) — scrub layer only. Plain
          mode renders just the chart frame above. An optional accent border
          wraps the whole ribbon (identity cue) when `ribbonAccent` is set. */}
        <Show when={scrubOn()}>
          <div
            class="sui-scrub-chart__ribbon"
            style={
              props.ribbonAccent
                ? {
                    border: `1px ${
                      props.ribbonAccentDashed ? "dashed" : "solid"
                    } ${props.ribbonAccent}`,
                    "border-radius": "6px",
                    overflow: "hidden",
                  }
                : undefined
            }
          >
            <DateAxis<C>
              cells={props.cells}
              selected={selectedIdx()}
              today={props.today}
              cellWidth={cellWidth()}
              onCellClick={(idx, cell) => emitScrub(idx, cell)}
              renderCell={props.renderCell}
              scrollableRef={handleAxisRef}
            />
          </div>
        </Show>
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
