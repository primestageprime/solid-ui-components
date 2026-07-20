import { render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EllipsisText } from "./EllipsisText";

// jsdom has no layout (scrollWidth ≡ 0). Install a ResizeObserver that measures
// synchronously on observe, and override element metrics on the prototype so
// every measured span reports the same, stable clip state.
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
    Object.defineProperty(HTMLElement.prototype, key, {
      configurable: true,
      get() {
        return 0;
      },
    });
  }
});

const hasTooltip = (container: HTMLElement) =>
  container.querySelector(".sui-ellipsis-text__trigger") !== null;

describe("EllipsisText — tooltip iff ellipsis", () => {
  it("wraps in a tooltip when the text is clipped", () => {
    vi.stubGlobal("ResizeObserver", SyncResizeObserver);
    overrideMetrics({ scrollWidth: 300, clientWidth: 100 });
    const { container } = render(() => (
      <EllipsisText class="cell-string" tooltip="1200 Really Long Street Name" />
    ));
    expect(hasTooltip(container)).toBe(true);
    expect(container.querySelector(".sui-ellipsis-text")?.textContent).toContain("1200");
  });

  it("renders a bare span (no tooltip) when the text fits", () => {
    vi.stubGlobal("ResizeObserver", SyncResizeObserver);
    overrideMetrics({ scrollWidth: 100, clientWidth: 100 });
    const { container } = render(() => (
      <EllipsisText class="cell-string" tooltip="Reno" />
    ));
    expect(hasTooltip(container)).toBe(false);
    expect(container.querySelector(".cell-string")?.textContent).toBe("Reno");
  });

  it("forces the tooltip via alsoWhen even when the text is not clipped", () => {
    vi.stubGlobal("ResizeObserver", SyncResizeObserver);
    overrideMetrics({ scrollWidth: 100, clientWidth: 100 });
    const { container } = render(() => (
      <EllipsisText class="cell-string" tooltip="A, B, C, D" alsoWhen={() => true}>
        A, B, C +1 more
      </EllipsisText>
    ));
    expect(hasTooltip(container)).toBe(true);
  });

  it("renders custom children as the visible text", () => {
    vi.stubGlobal("ResizeObserver", SyncResizeObserver);
    overrideMetrics({ scrollWidth: 100, clientWidth: 100 });
    const { container } = render(() => (
      <EllipsisText class="cell-string" tooltip="full value">
        visible
      </EllipsisText>
    ));
    expect(container.querySelector(".sui-ellipsis-text")?.textContent).toBe("visible");
  });
});
