// ============================================
// StepTimeline's pure half (Depth 0, no DOM): hour ticks for a sub-week
// domain, the integer y labels, and the adapter from StepTimeline's data
// shape to StackedTimelineChart's. Prints as a table in geometry.test.ts.
//
// TIME ZONE: every hour here is a UTC hour, like every date LevelsTimeline
// draws, so a tick never drifts with the viewer's zone. A consumer that wants
// local hours shifts its domain and its points before handing them over.
// ============================================
import type { StackedAreaSeriesData } from "../Chart";
import { type Mutation, type TimeValue, timeOf } from "../LevelsTimeline/geometry";
import { map } from "../../fn";

const HOUR_MS = 3_600_000;

/** Hour steps a tick row may use, smallest first. */
export const HOUR_STEPS = [1, 2, 3, 4, 6, 12, 24] as const;

/** At most this many hour ticks across the domain. */
export const MAX_HOUR_TICKS = 6;

/** One point of the cumulative series: `value` holds from `t` until the next point. */
export interface StepTimelinePoint {
  readonly t: TimeValue;
  readonly value: number;
}

/** One numbered flag: an event at `t`. `kind` joins the flag's announced name. */
export interface StepTimelineMarker {
  readonly id: string;
  readonly t: TimeValue;
  readonly label: string;
  readonly kind?: string;
}

/** The smallest hour step that keeps the row within `MAX_HOUR_TICKS`. */
export const hourStep = (domain: readonly [TimeValue, TimeValue]): number => {
  const hours = (timeOf(domain[1]) - timeOf(domain[0])) / HOUR_MS;
  for (const step of HOUR_STEPS) {
    if (hours / step <= MAX_HOUR_TICKS) return step;
  }
  return HOUR_STEPS[HOUR_STEPS.length - 1];
};

/** Tick timestamps on whole UTC hours that are multiples of the step, inside the domain. */
export const hourTicks = (domain: readonly [TimeValue, TimeValue]): number[] => {
  const start = timeOf(domain[0]);
  const end = timeOf(domain[1]);
  const step = hourStep(domain) * HOUR_MS;
  const ticks: number[] = [];
  for (let at = Math.ceil(start / step) * step; at <= end; at += step) {
    ticks.push(at);
  }
  return ticks;
};

/** "08" — the UTC hour, two digits. */
export const formatHour = (at: number): string =>
  String(new Date(at).getUTCHours()).padStart(2, "0");

/** A whole count prints; a fractional mid tick (0 · 1.5 · 3) prints nothing. */
export const formatCount = (value: number): string =>
  Number.isInteger(value) ? String(value) : "";

/** The y range: 0 to `total` when the caller knows it, else to the series' peak (at least 1). */
export const stepYDomain = (
  series: readonly StepTimelinePoint[],
  total: number | undefined,
): [number, number] => {
  if (total !== undefined && total > 0) return [0, total];
  let peak = 1;
  for (const point of series) peak = Math.max(peak, point.value);
  return [0, peak];
};

/** The series as StackedTimelineChart's single band. */
export const stepSeries = (
  series: readonly StepTimelinePoint[],
): StackedAreaSeriesData[] => [
  {
    id: "steps",
    label: "Steps done",
    points: map((point: StepTimelinePoint) => ({ at: point.t, value: point.value }), series),
  },
];

/** The markers as LevelsTimeline mutations. The kind joins the label ("Step 1 ·
 *  started"), because the label is what a flag announces: MutationFlags paints
 *  only the number and has no hover readout. */
export const stepMutations = (
  markers: readonly StepTimelineMarker[],
): Mutation[] =>
  map(
    (marker: StepTimelineMarker) => ({
      id: marker.id,
      at: marker.t,
      label:
        marker.kind === undefined ? marker.label : `${marker.label} · ${marker.kind}`,
    }),
    markers,
  );
