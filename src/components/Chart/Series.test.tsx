import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import type { Component } from "solid-js";
import { Chart } from "./Chart";
import { AreaSeries, PointSeries } from "./Series";
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

describe("PointSeries — class prop", () => {
  it("appends the caller class to the root group", () => {
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        <PointSeries
          data={data}
          x={(d) => d.x}
          y={(d) => d.y}
          class="my-points"
        />
      </Chart>
    ));
    const group = container.querySelector(".sui-chart__points")!;
    expect(group.classList.contains("my-points")).toBe(true);
    expect(group.querySelectorAll("circle").length).toBe(4);
  });

  it("keeps the base class alone when the caller omits class", () => {
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        <PointSeries data={data} x={(d) => d.x} y={(d) => d.y} />
      </Chart>
    ));
    expect(
      container.querySelector(".sui-chart__points")!.getAttribute("class"),
    ).toBe("sui-chart__points");
  });
});

// dside task 45210: the fill must close at the last DRAWN point, not at the
// last datum with a finite x.
describe("AreaSeries — closes the fill at the drawn line's ends", () => {
  const renderArea = (points: readonly Datum[]) => {
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        <AreaSeries data={points} x={(d) => d.x} y={(d) => d.y} />
      </Chart>
    ));
    const path = container.querySelector<SVGPathElement>(".sui-chart__area");
    return path?.getAttribute("d") ?? "";
  };

  // Every "<x>,<y>" pair in the path, in order.
  const pairs = (d: string): [number, number][] => {
    const out: [number, number][] = [];
    const re = /(-?[\d.]+),(-?[\d.]+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(d)) !== null) out.push([Number(m[1]), Number(m[2])]);
    return out;
  };

  it("a trailing NaN y does not extend the fill past the line", () => {
    const d = renderArea([
      { x: 0, y: 10 },
      { x: 5, y: 20 },
      { x: 10, y: NaN },
    ]);
    const p = pairs(d);
    // top line: 2 points; closing: 2 baseline points.
    expect(p.length).toBe(4);
    const lastDrawn = p[1];
    const closeFirst = p[2];
    const closeLast = p[3];
    expect(closeFirst[0]).toBe(lastDrawn[0]);
    expect(closeLast[0]).toBe(p[0][0]);
  });

  it("a leading NaN y does not extend the fill before the line", () => {
    const d = renderArea([
      { x: 0, y: NaN },
      { x: 5, y: 20 },
      { x: 10, y: 30 },
    ]);
    const p = pairs(d);
    expect(p.length).toBe(4);
    expect(p[2][0]).toBe(p[1][0]);
    expect(p[3][0]).toBe(p[0][0]);
  });
});
