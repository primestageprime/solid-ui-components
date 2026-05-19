import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { Chart } from "./Chart";
import { XAxis, YAxis } from "./Axes";
import { PointSeries } from "./Series";
import { PinMarkers, type Pin } from "./PinMarkers";
import { useChart } from "./context";
import { slotId } from "./slot-types";
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

  it("exposes drag.range via context, initially null", () => {
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
    expect(captured!.drag.range()).toBeNull();
  });

  it("drag.setRange mutates the context signal", () => {
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
    captured!.drag.setRange({ start: 1, end: 4 });
    expect(captured!.drag.range()).toEqual({ start: 1, end: 4 });
    captured!.drag.setRange(null);
    expect(captured!.drag.range()).toBeNull();
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
    // Plot clip is vertically inflated by 12px each side so edge-centered
    // glyphs (e.g., chevrons at the domain min/max) render fully.
    expect(parseFloat(rect!.getAttribute("x")!)).toBeCloseTo(0, 1);
    expect(parseFloat(rect!.getAttribute("y")!)).toBeCloseTo(-12, 1);
    expect(parseFloat(rect!.getAttribute("width")!)).toBeCloseTo(156, 1);
    expect(parseFloat(rect!.getAttribute("height")!)).toBeCloseTo(64 + 24, 1);
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

  it("exposes a stable clip.plotPathUrl via context that matches the defs id", () => {
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
    expect(captured!.clip.plotPathUrl()).toBe(`url(#${id})`);
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

describe("XAxis labelOffset", () => {
  it("XAxis labelOffset prop pushes tick labels down", () => {
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        <XAxis labelOffset={28} />
      </Chart>
    ));
    const labels = container.querySelectorAll(".sui-chart__axis-label");
    // Every label sits at the custom labelOffset.
    expect(labels[0]?.getAttribute("y")).toBe("28");
  });

  it("XAxis label y defaults to 16 when labelOffset is omitted (back-compat)", () => {
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        <XAxis />
      </Chart>
    ));
    const labels = container.querySelectorAll(".sui-chart__axis-label");
    expect(labels[0]?.getAttribute("y")).toBe("16");
  });

  it("XAxis tickOffset pushes tick marks down without moving the axis line", () => {
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        <XAxis tickOffset={14} />
      </Chart>
    ));
    const ticks = container.querySelectorAll(".sui-chart__axis-tick");
    expect(ticks.length).toBeGreaterThan(0);
    // First tick mark should start at y=14 (the tickOffset)
    expect(ticks[0]?.getAttribute("y1")).toBe("14");
    expect(ticks[0]?.getAttribute("y2")).toBe("18");
  });

  it("XAxis renders an optional title from `label` prop", () => {
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        <XAxis label="Time" />
      </Chart>
    ));
    const title = container.querySelector(".sui-chart__axis-title");
    expect(title).toBeTruthy();
    expect(title!.textContent).toBe("Time");
  });

  it("YAxis renders an optional title from `label` prop", () => {
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        <YAxis label="Temperature" />
      </Chart>
    ));
    const title = container.querySelector(".sui-chart__axis-title--y");
    expect(title).toBeTruthy();
    expect(title!.textContent).toBe("Temperature");
  });
});

describe("XAxis / YAxis hideLine", () => {
  it("XAxis renders its baseline by default", () => {
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        <XAxis />
      </Chart>
    ));
    expect(
      container.querySelector(".sui-chart__axis--x .sui-chart__axis-line"),
    ).toBeTruthy();
  });

  it("XAxis hides its baseline when hideLine is true", () => {
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        <XAxis hideLine />
      </Chart>
    ));
    expect(
      container.querySelector(".sui-chart__axis--x .sui-chart__axis-line"),
    ).toBeNull();
  });

  it("YAxis renders its baseline by default", () => {
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        <YAxis />
      </Chart>
    ));
    expect(
      container.querySelector(".sui-chart__axis--y .sui-chart__axis-line"),
    ).toBeTruthy();
  });

  it("YAxis hides its baseline when hideLine is true", () => {
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        <YAxis hideLine />
      </Chart>
    ));
    expect(
      container.querySelector(".sui-chart__axis--y .sui-chart__axis-line"),
    ).toBeNull();
  });
});

describe("Axes — no self-clip", () => {
  it("axis groups do NOT set a clip-path (docs: axes are not clipped to the plot area)", () => {
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        <XAxis />
        <YAxis />
      </Chart>
    ));
    const axes = Array.from(container.querySelectorAll(".sui-chart__axis"));
    expect(axes.length).toBeGreaterThan(0);
    axes.forEach((g) => {
      expect(g.getAttribute("clip-path")).toBeNull();
    });
  });
});

