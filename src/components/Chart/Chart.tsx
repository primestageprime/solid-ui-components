// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// Chart — composed root. Owns the single pointer listener on its <svg>
// (so per-slot listeners would clobber dispatch); slots read scales +
// pointer state via context.
import {
  type Component,
  type JSX,
  Show,
  createMemo,
  createSignal,
  createUniqueId,
  splitProps,
} from "solid-js";
import {
  ChartContext,
  type ChartContextValue,
  type DragRange,
  type Margin,
} from "./context";
import { linearScale, scaleTime, type Scale } from "./scales";
import { DEFAULT_GLYPH_SIZE } from "./shapes";
import type { Id } from "./slot-types";
import "./Chart.css";

export interface ChartProps {
  width: number;
  height: number;
  /** Data domain on X. Accepts numbers (linear scale) or Dates (time scale). */
  xDomain: [number, number] | [Date, Date];
  /** Data domain on Y. */
  yDomain: [number, number];
  /** Plot-area inset. Default: { top: 8, right: 8, bottom: 28, left: 36 }. */
  margin?: Partial<Margin>;
  /**
   * Height (px) of a reserved annotation lane that sits in the TOP margin,
   * directly ABOVE the plot area. When > 0, slots like `<PinMarkers
   * lane="annotation">` and `<GhostArc anchor="above">` render into the
   * band (y ∈ [-annotationLaneHeight, 0] in plot-local coords) instead of
   * colliding with data inside the plot.
   *
   * The lane lives INSIDE the existing top margin — the caller is
   * responsible for sizing `margin.top` to leave room (typically
   * `margin.top >= annotationLaneHeight + a few px breathing room`). The
   * lane does NOT shrink `innerHeight`. Default 0 (lane disabled).
   */
  annotationLaneHeight?: number;
  /** Optional title. Rendered as an HTML `<div>` ABOVE the SVG (so it
   *  doesn't eat plot pixels) and ALSO surfaced as the SVG `<title>` for
   *  screen readers. */
  title?: string;
  class?: string;
  style?: JSX.CSSProperties | string;
  children?: JSX.Element;
}

const DEFAULT_MARGIN: Margin = { top: 8, right: 8, bottom: 28, left: 36 };

// Vertical inflation for the plot-area clipPath so glyphs centered at the
// top/bottom edges (e.g. chevrons at y=domainMax) render fully. Half-glyph
// plus a 6px buffer.
const PLOT_CLIP_INFLATE_Y = DEFAULT_GLYPH_SIZE / 2 + 6;

const isDateDomain = (d: ChartProps["xDomain"]): d is [Date, Date] => {
  const a = d[0] instanceof Date;
  const b = d[1] instanceof Date;
  if (a !== b) {
    throw new Error(
      `Chart.xDomain: mixed types not allowed (got ${typeof d[0]}, ${typeof d[1]})`,
    );
  }
  return a && b;
};

