// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// Optional `lanes` prop enables vertical lane-stacking; omitting it
// renders full-height bands (mirrors TimelineBar).
import { type Component, For, Show, createMemo, mergeProps } from "solid-js";
import { clickableCursor } from "../../internal/style/clickable";
import { useChart } from "./context";
import type { ClickHandler, HoverHandler, Id } from "./slot-types";

/**
 * Opacity multiplier applied to selected segments. The base `fillOpacity` is
 * scaled by this factor (capped at 1) so selection visibly pops against the
 * unselected band. Tuned at 2.5 for the default 0.18 base (→ 0.45).
 */
const SELECTED_OPACITY_MULTIPLIER = 2.5;

// Module-level dedupe set for unknown-lane warnings. Pure tracking — keeps the
// warn-once invariant across all HighlightSegments instances without coupling
// to component lifecycle. Same pattern as TimelineBar.
const warnedLanes = new Set<string>();
const warnUnknownLane = (lane: string): null => {
  if (warnedLanes.has(lane)) return null;
  warnedLanes.add(lane);
  // eslint-disable-next-line no-console
  console.warn(
    `HighlightSegments: segment references unknown lane "${lane}" — segment skipped`,
  );
  return null;
};

export interface HighlightSegment {
  id: Id;
  start: number;
  end: number;
  color: string;
  label?: string;
  opacity?: number;
  /** Optional lane key for vertical stacking. Used when parent passes `lanes` prop. */
  lane?: string;
}

export interface HighlightSegmentsProps<
  T extends HighlightSegment = HighlightSegment,
> {
  data: readonly T[];
  /**
   * Lane order (top-to-bottom) for vertical stacking. Omitting renders
   * full-height bands. Segments referencing a lane NOT in this list are
   * skipped with a one-time console warning.
   */
  lanes?: readonly string[];
  /** IDs currently selected (highlighted with extra emphasis). */
  selectedIds?: ReadonlySet<Id>;
  /**
   * IDs externally driven into the same visual state as CSS `:hover`
   * (brighter opacity + stroke outline). Independent of `selectedIds` —
   * both can apply simultaneously. Use this to mirror hover from a
   * sibling panel (e.g. alarm-list ↔ chart sync).
   */
  emphasizedIds?: ReadonlySet<Id>;
  /** Default opacity for unselected segments. Default 0.18. */
  fillOpacity?: number;
  /** Pointer events. */
  onClick?: ClickHandler<T>;
  onHover?: HoverHandler<T>;
  class?: string;
}

export interface HighlightSegmentsOverrides {
  fillOpacity?: number;
  class?: string;
}
export type HighlightSegmentsDataProps<
  T extends HighlightSegment = HighlightSegment,
> = Omit<HighlightSegmentsProps<T>, keyof HighlightSegmentsOverrides>;

export function HighlightSegments<
  T extends HighlightSegment = HighlightSegment,
>(props: HighlightSegmentsProps<T>) {
  const ctx = useChart();
  const merged = mergeProps({ fillOpacity: 0.18 }, props);

  // Visual-hover signal driven by chart-root `ctx.hoverX()` rather than
  // per-rect DOM pointer events. Sibling slots (PointSeries dots, crosshair
  // dot/guide, PinMarkers chevrons) intermittently capture pointer events
  // and trigger spurious `pointerleave` on the segment rect; deriving hover
  // from the already-tracked data-domain cursor position is immune to that.
  const hoveredId = createMemo<Id | null>(() => {
    const hx = ctx.hoverX();
    if (hx === null) return null;
    const found = merged.data.find((s) => hx >= s.start && hx <= s.end);
    return found ? found.id : null;
  });

  return (
    <g
      class={`sui-chart__highlight-segments${merged.class ? ` ${merged.class}` : ""}`}
      clip-path={ctx.clip.plotPathUrl()}
    >
      <For each={merged.data}>
        {(seg) => {
          const x1 = () => ctx.xScale()(seg.start);
          const x2 = () => ctx.xScale()(seg.end);
          const isSelected = () => merged.selectedIds?.has(seg.id) ?? false;
          const isEmphasized = () => merged.emphasizedIds?.has(seg.id) ?? false;
          // Lane-aware vertical placement.
          // - lanes undefined → full-height.
          // - lanes set, seg.lane undefined → full-height (spans all lanes).
          // - lanes set, seg.lane IN lanes → that lane's band.
          // - lanes set, seg.lane NOT in lanes → skip + warn.
          const laneIdx = (): number => {
            if (!merged.lanes || !seg.lane) return -1;
            return merged.lanes.indexOf(seg.lane);
          };
          const laneCount = () => merged.lanes?.length ?? 1;
          const laneHeight = () => ctx.innerHeight() / Math.max(1, laneCount());
          const isLaned = () => laneIdx() >= 0;
          const isUnknownLane = () =>
            merged.lanes != null && seg.lane != null && laneIdx() < 0;
          const y = () => (isLaned() ? laneIdx() * laneHeight() : 0);
          const h = () => (isLaned() ? laneHeight() : ctx.innerHeight());
          return (
            <Show when={!isUnknownLane()} fallback={warnUnknownLane(seg.lane!)}>
              <rect
                class="sui-chart__highlight-segment"
                data-id={seg.id}
                data-selected={isSelected() ? "true" : undefined}
                data-emphasized={isEmphasized() ? "true" : undefined}
                data-hovered={hoveredId() === seg.id ? "true" : undefined}
                x={Math.min(x1(), x2())}
                y={y()}
                width={Math.abs(x2() - x1())}
                height={h()}
                fill={seg.color}
                opacity={
                  seg.opacity ??
                  (isSelected()
                    ? Math.min(
                        1,
                        merged.fillOpacity * SELECTED_OPACITY_MULTIPLIER,
                      )
                    : merged.fillOpacity)
                }
                onPointerDown={(e) => merged.onClick?.(seg, e)}
                onPointerEnter={(e) => merged.onHover?.(seg, e)}
                onPointerLeave={(e) => merged.onHover?.(null, e)}
                style={clickableCursor(!!merged.onClick)}
              />
            </Show>
          );
        }}
      </For>
    </g>
  );
}

export function createHighlightSegments<
  T extends HighlightSegment = HighlightSegment,
>(
  defaults: Partial<Omit<HighlightSegmentsProps<T>, "children">>,
): Component<HighlightSegmentsDataProps<T>> {
  return (props) => (
    <HighlightSegments<T>
      {...mergeProps(defaults, props as HighlightSegmentsProps<T>)}
    />
  );
}
