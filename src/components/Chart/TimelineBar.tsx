// Lanes are inferred from data in first-encounter order when `lanes` is
// omitted (otherwise the caller-supplied order wins, top-to-bottom).
import { Component, For, Show, createMemo, mergeProps } from "solid-js";
import { useChart } from "./context";
import type { ClickHandler, HoverHandler, Id } from "./slot-types";

// Module-level dedupe set for unknown-lane warnings. Pure tracking — keeps the
// warn-once invariant across all TimelineBar instances without coupling to
// component lifecycle.
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
   * Vertical anchor (top of band) when `bandHeight` is set. Accepts an
   * absolute pixel value, or the shorthands "top" / "bottom" /
   * "margin-bottom". When `bandHeight` is set and `bandY` is undefined,
   * defaults to "bottom" (the most common "timeline strip pinned to x-axis"
   * layout).
   *
   * - "top" — anchor at top of inner plot area (y = 0).
   * - "bottom" — anchor at bottom of inner plot area (y = innerHeight - bandHeight).
   * - "margin-bottom" — render BELOW the x-axis in the chart's bottom margin
   *   (y = innerHeight, flush with the axis line). The group OPTS OUT of the
   *   plot-area clip-path so the strip can render outside the inner plot
   *   region. Consumer must ensure `margin.bottom` accommodates the axis
   *   ticks/labels + `bandHeight`. For an explicit gap, use `bandY={number}`.
   * - number — absolute pixel y inside the chart's inner-coordinate frame.
   */
  bandY?: number | "top" | "bottom" | "margin-bottom";
  onBarClick?: ClickHandler<T>;
  onBarHover?: HoverHandler<T>;
  class?: string;
}

export interface TimelineBarOverrides {
  barHeight?: number;
  bandHeight?: number;
  bandY?: number | "top" | "bottom" | "margin-bottom";
  class?: string;
}
export type TimelineBarDataProps<T extends TimelineBarDatum = TimelineBarDatum> =
  Omit<TimelineBarProps<T>, keyof TimelineBarOverrides>;

export function TimelineBar<T extends TimelineBarDatum = TimelineBarDatum>(
  props: TimelineBarProps<T>,
) {
  const ctx = useChart();
  const merged = mergeProps({ barHeight: 0.6 }, props);

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

  // Gap (px) between the x-axis and a "margin-bottom" anchored strip. Zero by
  // default so the strip sits flush against the axis line (useful for strips
  // that visually replace the axis line). Consumers who want a gap can pass
  // `bandY={number}` with an explicit offset.
  const MARGIN_BOTTOM_GAP = 0;

  // Band layout — when `bandHeight` is set, lanes share the band;
  // otherwise lanes fill `innerHeight`.
  const bandTotalHeight = () =>
    merged.bandHeight != null ? merged.bandHeight : ctx.innerHeight();
  const bandTop = (): number => {
    if (merged.bandHeight == null) return 0;
    const anchor = merged.bandY ?? "bottom";
    switch (anchor) {
      case "top":
        return 0;
      case "bottom":
        return ctx.innerHeight() - merged.bandHeight;
      case "margin-bottom":
        return ctx.innerHeight() + MARGIN_BOTTOM_GAP;
      default:
        return anchor;
    }
  };
  const laneHeight = () => bandTotalHeight() / Math.max(1, lanes().length);

  // "margin-bottom" anchors render BELOW the x-axis in the bottom margin —
  // they use the axis-strip clip (full innerWidth, bottom-margin height) so
  // they stay horizontally clipped to the plot area while spanning vertically
  // into the margin. All other anchors use the plot-area clip.
  const activeClipPathUrl = () =>
    merged.bandY === "margin-bottom"
      ? ctx.clip.axisStripPathUrl()
      : ctx.clip.plotPathUrl();

  return (
    <g
      class={`sui-chart__timeline${merged.class ? " " + merged.class : ""}`}
      clip-path={activeClipPathUrl()}
    >
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
  );
}

export function createTimelineBar<T extends TimelineBarDatum = TimelineBarDatum>(
  defaults: Partial<Omit<TimelineBarProps<T>, "children">>,
): Component<TimelineBarDataProps<T>> {
  return (props) => <TimelineBar<T> {...mergeProps(defaults, props as TimelineBarProps<T>)} />;
}
