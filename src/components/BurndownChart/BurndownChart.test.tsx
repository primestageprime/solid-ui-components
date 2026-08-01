import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { BurndownChart, type BurndownBar } from "./BurndownChart";

const BARS: BurndownBar[] = [
  {
    label: "Mon",
    planned_complete: 2,
    planned_incomplete: 8,
    unplanned_complete: 1,
    unplanned_incomplete: 1,
  },
  {
    label: "Tue",
    planned_complete: 5,
    planned_incomplete: 4,
    unplanned_complete: 2,
    unplanned_incomplete: 0,
  },
  {
    label: "Wed",
    planned_complete: 8,
    planned_incomplete: 2,
    unplanned_complete: 0,
    unplanned_incomplete: 1,
  },
];

describe("BurndownChart", () => {
  it("renders an SVG chart with stacked bar segments", () => {
    const { container } = render(() => <BurndownChart bars={BARS} />);
    const svg = container.querySelector("svg")!;
    expect(svg).toBeTruthy();
    // Each bar contributes four segments (pc/pi/uc/ui) as <rect>s.
    expect(svg.querySelectorAll("rect").length).toBeGreaterThan(0);
  });

  it("renders axis tick labels at md size", () => {
    const { container } = render(() => <BurndownChart bars={BARS} />);
    // The bar labels feed the X axis tick formatter.
    expect(container.textContent).toContain("Mon");
  });

  it("xs size strips axes/labels for the inline footprint", () => {
    const { container } = render(() => <BurndownChart bars={BARS} size="xs" />);
    // No axis tick text in the compact variant.
    expect(container.textContent).not.toContain("Mon");
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("honors an explicit width to fill a container", () => {
    const { container } = render(() => (
      <BurndownChart bars={BARS} width={640} />
    ));
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("width")).toBe("640");
  });

  it("renders without error for a single bar (no trend line)", () => {
    const { container } = render(() => <BurndownChart bars={[BARS[0]]} />);
    expect(container.querySelector("svg")).toBeTruthy();
  });
});
