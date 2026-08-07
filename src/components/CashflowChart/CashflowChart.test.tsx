import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@solidjs/testing-library";
import {
  WeeklyCashflowChart,
  type WeeklyCashflowChartData,
  type WeeklyChartBar,
} from "./CashflowChart";

/** Build a chart bar, defaulting every numeric field to 0. */
function bar(
  week_start: string,
  over: Partial<WeeklyChartBar> = {},
): WeeklyChartBar {
  return {
    week_start,
    month_label: "",
    revenue_cents: 0,
    recurring_revenue_cents: 0,
    project_revenue_cents: 0,
    product_revenue_cents: 0,
    expense_cents: 0,
    recurring_expense_cents: 0,
    onetime_expense_cents: 0,
    balance_cents: 0,
    revenue_items: [],
    expense_items: [],
    recurring_expense_items: [],
    onetime_expense_items: [],
    isProjected: false,
    ...over,
  };
}

/** Read the rendered y-axis tick label texts. */
function yTickLabels(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll(".rc-cashflow__label-y")).map(
    (n) => n.textContent ?? "",
  );
}

// Minimal mock ResizeObserver: jsdom has none, so we install one that captures
// the callback and lets the test drive entries by hand. This lets us assert the
// loop-safe behaviour (rAF-defer + no-op skip) without real layout.
//
// DELIBERATELY NOT migrated to src/test-utils' installFakeSizer, for the same
// reason internal/dom/observeSize.test.ts is not: the subject here IS the
// scheduling. These tests assert that the viewBox does NOT change until the
// frame is flushed, and that a second resize cancels the first one's pending
// frame — so they must hold the rAF queue and flush it by hand. installFakeSizer
// hides exactly that (its `resize` awaits the frame before resolving, so a
// caller can never observe the un-flushed state). Migrating this file would
// silently delete the assertions it exists for.
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
    vi.stubGlobal(
      "ResizeObserver",
      MockResizeObserver as unknown as typeof ResizeObserver,
    );
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      rafQueue.push(cb);
      return rafQueue.length; // 1-based handle
    });
    vi.stubGlobal("cancelAnimationFrame", (handle: number) => {
      // handle is 1-based; clear the slot so a flush skips it.
      if (handle >= 1 && handle <= rafQueue.length)
        rafQueue[handle - 1] = () => {};
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
    const { container } = render(() => (
      <WeeklyCashflowChart data={EMPTY_DATA} />
    ));
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
    const { container } = render(() => (
      <WeeklyCashflowChart data={EMPTY_DATA} />
    ));
    const svg = container.querySelector("svg.rc-cashflow")!;

    MockResizeObserver.lastCallback!([entry(640, 480)], {} as ResizeObserver);
    MockResizeObserver.lastCallback!([entry(800, 600)], {} as ResizeObserver);
    // Two callbacks scheduled, but the first was cancelled — only the latest
    // measurement should win after a flush.
    flushRaf();
    expect(svg.getAttribute("viewBox")).toBe("0 0 800 600");
  });

  it("rounds fractional box sizes to whole pixels", () => {
    const { container } = render(() => (
      <WeeklyCashflowChart data={EMPTY_DATA} />
    ));
    const svg = container.querySelector("svg.rc-cashflow")!;
    MockResizeObserver.lastCallback!(
      [entry(640.4, 480.6)],
      {} as ResizeObserver,
    );
    flushRaf();
    expect(svg.getAttribute("viewBox")).toBe("0 0 640 481");
  });

  it("pins the height prop and only tracks width from the observer", () => {
    const { container } = render(() => (
      <WeeklyCashflowChart data={EMPTY_DATA} height={300} />
    ));
    const svg = container.querySelector("svg.rc-cashflow")!;
    expect(svg.getAttribute("viewBox")).toBe("0 0 1000 300");
    MockResizeObserver.lastCallback!([entry(640, 480)], {} as ResizeObserver);
    flushRaf();
    // Width tracks the container; height stays pinned to the prop.
    expect(svg.getAttribute("viewBox")).toBe("0 0 640 300");
  });
});

describe("WeeklyCashflowChart y-domain (degenerate → $0-anchored)", () => {
  // formatDollars renders negatives with a leading "-" (e.g. "-$100k"). A
  // $0-anchored domain therefore produces NO label starting with "-".
  const hasNegativeTick = (labels: string[]) =>
    labels.some((t) => t.trim().startsWith("-"));

  it("anchors the domain at $0 when there are no bars", () => {
    const { container } = render(() => (
      <WeeklyCashflowChart data={{ bars: [] }} />
    ));
    const labels = yTickLabels(container);
    expect(labels.length).toBeGreaterThan(0);
    expect(hasNegativeTick(labels)).toBe(false);
    expect(labels).toContain("$0");
  });

  it("anchors the domain at $0 when every bar is all-zero", () => {
    const data: WeeklyCashflowChartData = {
      bars: [bar("2026-06-01"), bar("2026-06-08"), bar("2026-06-15")],
    };
    const { container } = render(() => <WeeklyCashflowChart data={data} />);
    const labels = yTickLabels(container);
    expect(hasNegativeTick(labels)).toBe(false);
    expect(labels).toContain("$0");
  });

  it("keeps normal auto-scaling (negatives allowed) once a balance goes negative", () => {
    const data: WeeklyCashflowChartData = {
      bars: [
        bar("2026-06-01", { revenue_cents: 500_000, balance_cents: 500_000 }),
        // A real, deep negative balance — the chart must show negative ticks.
        bar("2026-06-08", {
          expense_cents: 9_000_000,
          balance_cents: -8_500_000,
        }),
      ],
    };
    const { container } = render(() => <WeeklyCashflowChart data={data} />);
    const labels = yTickLabels(container);
    expect(hasNegativeTick(labels)).toBe(true);
  });

  it("respects an explicit yMax even when data is degenerate", () => {
    const { container } = render(() => (
      <WeeklyCashflowChart data={{ bars: [] }} yMax={5_000_000} />
    ));
    const labels = yTickLabels(container);
    // $0-anchored bottom, but the top is driven by the manual yMax ($50k).
    expect(hasNegativeTick(labels)).toBe(false);
    expect(labels.some((t) => t.includes("k"))).toBe(true);
  });
});
