import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { Chart } from "./Chart";
import { XAxis } from "./Axes";
import { PointSeries } from "./Series";
import { useChart } from "./context";
import type { Component } from "solid-js";

describe("Chart", () => {
  it("renders with a numeric xDomain (back-compat)", () => {
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]} />
    ));
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("renders with a Date xDomain (time scale)", () => {
    const t0 = new Date(2026, 0, 1);
    const t1 = new Date(2026, 0, 2);
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[t0, t1]} yDomain={[0, 100]} />
    ));
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("exposes dragRange via context, initially null", () => {
    let captured: ReturnType<typeof useChart> | null = null;
    const Probe: Component = () => {
      captured = useChart();
      return null;
    };
    render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        <Probe />
      </Chart>
    ));
    expect(captured).not.toBeNull();
    expect(captured!.dragRange()).toBeNull();
  });

  it("setDragRange mutates the context signal", () => {
    let captured: ReturnType<typeof useChart> | null = null;
    const Probe: Component = () => {
      captured = useChart();
      return null;
    };
    render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        <Probe />
      </Chart>
    ));
    captured!.setDragRange({ start: 1, end: 4 });
    expect(captured!.dragRange()).toEqual({ start: 1, end: 4 });
    captured!.setDragRange(null);
    expect(captured!.dragRange()).toBeNull();
  });

  it("throws on mixed-type xDomain", () => {
    expect(() =>
      render(() => (
        // @ts-expect-error — testing the runtime guard
        <Chart width={200} height={100} xDomain={[0, new Date(2026, 0, 1)]} yDomain={[0, 100]} />
      )),
    ).toThrow(/mixed types/);
  });

  it("pointermove inside the plot area updates hoverX", () => {
    let captured: ReturnType<typeof useChart> | null = null;
    const Probe: Component = () => {
      captured = useChart();
      return null;
    };
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        <Probe />
      </Chart>
    ));
    const svg = container.querySelector("svg")!;
    fireEvent.pointerMove(svg, { clientX: 100, clientY: 50 });
    expect(captured!.hoverX()).not.toBeNull();
  });
});

describe("Chart — plot-area clip-path", () => {
  it("renders a <defs><clipPath> with a plot-area-sized rect", () => {
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]} />
    ));
    const clipPath = container.querySelector("svg > defs > clipPath");
    expect(clipPath).toBeTruthy();
    expect(clipPath!.getAttribute("id")).toMatch(/^sui-chart-clip-/);
    const rect = clipPath!.querySelector("rect");
    expect(rect).toBeTruthy();
    // innerWidth = 200 - 36 - 8 = 156; innerHeight = 100 - 8 - 28 = 64.
    expect(parseFloat(rect!.getAttribute("width")!)).toBeCloseTo(156, 1);
    expect(parseFloat(rect!.getAttribute("height")!)).toBeCloseTo(64, 1);
  });

  it("PointSeries wraps points in a clip-path group", () => {
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        <PointSeries data={[{ x: 1, y: 10 }]} x={(d) => d.x} y={(d) => d.y} />
      </Chart>
    ));
    const group = container.querySelector(".sui-chart__points");
    expect(group).toBeTruthy();
    expect(group!.getAttribute("clip-path")).toMatch(/^url\(#sui-chart-clip-/);
  });

  it("exposes a stable clipPathUrl via context that matches the defs id", () => {
    let captured: ReturnType<typeof useChart> | null = null;
    const Probe: Component = () => {
      captured = useChart();
      return null;
    };
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        <Probe />
      </Chart>
    ));
    const id = container.querySelector("svg > defs > clipPath")!.getAttribute("id")!;
    expect(captured!.clipPathUrl()).toBe(`url(#${id})`);
  });
});

describe("XAxis time-aware formatting", () => {
  it("uses scale.tickFormat() when scale is a TimeScale", () => {
    const t0 = new Date(2026, 0, 1);
    const t1 = new Date(2026, 0, 2);
    const { container } = render(() => (
      <Chart width={400} height={100} xDomain={[t0, t1]} yDomain={[0, 100]}>
        <XAxis tickCount={3} />
      </Chart>
    ));
    const labels = Array.from(container.querySelectorAll(".sui-chart__axis-label"));
    const anyTimeFormatted = labels.some((el) => /[:a-zA-Z/]/.test(el.textContent ?? ""));
    expect(anyTimeFormatted).toBe(true);
  });
});
