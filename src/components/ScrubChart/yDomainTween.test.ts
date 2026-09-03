import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRoot, createSignal } from "solid-js";
import {
  DEFAULT_Y_FIT_TRANSITION_MS,
  type YDomain,
  approachFraction,
  createYDomainTween,
  domainHolds,
  isSettled,
  stepYDomain,
} from "./yDomainTween";
import type { ProgressClock } from "../../internal/progress/useProgressEngine";
import { DEFAULT_Y_FIT_MARGIN, fitYDomain } from "./yScaleMode";

/** A clock the test drives by hand. `tick(ms)` runs exactly one frame. */
const fakeClock = () => {
  let now = 0;
  let nextHandle = 1;
  const pending = new Map<number, (t: number) => void>();
  const clock: ProgressClock = {
    now: () => now,
    raf: (cb) => {
      const handle = nextHandle++;
      pending.set(handle, cb);
      return handle;
    },
    cancel: (handle) => {
      pending.delete(handle);
    },
  };
  return {
    clock,
    pendingCount: () => pending.size,
    tick: (ms: number) => {
      now += ms;
      const due = [...pending.entries()];
      pending.clear();
      for (const [, cb] of due) cb(now);
    },
  };
};

describe("domainHolds", () => {
  it("holds a value between the ends", () => {
    expect(domainHolds([0, 8000], 4000)).toBe(true);
  });

  it("holds a value ON the high end, whatever the plot height", () => {
    // The regression: the axis withheld this tick at rest, so the reader lost
    // the top bound of a settled domain.
    expect(domainHolds([0, 8000], 8000)).toBe(true);
  });

  it("holds a value ON the low end", () => {
    expect(domainHolds([0, 100], 0)).toBe(true);
  });

  it("drops a value above the high end", () => {
    // The domain on screen has not reached 10000 yet — the tween still runs.
    expect(domainHolds([0, 120], 10000)).toBe(false);
  });

  it("drops a value below the low end", () => {
    expect(domainHolds([0, 120], -50)).toBe(false);
  });

  it("holds a value the tween already calls arrived", () => {
    // One frame short of the target. The tween stops here, so the axis must
    // draw the tick rather than wait for a frame that never comes.
    expect(domainHolds([0, 7999.9], 8000)).toBe(true);
  });

  it("holds both ends of a flat domain", () => {
    expect(domainHolds([5, 5], 5)).toBe(true);
  });
});

describe("approachFraction", () => {
  it("covers nothing in a step of no length", () => {
    expect(approachFraction(0, 240)).toBe(0);
  });

  it("covers everything when the transition takes no time", () => {
    expect(approachFraction(16, 0)).toBe(1);
  });

  it("covers most of the distance over one transition", () => {
    // 15 frames of 16ms make up one 240ms transition.
    const remaining = (1 - approachFraction(16, 240)) ** 15;
    expect(1 - remaining).toBeCloseTo(0.95, 2);
  });

  it("caps how far one long frame covers", () => {
    // A backgrounded tab hands the loop a gap of seconds. The cap keeps that
    // one frame from covering the whole distance at once.
    expect(approachFraction(10000, 240)).toBe(approachFraction(100, 240));
  });

  it("covers the same distance at any frame rate", () => {
    // Two 8ms steps against one 16ms step. The remainders must match, or a
    // 120Hz display would arrive sooner than a 60Hz one.
    const one = 1 - approachFraction(16, 240);
    const two = (1 - approachFraction(8, 240)) ** 2;
    expect(two).toBeCloseTo(one, 6);
  });
});

describe("stepYDomain", () => {
  const target: YDomain = [0, 100];

  it("moves both ends toward the target", () => {
    const next = stepYDomain([0, 0], target, 16, 240);
    expect(next[1]).toBeGreaterThan(0);
    expect(next[1]).toBeLessThan(100);
  });

  it("returns the target itself on arrival", () => {
    // The loop lands EXACTLY on the target, so the axis labels state the
    // number the scale holds. One step is capped, so run several.
    const arrived = Array.from({ length: 100 }).reduce<YDomain>(
      (domain) => stepYDomain(domain, target, 16, 240),
      [0, 0],
    );
    expect(arrived).toBe(target);
  });

  it("follows a NEW target from where the last step left off", () => {
    // This is the retarget contract: the step reads the domain on screen, so
    // a target that moves mid-flight is followed, not chased from the start.
    const halfway = stepYDomain([0, 0], target, 120, 240);
    const moved = stepYDomain(halfway, [0, 200], 16, 240);
    expect(moved[1]).toBeGreaterThan(halfway[1]);
  });
});

