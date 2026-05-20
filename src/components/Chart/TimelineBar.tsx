// Lanes are inferred from data in first-encounter order when `lanes` is
// omitted (otherwise the caller-supplied order wins, top-to-bottom).
import { Component, For, Show, createMemo, mergeProps } from "solid-js";
import { useChart } from "./context";
import type { ClickHandler, HoverHandler, Id } from "./slot-types";

const warnedLanes = new Set<string>();
const warnUnknownLane = (lane: string): void => {
  if (warnedLanes.has(lane)) return;
  warnedLanes.add(lane);
  // eslint-disable-next-line no-console
  console.warn(`TimelineBar: bar references unknown lane "${lane}" — bar skipped`);
};

export interface TimelineBarDatum {
  id: Id;
  start: number;
  end: number;
  lane: string;
  color: string;
  state?: string;
}

/**
 * Vertical anchor for the timeline strip when `bandHeight` is set.
 *
 * Discriminated union — each variant captures one layout intent:
 * - `{ anchor: "top" }` — pin top of band to top of inner plot area (y = 0).
 * - `{ anchor: "bottom" }` — pin top of band to `innerHeight - bandHeight`
 *   (i.e. flush with the x-axis from above). Default when `bandY` is omitted.
 * - `{ anchor: "margin-bottom", gapPx? }` — render BELOW the x-axis in the
 *   chart's bottom margin (top of band at `innerHeight + (gapPx ?? 0)`).
 *   The group switches to the axis-strip clip-path so the strip stays
 *   horizontally clipped to the plot area while extending vertically into
 *   the margin. Consumer must ensure `margin.bottom` accommodates the axis
 *   ticks/labels + `bandHeight + gapPx`.
 * - `{ y: number }` — absolute pixel y inside the chart's inner-coordinate
 *   frame.
 */
export type BandYAnchor =
  | { anchor: "top" }
  | { anchor: "bottom" }
  | { anchor: "margin-bottom"; gapPx?: number }
  | { y: number };

export interface TimelineBarProps<T extends TimelineBarDatum = TimelineBarDatum> {
  data: readonly T[];
  /** Lane order (top-to-bottom). If omitted, inferred from data encounter order. */
  lanes?: readonly string[];
  selectedId?: Id | null;
  hoveredId?: Id | null;
  /** Bar height as fraction of lane height. Default 0.6. */
  barHeight?: number;
  /**
   * Total vertical extent for the timeline strip in PIXELS. When set, lanes
   * share `bandHeight / lanes.length` instead of filling the full plot area.
   * Use this to render a thin strip near an axis. Default `undefined` (lanes
   * fill `innerHeight`).
   */
  bandHeight?: number;
  /**
   * Vertical anchor for the band. See `BandYAnchor` for variants. Defaults
   * to `{ anchor: "bottom" }` (the most common "timeline strip pinned to
   * x-axis" layout).
   */
  bandY?: BandYAnchor;
  /**
   * Optional label rendered to the LEFT of the strip, inside the chart's
   * left margin. Vertically centered with the band; `text-anchor="end"`
   * so the label right-aligns against the strip's start. Consumers should
   * ensure `margin.left` accommodates the label width. When omitted, no
   * label element is rendered.
   */
  label?: string;
  /**
   * Rotate the strip's label text -45° (bottom-left → top-right). The label
   * anchors its end at the strip's left edge so it reads ascending toward
   * the strip. Default false.
   */
  rotateLabel?: boolean;
  /**
   * Vertical anchor for the label relative to the strip band:
   *   `"center"` (default) — at band center.
   *   `"top"` — at the band's top edge.
   *   `"bottom"` — at the band's bottom edge.
   * Use top/bottom on vertically-snug stacked strips so rotated labels
   * don't collide on the diagonal.
   */
  labelAlign?: "top" | "center" | "bottom";
  /**
   * Stroke color for each segment rect. Defaults to a card-bg-matching
   * dark token so adjacent segments (same lane, different colors) and
   * vertically-adjacent strips (different lanes, same color) read as
   * separate slabs even when their fills touch.
   *
   * Pass `"none"` to disable the stroke entirely.
   */
  segmentStroke?: string;
  /** Stroke width in px. Default 1. */
  segmentStrokeWidth?: number;
  onBarClick?: ClickHandler<T>;
  onBarHover?: HoverHandler<T>;
  class?: string;
}

export interface TimelineBarOverrides {
  barHeight?: number;
  bandHeight?: number;
  bandY?: BandYAnchor;
  segmentStroke?: string;
  segmentStrokeWidth?: number;
  class?: string;
}
export type TimelineBarDataProps<T extends TimelineBarDatum = TimelineBarDatum> =
  Omit<TimelineBarProps<T>, keyof TimelineBarOverrides>;

