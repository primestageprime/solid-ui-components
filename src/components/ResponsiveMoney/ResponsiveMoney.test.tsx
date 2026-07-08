import { render } from "@solidjs/testing-library";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { ResponsiveMoney } from "./index";

// jsdom has no ResizeObserver; onMount installs one. A no-op stub is enough —
// clientWidth stays 0, so the component keeps falling back to the widest tier.
class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
beforeAll(() => vi.stubGlobal("ResizeObserver", NoopResizeObserver));
afterAll(() => vi.unstubAllGlobals());

// The visible figure is the first Text span; the second is the hidden
// measurement twin (see ResponsiveMoney.tsx), which shares the DOM but must
// be excluded from assertions on what's actually shown.
const visibleText = (container: HTMLElement) =>
  container.querySelector(".sui-responsive-money > span")!.textContent;

describe("ResponsiveMoney", () => {
  it("renders the full (widest) tier before any container width is measured", () => {
    // jsdom reports 0 for clientWidth/getBoundingClientRect, so the component
    // falls back to the widest ladder candidate rather than the narrowest.
    const { container } = render(() => <ResponsiveMoney cents={33_028_500} />);
    expect(visibleText(container)).toBe("$330,285");
  });

  it("keeps the sign for negative values", () => {
    const { container } = render(() => (
      <ResponsiveMoney cents={-33_028_500} />
    ));
    expect(visibleText(container)).toBe("-$330,285");
  });
});
