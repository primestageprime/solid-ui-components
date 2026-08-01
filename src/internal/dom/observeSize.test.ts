import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { observeSize, type ObservedSize } from "./observeSize";

// Minimal ResizeObserver stand-in: lets a test drive the dispatch directly.
type Cb = (entries: ResizeObserverEntry[]) => void;
let dispatch: Cb | null = null;
let disconnected = 0;
let observed: Element[] = [];
let observeCalls: { el: Element; options?: ResizeObserverOptions }[] = [];

const entryFor = (width: number, height: number): ResizeObserverEntry =>
  ({
    target: document.createElement("div"),
    contentRect: { width, height } as DOMRectReadOnly,
    borderBoxSize: undefined,
  }) as unknown as ResizeObserverEntry;

class FakeRO {
  constructor(cb: Cb) {
    dispatch = cb;
  }
  observe(el: Element, options?: ResizeObserverOptions) {
    observed.push(el);
    observeCalls.push({ el, options });
  }
  disconnect() {
    disconnected += 1;
  }
  unobserve() {}
}

// rAF stand-in with a manual pump, so "did it defer?" is directly observable.
let frames: Array<() => void> = [];
const pump = () => {
  const queued = frames;
  frames = [];
  for (const f of queued) f();
};

describe("observeSize", () => {
  beforeEach(() => {
    dispatch = null;
    disconnected = 0;
    observed = [];
    observeCalls = [];
    frames = [];
    vi.stubGlobal("ResizeObserver", FakeRO);
    vi.stubGlobal("requestAnimationFrame", (f: () => void) => {
      frames.push(f);
      return frames.length;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => {
      frames[id - 1] = () => {};
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("does not call back synchronously inside the observer dispatch", () => {
    const el = document.createElement("div");
    const seen: ObservedSize[] = [];
    observeSize(el, (s) => seen.push(s));

    dispatch?.([entryFor(300, 100)]);
    // Still inside/just after dispatch — nothing delivered yet.
    expect(seen).toEqual([]);

    pump();
    expect(seen).toEqual([{ width: 300, height: 100 }]);
  });

  it("change-guards: an unchanged size never reaches the callback", () => {
    const el = document.createElement("div");
    const seen: ObservedSize[] = [];
    observeSize(el, (s) => seen.push(s));

    dispatch?.([entryFor(300, 100)]);
    pump();
    expect(seen).toHaveLength(1);

    // Three more fires at the same size — the common case during a drag.
    dispatch?.([entryFor(300, 100)]);
    dispatch?.([entryFor(300.4, 100.2)]); // rounds to the same box
    dispatch?.([entryFor(300, 100)]);
    pump();
    expect(seen).toHaveLength(1);
  });

  it("coalesces multiple fires in one frame down to the newest size", () => {
    const el = document.createElement("div");
    const seen: ObservedSize[] = [];
    observeSize(el, (s) => seen.push(s));

    dispatch?.([entryFor(300, 100)]);
    dispatch?.([entryFor(400, 100)]);
    dispatch?.([entryFor(500, 100)]);
    pump();
    // One delivery, carrying the latest measurement — no lag behind a drag.
    expect(seen).toEqual([{ width: 500, height: 100 }]);
  });

  it("guards against the QUEUED size, not just the delivered one", () => {
    // A → B → A within one frame: the revert must win. Guarding on `delivered`
    // alone would return early on the second A and flush the stranded B,
    // reporting a size the element no longer has.
    const el = document.createElement("div");
    const seen: ObservedSize[] = [];
    observeSize(el, (s) => seen.push(s));

    dispatch?.([entryFor(300, 100)]); // A
    pump();
    expect(seen).toEqual([{ width: 300, height: 100 }]);

    dispatch?.([entryFor(400, 100)]); // B — queued
    dispatch?.([entryFor(300, 100)]); // back to A before the frame runs
    pump();

    // Consumer ends up at A, and never saw the superseded B.
    expect(seen).toEqual([
      { width: 300, height: 100 },
      { width: 300, height: 100 },
    ]);
  });

  it("still drops a repeat of the queued size (guard stays effective)", () => {
    const el = document.createElement("div");
    const seen: ObservedSize[] = [];
    observeSize(el, (s) => seen.push(s));

    dispatch?.([entryFor(300, 100)]);
    dispatch?.([entryFor(300, 100)]); // identical repeat while queued
    dispatch?.([entryFor(300, 100)]);
    pump();
    expect(seen).toEqual([{ width: 300, height: 100 }]);
  });

  it("disposer disconnects and cancels a pending frame", () => {
    const el = document.createElement("div");
    const seen: ObservedSize[] = [];
    const dispose = observeSize(el, (s) => seen.push(s));

    dispatch?.([entryFor(300, 100)]);
    dispose();
    pump();

    // An unmounted consumer must never receive a write.
    expect(seen).toEqual([]);
    expect(disconnected).toBe(1);
  });

  it("forwards observe options, and omitting them passes nothing", () => {
    const el = document.createElement("div");
    observeSize(el, () => {});
    expect(observeCalls).toEqual([{ el, options: undefined }]);

    observeCalls = [];
    const opts: ResizeObserverOptions = { box: "border-box" };
    observeSize(el, () => {}, opts);
    expect(observeCalls).toEqual([{ el, options: opts }]);
  });

  it("keeps the guard and the rAF deferral on the border-box path", () => {
    // A `box` option must not become a way to bypass the loop-safety the
    // primitive exists for.
    const el = document.createElement("div");
    const seen: ObservedSize[] = [];
    observeSize(el, (s) => seen.push(s), { box: "border-box" });

    dispatch?.([entryFor(300, 100)]);
    expect(seen).toEqual([]); // still deferred, not synchronous
    pump();
    expect(seen).toEqual([{ width: 300, height: 100 }]);

    dispatch?.([entryFor(300, 100)]); // unchanged — still guarded
    pump();
    expect(seen).toHaveLength(1);
  });

  it("is a no-op where ResizeObserver is unavailable (SSR / jsdom)", () => {
    vi.stubGlobal("ResizeObserver", undefined);
    const el = document.createElement("div");
    const seen: ObservedSize[] = [];
    const dispose = observeSize(el, (s) => seen.push(s));
    expect(seen).toEqual([]);
    expect(() => dispose()).not.toThrow();
  });
});
