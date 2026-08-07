import { createRoot, createSignal } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createTruncationObserver } from "./createTruncationObserver";
import { installFakeSizer, type FakeSizer } from "../test-utils";

// The shared sizer is the controllable shape: `resize` delivers a box to every
// observer watching the element and then awaits observeSize's deferral frame,
// so the separate `frame()` helper this file used to carry is gone. The size
// passed to `resize` must DIFFER from the last one delivered — observeSize
// change-guards on the box, so re-delivering the same numbers is dropped before
// it can schedule anything.
//
// Only the post-mount regression test below drives a resize. The other four
// install the sizer and never fire it, because they are not observer tests:
// createTruncationObserver's createEffect calls `measure()` synchronously
// (createTruncationObserver.ts:59) before observing anything, and that first
// measure is what they assert on. They used to fire the observer anyway, which
// read as observer coverage they did not have — neutering the delivery left
// them green and failed only the regression test. The sizer still has to be
// installed for all six: line 44 returns a permanently-false accessor when
// `typeof ResizeObserver === "undefined"`, which is what the last test pins.
let sizer: FakeSizer | undefined;

const withMockedMetrics = (
  el: HTMLElement,
  metrics: {
    scrollWidth?: number;
    clientWidth?: number;
    scrollHeight?: number;
    clientHeight?: number;
  },
) => {
  for (const [key, value] of Object.entries(metrics)) {
    Object.defineProperty(el, key, { configurable: true, value });
  }
};

// The observer wires up inside a createEffect, which Solid flushes on a
// microtask — await one before touching the observer instance.
const tick = () => Promise.resolve();

afterEach(() => {
  sizer?.restore();
  sizer = undefined;
  vi.unstubAllGlobals();
});

describe("createTruncationObserver", () => {
  it("reports truncated when content overflows horizontally (single-line ellipsis)", async () => {
    sizer = installFakeSizer();
    await createRoot(async (dispose) => {
      const el = document.createElement("span");
      withMockedMetrics(el, {
        scrollWidth: 300,
        clientWidth: 100,
        scrollHeight: 20,
        clientHeight: 20,
      });
      const [ref] = createSignal(el);
      const isTruncated = createTruncationObserver(ref);
      await tick();
      expect(isTruncated()).toBe(true);
      dispose();
    });
  });

  it("reports truncated when content overflows vertically (line-clamp)", async () => {
    sizer = installFakeSizer();
    await createRoot(async (dispose) => {
      const el = document.createElement("span");
      withMockedMetrics(el, {
        scrollWidth: 100,
        clientWidth: 100,
        scrollHeight: 60,
        clientHeight: 20,
      });
      const [ref] = createSignal(el);
      const isTruncated = createTruncationObserver(ref);
      await tick();
      expect(isTruncated()).toBe(true);
      dispose();
    });
  });

  it("reports NOT truncated when content fits (no ellipsis → no tooltip)", async () => {
    sizer = installFakeSizer();
    await createRoot(async (dispose) => {
      const el = document.createElement("span");
      withMockedMetrics(el, {
        scrollWidth: 100,
        clientWidth: 100,
        scrollHeight: 20,
        clientHeight: 20,
      });
      const [ref] = createSignal(el);
      const isTruncated = createTruncationObserver(ref);
      await tick();
      expect(isTruncated()).toBe(false);
      dispose();
    });
  });

  it("absorbs sub-pixel rounding within 1px", async () => {
    sizer = installFakeSizer();
    await createRoot(async (dispose) => {
      const el = document.createElement("span");
      withMockedMetrics(el, {
        scrollWidth: 101,
        clientWidth: 100,
        scrollHeight: 20,
        clientHeight: 20,
      });
      const [ref] = createSignal(el);
      const isTruncated = createTruncationObserver(ref);
      await tick();
      expect(isTruncated()).toBe(false);
      dispose();
    });
  });

  it("re-measures when the box changes after mount (stale-measurement regression)", async () => {
    const fake = installFakeSizer();
    sizer = fake;
    await createRoot(async (dispose) => {
      const el = document.createElement("span");
      // Mounts wide enough to fit — the original onMount-only code latched here.
      withMockedMetrics(el, {
        scrollWidth: 100,
        clientWidth: 100,
        scrollHeight: 20,
        clientHeight: 20,
      });
      const [ref] = createSignal(el);
      const isTruncated = createTruncationObserver(ref);
      await tick();
      await fake.resize(el, { width: 200, height: 20 });
      expect(isTruncated()).toBe(false);
      // Column later narrows (no window resize): the element now clips. The
      // narrower box is what the observer reports.
      withMockedMetrics(el, {
        scrollWidth: 300,
        clientWidth: 100,
        scrollHeight: 20,
        clientHeight: 20,
      });
      await fake.resize(el, { width: 100, height: 20 });
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
