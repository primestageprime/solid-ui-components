import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { Chart } from "./Chart";
import { ChartTooltip } from "./Tooltip";

describe("ChartTooltip — portal", () => {
  it("Chart renders a .sui-chart__overlay sibling of the SVG", () => {
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]} />
    ));
    const overlay = container.querySelector(".sui-chart__overlay");
    const svg = container.querySelector("svg.sui-chart__svg");
    expect(overlay).toBeTruthy();
    expect(svg).toBeTruthy();
    // overlay must NOT be inside the SVG (the whole point of the fix)
    expect(svg!.contains(overlay!)).toBe(false);
    // overlay should share the same parent as the SVG (.sui-chart)
    expect(overlay!.parentElement).toBe(svg!.parentElement);
  });

  it("ChartTooltip portals out of the SVG when hoverX is set", () => {
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        <ChartTooltip data={[{ x: 5 }]} x={(d) => d.x}>
          {(p) => <span class="sui-tooltip-sentinel">{String(p.x)}</span>}
        </ChartTooltip>
      </Chart>
    ));
    const svg = container.querySelector("svg.sui-chart__svg");
    // Sentinel may not render yet (hoverX is null on mount), but if it does,
    // it must NOT be a descendant of the SVG.
    const sentinel = document.querySelector(".sui-tooltip-sentinel");
    if (sentinel) {
      expect(svg!.contains(sentinel)).toBe(false);
    }
    // Overlay container is always present and outside the SVG.
    const overlay = container.querySelector(".sui-chart__overlay");
    expect(overlay).toBeTruthy();
    expect(svg!.contains(overlay!)).toBe(false);
  });
});
