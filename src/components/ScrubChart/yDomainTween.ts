// lastReviewedAt: 2026-09-02
// lastReviewedBy: adlai.arnold
// ============================================
// ScrubChart — y-domain tween.
//
// The fitted y-domain changes for two reasons: the reader clicks the fit
// toggle (one jump), and the visible window moves while the reader pans (a
// new domain on every frame). Both reach this module through ONE path.
//
// The tween is an EXPONENTIAL APPROACH, not a fixed-duration ease. Each frame
// covers a fraction of the distance that still remains between the domain on
// screen and the LATEST target. A moving target is therefore followed: the
// tween never restarts, never holds a captured start value, and never lags
// behind the pointer. A fixed-duration ease restarts on each new target, and
// under a pan that reads worse than no tween at all.
//
// The loop itself lives in internal/animation/approachTween.ts, because the
// chart height eases the same way. This module states what one step of a
// DOMAIN does and hands that to the loop.
//
// The module splits into a PURE part and one reactive wrapper:
//
//   • approachFraction / stepYDomain / isSettled / domainHolds — pure
//     functions of their arguments. The unit tests drive these.
//     `domainHolds` answers the y-axis: does the domain ON SCREEN hold this
//     target tick yet? The axis withholds a tick until it does.
//   • createYDomainTween — the shared loop, wired to `stepYDomain` and
//     `isSettled`.
//
// ScrubChart.tsx never sees the loop; yAxis.ts wires this module to the
// scales.
// ============================================

import type { Accessor } from "solid-js";
import { clamp } from "../../internal/math/clamp";
import { createApproachTween } from "../../internal/animation/approachTween";
import { lerp } from "../../internal/animation/trajectories";
import type { ProgressClock } from "../../internal/progress/useProgressEngine";

/** A y-axis domain, low end first. */
export type YDomain = [number, number];

/** Milliseconds a new fitted y-domain takes to reach the screen. */
export const DEFAULT_Y_FIT_TRANSITION_MS = 240;

// `transitionMs` states the time to cover MOST of the distance, not all of
// it: an exponential approach reaches its target only in the limit. Three
// time constants cover 95%, which the reader reads as arrival.
const DECAY_PER_TRANSITION = 3;

// Longest step one frame may take, in ms. A backgrounded tab, or a clock
// that reports another time base, hands the loop a huge gap; the cap keeps
// one frame from covering the whole distance at once.
const MAX_FRAME_MS = 100;

// The domain has arrived once each end is nearer than this fraction of the
// target span. At a span of 8000 over a 200px plot that is 0.2px.
const SETTLE_FRACTION = 1e-3;

// Smallest settle distance, in data units, for a target span near zero.
const MIN_SETTLE = 1e-9;

/**
 * The fraction of the remaining distance one step covers.
 *
 * The result depends on the step's LENGTH, not on the frame rate, so a 30Hz
 * display and a 120Hz display take the same wall-clock time to arrive.
 *
 * @param dtMs Length of the step, in ms.
 * @param transitionMs Time the domain takes to cover most of the distance.
 * @returns A fraction in [0, 1].
 */
export const approachFraction = (dtMs: number, transitionMs: number): number =>
  transitionMs <= 0
    ? 1
    : 1 -
      Math.exp(
        (-DECAY_PER_TRANSITION * clamp(dtMs, 0, MAX_FRAME_MS)) / transitionMs,
      );

/** The distance at which an end counts as arrived, for a given target. */
const settleDistance = ([low, high]: YDomain): number =>
  Math.max(MIN_SETTLE, Math.abs(high - low) * SETTLE_FRACTION);

/**
 * Is the domain on screen near enough to the target to stop the loop?
 *
 * @param current The domain on screen.
 * @param target The domain the chart moves toward.
 * @returns True when both ends have arrived.
 */
export const isSettled = (current: YDomain, target: YDomain): boolean => {
  const near = settleDistance(target);
  return (
    Math.abs(current[0] - target[0]) <= near &&
    Math.abs(current[1] - target[1]) <= near
  );
};

/**
 * Does the domain on screen hold this tick value?
 *
 * The y-axis takes its tick VALUES from the TARGET domain, so a tick can sit
 * outside the domain on screen while the tween runs. The axis drops such a
 * tick until the tween brings it in. This function is that test.
 *
 * The test reads DATA units, not pixels. A tick ON a domain end therefore
 * counts as inside at every plot height, because the comparison never passes
 * through the scale and no rounding pushes the tick out. The slack is the
 * distance the tween counts as arrival, so the axis and the tween agree on
 * when a tick has landed: a domain the tween calls settled shows every tick.
 *
 * @param shown The domain on screen.
 * @param value The tick value to test.
 * @returns True when the axis draws the tick.
 */
export const domainHolds = (shown: YDomain, value: number): boolean => {
  const slack = settleDistance(shown);
  return value >= shown[0] - slack && value <= shown[1] + slack;
};

/**
 * One step of the approach: the domain to draw after `dtMs` more time.
 *
 * The step reads the CURRENT domain and the LATEST target, so the caller
 * retargets by passing a different `target` — there is no state to reset.
 * The function returns the target itself once both ends have arrived, so the
 * loop lands exactly on the number the axis labels state.
 *
 * @param current The domain on screen.
 * @param target The domain the chart moves toward.
 * @param dtMs Length of the step, in ms.
 * @param transitionMs Time the domain takes to cover most of the distance.
 * @returns The domain to draw now.
 */
export const stepYDomain = (
  current: YDomain,
  target: YDomain,
  dtMs: number,
  transitionMs: number,
): YDomain => {
  const t = approachFraction(dtMs, transitionMs);
  const next: YDomain = [
    lerp(current[0], target[0], t),
    lerp(current[1], target[1], t),
  ];
  return isSettled(next, target) ? target : next;
};

/** What `createYDomainTween` reads. Every field is an accessor, so the tween
 *  answers a change in any of them. */
export interface YDomainTweenOptions {
  /** The domain the chart moves toward. `null` means no fitted domain. */
  target: Accessor<YDomain | null>;
  /** Time to reach a new target, in ms. `false` turns the tween off. */
  transitionMs: Accessor<number | false>;
  /** True when the reader asks for less motion. The tween then never runs. */
  reducedMotion: Accessor<boolean>;
  /** Injected for the tests. Defaults to rAF plus `performance.now`. */
  clock?: ProgressClock;
}

/**
 * The y-domain to DRAW, tweened toward `target`.
 *
 * The returned accessor answers the target at once in four cases: the first
 * domain of the chart's life, `transitionMs` of `false`, a reader who asks for
 * less motion, and a hidden document. In every other case it moves toward the
 * target one frame at a time and lands on it exactly.
 *
 * @param options See `YDomainTweenOptions`.
 * @returns The domain on screen, or `null` when there is no fitted domain.
 */
export const createYDomainTween = (
  options: YDomainTweenOptions,
): Accessor<YDomain | null> =>
  createApproachTween<YDomain>({
    target: options.target,
    transitionMs: options.transitionMs,
    reducedMotion: options.reducedMotion,
    step: stepYDomain,
    settled: isSettled,
    clock: options.clock,
  });
