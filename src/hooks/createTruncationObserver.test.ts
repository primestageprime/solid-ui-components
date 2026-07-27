import { createRoot, createSignal } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createTruncationObserver } from "./createTruncationObserver";

// A controllable ResizeObserver: the most recent instance's callback can be
// fired on demand to simulate a layout/resize pass (jsdom has no real layout).
let lastObserver: FakeResizeObserver | undefined;
class FakeResizeObserver {
  callback: ResizeObserverCallback;
  constructor(cb: ResizeObserverCallback) {
    this.callback = cb;
    lastObserver = this;
  }
  target?: Element;
  observe(el: Element) {
    this.target = el;
  }
  unobserve() {}
  disconnect() {}
  /** Simulate a layout pass. A real ResizeObserver always delivers at least one
   *  entry carrying the new box, and the measurement pipeline change-guards on
   *  that box — so a fire that means "the box changed" must carry a size that
   *  actually differs from the previous one. */
  fire(width = 100, height = 20) {
    this.callback(
      [
        {
          target: this.target ?? document.createElement("span"),
          contentRect: { width, height } as DOMRectReadOnly,
        } as ResizeObserverEntry,
      ],
      this as unknown as ResizeObserver,
    );
  }
}

/** observeSize defers the write out of the observer dispatch, so a fire lands
 *  on the next frame. */
const frame = () =>
  new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame === "function")
      requestAnimationFrame(() => resolve());
    else setTimeout(resolve, 0);
  });

const withMockedMetrics = (
  el: HTMLElement,
  metrics: { scrollWidth?: number; clientWidth?: number; scrollHeight?: number; clientHeight?: number },
) => {
  for (const [key, value] of Object.entries(metrics)) {
    Object.defineProperty(el, key, { configurable: true, value });
  }
};

// The observer wires up inside a createEffect, which Solid flushes on a
// microtask — await one before touching the observer instance.
const tick = () => Promise.resolve();

afterEach(() => {
  lastObserver = undefined;
  vi.unstubAllGlobals();
});

describe("createTruncationObserver", () => {
  it("reports truncated when content overflows horizontally (single-line ellipsis)", async () => {
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    await createRoot(async (dispose) => {
      const el = document.createElement("span");
      withMockedMetrics(el, { scrollWidth: 300, clientWidth: 100, scrollHeight: 20, clientHeight: 20 });
      const [ref] = createSignal(el);
      const isTruncated = createTruncationObserver(ref);
      await tick();
      lastObserver!.fire();
      expect(isTruncated()).toBe(true);
      dispose();
    });
  });

  it("reports truncated when content overflows vertically (line-clamp)", async () => {
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    await createRoot(async (dispose) => {
      const el = document.createElement("span");
      withMockedMetrics(el, { scrollWidth: 100, clientWidth: 100, scrollHeight: 60, clientHeight: 20 });
      const [ref] = createSignal(el);
      const isTruncated = createTruncationObserver(ref);
      await tick();
      lastObserver!.fire();
      expect(isTruncated()).toBe(true);
      dispose();
    });
  });

  it("reports NOT truncated when content fits (no ellipsis → no tooltip)", async () => {
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    await createRoot(async (dispose) => {
      const el = document.createElement("span");
      withMockedMetrics(el, { scrollWidth: 100, clientWidth: 100, scrollHeight: 20, clientHeight: 20 });
      const [ref] = createSignal(el);
      const isTruncated = createTruncationObserver(ref);
      await tick();
      lastObserver!.fire();
      expect(isTruncated()).toBe(false);
      dispose();
    });
  });

  it("absorbs sub-pixel rounding within 1px", async () => {
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    await createRoot(async (dispose) => {
      const el = document.createElement("span");
      withMockedMetrics(el, { scrollWidth: 101, clientWidth: 100, scrollHeight: 20, clientHeight: 20 });
      const [ref] = createSignal(el);
      const isTruncated = createTruncationObserver(ref);
      await tick();
      lastObserver!.fire();
      expect(isTruncated()).toBe(false);
      dispose();
    });
  });

  it("re-measures when the box changes after mount (stale-measurement regression)", async () => {
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    await createRoot(async (dispose) => {
      const el = document.createElement("span");
      // Mounts wide enough to fit — the original onMount-only code latched here.
      withMockedMetrics(el, { scrollWidth: 100, clientWidth: 100, scrollHeight: 20, clientHeight: 20 });
      const [ref] = createSignal(el);
      const isTruncated = createTruncationObserver(ref);
      await tick();
      lastObserver!.fire(200, 20);
      await frame();
      expect(isTruncated()).toBe(false);
      // Column later narrows (no window resize): the element now clips. The
      // narrower box is what the observer reports.
      withMockedMetrics(el, { scrollWidth: 300, clientWidth: 100, scrollHeight: 20, clientHeight: 20 });
      lastObserver!.fire(100, 20);
      await frame();
      expect(isTruncated()).toBe(true);
      dispose();
    });
  });

  it("stays false (SSR-safe) when ResizeObserver is unavailable", async () => {
    vi.stubGlobal("ResizeObserver", undefined);
    await createRoot(async (dispose) => {
      const el = document.createElement("span");
      withMockedMetrics(el, { scrollWidth: 300, clientWidth: 100 });
      const [ref] = createSignal(el);
      const isTruncated = createTruncationObserver(ref);
      await tick();
      expect(isTruncated()).toBe(false);
      dispose();
    });
  });
});
