// lastReviewedAt: 2026-10-13
// lastReviewedBy: adlai.arnold
// ============================================
// SlotTrack — Structural (Depth 1). SVG chart slot; composes no library components.
//
// A TRACK of expected slots along one y: one lozenge per slot, as wide as the
// slot's window on the x scale and never narrower than `minWidth`. The
// lozenge's state is data: `filled` when what was expected arrived, `partial`
// when some of it did, `empty` when nothing did (a dashed outline, no fill).
// A caption above a lozenge counts what arrived ("×2", "1 of 2"). The
// arrivals themselves are a `PointSeries` on the same y, composed beside it.
//
// `SlotTrackSwatch` draws one lozenge with a dot at legend size, for a
// `Legend` item's `swatch`.
// ============================================
import { type Component, For, Show } from "solid-js";
import { useChart } from "./context";

export type SlotState = "filled" | "partial" | "empty";

export interface SlotTrackProps<T> {
  data: readonly T[];
  /** The slot's window on the x scale, in data units (epoch ms on a time axis). */
  from: (d: T) => number;
  to: (d: T) => number;
  /** The y the track sits on, in data units. */
  y: number;
  state: (d: T) => SlotState;
  /** A short count drawn above the lozenge. Omitted or empty, none. */
  caption?: (d: T) => string | undefined;
  /** Tooltip / aria title per slot. */
  title?: (d: T) => string;
  /** Lozenge height in px. Default 8. */
  height?: number;
  /** Lozenge minimum width in px. Default 22. */
  minWidth?: number;
  class?: string;
}

export function SlotTrack<T>(props: SlotTrackProps<T>) {
  const ctx = useChart();
  const height = () => props.height ?? 8;
  const minWidth = () => props.minWidth ?? 22;
  return (
    <g class={`sui-chart__slot-track${props.class ? ` ${props.class}` : ""}`}>
      <For each={props.data}>
        {(d) => {
          const xs = () => ctx.xScale();
          const x0 = () => xs()(props.from(d));
          const x1 = () => xs()(props.to(d));
          const width = () => Math.max(x1() - x0(), minWidth());
          const mid = () => (x0() + x1()) / 2;
          const cy = () => ctx.yScale()(props.y);
          const caption = () => props.caption?.(d) ?? "";
          return (
            <g
              class={`sui-chart__slot sui-chart__slot--${props.state(d)}`}
              data-state={props.state(d)}
            >
              <rect
                x={mid() - width() / 2}
                y={cy() - height() / 2}
                width={width()}
                height={height()}
                rx={height() / 2}
              >
                <Show when={props.title}>
                  <title>{props.title!(d)}</title>
                </Show>
              </rect>
              <Show when={caption() !== ""}>
                <text
                  class="sui-chart__slot-caption"
                  x={mid()}
                  y={cy() - height() / 2 - 3}
                  text-anchor="middle"
                >
                  {caption()}
                </text>
              </Show>
            </g>
          );
        }}
      </For>
    </g>
  );
}

export interface SlotTrackSwatchProps {
  /** The state the swatch shows. Default `filled`. */
  state?: SlotState;
}

/** One lozenge with a dot, at legend size: a `Legend` item's `swatch`. */
export const SlotTrackSwatch: Component<SlotTrackSwatchProps> = (props) => (
  <svg
    class={`sui-chart__slot-swatch sui-chart__slot sui-chart__slot--${props.state ?? "filled"}`}
    width="22"
    height="10"
    viewBox="0 0 22 10"
    aria-hidden="true"
  >
    <rect x="1" y="1" width="20" height="8" rx="4" />
    <circle cx="11" cy="5" r="2" />
  </svg>
);
