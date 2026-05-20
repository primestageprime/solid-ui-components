import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { createSignal, type JSX, type Component } from "solid-js";
import { Chart } from "./Chart";
import { GhostPin } from "./GhostPin";
import { WarningGhostPin } from "./GhostPin.variants";
import { useChart } from "./context";
import type { Descriptor } from "./shapes";

const wrapper = (slot: () => JSX.Element) =>
  render(() => (
    <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
      {slot()}
    </Chart>
  ));

describe("GhostPin — render", () => {
  it("renders nothing when descriptor is null", () => {
    const { container } = wrapper(() => <GhostPin descriptor={null} />);
    expect(container.querySelector(".sui-chart__ghost-pin")).toBeNull();
  });

  it("renders nothing when hoverX is null even with a descriptor", () => {
    const desc: Descriptor = { color: "var(--sui-warning)", shape: "pin" };
    const { container } = wrapper(() => <GhostPin descriptor={desc} />);
    expect(container.querySelector(".sui-chart__ghost-pin")).toBeNull();
  });
});

describe("GhostPin — reactivity", () => {
  it("appears when hoverX is set via setHoverX", () => {
    let setHover: ((x: number | null) => void) | null = null;
    const Probe: Component = () => {
      const ctx = useChart();
      setHover = ctx.setHoverX;
      return null;
    };
    const desc: Descriptor = { color: "#fff", shape: "pin" };
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        <Probe />
        <GhostPin descriptor={desc} />
      </Chart>
    ));
    expect(container.querySelector(".sui-chart__ghost-pin")).toBeNull();
    setHover!(5);
    expect(container.querySelector(".sui-chart__ghost-pin")).toBeTruthy();
  });

  it("hides when descriptor flips to null", () => {
    const [desc, setDesc] = createSignal<Descriptor | null>({ color: "#fff", shape: "pin" });
    let setHover: ((x: number | null) => void) | null = null;
    const Probe: Component = () => {
      const ctx = useChart();
      setHover = ctx.setHoverX;
      return null;
    };
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        <Probe />
        <GhostPin descriptor={desc()} />
      </Chart>
    ));
    setHover!(5);
    expect(container.querySelector(".sui-chart__ghost-pin")).toBeTruthy();
    setDesc(null);
    expect(container.querySelector(".sui-chart__ghost-pin")).toBeNull();
  });
});

describe("GhostPin — pointer-events", () => {
  it("wrapper has pointer-events='none' to avoid intercepting real pin clicks", () => {
    let setHover: ((x: number | null) => void) | null = null;
    const Probe: Component = () => {
      const ctx = useChart();
      setHover = ctx.setHoverX;
      return null;
    };
    const desc: Descriptor = { color: "#fff", shape: "pin" };
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        <Probe />
        <GhostPin descriptor={desc} />
      </Chart>
    ));
    setHover!(5);
    const wrapper = container.querySelector(".sui-chart__ghost-pin")!;
    expect(wrapper.getAttribute("pointer-events")).toBe("none");
  });
});

describe("GhostPin — lane", () => {
  // ShapeGlyph positions via `<g transform="translate(cx, cy)">` so we
  // parse the y component out of the transform string.
  const cyFromTransform = (el: Element): number => {
    const m = el
      .getAttribute("transform")!
      .match(/translate\(\s*[\d.-]+\s*,\s*(-?[\d.]+)\s*\)/);
    return Number(m![1]);
  };

  it("lane='annotation' uses the annotation-lane clip-path", () => {
    let setHover: ((x: number | null) => void) | null = null;
    const Probe: Component = () => {
      const ctx = useChart();
      setHover = ctx.setHoverX;
      return null;
    };
    const desc: Descriptor = { color: "#fff", shape: "pin" };
    const { container } = render(() => (
      <Chart
        width={200}
        height={100}
        xDomain={[0, 10]}
        yDomain={[0, 100]}
        annotationLaneHeight={32}
        margin={{ top: 40 }}
      >
        <Probe />
        <GhostPin descriptor={desc} lane="annotation" />
      </Chart>
    ));
    setHover!(5);
    const group = container.querySelector(".sui-chart__ghost-pin")!;
    expect(group.getAttribute("data-lane")).toBe("annotation");
    expect(group.getAttribute("clip-path")).toMatch(
      /^url\(#sui-chart-annotation-lane-clip-/,
    );
  });

  it("lane='annotation' centers glyph at -annotationLaneHeight/2 (ignores y)", () => {
    let setHover: ((x: number | null) => void) | null = null;
    const Probe: Component = () => {
      const ctx = useChart();
      setHover = ctx.setHoverX;
      return null;
    };
    const desc: Descriptor = { color: "#fff", shape: "circle" };
    const { container } = render(() => (
      <Chart
        width={200}
        height={100}
        xDomain={[0, 10]}
        yDomain={[0, 100]}
        annotationLaneHeight={32}
        margin={{ top: 40 }}
      >
        <Probe />
        <GhostPin descriptor={desc} lane="annotation" y={50} />
      </Chart>
    ));
    setHover!(5);
    const glyph = container.querySelector(".sui-chart__ghost-pin > g")!;
    // -32 / 2 = -16
    expect(cyFromTransform(glyph)).toBeCloseTo(-16, 1);
  });

  it("lane='annotation' falls back to cy=0 when chart has no lane configured", () => {
    let setHover: ((x: number | null) => void) | null = null;
    const Probe: Component = () => {
      const ctx = useChart();
      setHover = ctx.setHoverX;
      return null;
    };
    const desc: Descriptor = { color: "#fff", shape: "circle" };
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        <Probe />
        <GhostPin descriptor={desc} lane="annotation" />
      </Chart>
    ));
    setHover!(5);
    const glyph = container.querySelector(".sui-chart__ghost-pin > g")!;
    expect(cyFromTransform(glyph)).toBeCloseTo(0, 1);
  });

  it("lane='plot-data' (default) uses the plot clip-path", () => {
    let setHover: ((x: number | null) => void) | null = null;
    const Probe: Component = () => {
      const ctx = useChart();
      setHover = ctx.setHoverX;
      return null;
    };
    const desc: Descriptor = { color: "#fff", shape: "pin" };
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        <Probe />
        <GhostPin descriptor={desc} />
      </Chart>
    ));
    setHover!(5);
    const group = container.querySelector(".sui-chart__ghost-pin")!;
    expect(group.getAttribute("data-lane")).toBe("plot-data");
    expect(group.getAttribute("clip-path")).toMatch(/^url\(#sui-chart-clip-/);
  });
});

describe("GhostPin — curried variants", () => {
  it("WarningGhostPin attaches the warning class when visible", () => {
    let setHover: ((x: number | null) => void) | null = null;
    const Probe: Component = () => {
      const ctx = useChart();
      setHover = ctx.setHoverX;
      return null;
    };
    const desc: Descriptor = { color: "var(--sui-warning)", shape: "pin" };
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        <Probe />
        <WarningGhostPin descriptor={desc} />
      </Chart>
    ));
    setHover!(5);
    expect(container.querySelector(".sui-chart__ghost-pin--warning")).toBeTruthy();
  });
});
