// The base is not exported — use the curried `StepTimeline`, or bake another
// height with `createStepTimeline({ height })`.
export { createStepTimeline } from "./StepTimeline";
export type {
  StepTimelineDataProps,
  StepTimelineOverrides,
  StepTimelineProps,
} from "./StepTimeline";
export { StepTimeline, STEP_TIMELINE_HEIGHT } from "./variants";
export { hourTicks, stepYDomain } from "./geometry";
export type { StepTimelineMarker, StepTimelinePoint } from "./geometry";