describe("Chart — global nearest emphasis coordinator", () => {
  it("only one slot wins across the chart when multiple participate", () => {
    // PointSeries data: x=0 (far from hoverX=8)
    // PinMarkers data:  x=8 (matches hoverX exactly)
    // Expected: only the pin gets data-emphasized; the point does not.
    let setHover: ((x: number | null) => void) | null = null;
    const Probe: Component = () => {
      const ctx = useChart();
      setHover = ctx.setHoverX;
      return null;
    };
    const pins: Pin[] = [
      { id: slotId("p"), x: 8, descriptor: { color: "#fff", shape: "pin" } },
    ];
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        <Probe />
        <PointSeries
          data={[{ x: 0, y: 10 }]}
          x={(d) => d.x}
          y={(d) => d.y}
          radius={3}
          emphasizeNearestX
        />
        <PinMarkers data={pins} emphasizeNearestX />
      </Chart>
    ));
    setHover!(8);
    // Only the pin (closer to hoverX) is emphasized.
    const emphasizedCircles = container.querySelectorAll(
      '.sui-chart__points circle[data-emphasized="true"]',
    );
    const emphasizedPins = container.querySelectorAll(
      '.sui-chart__pin-marker[data-emphasized="true"]',
    );
    expect(emphasizedCircles.length).toBe(0);
    expect(emphasizedPins.length).toBe(1);
    expect(emphasizedPins[0].getAttribute("data-id")).toBe("p");
  });

  it("flipping distances reverses the winner", () => {
    // PointSeries datum at x=2; PinMarkers pin at x=8. hoverX=3 → point wins.
    let setHover: ((x: number | null) => void) | null = null;
    const Probe: Component = () => {
      const ctx = useChart();
      setHover = ctx.setHoverX;
      return null;
    };
    const pins: Pin[] = [
      { id: slotId("p"), x: 8, descriptor: { color: "#fff", shape: "pin" } },
    ];
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        <Probe />
        <PointSeries
          data={[{ x: 2, y: 10 }]}
          x={(d) => d.x}
          y={(d) => d.y}
          radius={3}
          emphasizeNearestX
        />
        <PinMarkers data={pins} emphasizeNearestX />
      </Chart>
    ));
    setHover!(3);
    expect(
      container.querySelectorAll(
        '.sui-chart__points circle[data-emphasized="true"]',
      ).length,
    ).toBe(1);
    expect(
      container.querySelectorAll(
        '.sui-chart__pin-marker[data-emphasized="true"]',
      ).length,
    ).toBe(0);
    // hoverX=7 → pin (at x=8) wins.
    setHover!(7);
    expect(
      container.querySelectorAll(
        '.sui-chart__points circle[data-emphasized="true"]',
      ).length,
    ).toBe(0);
    expect(
      container.querySelectorAll(
        '.sui-chart__pin-marker[data-emphasized="true"]',
      ).length,
    ).toBe(1);
  });

  it("clearing hoverX withdraws all candidates so no slot is emphasized", () => {
    let setHover: ((x: number | null) => void) | null = null;
    const Probe: Component = () => {
      const ctx = useChart();
      setHover = ctx.setHoverX;
      return null;
    };
    const pins: Pin[] = [
      { id: slotId("p"), x: 8, descriptor: { color: "#fff", shape: "pin" } },
    ];
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        <Probe />
        <PointSeries
          data={[{ x: 0, y: 10 }]}
          x={(d) => d.x}
          y={(d) => d.y}
          radius={3}
          emphasizeNearestX
        />
        <PinMarkers data={pins} emphasizeNearestX />
      </Chart>
    ));
    setHover!(5);
    expect(
      container.querySelectorAll('[data-emphasized="true"]').length,
    ).toBe(1);
    setHover!(null);
    expect(
      container.querySelectorAll('[data-emphasized="true"]').length,
    ).toBe(0);
  });

  it("exposes emphasis.winnerId via context (null when no candidates)", () => {
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
    const a = slotId("slot-a");
    const b = slotId("slot-b");
    expect(captured!.emphasis.winnerId()).toBeNull();
    captured!.emphasis.report(a, 5);
    captured!.emphasis.report(b, 2);
    expect(captured!.emphasis.winnerId()).toBe(b);
    captured!.emphasis.clear(b);
    expect(captured!.emphasis.winnerId()).toBe(a);
    captured!.emphasis.clear(a);
    expect(captured!.emphasis.winnerId()).toBeNull();
  });
});

describe("Chart — axis-strip clip-path", () => {
  it("renders a second clipPath for the bottom-margin strip", () => {
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]} />
    ));
    const clipPaths = container.querySelectorAll("svg > defs > clipPath");
    expect(clipPaths.length).toBe(2);
    const stripClip = Array.from(clipPaths).find((el) =>
      /^sui-chart-axis-strip-clip-/.test(el.getAttribute("id") ?? ""),
    );
    expect(stripClip).toBeTruthy();
    const rect = stripClip!.querySelector("rect")!;
    // innerWidth = 200 - 36 - 8 = 156; innerHeight = 100 - 8 - 28 = 64;
    // margin.bottom = 28.
    expect(parseFloat(rect.getAttribute("x")!)).toBeCloseTo(0, 1);
    expect(parseFloat(rect.getAttribute("y")!)).toBeCloseTo(64, 1);
    expect(parseFloat(rect.getAttribute("width")!)).toBeCloseTo(156, 1);
    expect(parseFloat(rect.getAttribute("height")!)).toBeCloseTo(28, 1);
  });

  it("exposes a stable clip.axisStripPathUrl via context that matches the defs id", () => {
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
    const stripClip = Array.from(
      container.querySelectorAll("svg > defs > clipPath"),
    ).find((el) =>
      /^sui-chart-axis-strip-clip-/.test(el.getAttribute("id") ?? ""),
    )!;
    expect(captured!.clip.axisStripPathUrl()).toBe(
      `url(#${stripClip.getAttribute("id")})`,
    );
  });
});
