import { render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IdCell, LongTextCell, StringCell } from "./textCells";

// jsdom has no layout: scrollWidth/clientWidth are 0. To exercise the
// clamp-mode "tooltip iff ellipsis" logic we (1) install a ResizeObserver that
// measures synchronously on observe, and (2) override the element metrics on
// HTMLElement.prototype so every clamp element reports the same clip state —
// stable across the re-render that flips into/out of the tooltip branch.
class SyncResizeObserver {
  callback: ResizeObserverCallback;
  constructor(cb: ResizeObserverCallback) {
    this.callback = cb;
  }
  observe(el: Element) {
    this.callback(
      [{ target: el } as ResizeObserverEntry],
      this as unknown as ResizeObserver,
    );
  }
  unobserve() {}
  disconnect() {}
}

const overrideMetrics = (metrics: Record<string, number>) => {
  for (const [key, value] of Object.entries(metrics)) {
    Object.defineProperty(HTMLElement.prototype, key, {
      configurable: true,
      get() {
        return value;
      },
    });
  }
};

afterEach(() => {
  vi.unstubAllGlobals();
  for (const key of ["scrollWidth", "clientWidth", "scrollHeight", "clientHeight"]) {
    // Restore jsdom's default (0) so tests don't leak metrics into each other.
    Object.defineProperty(HTMLElement.prototype, key, {
      configurable: true,
      get() {
        return 0;
      },
    });
  }
});

// The tooltip reveal renders a Kobalte trigger; the plain (untruncated) reveal
// renders a bare span. The trigger class is the reliable DOM discriminator.
const hasTooltip = (container: HTMLElement) =>
  container.querySelector(".sui-tooltip__trigger") !== null;

describe("LongTextCell — clamp + tooltip reveal (ellipsis iff tooltip)", () => {
  it("shows the tooltip when the value is actually clipped", () => {
    vi.stubGlobal("ResizeObserver", SyncResizeObserver);
    overrideMetrics({ scrollWidth: 300, clientWidth: 100, scrollHeight: 20, clientHeight: 20 });
    const { container } = render(() => (
      <LongTextCell value="1200 Really Long Street Name" clampLines={1} reveal="tooltip" />
    ));
    expect(hasTooltip(container)).toBe(true);
  });

  it("does NOT show the tooltip when the value fits (no ellipsis)", () => {
    vi.stubGlobal("ResizeObserver", SyncResizeObserver);
    overrideMetrics({ scrollWidth: 100, clientWidth: 100, scrollHeight: 20, clientHeight: 20 });
    const { container } = render(() => (
      <LongTextCell value="Reno" clampLines={1} reveal="tooltip" />
    ));
    expect(hasTooltip(container)).toBe(false);
    expect(container.textContent).toContain("Reno");
  });

  it("renders the empty fallback for a blank value (never a tooltip)", () => {
    vi.stubGlobal("ResizeObserver", SyncResizeObserver);
    overrideMetrics({ scrollWidth: 300, clientWidth: 100 });
    const { container } = render(() => (
      <LongTextCell value="" clampLines={1} reveal="tooltip" />
    ));
    expect(hasTooltip(container)).toBe(false);
    expect(container.querySelector(".sui-value-empty")).not.toBeNull();
  });
});

describe("StringCell / IdCell — tooltip iff the value is clipped", () => {
  const hasTooltip = (container: HTMLElement) =>
    container.querySelector(".sui-ellipsis-text__trigger") !== null;

  it("StringCell tooltips a clipped value, not a fitting one", () => {
    vi.stubGlobal("ResizeObserver", SyncResizeObserver);
    overrideMetrics({ scrollWidth: 300, clientWidth: 100 });
    const clipped = render(() => <StringCell value="a very long string value" />);
    expect(hasTooltip(clipped.container)).toBe(true);

    overrideMetrics({ scrollWidth: 100, clientWidth: 100 });
    const fits = render(() => <StringCell value="ok" />);
    expect(hasTooltip(fits.container)).toBe(false);
    expect(fits.container.querySelector(".sui-value-string")?.textContent).toBe("ok");
  });

  it("IdCell tooltips a clipped id and keeps the .sui-value-id pill", () => {
    vi.stubGlobal("ResizeObserver", SyncResizeObserver);
    overrideMetrics({ scrollWidth: 300, clientWidth: 100 });
    const { container } = render(() => <IdCell value="veryLongIdentifier-0001" />);
    expect(hasTooltip(container)).toBe(true);
    expect(container.querySelector(".sui-value-id")?.textContent).toContain("veryLongIdentifier");
  });

  it("renders the empty fallback (never a tooltip) for null", () => {
    vi.stubGlobal("ResizeObserver", SyncResizeObserver);
    overrideMetrics({ scrollWidth: 300, clientWidth: 100 });
    const { container } = render(() => <StringCell value={null} />);
    expect(hasTooltip(container)).toBe(false);
    expect(container.querySelector(".sui-value-empty")?.textContent).toBe("—");
  });
});

describe("LongTextCell — inline char-count reveal (unchanged behavior)", () => {
  it("shows a 'more...' affordance when the value exceeds maxLength", () => {
    const { container } = render(() => (
      <LongTextCell value={"x".repeat(80)} maxLength={40} />
    ));
    expect(container.querySelector(".sui-value-longtext__more")).not.toBeNull();
  });

  it("renders the whole value with no affordance when it fits", () => {
    const { container } = render(() => (
      <LongTextCell value="short" maxLength={40} />
    ));
    expect(container.querySelector(".sui-value-longtext__more")).toBeNull();
    expect(container.textContent).toContain("short");
  });
});
