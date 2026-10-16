// ============================================
// Frame pump — drive `requestAnimationFrame` and `performance.now` by hand.
//
// A tween that runs on the real clock (`realClock` in useProgressEngine) can
// only be observed by WAITING for it: `vi.waitFor` polls the DOM while jsdom's
// 60 Hz rAF carries the value toward its target, so a 240 ms transition is a
// 240 ms test plus polling slack (measured 600 ms each for ScrubChart's two
// settle tests, 2026-10-16). The pump replaces the wait with a step function:
// every call to `frame(dt)` advances the clock by `dt` ms and runs every
// callback queued before it, in order, exactly as one browser frame would.
// The test then asserts synchronously after as many frames as the behaviour
// needs. Nothing about the component changes; it still asks the global rAF
// for its next frame.
//
// Not `vi.useFakeTimers()`: that fakes rAF too, but hands every callback the
// FAKED `performance.now()` only when `toFake` lists it, and once it does the
// whole file's timers move with it. The pump is local to the test and touches
// two globals, both restored.
// ============================================

export interface FramePump {
  /** Advance the clock by `dt` ms and run one frame's worth of callbacks. */
  frame(dt?: number): void;
  /** Run `n` frames of `dt` ms each. */
  frames(n: number, dt?: number): void;
  /** Frames queued and not yet run. Zero means every loop has settled. */
  pending(): number;
  /** Put both globals back. Call from `finally` or `afterEach`. */
  restore(): void;
}

/** Default frame, in ms — a 60 Hz display. */
export const FRAME_MS = 1000 / 60;

/**
 * Install the pump. From this call until `restore()`, `requestAnimationFrame`
 * queues instead of scheduling and `performance.now()` answers the pumped
 * clock, which starts at the real `performance.now()` so elapsed-time maths
 * that began before the install still reads sensibly.
 */
export const installFramePump = (): FramePump => {
  const g = globalThis as {
    requestAnimationFrame?: typeof requestAnimationFrame;
    cancelAnimationFrame?: typeof cancelAnimationFrame;
  };
  const prevRaf = g.requestAnimationFrame;
  const prevCaf = g.cancelAnimationFrame;
  const prevNow = performance.now;

  let now = prevNow.call(performance);
  let nextId = 1;
  const queue = new Map<number, FrameRequestCallback>();

  g.requestAnimationFrame = ((cb: FrameRequestCallback): number => {
    const id = nextId++;
    queue.set(id, cb);
    return id;
  }) as typeof requestAnimationFrame;
  g.cancelAnimationFrame = ((id: number): void => {
    queue.delete(id);
  }) as typeof cancelAnimationFrame;
  performance.now = () => now;

  const frame = (dt: number = FRAME_MS): void => {
    now += dt;
    // Callbacks queued DURING this frame belong to the next one.
    const due = [...queue.entries()];
    queue.clear();
    for (const [, cb] of due) cb(now);
  };

  return {
    frame,
    frames(n: number, dt: number = FRAME_MS): void {
      for (let i = 0; i < n; i += 1) frame(dt);
    },
    pending: () => queue.size,
    restore(): void {
      g.requestAnimationFrame = prevRaf;
      g.cancelAnimationFrame = prevCaf;
      performance.now = prevNow;
      queue.clear();
    },
  };
};
