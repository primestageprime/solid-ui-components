// ============================================
// StepTimeline Curried Variants — Depth 3 (zero CSS)
// ============================================
import type { Component } from "solid-js";
import { createStepTimeline, type StepTimelineDataProps } from "./StepTimeline";

/** The canon's timeline height (160–220px), header included. */
export const STEP_TIMELINE_HEIGHT = 200;

/** A 200px collapsible step timeline: the Taskmaster canon's task timeline. */
export const StepTimeline: Component<StepTimelineDataProps> = createStepTimeline({
  height: STEP_TIMELINE_HEIGHT,
});
