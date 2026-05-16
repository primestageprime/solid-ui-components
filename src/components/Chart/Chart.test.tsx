import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { Chart } from "./Chart";
import { XAxis } from "./Axes";
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
