import { render } from "@solidjs/testing-library";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { EllipsisText } from "./EllipsisText";
import { installFakeSizer, type FakeSizer } from "../../test-utils";

// jsdom has no layout (scrollWidth ≡ 0). Install a ResizeObserver that measures
// synchronously on observe, and override element metrics on the prototype so
// every measured span reports the same, stable clip state.
// The sizer stays SILENT — `resize` is never called. It only has to exist:
// createTruncationObserver bails early when `typeof ResizeObserver ===
// "undefined"` (createTruncationObserver.ts:44), and once past that guard its
// createEffect calls `measure()` synchronously (line 59) before installing the
// observer at all. That first synchronous measure is what these assertions
// read. The previous double fired its callback on observe; replacing that with
// a no-op left every test here green, so the firing was never load-bearing.
let sizer: FakeSizer;
beforeAll(() => {
  sizer = installFakeSizer();
});
afterAll(() => sizer.restore());

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
    overrideMetrics({ scrollWidth: 300, clientWidth: 100 });
    const { container } = render(() => (
      <EllipsisText class="sui-value-string" tooltip="1200 Really Long Street Name" />
    ));
    expect(hasTooltip(container)).toBe(true);
    expect(container.querySelector(".sui-ellipsis-text")?.textContent).toContain("1200");
  });

  it("renders a bare span (no tooltip) when the text fits", () => {
    overrideMetrics({ scrollWidth: 100, clientWidth: 100 });
    const { container } = render(() => (
      <EllipsisText class="sui-value-string" tooltip="Reno" />
    ));
    expect(hasTooltip(container)).toBe(false);
    expect(container.querySelector(".sui-value-string")?.textContent).toBe("Reno");
  });

  it("forces the tooltip via alsoWhen even when the text is not clipped", () => {
    overrideMetrics({ scrollWidth: 100, clientWidth: 100 });
    const { container } = render(() => (
      <EllipsisText class="sui-value-string" tooltip="A, B, C, D" alsoWhen={() => true}>
        A, B, C +1 more
      </EllipsisText>
    ));
    expect(hasTooltip(container)).toBe(true);
  });

  it("renders custom children as the visible text", () => {
    overrideMetrics({ scrollWidth: 100, clientWidth: 100 });
    const { container } = render(() => (
      <EllipsisText class="sui-value-string" tooltip="full value">
        visible
      </EllipsisText>
    ));
    expect(container.querySelector(".sui-ellipsis-text")?.textContent).toBe("visible");
  });
});
