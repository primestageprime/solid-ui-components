// ============================================
// labelLayer — the paint half of the chart-label feature.
//
// `labelPlacement.ts` decides WHERE a label goes. This module decides WHICH
// labels exist, measures them, and draws the survivors. It sits in its own
// file because `CashflowScrubChart.tsx` is already past the 500-line guidance.
//
// The two exported builders run at two different times, and the order is the
// whole mechanism (see labelPlacement.ts's header):
//
//   labelReservations(...)  BEFORE the scales exist. Text and stated zone
//                           only — that is all `reserveLabelSpace` may read.
//   labelCandidates(...)    AFTER the scales exist, inside the frame the
//                           reservation bought.
//
// Both walk the same list in the same order — every series, then every marker.
// The reservation pass is an AGGREGATE (a widest and a count), so it keeps a
// label whose anchor point has no value; the candidate pass drops that label,
// because there is no point to hang it on. `placeLabels` indexes its results
// against the CANDIDATES, so the two lists never have to line up.
//
// WHICH LABELS EXIST
//
// A series joins as soon as it carries a `label`. Rendering that field is the
// point of the feature; it has been on the public API for a long time and
// nothing drew it.
//
// A marker joins only with an EXPLICIT `labelPlacement`. A `"rule"` marker
// already paints its caption at the top of its own rule, and its line already
// starts below that caption, so an "auto" marker keeps the position it had
// before this feature existed and no current chart moves. An explicit zone
// moves the caption into the ladder and hands the rule its full height back.
// ============================================
import { type Component, For } from "solid-js";
import { filter, flatMap, map } from "../../fn";
import { measureLabelWidth } from "../ScrubChart/helpers";
import {
  LABEL_ROW_HEIGHT,
  type LabelCandidate,
  type LabelPoint,
  type Polyline,
  type LabelPlacementResult,
  type LabelReservation,
  type PlacedLabel,
} from "./labelPlacement";
import type {
  CashflowBalanceSeries,
  CashflowCell,
  CashflowChartMarker,
} from "./types";

/** Pixel geometry the candidate builder needs, taken from the chart context. */
export interface LabelGeometry {
  /** Centre x for the cell at `index`. */
  readonly cellToX: (index: number) => number;
  /** A y-domain value in cents, mapped to a pixel y. */
  readonly yToPlot: (value: number) => number;
  /** Balance in cents on the primary line at `index`, when there is one. */
  readonly primaryCents: (index: number) => number | undefined;
  /** How many cells the chart draws. */
  readonly cellCount: number;
}

/**
 * A marker's caption is placed by the ladder only when the caller names a
 * zone. "auto" and an absent field both keep the top-of-rule caption that
 * `renderMarkers` has always drawn.
 */
export const markerJoinsLadder = (marker: CashflowChartMarker): boolean =>
  Boolean(marker.label) &&
  marker.labelPlacement !== undefined &&
  marker.labelPlacement !== "auto";

/** Series that carry a label, in array order. */
const labelledSeries = (
  series: readonly CashflowBalanceSeries[],
): readonly CashflowBalanceSeries[] =>
  filter((s: CashflowBalanceSeries) => Boolean(s.label), series);

/** Markers the ladder owns, in array order. */
const ladderMarkers = (
  markers: readonly CashflowChartMarker[],
): readonly CashflowChartMarker[] => filter(markerJoinsLadder, markers);

/**
 * What every label costs the frame, from the text and the stated zone ALONE.
 *
 * This runs before any scale exists, so it may read nothing else. Its output
 * feeds `reserveLabelSpace`, whose output feeds `rightGutter` and
 * `xAxisExtraHeight` — the two knobs that build the scales the placement pass
 * then reads back.
 *
 * @param series  The chart's overlay balance series.
 * @param markers The chart's plotline markers.
 * @returns One reservation per label, series first and markers second.
 */
export const labelReservations = (
  series: readonly CashflowBalanceSeries[],
  markers: readonly CashflowChartMarker[],
): readonly LabelReservation[] => [
  ...map(
    (s: CashflowBalanceSeries) => ({
      width: measureLabelWidth(s.label ?? ""),
      placement: s.labelPlacement ?? ("auto" as const),
    }),
    labelledSeries(series),
  ),
  ...map(
    (m: CashflowChartMarker) => ({
      width: measureLabelWidth(m.label ?? ""),
      placement: m.labelPlacement ?? ("auto" as const),
    }),
    ladderMarkers(markers),
  ),
];

/** One label with its text kept, so the layer can draw what the ladder placed. */
export interface ChartLabel extends LabelCandidate {
  readonly text: string;
}

/** The last index whose accessor returns a value, or `null` for an empty line. */
const lastDefinedIndex = (
  count: number,
  valueAt: (index: number) => number | null | undefined,
): number | null => {
  let found: number | null = null;
  for (let i = 0; i < count; i += 1) {
    if (valueAt(i) != null) found = i;
  }
  return found;
};

/**
 * One candidate per series label, anchored at the series' LAST drawn point —
 * the conventional place to name a line, and the only point on it guaranteed
 * to have clear space on one side.
 */
const seriesCandidates = (
  series: readonly CashflowBalanceSeries[],
  cells: readonly CashflowCell[],
  geometry: LabelGeometry,
): readonly ChartLabel[] =>
  filter(
    (c): c is ChartLabel => c !== null,
    map((s: CashflowBalanceSeries) => {
      const at = (i: number) => s.balanceCents(cells[i], i);
      const last = lastDefinedIndex(geometry.cellCount, at);
      const value = last === null ? null : at(last);
      if (last === null || value == null) return null;
      const y = geometry.yToPlot(value);
      return {
        id: `series:${s.id}`,
        text: s.label ?? "",
        width: measureLabelWidth(s.label ?? ""),
        height: LABEL_ROW_HEIGHT,
        placement: s.labelPlacement ?? ("auto" as const),
        x: geometry.cellToX(last),
        y,
        endY: y,
      };
    }, labelledSeries(series)),
  );

