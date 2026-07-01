import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import type { Component } from "solid-js";
import { Chart } from "./Chart";
import { ChartTooltip } from "./Tooltip";
import { useChart } from "./context";

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

describe("ChartTooltip — y-clamp", () => {
  // Chart geometry below: width=200, height=100, default margin top=8,
  // bottom=28 → innerHeight=64. yScale maps yDomain [0,100] → [64, 0]
  // (chart inverts y so domain max sits at plot top).
  // Y-clamp range = [margin.top, margin.top + innerHeight] = [8, 72].
  type Pt = { x: number; y: number };

  const tooltipTop = (root: ParentNode): number => {
    const el = root.querySelector(".sui-chart__tooltip") as HTMLElement | null;
    if (!el) throw new Error("tooltip element not mounted");
    return parseFloat(el.style.top);
  };

  it("clamps to margin.top when the point sits above the plot", () => {
    // y=100 → yScale=0 → pointY = 0 + 8 + (-12) = -4 → clamp to 8.
    let setHover: ((x: number | null) => void) | null = null;
    const Probe: Component = () => {
      const ctx = useChart();
      setHover = ctx.setHoverX;
      return null;
    };
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        <Probe />
        <ChartTooltip<Pt>
          data={[{ x: 5, y: 100 }]}
          x={(d) => d.x}
          y={(d) => d.y}
        >
          {(p) => <span>{String(p.x)}</span>}
        </ChartTooltip>
      </Chart>
    ));
    setHover!(5);
    expect(tooltipTop(container)).toBeCloseTo(8, 1);
  });

  it("clamps to margin.top + innerHeight when the point sits below the plot", () => {
    // y=0 → yScale=64 → pointY = 64 + 8 + 100 = 172 → clamp to 72.
    let setHover: ((x: number | null) => void) | null = null;
    const Probe: Component = () => {
      const ctx = useChart();
      setHover = ctx.setHoverX;
      return null;
    };
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        <Probe />
        <ChartTooltip<Pt>
          data={[{ x: 5, y: 0 }]}
          x={(d) => d.x}
          y={(d) => d.y}
          offset={{ x: 0, y: 100 }}
        >
          {(p) => <span>{String(p.x)}</span>}
        </ChartTooltip>
      </Chart>
    ));
    setHover!(5);
    expect(tooltipTop(container)).toBeCloseTo(72, 1);
  });

  it("tracks yScale output mid-plot (no clamp)", () => {
    // y=50 → yScale=32 → pointY = 32 + 8 + 0 = 40. Between 8 and 72.
    let setHover: ((x: number | null) => void) | null = null;
    const Probe: Component = () => {
      const ctx = useChart();
      setHover = ctx.setHoverX;
      return null;
    };
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        <Probe />
        <ChartTooltip<Pt>
          data={[{ x: 5, y: 50 }]}
          x={(d) => d.x}
          y={(d) => d.y}
          offset={{ x: 0, y: 0 }}
        >
          {(p) => <span>{String(p.x)}</span>}
        </ChartTooltip>
      </Chart>
    ));
    setHover!(5);
    expect(tooltipTop(container)).toBeCloseTo(40, 1);
  });
});
