// lastReviewedAt: 2026-09-03
// lastReviewedBy: adlai.arnold
// ============================================
// ScrubChart — chart-height tween.
//
// The frame height changes for one reason: the reader clicks the expand
// chevron, and the chart moves between `chartHeight` and `chartHeightExpanded`.
// The height eases, because a jump moves every gridline, every label and the
// page below the chart in one frame.
//
// ScrubChart derives its whole geometry from ONE height accessor — the plot
// span, the axis rows, the window band and the `viewBox` all read it — so the
// number itself tweens. A CSS transition on the frame would ease the box while
// the series inside it jumped.
//
// The easing is the same exponential approach the y-domain takes; see
// internal/animation/approachTween.ts for the loop and yDomainTween.ts for the
// other caller. This module states what one step of a HEIGHT does.
// ============================================

import type { Accessor } from "solid-js";
import { createApproachTween } from "../../internal/animation/approachTween";
import { lerp } from "../../internal/animation/trajectories";
import { approachFraction } from "./yDomainTween";
import type { ProgressClock } from "../../internal/progress/useProgressEngine";

/** Milliseconds a new chart height takes to reach the screen. */
export const DEFAULT_EXPAND_TRANSITION_MS = 240;

// The height has arrived once it is nearer than this, in px. Half a pixel is
// below what a display can draw, so the reader sees the target already.
const SETTLE_PX = 0.5;

/**
 * Is the height on screen near enough to the target to stop the loop?
 *
 * @param current The height on screen, in px.
 * @param target The height the chart moves toward, in px.
 * @returns True once the loop may stop.
 */
export const isHeightSettled = (current: number, target: number): boolean =>
  Math.abs(current - target) <= SETTLE_PX;

/**
 * One step of the approach: the height to draw after `dtMs` more time.
 *
 * The step reads the CURRENT height and the LATEST target, so a reader who
 * clicks twice mid-flight is followed from wherever the frame has reached.
 * The function returns the target itself on arrival, so the frame lands on
 * exactly the number the caller asked for.
 *
 * @param current The height on screen, in px.
 * @param target The height the chart moves toward, in px.
 * @param dtMs Length of the step, in ms.
 * @param transitionMs Time the height takes to cover most of the distance.
 * @returns The height to draw now, in px.
 */
export const stepChartHeight = (
  current: number,
  target: number,
  dtMs: number,
  transitionMs: number,
): number => {
  const next = lerp(current, target, approachFraction(dtMs, transitionMs));
  return isHeightSettled(next, target) ? target : next;
};

/** What `createChartHeightTween` reads. Every field is an accessor, so the
 *  tween answers a change in any of them. */
export interface ChartHeightTweenOptions {
  /** The height the chart moves toward, in px. */
  target: Accessor<number>;
  /** Time to reach a new height, in ms. `false` turns the tween off. */
  transitionMs: Accessor<number | false>;
  /** True when the reader asks for less motion. The tween then never runs. */
  reducedMotion: Accessor<boolean>;
  /** Injected for the tests. Defaults to rAF plus `performance.now`. */
  clock?: ProgressClock;
}

/**
 * The frame height to DRAW, tweened toward `target`.
 *
 * @param options See `ChartHeightTweenOptions`.
 * @returns The height on screen, in px.
 */
export const createChartHeightTween = (
  options: ChartHeightTweenOptions,
): Accessor<number> => {
  const rendered = createApproachTween<number>({
    target: options.target,
    transitionMs: options.transitionMs,
    reducedMotion: options.reducedMotion,
    step: stepChartHeight,
    settled: isHeightSettled,
    clock: options.clock,
  });
  // The target is never null, so neither is the height on screen. The
  // fallback states that to the type system and never runs.
  return () => rendered() ?? options.target();
};
