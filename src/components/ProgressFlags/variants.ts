// Curried ProgressFlags variants — the correct call-site form, with the y-axis
// wording and the tolerance baked in. A call site passes a title, a trace and
// (optionally) an as-of time and the hover/select pair; it never names the
// axis or picks a tolerance.
//
// One variant to start, deliberately. A consumer that words its y axis
// differently, or tunes the tolerance, curries `createProgressFlags` once in
// its own design-system layer.
import type { Component } from "solid-js";
import { type ProgressFlagsDataProps, createProgressFlags } from "./ProgressFlags";
import { TOLERANCE_RATIO } from "./model";

/** The step timeline of a tracked topic: planned minutes earned over wall-clock time, half-of-planned tolerance. */
export const StepProgressFlags: Component<ProgressFlagsDataProps> = createProgressFlags({
  yTitle: "Planned minutes earned",
  toleranceRatio: TOLERANCE_RATIO,
});
