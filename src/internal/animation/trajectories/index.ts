// Trajectory model for animating a single Mixed-Shapes lane between
// two frames of a status-flow state machine.
//
// The metaphor: every visual element (card, arrow anchor) is a pure
// function of `t ∈ [0, 1]` — the parameter that runs from "the
// previous frame" to "the next frame" during a single tick. A
// `LaneTrajectory` bundles those functions for one lane.
//
// Phasing within a single tick:
//   [0 .. PHASE_LEAVE_END]      cards LEAVING the visible window
//                               slurp into their lozenge
//   [PHASE_LEAVE_END .. PHASE_MOVE_END]
//                               cards that stay visible LERP between
//                               their previous and next rest rects
//   [PHASE_MOVE_END .. 1]       cards ARRIVING into the visible window
//                               slurp out of their lozenge
//
// Each phase boundary is a fraction of MS_PHASE_TOTAL so changing the
// timing budget never requires re-wiring the trajectory math.
//
// This module is pure — no Solid signals, no DOM. Renderers consume
// `evaluateAt(trajectory, t)` and render whatever the trajectory says
// each card/arrow should look like right now.
//
// The implementation is split by concern across this directory; this
// barrel re-exports the exact public surface the module has always had.

export type { CardMode, CardStatus, Point, Rect } from "./primitives";
export {
  DEFAULT_TIMING,
  MS_MOVE_MS,
  MS_PHASE_TOTAL,
  MS_SLURP_MS,
  PHASE_LEAVE_END,
  PHASE_MOVE_END,
  phasesFor,
} from "./timing";
export type { LanePhases, LaneTimingConfig } from "./timing";
export { ease, lerp, lerpPoint, lerpRect, windowProgress } from "./math";
export { slurpRectMorph } from "./slurp";
export { snapshotFrame } from "./layout";
export type { FramePosition, FrameSnapshot, LayoutParams } from "./layout";
export type {
  ArrowTrajectory,
  CardTrajectory,
  LaneTrajectory,
  LozengeRects,
} from "./card-builders";
export {
  buildLaneTrajectory,
  buildLaneTrajectoryFromSnapshots,
  dashednessAt,
} from "./builders";
export type {
  BuildFromSnapshotsArgs,
  BuildLaneTrajectoryArgs,
} from "./builders";
