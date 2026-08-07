// ============================================
// Shared ResizeObserver double.
//
// `observeSize` (src/internal/dom/observeSize.ts:90) is the ONLY place the
// library constructs a ResizeObserver, so substituting the global here covers
// every measuring component in one move. jsdom ships no ResizeObserver at all,
// which is why an unstubbed test sees `observeSize` return its no-op disposer
// and never measure.
//
// Before this module, sixteen test files each grew their own double in four
// incompatible shapes: a silent no-op, a fire-on-observe, a recorder that
// asserted the `{ box }` option, and an externally-triggerable one. All four
// are the same object here:
//
//   no-op            → install and never call `resize`
//   fire-on-observe  → set `autoFire`
//   recorder         → read `observations` (how observe was called) or
//                      `observed()` (what is watched right now)
//   triggerable      → `await sizer.resize(el, size)`
//
// `resize` is async because `observeSize` defers the callback out of the
// observer dispatch phase through requestAnimationFrame (its defence (2)). The
// returned promise resolves once that frame has run and Solid has flushed, so
// a caller awaits once and asserts — without needing to know the deferral
// exists. The one test that must see the deferral is `observeSize.test.ts`
// itself: its subject IS the scheduling, so it keeps its own lower-level
// double and must not be migrated to this one.
//
// NOTE: `observeSize` also holds a change-guard (its defence (1)) — a resize to
// the size already delivered is dropped before it can schedule anything. That
// is real behaviour, not a quirk of this double: resizing twice to the same
// numbers delivers once.
// ============================================

import type { ObservedSize } from "../internal/dom/observeSize";
import { flatMap } from "../fn";

/** One `observe()` call, in the order it happened. */
export interface SizeObservation {
  el: Element;
  options?: ResizeObserverOptions;
}

export interface FakeSizer {
  /** Every `observe()` call across every observer, in order. Assert on
   *  `options.box` here — a callback that measures the border box but observes
   *  the content box silently stops updating (see observeSize's header). */
  readonly observations: SizeObservation[];
  /** Elements observed RIGHT NOW, across every live observer, in observe order.
   *
   *  Distinct from `observations`, and both are needed. That is an append-only
   *  log: it answers "how was observe called", which is the right question for
   *  `options.box`. This is a live set that shrinks on `unobserve` and
   *  `disconnect`, which is the only thing that can answer "is the stale row
   *  still being watched, or was it swapped out cleanly" — a leak there shows
   *  up as a growing observed set, never as a wrong measurement. */
  observed(): Element[];
  /** When true, `observe()` immediately delivers `initialSize`. Models the
   *  browser's first synchronous delivery; off by default so a test that only
   *  wants silence gets silence. */
  autoFire: boolean;
  /** Size delivered by `autoFire`. */
  initialSize: ObservedSize;
  /** Deliver `size` to every observer watching `el`, then wait for
   *  `observeSize`'s deferral frame and Solid's flush. */
  resize(el: Element, size: ObservedSize): Promise<void>;
  /** Deliver to every observer regardless of target. For the common case of a
   *  single measured element whose node is awkward to reach. */
  resizeAll(size: ObservedSize): Promise<void>;
  /** Put the previous global back. Call from `afterEach`. */
  restore(): void;
}

type Callback = (entries: ResizeObserverEntry[]) => void;

interface LiveObserver {
  callback: Callback;
  targets: Element[];
}

const entryFor = (el: Element, size: ObservedSize): ResizeObserverEntry =>
  ({
    target: el,
    contentRect: {
      width: size.width,
      height: size.height,
      top: 0,
      left: 0,
      right: size.width,
      bottom: size.height,
      x: 0,
      y: 0,
    } as DOMRectReadOnly,
    borderBoxSize: [{ inlineSize: size.width, blockSize: size.height }],
    devicePixelContentBoxSize: [],
  }) as unknown as ResizeObserverEntry;

/** One animation frame, then one microtask — the frame lets `observeSize`'s
 *  deferred flush run, the microtask lets Solid settle the resulting render. */
const settle = async (): Promise<void> => {
  await new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 0);
    }
  });
  await Promise.resolve();
};

/**
 * Install a ResizeObserver double on the global and return the handle.
 *
 * Deliberately NOT installed by `test-setup.ts`: twenty-five test files render
 * a measuring component without stubbing anything today, and in those
 * `observeSize` is a silent no-op. A global default would flip all of them to
 * measuring `{ width: 0, height: 0 }` (jsdom reports zero rects), pushing
 * OverflowNav, FilterBar, ResponsiveMoney and SwimlaneChart into their
 * collapsed branches mid-suite. Opting in keeps that choice local.
 */
export function installFakeSizer(): FakeSizer {
  const observers: LiveObserver[] = [];
  const observations: SizeObservation[] = [];

  const previous = (globalThis as { ResizeObserver?: unknown }).ResizeObserver;

  const handle: FakeSizer = {
    observations,
    autoFire: false,
    initialSize: { width: 0, height: 0 },

    observed(): Element[] {
      return flatMap((observer: LiveObserver) => observer.targets, observers);
    },

    async resize(el: Element, size: ObservedSize): Promise<void> {
      for (const observer of observers) {
        if (observer.targets.indexOf(el) >= 0) {
          observer.callback([entryFor(el, size)]);
        }
      }
      await settle();
    },

    async resizeAll(size: ObservedSize): Promise<void> {
      for (const observer of observers) {
        for (const target of observer.targets) {
          observer.callback([entryFor(target, size)]);
        }
      }
      await settle();
    },

    restore(): void {
      observers.length = 0;
      observations.length = 0;
      (globalThis as { ResizeObserver?: unknown }).ResizeObserver = previous;
    },
  };

  class FakeResizeObserver {
    private readonly live: LiveObserver;

    constructor(callback: Callback) {
      this.live = { callback, targets: [] };
      observers.push(this.live);
    }

    observe(el: Element, options?: ResizeObserverOptions): void {
      this.live.targets.push(el);
      observations.push({ el, options });
      if (handle.autoFire) {
        this.live.callback([entryFor(el, handle.initialSize)]);
      }
    }

    unobserve(el: Element): void {
      const at = this.live.targets.indexOf(el);
      if (at >= 0) this.live.targets.splice(at, 1);
    }

    disconnect(): void {
      this.live.targets.length = 0;
    }
  }

  (globalThis as { ResizeObserver?: unknown }).ResizeObserver =
    FakeResizeObserver;

  return handle;
}