export const Chart: Component<ChartProps> = (props) => {
  // NB: `onPointer*` are listed so that any pass-through handlers from a consumer
  // are routed to `local` (and discarded) — never spread onto the <svg> via
  // `others`, where they would clobber Chart's own listeners.
  // We widen via intersection so the keys are valid for `splitProps` even though
  // they are intentionally absent from the public `ChartProps` surface.
  type PointerPassthrough = Pick<
    JSX.SvgSVGAttributes<SVGSVGElement>,
    "onPointerMove" | "onPointerDown" | "onPointerUp" | "onPointerLeave"
  >;
  const [local, others] = splitProps(props as ChartProps & PointerPassthrough, [
    "width",
    "height",
    "xDomain",
    "yDomain",
    "margin",
    "annotationLaneHeight",
    "title",
    "class",
    "style",
    "children",
    "onPointerMove",
    "onPointerDown",
    "onPointerUp",
    "onPointerLeave",
  ]);

  // Title lives in an HTML `<div>` ABOVE the SVG (see render below), so
  // `margin.top` defaults straight to `DEFAULT_MARGIN.top` regardless of
  // whether a title is set.
  const margin = createMemo<Margin>(() => ({
    ...DEFAULT_MARGIN,
    ...(local.margin ?? {}),
  }));
  const width = createMemo(() => local.width);
  const height = createMemo(() => local.height);
  const innerWidth = createMemo(() =>
    Math.max(0, width() - margin().left - margin().right),
  );
  const innerHeight = createMemo(() =>
    Math.max(0, height() - margin().top - margin().bottom),
  );
  const annotationLaneHeight = createMemo(() =>
    Math.max(0, local.annotationLaneHeight ?? 0),
  );

  const xScale = createMemo<Scale>(() => {
    const d = local.xDomain;
    return isDateDomain(d)
      ? scaleTime(d, [0, innerWidth()])
      : linearScale(d, [0, innerWidth()]);
  });
  const yScale = createMemo<Scale>(() =>
    linearScale(local.yDomain, [innerHeight(), 0]),
  );

  const [hoverX, setHoverX] = createSignal<number | null>(null);
  const [dragRange, setDragRange] = createSignal<DragRange | null>(null);
  const [committedDragRange, setCommittedDragRange] =
    createSignal<DragRange | null>(null);
  const [tooltipMount, setTooltipMount] = createSignal<HTMLElement | null>(
    null,
  );

  // ---- Global "nearest emphasis" coordinator ----
  // Slots report their nearest-candidate distance (DATA-domain units). The
  // coordinator derives the single winning slotId; ties are broken by first
  // reporter (insertion order in the Map). Map signal uses immutable updates
  // so the createMemo below tracks correctly.
  const [emphasisCandidates, setEmphasisCandidates] = createSignal<
    Map<Id, number>
  >(new Map());

  const reportEmphasisCandidate = (slotId: Id, distance: number): void => {
    setEmphasisCandidates((prev) => {
      if (prev.get(slotId) === distance) return prev;
      const next = new Map(prev);
      next.set(slotId, distance);
      return next;
    });
  };
  const clearEmphasisCandidate = (slotId: Id): void => {
    setEmphasisCandidates((prev) => {
      if (!prev.has(slotId)) return prev;
      const next = new Map(prev);
      next.delete(slotId);
      return next;
    });
  };
  const emphasisWinnerSlotId = createMemo<Id | null>(
    () =>
      Array.from(emphasisCandidates().entries()).reduce<{
        id: Id | null;
        dist: number;
      }>((best, [id, dist]) => (dist < best.dist ? { id, dist } : best), {
        id: null,
        dist: Infinity,
      }).id,
  );

  // Per-instance clipPath ids — stable across renders, unique across charts.
  const clipId = `sui-chart-clip-${createUniqueId()}`;
  const clipPathUrl = createMemo(() => `url(#${clipId})`);
  const axisStripClipId = `sui-chart-axis-strip-clip-${createUniqueId()}`;
  const axisStripClipPathUrl = createMemo(() => `url(#${axisStripClipId})`);
  const annotationLaneClipId = `sui-chart-annotation-lane-clip-${createUniqueId()}`;
  const annotationLanePathUrl = createMemo(
    () => `url(#${annotationLaneClipId})`,
  );

  let svgEl: SVGSVGElement | undefined;
  let dragAnchor: number | null = null;

  const pointerDataX = (clientX: number): number | null => {
    if (!svgEl) return null;
    const rect = svgEl.getBoundingClientRect();
    const px = clientX - rect.left - margin().left;
    if (px < 0 || px > innerWidth()) return null;
    return xScale().invert(px);
  };

  const onPointerMove = (e: PointerEvent) => {
    const x = pointerDataX(e.clientX);
    setHoverX(x);
    if (dragAnchor != null && x != null) {
      setDragRange({
        start: Math.min(dragAnchor, x),
        end: Math.max(dragAnchor, x),
      });
    }
  };
  const onPointerDown = (e: PointerEvent) => {
    const x = pointerDataX(e.clientX);
    if (x == null) return;
    dragAnchor = x;
    setDragRange({ start: x, end: x });
    // Clear any previous commit so the next pointerup is observably a new event.
    setCommittedDragRange(null);
  };
  const onPointerUp = () => {
    if (dragAnchor != null) {
      const range = dragRange();
      if (range != null) setCommittedDragRange(range);
    }
    dragAnchor = null;
    // Leave the latest dragRange in place; consumers clear it via setDragRange(null).
  };
  const onPointerLeave = () => {
    setHoverX(null);
    dragAnchor = null;
  };

  const ctx: ChartContextValue = {
    width,
    height,
    margin,
    innerWidth,
    innerHeight,
    annotationLaneHeight,
    xScale,
    yScale,
    hoverX,
    setHoverX,
    drag: {
      range: dragRange,
      setRange: setDragRange,
      committed: committedDragRange,
      setCommitted: setCommittedDragRange,
    },
    emphasis: {
      report: reportEmphasisCandidate,
      clear: clearEmphasisCandidate,
      winnerId: emphasisWinnerSlotId,
    },
    clip: {
      plotPathUrl: clipPathUrl,
      axisStripPathUrl: axisStripClipPathUrl,
      annotationLanePathUrl,
    },
    overlay: {
      tooltipMount,
      setTooltipMount,
    },
  };

  return (
    <ChartContext.Provider value={ctx}>
      <div
        class={`sui-chart${local.class ? ` ${local.class}` : ""}`}
        style={local.style as JSX.CSSProperties}
      >
        <Show when={local.title}>
          <div class="sui-chart__title">{local.title}</div>
        </Show>
        <svg
          ref={svgEl}
          class="sui-chart__svg"
          width={width()}
          height={height()}
          viewBox={`0 0 ${width()} ${height()}`}
          role={local.title ? "img" : undefined}
          aria-label={local.title}
          aria-hidden={local.title ? undefined : "true"}
          onPointerMove={onPointerMove}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerLeave}
          {...(others as JSX.SvgSVGAttributes<SVGSVGElement>)}
        >
          <Show when={local.title}>
            <title>{local.title}</title>
          </Show>
          <defs>
            <clipPath id={clipId}>
              <rect
                x={0}
                y={-PLOT_CLIP_INFLATE_Y}
                width={innerWidth()}
                height={innerHeight() + PLOT_CLIP_INFLATE_Y * 2}
              />
            </clipPath>
            {/*
              Axis-strip clip: spans the full inner-plot width but lives in
              the bottom-margin region. Rect coords are in plot-local space
              because the consuming `<g>` lives inside the same
              `<g transform="translate(margin)">` wrapper.
            */}
            <clipPath id={axisStripClipId}>
              <rect
                x={0}
                y={innerHeight()}
                width={innerWidth()}
                height={margin().bottom}
              />
            </clipPath>
            {/*
              Annotation-lane clip: x spans the full inner-plot width, y
              spans `[-annotationLaneHeight, 0]` in plot-local coords —
              i.e. the band carved out of the top margin, directly above
              the plot area. Collapses to zero height when the chart is
              not hosting an annotation lane.
            */}
            <clipPath id={annotationLaneClipId}>
              <rect
                x={0}
                y={-annotationLaneHeight()}
                width={innerWidth()}
                height={annotationLaneHeight()}
              />
            </clipPath>
          </defs>
          <g transform={`translate(${margin().left}, ${margin().top})`}>
            {local.children}
          </g>
        </svg>
        <div ref={(el) => setTooltipMount(el)} class="sui-chart__overlay" />
      </div>
    </ChartContext.Provider>
  );
};
