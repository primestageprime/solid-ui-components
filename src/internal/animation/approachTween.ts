// lastReviewedAt: 2026-09-03
// lastReviewedBy: adlai.arnold
// ============================================
// Approach tween — the rAF loop behind an EXPONENTIAL APPROACH.
//
// Each frame covers a fraction of the distance that still remains between the
// value on screen and the LATEST target. A moving target is therefore
// followed: the loop never restarts, never holds a captured start value, and
// never lags behind the pointer. A fixed-duration ease restarts on each new
// target, and under a pan that reads worse than no tween at all.
//
// The module holds the LOOP only. The caller states what one step does
// (`step`) and when the value has arrived (`settled`), so the same loop drives
// a y-domain pair and a chart height. See yDomainTween.ts and
// chartHeightTween.ts for the two.
//
// A HIDDEN document delivers no animation frame at all, so the loop must not
// run there. `createDocumentHidden` answers that, and the tween SNAPS while
// the document hides the chart.
// ============================================

import {
  type Accessor,
  createEffect,
  createSignal,
  onCleanup,
  untrack,
} from "solid-js";
import { type ProgressClock, realClock } from "../progress/useProgressEngine";

/**
 * Does the document hide the chart right now?
 *
 * A hidden document — a background tab, a minimised window — runs NO animation
 * frame. A frame the loop asked for before the document hid stays in the queue
 * until the reader comes back, so the tween stops where it stands. The value
 * on screen then belongs to that half-finished frame, and the reader who
 * returns hours later still sees it, because the queued frame arrives only on
 * the way back.
 *
 * The tween therefore SNAPS while the document hides the chart. Nobody watches
 * a hidden document, so no motion is lost.
 *
 * @returns True while the document is hidden. False without a document (SSR).
 */
export const createDocumentHidden = (): Accessor<boolean> => {
  if (typeof document === "undefined") return () => false;
  const read = () => document.visibilityState === "hidden";
  const [hidden, setHidden] = createSignal(read());
  const answer = () => setHidden(read());
  document.addEventListener("visibilitychange", answer);
  onCleanup(() => document.removeEventListener("visibilitychange", answer));
  return hidden;
};

/** What `createApproachTween` reads. Every field is an accessor, so the tween
 *  answers a change in any of them. */
export interface ApproachTweenOptions<T> {
  /** The value the chart moves toward. `null` means there is none. */
  target: Accessor<T | null>;
  /** Time to reach a new target, in ms. `false` turns the tween off. */
  transitionMs: Accessor<number | false>;
  /** True when the reader asks for less motion. The tween then never runs. */
  reducedMotion: Accessor<boolean>;
  /** One step of the approach: the value to draw after `dtMs` more time. */
  step: (current: T, target: T, dtMs: number, transitionMs: number) => T;
  /** Has the value on screen arrived at the target? */
  settled: (current: T, target: T) => boolean;
  /** Injected for the tests. Defaults to rAF plus `performance.now`. */
  clock?: ProgressClock;
}

/**
 * The value to DRAW, tweened toward `target`.
 *
 * The returned accessor answers the target at once in four cases: the first
 * value of the chart's life, `transitionMs` of `false`, a reader who asks for
 * less motion, and a hidden document. In every other case it moves toward the
 * target one frame at a time and lands on it exactly.
 *
 * @param options See `ApproachTweenOptions`.
 * @returns The value on screen, or `null` when there is no target.
 */
export const createApproachTween = <T>(
  options: ApproachTweenOptions<T>,
): Accessor<T | null> => {
  const clock = options.clock ?? realClock;
  const documentHidden = createDocumentHidden();
  const [rendered, setRendered] = createSignal<T | null>(
    untrack(options.target),
  );

  let handle: number | null = null;
  let lastNow = 0;

  const stop = () => {
    if (handle === null) return;
    clock.cancel(handle);
    handle = null;
  };

  const frame = (now: number) => {
    handle = null;
    const target = untrack(options.target);
    const current = untrack(rendered);
    const transition = untrack(options.transitionMs);
    if (target === null || current === null || transition === false) {
      setRendered(() => target);
      return;
    }
    const dt = now - lastNow;
    lastNow = now;
    const next = options.step(current, target, dt, transition);
    setRendered(() => next);
    // Stop on arrival. A later target starts the loop again.
    if (next !== target) handle = clock.raf(frame);
  };

  // A RUNNING loop keeps its `lastNow`, so a new target retargets the loop
  // instead of restarting it.
  const start = () => {
    if (handle !== null) return;
    lastNow = clock.now();
    handle = clock.raf(frame);
  };

  createEffect(() => {
    const target = options.target();
    const transition = options.transitionMs();
    const reduced = options.reducedMotion();
    const hidden = documentHidden();
    const current = untrack(rendered);
    // Snap, and run no frame at all, when there is nothing to tween: no
    // target, no value on screen yet, a caller who turned the tween off, a
    // reader who asks for less motion, or a document that runs no frame.
    //
    // `hidden` reads REACTIVELY, so a document that hides MID-TWEEN lands the
    // value on the target at once and cancels the frame it waits for.
    if (
      target === null ||
      current === null ||
      transition === false ||
      reduced ||
      hidden ||
      options.settled(current, target)
    ) {
      stop();
      setRendered(() => target);
      return;
    }
    start();
  });

  onCleanup(stop);

  return rendered;
};
