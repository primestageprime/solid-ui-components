// ============================================
// StepTimeline — Composite (Depth 3)
// Owns zero CSS files and zero inline style={}. Composes ChartFrame (Depth 2,
// curried at factory time with a stated height) around StackedTimelineChart
// (Depth 2, curried with a linear crossing, hour ticks and whole-count y
// labels). No chart is drawn here: the step is StackedAreaSeries' linear
// curve, the numbered flags with their rules and selection are
// LevelsTimeline's own mutation contract through Chart/MutationFlags, and the
// box measurement is StackedTimelineChart's.
//
// A cumulative count over time — steps done in a task — as a stepped band
// that rises square at each completion, with one numbered flag per event
// (a start, a completion) above the plot. Selecting a flag lights it and its
// rule. The frame's header carries the title and a collapse chevron; a
// collapsed timeline keeps only that header (Taskmaster canon, 2026-10-15:
// 160–220px with a collapsible header, the steps table taking the rest).
//
// The x-axis is HOURS (UTC, see ./geometry), for a domain of a day or so:
// LevelsTimeline's own axis is calendar-grained (weeks and months) and draws
// no ticks inside a single day, which is why this does not wrap it.
// ============================================
import type { Component, JSX } from "solid-js";
import { mergeProps } from "solid-js";
import { createChartFrame } from "../ChartFrame/ChartFrame";
import { createStackedTimelineChart } from "../StackedTimelineChart/StackedTimelineChart";
import type { TimeValue } from "../LevelsTimeline/geometry";
import {
  type StepTimelineMarker,
  type StepTimelinePoint,
  formatCount,
  formatHour,
  hourTicks,
  stepMutations,
  stepSeries,
  stepYDomain,
} from "./geometry";

export interface StepTimelineProps {
  /** Header title. Default "Timeline". */
  title?: JSX.Element;
  /** The cumulative count, ascending by `t`; each value holds until the next point. */
  series: readonly StepTimelinePoint[];
  /** One numbered flag each, numbered in time order; `kind` joins the flag's announced name. */
  markers: readonly StepTimelineMarker[];
  /** The visible span, the caller's — never derived from the data. */
  domain: readonly [TimeValue, TimeValue];
  /** The y top (e.g. the task's step count). Default: the series' peak. */
  total?: number;
  /** The lit flag. */
  selectedId?: string;
  /** Provided => the flags are buttons. */
  onSelect?: (id: string) => void;
  /** Controlled collapse. Omit it and the timeline owns the state, starting open. */
  collapsed?: boolean;
  onCollapsedChange?: (next: boolean) => void;
}

/** Props that are presentational — locked at curry time. */
export interface StepTimelineOverrides {
  /** The frame's in-flow height in px, header included. */
  height: number;
}

export type StepTimelineDataProps = StepTimelineProps;

/** The plot: one linear step band, hour ticks, whole-count y labels. */
const StepPlot = createStackedTimelineChart({
  curve: "linear",
  xTickFormat: formatHour,
  yTickFormat: formatCount,
});

export function createStepTimeline(
  defaults: StepTimelineOverrides,
): Component<StepTimelineDataProps> {
  const Frame = createChartFrame({ height: defaults.height });
  return (raw) => {
    const props = mergeProps({ title: "Timeline" as JSX.Element }, raw);
    return (
      <Frame
        title={props.title}
        collapsible
        collapsed={props.collapsed}
        onCollapsedChange={props.onCollapsedChange}
      >
        <StepPlot
          series={stepSeries(props.series)}
          xDomain={[
            new Date(props.domain[0]),
            new Date(props.domain[1]),
          ]}
          yDomain={stepYDomain(props.series, props.total)}
          xTickValues={hourTicks(props.domain)}
          mutations={stepMutations(props.markers)}
          selectedMutationId={props.selectedId}
          onSelectMutation={props.onSelect}
        />
      </Frame>
    );
  };
}