/** One candidate per ladder-owned marker, anchored at the marker's own point. */
const markerCandidates = (
  markers: readonly CashflowChartMarker[],
  geometry: LabelGeometry,
): readonly ChartLabel[] =>
  filter(
    (c): c is ChartLabel => c !== null,
    map((m: CashflowChartMarker) => {
      const value = m.valueCents ?? geometry.primaryCents(m.index);
      if (value == null) return null;
      const y = geometry.yToPlot(value);
      return {
        id: `marker:${m.index}`,
        text: m.label ?? "",
        width: measureLabelWidth(m.label ?? ""),
        height: LABEL_ROW_HEIGHT,
        placement: m.labelPlacement ?? ("auto" as const),
        x: geometry.cellToX(m.index),
        y,
        endY: y,
      };
    }, ladderMarkers(markers)),
  );

/**
 * Every label the ladder must place, with the pixel geometry it needs.
 *
 * This runs AFTER the scales exist, inside the frame the reservation bought.
 *
 * @param series   The chart's overlay balance series.
 * @param markers  The chart's plotline markers.
 * @param cells    The cells the series accessors read.
 * @param geometry Scales and counts from the chart context.
 * @returns One candidate per label whose anchor point has a value.
 */
export const labelCandidates = (
  series: readonly CashflowBalanceSeries[],
  markers: readonly CashflowChartMarker[],
  cells: readonly CashflowCell[],
  geometry: LabelGeometry,
): readonly ChartLabel[] => [
  ...seriesCandidates(series, cells, geometry),
  ...markerCandidates(
    filter(
      (m: CashflowChartMarker) => m.index >= 0 && m.index < geometry.cellCount,
      markers,
    ),
    geometry,
  ),
];

/**
 * Split a cell range into the runs of consecutive points that carry a value.
 * A run of one point draws no segment, so it cannot be crossed and is left
 * out. The loop carries the run being built, which a combinator would only
 * hide.
 */
const runsOf = (
  count: number,
  pointAt: (index: number) => LabelPoint | null,
): readonly Polyline[] => {
  const runs: LabelPoint[][] = [];
  let current: LabelPoint[] = [];
  for (let i = 0; i < count; i += 1) {
    const point = pointAt(i);
    if (point === null) {
      if (current.length > 1) runs.push(current);
      current = [];
      continue;
    }
    current.push(point);
  }
  if (current.length > 1) runs.push(current);
  return runs;
};

/**
 * Every line the chart paints, as the pixel polylines the body rung tests
 * against. A caption that crosses a drawn line is unreadable even when it
 * collides with no other text, so the primary line and every overlay series
 * are handed in — each split at its own gaps, so a break in a forecast is not
 * bridged by a segment the chart never draws.
 *
 * @param cells    The cells the series accessors read.
 * @param series   The chart's overlay balance series.
 * @param geometry Scales and counts from the chart context.
 * @returns One polyline per drawn run.
 */
export const drawnPolylines = (
  cells: readonly CashflowCell[],
  series: readonly CashflowBalanceSeries[],
  geometry: LabelGeometry,
): readonly Polyline[] => {
  const pointOf = (index: number, value: number | null | undefined) =>
    value == null
      ? null
      : { x: geometry.cellToX(index), y: geometry.yToPlot(value) };
  return [
    ...runsOf(geometry.cellCount, (i) => pointOf(i, geometry.primaryCents(i))),
    ...flatMap(
      (s: CashflowBalanceSeries) =>
        runsOf(geometry.cellCount, (i) =>
          pointOf(i, s.balanceCents(cells[i], i)),
        ),
      series,
    ),
  ];
};

/** A label the ladder placed, paired back with the text to draw. */
interface DrawnLabel {
  readonly placed: PlacedLabel;
  readonly text: string;
}

/**
 * Pair each result with its candidate and drop the ones the ladder refused.
 *
 * A dropped label draws nothing and logs nothing. Silence is the specified
 * behaviour: a caller cannot see the container width or the theme's font, so
 * a drop is the component doing its job, not a fault to report.
 */
export const drawnLabels = (
  labels: readonly ChartLabel[],
  results: readonly LabelPlacementResult[],
): readonly DrawnLabel[] =>
  filter(
    (d): d is DrawnLabel => d !== null,
    map(
      (result: LabelPlacementResult, i: number) =>
        result.kind === "placed"
          ? { placed: result, text: labels[i].text }
          : null,
      results,
    ),
  );

/**
 * The label layer: one `<text>` per placed label, in one `<g>`.
 *
 * Emitted AFTER the primary line so it paints on top. SVG has no z-index, so
 * document order is paint order — appending the layer reorders nothing that
 * was already there. It sits outside the plot's clip path because the right
 * and below zones are, by construction, outside the plot rectangle.
 */
export const ChartLabelLayer: Component<{
  labels: readonly ChartLabel[];
  results: readonly LabelPlacementResult[];
}> = (props) => (
  <g class="sui-cashflow-scrub-chart__labels">
    <For each={drawnLabels(props.labels, props.results)}>
      {(label) => (
        <text
          class={`sui-cashflow-scrub-chart__label sui-cashflow-scrub-chart__label--${label.placed.zone}`}
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
