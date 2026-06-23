// ============================================
// Self-estimating progress — Solid wrapper around the pure engine.
//
// Creates one ProgressEngine, drives it from an internal requestAnimationFrame
// loop, and exposes a reactive `tick` signal that bumps each frame so callers
// can read `engine.fractionOf(id)` inside a memo and re-render at ~60fps.
//
// The loop starts on demand (whenever `observe` reports there may be work) and
// STOPS itself the first frame nothing is animating — no wasted frames when all
// batches are idle/done. Cleans up its pending frame on unmount.
//
// A clock + scheduler are INJECTABLE for deterministic tests, but this is an
// internal seam only — never exposed in any public component API.
// ============================================
import { createSignal, onCleanup } from "solid-js";
import {
  createProgressEngine,
  type BatchInput,
  type ProgressEngine,
} from "./engine";

export interface ProgressClock {
  /** Wall-clock now in ms. */
  now(): number;
  /** Schedule a callback for the next frame; returns a cancel handle. */
  raf(cb: (now: number) => void): number;
  /** Cancel a scheduled frame. */
  cancel(handle: number): void;
}

/** The real browser clock (rAF + performance.now), SSR/jsdom-safe. */
export const realClock: ProgressClock = {
  now: () =>
    typeof performance !== "undefined" ? performance.now() : Date.now(),
  raf: (cb) =>
    typeof requestAnimationFrame !== "undefined"
      ? requestAnimationFrame((t) => cb(t))
      : (setTimeout(() => cb(Date.now()), 16) as unknown as number),
  cancel: (h) => {
    if (typeof cancelAnimationFrame !== "undefined") cancelAnimationFrame(h);
    else clearTimeout(h);
  },
};

export interface ProgressController {
  /** The underlying engine (for `fractionOf`, and tests). */
  engine: ProgressEngine;
  /** Reactive frame counter — read it in a memo to track the eased fills. */
  tick: () => number;
  /** Reconcile tracked batches with the caller's current set + (re)start the
   *  loop if anything may need to animate. Call from an effect over the data. */
  observe(batches: BatchInput[]): void;
}

export function useProgressEngine(
  clock: ProgressClock = realClock,
): ProgressController {
  const engine = createProgressEngine();
  const [tick, setTick] = createSignal(0);

  let handle: number | null = null;
  let running = false;

  const stop = () => {
    if (handle !== null) {
      clock.cancel(handle);
      handle = null;
    }
    running = false;
  };

  const loop = (now: number) => {
    handle = null;
    const animating = engine.frame(now);
    setTick((t) => t + 1);
    if (animating) {
      handle = clock.raf(loop);
    } else {
      running = false;
    }
  };

  const start = () => {
    if (running) return;
    running = true;
    handle = clock.raf(loop);
  };

  const observe = (batches: BatchInput[]) => {
    engine.observe(batches, clock.now());
    // Render this frame's state immediately, and keep the loop alive while
    // anything still needs to move.
    const animating = engine.frame(clock.now());
    setTick((t) => t + 1);
    if (animating) start();
  };

  onCleanup(stop);

  return { engine, tick, observe };
}
