import { describe, it, expect, afterEach } from "vitest";
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

// jsdom lays nothing out, so offsetWidth is always 0 and the tooltip could
// never overflow anything. Stub the prototype getter to give the component a
// rendered width to react to; the x-placement maths is what is under test.
let restoreWidth: (() => void) | null = null;
const stubTooltipWidth = (px: number) => {
  const original = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    "offsetWidth",
  );
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
    configurable: true,
    get: () => px,
  });
  restoreWidth = () => {
    if (original) {
      Object.defineProperty(HTMLElement.prototype, "offsetWidth", original);
    } else {
      delete (HTMLElement.prototype as { offsetWidth?: number }).offsetWidth;
    }
  };
};

afterEach(() => {
  restoreWidth?.();
  restoreWidth = null;
});

describe("ChartTooltip — x-placement", () => {
  // width=200, default margin left=36 right=8 → innerWidth=156, so xScale
  // maps xDomain [0,10] → [0,156] and the plot's right edge sits at x=192.
  type Pt = { x: number };

  const tooltipLeft = (): number => {
    const el = document.querySelector(
      ".sui-chart__tooltip",
    ) as HTMLElement | null;
    if (!el) throw new Error("tooltip element not mounted");
    return parseFloat(el.style.left);
  };

  const hoverAt = (
    dataX: number,
    point: number,
    opts: { maxWidth?: number; chartWidth?: number } = {},
  ) => {
    let setHover: ((x: number | null) => void) | null = null;
    const Probe: Component = () => {
      const ctx = useChart();
      setHover = ctx.setHoverX;
      return null;
    };
    render(() => (
      <Chart
        width={opts.chartWidth ?? 200}
        height={100}
        xDomain={[0, 10]}
        yDomain={[0, 100]}
      >
        <Probe />
        <ChartTooltip<Pt>
          data={[{ x: point }]}
          x={(d) => d.x}
          maxWidth={opts.maxWidth}
        >
          {(p) => <span>{String(p.x)}</span>}
        </ChartTooltip>
      </Chart>
    ));
    setHover!(dataX);
  };

  it("sits to the right of the anchor when it fits", () => {
    // anchor = 0 + 36 = 36 → preferred 48; 48 + 120 = 168 ≤ 200.
    stubTooltipWidth(120);
    hoverAt(0, 0);
    expect(tooltipLeft()).toBeCloseTo(48, 1);
  });

  it("flips to the left of the anchor rather than overflowing the right edge", () => {
    // anchor = 156 + 36 = 192 → preferred 204, which would overflow a 200px
    // chart by any width at all. Flipped: 192 - 12 - 120 = 60.
    stubTooltipWidth(120);
    hoverAt(10, 10);
    expect(tooltipLeft()).toBeCloseTo(60, 1);
    expect(tooltipLeft() + 120).toBeLessThanOrEqual(200);
  });

  it("keeps wrapping content inside the chart in the right-most fifth of the plot", () => {
    // The regression `maxWidth` would otherwise cause: 320px of wrapped
    // content anchored at 90% of the plot width. Chart 600 wide → innerWidth
    // 556, anchor = 500.4 + 36 = 536.4. Right of it needs 868 > 600, so it
    // flips to 536.4 - 12 - 320 = 204.4 and the right edge lands at 524.4.
    stubTooltipWidth(320);
    hoverAt(9, 9, { maxWidth: 320, chartWidth: 600 });
    expect(tooltipLeft()).toBeCloseTo(204.4, 1);
    expect(tooltipLeft()).toBeGreaterThanOrEqual(0);
    expect(tooltipLeft() + 320).toBeLessThanOrEqual(600);
  });

  it("pins to the left edge when the tooltip is wider than the chart", () => {
    stubTooltipWidth(300);
    hoverAt(10, 10);
    expect(tooltipLeft()).toBeCloseTo(0, 1);
  });
});

describe("ChartTooltip — wrapping", () => {
  type Pt = { x: number };

  const renderTooltip = (maxWidth?: number) => {
    let setHover: ((x: number | null) => void) | null = null;
    const Probe: Component = () => {
      const ctx = useChart();
      setHover = ctx.setHoverX;
      return null;
    };
    render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        <Probe />
        <ChartTooltip<Pt> data={[{ x: 5 }]} x={(d) => d.x} maxWidth={maxWidth}>
          {(p) => <span>{String(p.x)}</span>}
        </ChartTooltip>
      </Chart>
    ));
    setHover!(5);
    return document.querySelector(".sui-chart__tooltip") as HTMLElement;
  };

  it("stays a single nowrap line by default", () => {
    const el = renderTooltip();
    expect(el.classList.contains("sui-chart__tooltip--wrap")).toBe(false);
    expect(el.style.getPropertyValue("--sui-chart-tooltip-max-width")).toBe("");
  });

  it("opts into wrapping with a width cap when maxWidth is set", () => {
    const el = renderTooltip(320);
    expect(el.classList.contains("sui-chart__tooltip--wrap")).toBe(true);
    expect(el.style.getPropertyValue("--sui-chart-tooltip-max-width")).toBe(
      "320px",
    );
  });
});

describe("ChartTooltip — empty series", () => {
  type Pt = { x: number };

  const renderEmpty = (withFallback: boolean) => {
    let setHover: ((x: number | null) => void) | null = null;
    const Probe: Component = () => {
      const ctx = useChart();
      setHover = ctx.setHoverX;
      return null;
    };
    render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        <Probe />
        <ChartTooltip<Pt>
          data={[]}
          x={(d) => d.x}
          fallback={
            withFallback
              ? (dataX) => <span class="sui-fallback">{String(dataX)}</span>
              : undefined
          }
        >
          {(p) => <span>{String(p.x)}</span>}
        </ChartTooltip>
      </Chart>
    ));
    setHover!(5);
  };

  it("renders nothing without a fallback", () => {
    renderEmpty(false);
    expect(document.querySelector(".sui-chart__tooltip")).toBeNull();
  });

  it("renders the fallback anchored to the hovered x", () => {
    renderEmpty(true);
    const el = document.querySelector(".sui-chart__tooltip") as HTMLElement;
    expect(el).toBeTruthy();
    expect(el.textContent).toBe("5");
    // hoverX=5 → xScale 78 → anchor 78 + 36 = 114 → +12 offset.
    expect(parseFloat(el.style.left)).toBeCloseTo(126, 1);
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