describe("isSettled", () => {
  it("counts a hair's distance as arrived", () => {
    expect(isSettled([0, 100.0000001], [0, 100])).toBe(true);
  });

  it("counts a visible distance as still moving", () => {
    expect(isSettled([0, 90], [0, 100])).toBe(false);
  });
});

describe("createYDomainTween", () => {
  const run = <T>(
    body: (dispose: () => void) => T,
  ): { value: T; dispose: () => void } => {
    let dispose = () => {};
    const value = createRoot((d) => {
      dispose = d;
      return body(d);
    });
    return { value, dispose };
  };

  it("shows the first domain at once", () => {
    const c = fakeClock();
    const { value: shown, dispose } = run(() =>
      createYDomainTween({
        target: () => [0, 100] as YDomain,
        transitionMs: () => DEFAULT_Y_FIT_TRANSITION_MS,
        reducedMotion: () => false,
        clock: c.clock,
      }),
    );
    expect(shown()).toEqual([0, 100]);
    expect(c.pendingCount()).toBe(0);
    dispose();
  });

  it("snaps to a new target when the caller turns the tween off", () => {
    const c = fakeClock();
    const [target, setTarget] = createSignal<YDomain | null>([0, 100]);
    const { value: shown, dispose } = run(() =>
      createYDomainTween({
        target,
        transitionMs: () => false,
        reducedMotion: () => false,
        clock: c.clock,
      }),
    );
    setTarget([0, 8000]);
    expect(shown()).toEqual([0, 8000]);
    expect(c.pendingCount()).toBe(0);
    dispose();
  });

  it("snaps to a new target for a reader who asks for less motion", () => {
    const c = fakeClock();
    const [target, setTarget] = createSignal<YDomain | null>([0, 100]);
    const { value: shown, dispose } = run(() =>
      createYDomainTween({
        target,
        transitionMs: () => DEFAULT_Y_FIT_TRANSITION_MS,
        reducedMotion: () => true,
        clock: c.clock,
      }),
    );
    setTarget([0, 8000]);
    expect(shown()).toEqual([0, 8000]);
    // No frame runs at all — the tween is skipped, not shortened.
    expect(c.pendingCount()).toBe(0);
    dispose();
  });

  it("tweens toward a new target and lands on it", () => {
    const c = fakeClock();
    const [target, setTarget] = createSignal<YDomain | null>([0, 100]);
    const { value: shown, dispose } = run(() =>
      createYDomainTween({
        target,
        transitionMs: () => DEFAULT_Y_FIT_TRANSITION_MS,
        reducedMotion: () => false,
        clock: c.clock,
      }),
    );
    setTarget([0, 200]);
    expect(shown()).toEqual([0, 100]); // still the old domain this frame
    c.tick(16);
    const partway = shown()![1];
    expect(partway).toBeGreaterThan(100);
    expect(partway).toBeLessThan(200);
    // Run the loop out. It stops itself on arrival.
    for (let i = 0; i < 200 && c.pendingCount() > 0; i += 1) c.tick(16);
    expect(shown()).toEqual([0, 200]);
    expect(c.pendingCount()).toBe(0);
    dispose();
  });

  // The tween and the y-axis must aim at ONE domain. The axis takes its tick
  // VALUES from the target domain, and it withholds a tick the domain on
  // screen does not hold. A tween that stopped on any other number — the
  // PADDED domain, say — would withhold the max tick for ever.
  it("settles on the snapped domain fitYDomain returns", () => {
    const c = fakeClock();
    const pin = { min: 0 };
    const from = fitYDomain([0, 100], "series", pin, DEFAULT_Y_FIT_MARGIN, 5);
    const to = fitYDomain([0, 8000], "series", pin, DEFAULT_Y_FIT_MARGIN, 5);
    const [target, setTarget] = createSignal<YDomain | null>(from);
    const { value: shown, dispose } = run(() =>
      createYDomainTween({
        target,
        transitionMs: () => DEFAULT_Y_FIT_TRANSITION_MS,
        reducedMotion: () => false,
        clock: c.clock,
      }),
    );
    setTarget(to);
    for (let i = 0; i < 200 && c.pendingCount() > 0; i += 1) c.tick(16);
    // The destination is the SNAPPED domain, to the last digit.
    expect(shown()).toEqual(to);
    expect(shown()).toEqual([0, 10000]);
    // 8640 is the padded max. The tween passes it and never rests on it.
    expect(shown()?.[1]).not.toBe(8640);
    dispose();
  });

  it("retargets a running loop instead of restarting it", () => {
    const c = fakeClock();
    const [target, setTarget] = createSignal<YDomain | null>([0, 100]);
    const { value: shown, dispose } = run(() =>
      createYDomainTween({
        target,
        transitionMs: () => DEFAULT_Y_FIT_TRANSITION_MS,
        reducedMotion: () => false,
        clock: c.clock,
      }),
    );
    setTarget([0, 200]);
    c.tick(16);
    const before = shown()![1];
    // The target moves again mid-flight, as it does on every pan frame.
    setTarget([0, 300]);
    c.tick(16);
    const after = shown()![1];
    // The domain carries on from where it was. A restart would drop it back
    // toward 100 and the axis would lag behind the pointer.
    expect(after).toBeGreaterThan(before);
    expect(c.pendingCount()).toBe(1);
    dispose();
  });

  it("cancels its pending frame on cleanup", () => {
    const c = fakeClock();
    const [target, setTarget] = createSignal<YDomain | null>([0, 100]);
    const { value: shown, dispose } = run(() =>
      createYDomainTween({
        target,
        transitionMs: () => DEFAULT_Y_FIT_TRANSITION_MS,
        reducedMotion: () => false,
        clock: c.clock,
      }),
    );
    setTarget([0, 200]);
    expect(c.pendingCount()).toBe(1);
    dispose();
    expect(c.pendingCount()).toBe(0);
    expect(shown()).toEqual([0, 100]);
  });

  it("follows the target to null when the fit goes away", () => {
    const c = fakeClock();
    const [target, setTarget] = createSignal<YDomain | null>([0, 100]);
    const { value: shown, dispose } = run(() =>
      createYDomainTween({
        target,
        transitionMs: () => DEFAULT_Y_FIT_TRANSITION_MS,
        reducedMotion: () => false,
        clock: c.clock,
      }),
    );
    setTarget(null);
    expect(shown()).toBeNull();
    dispose();
  });
});