export function TimelineBar<T extends TimelineBarDatum = TimelineBarDatum>(
  props: TimelineBarProps<T>,
) {
  const ctx = useChart();
  const merged = mergeProps(
    {
      barHeight: 0.6,
      segmentStroke: "var(--sui-border-strong, rgba(255, 255, 255, 0.18))",
      segmentStrokeWidth: 1,
    },
    props,
  );

  const lanes = createMemo<readonly string[]>(() => {
    if (merged.lanes) return merged.lanes;
    const seen = new Set<string>();
    const out: string[] = [];
    for (const d of merged.data) {
      if (!seen.has(d.lane)) {
        seen.add(d.lane);
        out.push(d.lane);
      }
    }
    return out;
  });

  const resolvedBandY = (): BandYAnchor => merged.bandY ?? { anchor: "bottom" };

  const bandTotalHeight = () =>
    merged.bandHeight != null ? merged.bandHeight : ctx.innerHeight();
  const bandTop = (): number => {
    if (merged.bandHeight == null) return 0;
    const b = resolvedBandY();
    if ("y" in b) return b.y;
    switch (b.anchor) {
      case "top":
        return 0;
      case "bottom":
        return ctx.innerHeight() - merged.bandHeight;
      case "margin-bottom":
        return ctx.innerHeight() + (b.gapPx ?? 0);
    }
  };
  const laneHeight = () => bandTotalHeight() / Math.max(1, lanes().length);

  // "margin-bottom" anchors render BELOW the x-axis in the bottom margin —
  // they use the axis-strip clip (full innerWidth, bottom-margin height) so
  // they stay horizontally clipped to the plot area while spanning vertically
  // into the margin. All other anchors use the plot-area clip.
  const activeClipPathUrl = () => {
    const b = resolvedBandY();
    return "anchor" in b && b.anchor === "margin-bottom"
      ? ctx.clip.axisStripPathUrl()
      : ctx.clip.plotPathUrl();
  };

  const labelY = (): number => {
    const align = merged.labelAlign ?? "center";
    if (align === "top") return bandTop();
    if (align === "bottom") return bandTop() + bandTotalHeight();
    return bandTop() + bandTotalHeight() / 2;
  };

  return (
    <>
      <g
        class={`sui-chart__timeline${merged.class ? " " + merged.class : ""}`}
        clip-path={activeClipPathUrl()}
      >
        <Show when={merged.bandHeight != null}>
          <rect
            class="sui-chart__timeline-track"
            x={0}
            y={bandTop()}
            width={ctx.innerWidth()}
            height={bandTotalHeight()}
          />
        </Show>
        <For each={merged.data}>
          {(bar) => {
            const laneIdx = () => lanes().indexOf(bar.lane);
            const x1 = () => ctx.xScale()(bar.start);
            const x2 = () => ctx.xScale()(bar.end);
            const yTop = () =>
              bandTop() +
              laneIdx() * laneHeight() +
              (laneHeight() * (1 - merged.barHeight)) / 2;
            const isSelected = () => merged.selectedId === bar.id;
            const isHovered = () => merged.hoveredId === bar.id;
            return (
              <Show
                when={laneIdx() >= 0}
                fallback={(warnUnknownLane(bar.lane), null)}
              >
                <rect
                  class="sui-chart__timeline-bar"
                  data-id={bar.id}
                  data-state={bar.state}
                  data-selected={isSelected() ? "true" : undefined}
                  data-hovered={isHovered() ? "true" : undefined}
                  x={Math.min(x1(), x2())}
                  y={yTop()}
                  width={Math.abs(x2() - x1())}
                  height={laneHeight() * merged.barHeight}
                  fill={bar.color}
                  stroke={merged.segmentStroke}
                  stroke-width={merged.segmentStrokeWidth}
                  onPointerDown={(e) => merged.onBarClick?.(bar, e)}
                  onPointerEnter={(e) => merged.onBarHover?.(bar, e)}
                  onPointerLeave={(e) => merged.onBarHover?.(null, e)}
                  style={{ cursor: (merged.onBarClick || merged.onBarHover) ? "pointer" : undefined }}
                />
              </Show>
            );
          }}
        </For>
      </g>
      {/* Label sits OUTSIDE the clipped strip group so it can render in
          the left margin without being clipped. `dominant-baseline="central"`
          vertically centers the glyph regardless of font; `text-anchor="end"`
          right-aligns against the strip's start (x = 0 in plot-local
          coords). Pointer events disabled — label is decorative.

          When `rotateLabel` is true the text is rotated -45° about its
          end-anchor at (-8, labelY) so it reads ascending toward the strip;
          the rotated baseline still meets the strip's left edge. */}
      <Show when={merged.label}>
        <text
          class="sui-chart__timeline-bar-label"
          x={merged.rotateLabel ? undefined : -8}
          y={merged.rotateLabel ? undefined : labelY()}
          text-anchor="end"
          dominant-baseline="central"
          transform={
            merged.rotateLabel
              ? `translate(-8, ${labelY()}) rotate(-45)`
              : undefined
          }
          style={{ "pointer-events": "none" }}
        >
          {merged.label}
        </text>
      </Show>
    </>
  );
}

export function createTimelineBar<T extends TimelineBarDatum = TimelineBarDatum>(
  defaults: Partial<Omit<TimelineBarProps<T>, "children">>,
): Component<TimelineBarDataProps<T>> {
  return (props) => <TimelineBar<T> {...mergeProps(defaults, props as TimelineBarProps<T>)} />;
}
