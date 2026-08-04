// ============================================
// Shared pointer-event driver.
//
// jsdom implements neither `PointerEvent` nor any of the pointer-capture
// methods. Three test files each worked around the first with a MouseEvent plus
// a defined `pointerId`, and one worked around the second with its own capture
// spies — arriving at three incompatible conventions (one supplied pointerId,
// one omitted it; one hardcoded clientY 50, another 30).
//
// Coordinates are REQUIRED here, deliberately. "Inside the plot" is a property
// of the component under test, and the two hardcoded values were not
// interchangeable: Chart's 50 and CashflowScrubChart's 30 each sit inside their
// own plot rect. Inferring a default from the element's rect would be worse
// still — under jsdom that rect is all zeros unless `installRects` ran first,
// so the inferred point would land outside the plot and the test would pass
// for the wrong reason.
//
// Capture is a separate, opt-in call. Bundling it into `pointer()` would change
// ScrubChart's environment: its component relies on `safeSetPointerCapture`
// swallowing the missing method, and a `hasPointerCapture()` returning true
// newly routes releases back to the element.
//
// NOT for slot-level handlers. Chart's PinMarkers, TimelineBar and
// HighlightSegments tests drive `fireEvent.pointerDown` with no coordinates at
// all, which is the right tool when the assertion is "the handler ran".
// ============================================

export interface PointerPosition {
  clientX: number;
  clientY: number;
}

export interface PointerDriver {
  down(at: PointerPosition): void;
  move(at: PointerPosition): void;
  up(at?: PointerPosition): void;
  leave(at?: PointerPosition): void;
  cancel(at?: PointerPosition): void;
}

const dispatch = (
  el: Element,
  type: string,
  at: PointerPosition,
  pointerId: number,
): void => {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: at.clientX,
    clientY: at.clientY,
  });
  // jsdom's MouseEvent carries no pointerId; the production handlers read it to
  // pair a capture with its release.
  Object.defineProperty(event, "pointerId", { value: pointerId });
  el.dispatchEvent(event);
};

/**
 * Drive a pointer gesture at `el`. The last position is remembered, so `up`,
 * `leave` and `cancel` may omit theirs — a release usually happens wherever the
 * last move left off.
 */
export function pointer(el: Element, pointerId = 1): PointerDriver {
  let last: PointerPosition = { clientX: 0, clientY: 0 };

  const send = (type: string, at?: PointerPosition): void => {
    if (at) last = at;
    dispatch(el, type, last, pointerId);
  };

  return {
    down: (at) => send("pointerdown", at),
    move: (at) => send("pointermove", at),
    up: (at) => send("pointerup", at),
    leave: (at) => send("pointerleave", at),
    cancel: (at) => send("pointercancel", at),
  };
}

/** A minimal call recorder. Hand-rolled rather than `vi.fn()` so this module
 *  carries no vitest import into the published `dist/test-utils/*.d.ts`. */
export interface Recorder {
  (...args: unknown[]): void;
  calls: unknown[][];
}

const recorder = (): Recorder => {
  const calls: unknown[][] = [];
  const fn = (...args: unknown[]): void => {
    calls.push(args);
  };
  return Object.assign(fn, { calls });
};

export interface PointerCapture {
  setPointerCapture: Recorder;
  releasePointerCapture: Recorder;
  restore(): void;
}

/**
 * Install pointer-capture methods on `el`. `hasPointerCapture` returns true,
 * which models "the drag owns the pointer" — that is what routes a release
 * outside the element back to it.
 */
export function installPointerCapture(el: Element): PointerCapture {
  const target = el as unknown as Record<string, unknown>;
  const previous = {
    setPointerCapture: target.setPointerCapture,
    releasePointerCapture: target.releasePointerCapture,
    hasPointerCapture: target.hasPointerCapture,
  };

  const setPointerCapture = recorder();
  const releasePointerCapture = recorder();

  Object.assign(target, {
    setPointerCapture,
    releasePointerCapture,
    hasPointerCapture: () => true,
  });

  return {
    setPointerCapture,
    releasePointerCapture,
    restore: () => {
      Object.assign(target, previous);
    },
  };
}
