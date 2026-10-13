// lastReviewedAt: 2026-09-11
// lastReviewedBy: adlai.arnold
// ChartLabels — Structural (Depth 1). SVG chart slot; composes no library
// components.
// ============================================
// The `Chart` ADAPTER for the label-ladder mark, per
// docs/adr/0010-a-mark-is-a-core-plus-one-adapter-per-context.md.
// `placeLabels` (`./labelPlacement.ts`) is the CORE: it takes an explicit
// pixel plot rect and returns where each label lands — data, never JSX. This
// adapter reads `useChart()` — PLOT-LOCAL — and converts `data` through
// `xScale`/`yScale` into the core's geometry, reserving space against the
// plot's OWN `innerWidth`/`innerHeight` (a `Chart`'s margins are fixed at
// mount, unlike `ScrubChart`'s, so this adapter does not feed a reservation
// back into the margin the way `CashflowScrubChart` does).
// `ScrubChart`'s `ScrubChartLabels` (`../ScrubChart/ScrubChartLabels.tsx`) is
// the other adapter; it supplies FRAME-ABSOLUTE pixels instead — the
// coordinate difference the two adapters exist to absorb. Both call the
// core's `drawnLabels` to pair a placement with the text it draws, so
// neither re-derives that pairing.
// Filed as ChartLabels.tsx: a name differing only in case from the core's
// `labelPlacement.ts` risks nothing here, but stays paired with the core's
// name for the same reason `DeviationBandMark.tsx` does.
// ============================================
import { For, createMemo } from "solid-js";
import { map } from "../../fn";
import { useChart } from "./context";
import {
  LABEL_ROW_HEIGHT,
  type ChartLabel,
  type LabelPoint,
  type LabelZone,
  type PlotRect,
  type Polyline,
  drawnLabels,
  placeLabels,
  reserveLabelSpace,
} from "./labelPlacement";

export interface ChartLabelsProps<T> {
  /** Ordered items each label is anchored to. */
  data: readonly T[];
  /** Stable identity for one item's label. */
  id: (d: T, index: number) => string;
  /** Text the label draws. */
  text: (d: T, index: number) => string;
  /** Measured text width in px, e.g. via `measureLabelWidth`. */
  width: (d: T, index: number) => number;
  /** Item → x, in the chart's x-domain unit. */
  x: (d: T, index: number) => number;
  /** Item → y, in the chart's y-domain unit. */
  y: (d: T, index: number) => number;
  /** Item → the caller's stated zone. Defaults to `"auto"` for every item. */
  placement?: (d: T, index: number) => LabelZone;
  /** Every drawn series, in the chart's domain units. A body label may not
   *  cross one: a caption over a line is unreadable even when no text
   *  collides. Omitted, the body rung tests against no line. */
  polylines?: readonly (readonly LabelPoint[])[];
  /** Extra px a right-gutter label stands past the plot edge, beyond the
   *  ladder's own gap, so a mark in the gutter (a `GapBracket`) keeps
   *  clear of the text. Default `0`. */
  rightInset?: number;
  /** The right gutter the host already reserved in its margin, in px. The
   *  ladder's own reservation (the widest explicit `"right"` label) is the
   *  floor; a wider host gutter lets an `"auto"` caption that cannot sit
   *  beside its point move into the gutter instead of dropping. */
  gutterWidth?: number;
  /** Extra class on the wrapping `<g>`, alongside the base
   *  `sui-chart__labels` class. */
  class?: string;
}

/**
 * Draws the label ladder as a `Chart` slot child: one `<text>` per item
 * `placeLabels` found room for. Plot-local pixels, read from `useChart()`.
 */
export function ChartLabels<T>(props: ChartLabelsProps<T>) {
  const ctx = useChart();
  const candidates = createMemo<readonly ChartLabel[]>(() =>
    map((d: T, i: number) => {
      const py = ctx.yScale()(props.y(d, i));
      return {
        id: props.id(d, i),
        text: props.text(d, i),
        width: props.width(d, i),
        height: LABEL_ROW_HEIGHT,
        placement: props.placement?.(d, i) ?? "auto",
        x: ctx.xScale()(props.x(d, i)),
        y: py,
        endY: py,
      };
    }, props.data),
  );
  const polylines = createMemo<readonly Polyline[]>(() =>
    map(
      (line: readonly LabelPoint[]) =>
        map((p: LabelPoint) => ({ x: ctx.xScale()(p.x), y: ctx.yScale()(p.y) }), line),
      props.polylines ?? [],
    ),
  );
  const drawn = createMemo(() => {
    const plot: PlotRect = {
      left: 0,
      top: 0,
      right: ctx.innerWidth(),
      bottom: ctx.innerHeight(),
    };
    const reserved = reserveLabelSpace(candidates());
    const space = { ...reserved, rightGutter: Math.max(reserved.rightGutter, props.gutterWidth ?? 0) };
    const inset = props.rightInset ?? 0;
    return map(
      (label) =>
        label.placed.zone === "right" && inset !== 0
          ? { ...label, placed: { ...label.placed, x: label.placed.x + inset } }
          : label,
      drawnLabels(candidates(), placeLabels(candidates(), plot, polylines(), space)),
    );
  });

  return (
    <g class={`sui-chart__labels${props.class ? ` ${props.class}` : ""}`}>
      <For each={drawn()}>
        {(label) => (
          <text
            class={`sui-chart__label sui-chart__label--${label.placed.zone}`}
            x={label.placed.x}
            y={label.placed.y}
            text-anchor={label.placed.anchor}
          >
            {label.text}
          </text>
        )}
      </For>
    </g>
  );
}
