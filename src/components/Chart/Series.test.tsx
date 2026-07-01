import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import type { Component } from "solid-js";
import { Chart } from "./Chart";
import { PointSeries } from "./Series";
import { useChart } from "./context";

interface Datum {
  x: number;
  y: number;
}

const data: readonly Datum[] = [
  { x: 0, y: 10 },
  { x: 3, y: 20 },
  { x: 7, y: 30 },
  { x: 10, y: 40 },
];

describe("PointSeries — emphasizeNearestX", () => {
  it("defaults to no emphasis when prop is unset", () => {
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        <PointSeries data={data} x={(d) => d.x} y={(d) => d.y} radius={3} />
      </Chart>
    ));
    const circles = container.querySelectorAll<SVGCircleElement>(
      ".sui-chart__points circle",
    );
    expect(circles.length).toBe(4);
    const radii = Array.from(circles).map((c) => Number(c.getAttribute("r")));
    expect(radii.every((r) => r === 3)).toBe(true);
  });

  it("enlarges the dot nearest to hoverX by emphasisScale (default 2x)", () => {
    let setHover: ((x: number | null) => void) | null = null;
    const Probe: Component = () => {
      const ctx = useChart();
      setHover = ctx.setHoverX;
      return null;
    };
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        <Probe />
        <PointSeries
          data={data}
          x={(d) => d.x}
          y={(d) => d.y}
          radius={3}
          emphasizeNearestX
        />
      </Chart>
    ));
    // No emphasis until hoverX is set.
    let emphasized = container.querySelectorAll('[data-emphasized="true"]');
    expect(emphasized.length).toBe(0);

    // hoverX=6 → nearest datum is x=7 (index 2).
    setHover!(6);
    emphasized = container.querySelectorAll('[data-emphasized="true"]');
    expect(emphasized.length).toBe(1);
    const emphasizedCircle = emphasized[0] as SVGCircleElement;
    expect(Number(emphasizedCircle.getAttribute("r"))).toBe(6); // 3 * 2

    // Clearing hover removes emphasis.
    setHover!(null);
    expect(container.querySelectorAll('[data-emphasized="true"]').length).toBe(
      0,
    );
  });

  it("respects custom emphasisScale", () => {
    let setHover: ((x: number | null) => void) | null = null;
    const Probe: Component = () => {
      const ctx = useChart();
      setHover = ctx.setHoverX;
      return null;
    };
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        <Probe />
        <PointSeries
          data={data}
          x={(d) => d.x}
          y={(d) => d.y}
          radius={4}
          emphasizeNearestX
          emphasisScale={3}
        />
      </Chart>
    ));
    setHover!(0);
    const emphasized = container.querySelector<SVGCircleElement>(
      '[data-emphasized="true"]',
    );
    expect(emphasized).toBeTruthy();
    expect(Number(emphasized!.getAttribute("r"))).toBe(12); // 4 * 3
  });
});
