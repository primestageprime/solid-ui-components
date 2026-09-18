// Barrel — the PUBLIC surface, re-exported from src/index.ts. No curried
// variant: tick text carries a screen's units, so the consumer curries once
// with `createStackedTimelineChart`. Every type is qualified with the
// component's name, because an ambiguous `export *` resolves to nothing.
export {
  STACKED_TIMELINE_FALLBACK_SIZE,
  StackedTimelineChart,
  createStackedTimelineChart,
} from "./StackedTimelineChart";
export type {
  StackedTimelineChartDataProps,
  StackedTimelineChartOverrides,
  StackedTimelineChartProps,
  StackedTimelineEvent,
  StackedTimelineRule,
} from "./StackedTimelineChart";
