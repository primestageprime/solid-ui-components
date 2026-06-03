import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@solidjs/testing-library";
import { WeeklyCashflowChart, type WeeklyCashflowChartData } from "./CashflowChart";

// Minimal mock ResizeObserver: jsdom has none, so we install one that captures
// the callback and lets the test drive entries by hand. This lets us assert the
// loop-safe behaviour (rAF-defer + no-op skip) without real layout.
class MockResizeObserver {
  static lastCallback: ResizeObserverCallback | null = null;
  static observed: Element[] = [];
  static disconnected = false;
  cb: ResizeObserverCallback;
  constructor(cb: ResizeObserverCallback) {
    this.cb = cb;
    MockResizeObserver.lastCallback = cb;
  }
  observe(el: Element) {
    MockResizeObserver.observed.push(el);
  }
  unobserve() {}
  disconnect() {
    MockResizeObserver.disconnected = true;
  }
}

/** Build a fake ResizeObserverEntry exposing a rounded border-box size. */
function entry(width: number, height: number): ResizeObserverEntry {
  return {
    borderBoxSize: [{ inlineSize: width, blockSize: height }],
    contentRect: { width, height } as DOMRectReadOnly,
    target: document.createElement("div"),
  } as unknown as ResizeObserverEntry;
}

const EMPTY_DATA: WeeklyCashflowChartData = { bars: [] };

describe("WeeklyCashflowChart ResizeObserver (loop-safe)", () => {
  let rafQueue: FrameRequestCallback[];

  beforeEach(() => {
    MockResizeObserver.lastCallback = null;
    MockResizeObserver.observed = [];
    MockResizeObserver.disconnected = false;
    rafQueue = [];
    vi.stubGlobal("ResizeObserver", MockResizeObserver as unknown as typeof ResizeObserver);
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      rafQueue.push(cb);
      return rafQueue.length; // 1-based handle
    });
    vi.stubGlobal("cancelAnimationFrame", (handle: number) => {
      // handle is 1-based; clear the slot so a flush skips it.
      if (handle >= 1 && handle <= rafQueue.length) rafQueue[handle - 1] = () => {};
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const flushRaf = () => {
    const queue = rafQueue;
    rafQueue = [];
    for (const cb of queue) cb(performance.now());
  };

  it("does not update size synchronously inside the observer callback", () => {
    const { container } = render(() => <WeeklyCashflowChart data={EMPTY_DATA} />);
    const svg = container.querySelector("svg.rc-cashflow")!;
    const before = svg.getAttribute("viewBox");

    // Fire a resize. Because the update is deferred to rAF, the viewBox must
    // NOT change until the frame is flushed.
    MockResizeObserver.lastCallback!([entry(640, 480)], {} as ResizeObserver);
    expect(svg.getAttribute("viewBox")).toBe(before);
    expect(rafQueue.length).toBe(1);

    flushRaf();
    expect(svg.getAttribute("viewBox")).toBe("0 0 640 480");
  });

  it("coalesces rapid resizes by cancelling the pending frame", () => {
    const { container } = render(() => <WeeklyCashflowChart data={EMPTY_DATA} />);
    const svg = container.querySelector("svg.rc-cashflow")!;

    MockResizeObserver.lastCallback!([entry(640, 480)], {} as ResizeObserver);
    MockResizeObserver.lastCallback!([entry(800, 600)], {} as ResizeObserver);
    // Two callbacks scheduled, but the first was cancelled — only the latest
    // measurement should win after a flush.
    flushRaf();
    expect(svg.getAttribute("viewBox")).toBe("0 0 800 600");
  });

  it("rounds fractional box sizes to whole pixels", () => {
    const { container } = render(() => <WeeklyCashflowChart data={EMPTY_DATA} />);
    const svg = container.querySelector("svg.rc-cashflow")!;
    MockResizeObserver.lastCallback!([entry(640.4, 480.6)], {} as ResizeObserver);
    flushRaf();
    expect(svg.getAttribute("viewBox")).toBe("0 0 640 481");
  });

  it("pins the height prop and only tracks width from the observer", () => {
    const { container } = render(() => <WeeklyCashflowChart data={EMPTY_DATA} height={300} />);
    const svg = container.querySelector("svg.rc-cashflow")!;
    expect(svg.getAttribute("viewBox")).toBe("0 0 1000 300");
    MockResizeObserver.lastCallback!([entry(640, 480)], {} as ResizeObserver);
    flushRaf();
    // Width tracks the container; height stays pinned to the prop.
    expect(svg.getAttribute("viewBox")).toBe("0 0 640 300");
  });
});