// The regression a jsdom test could not see. A HIDDEN document runs no
// animation frame, so a frame the loop asks for waits in the queue until the
// reader comes back. The domain then stops part-way, the axis labels still
// state the TARGET domain, and `domainHolds` withholds every tick the stopped
// domain misses — in a background tab, for as long as the tab stays hidden.
// The tween must snap instead.
describe("createYDomainTween in a hidden document", () => {
  let visibility: DocumentVisibilityState = "visible";

  beforeEach(() => {
    visibility = "visible";
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => visibility,
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(document, "visibilityState");
  });

  /** Hide the document the way the browser does: set state, then announce. */
  const hide = () => {
    visibility = "hidden";
    document.dispatchEvent(new Event("visibilitychange"));
  };

  const run = <T>(body: () => T): { value: T; dispose: () => void } => {
    let dispose = () => {};
    const value = createRoot((d) => {
      dispose = d;
      return body();
    });
    return { value, dispose };
  };

  const tween = (c: ReturnType<typeof fakeClock>) => {
    const [target, setTarget] = createSignal<YDomain | null>([0, 100]);
    const { value: shown, dispose } = run(() =>
      createYDomainTween({
        target,
        transitionMs: () => DEFAULT_Y_FIT_TRANSITION_MS,
        reducedMotion: () => false,
        clock: c.clock,
      }),
    );
    return { shown, setTarget, dispose };
  };

  it("snaps to a new target while the document is hidden", () => {
    visibility = "hidden";
    const c = fakeClock();
    const { shown, setTarget, dispose } = tween(c);
    setTarget([0, 8000]);
    expect(shown()).toEqual([0, 8000]);
    // The loop asks for no frame, because a hidden document runs none.
    expect(c.pendingCount()).toBe(0);
    dispose();
  });

  it("lands the domain on the target when the document hides mid-tween", () => {
    const c = fakeClock();
    const { shown, setTarget, dispose } = tween(c);
    setTarget([0, 8000]);
    c.tick(16);
    expect(shown()?.[1]).toBeLessThan(8000);
    hide();
    // The domain arrives at once, and the frame it waited for is cancelled.
    expect(shown()).toEqual([0, 8000]);
    expect(c.pendingCount()).toBe(0);
    dispose();
  });
});
