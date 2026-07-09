import { describe, it, expect, vi } from "vitest";
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
        <Chart
          width={200}
          height={100}
          // @ts-expect-error — testing the runtime guard
          xDomain={[0, new Date(2026, 0, 1)]}
          yDomain={[0, 100]}
        />
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

describe("Chart — drag off the plot edge (pointer capture + clamp)", () => {
  // jsdom has no real PointerEvent constructor, so @solidjs/testing-library's
  // fireEvent.pointer* drops clientX/pointerId. Dispatch a MouseEvent with a
  // pointer* type instead — it carries clientX and still triggers the
  // onPointer* listeners. (pointerId is absent → reads as undefined, which is
  // fine: the capture methods below are mocked.)
  const firePointer = (
    svg: SVGSVGElement,
    type: "pointerdown" | "pointermove" | "pointerup" | "pointerleave",
    clientX: number,
  ) => {
    svg.dispatchEvent(
      new MouseEvent(type, { clientX, clientY: 50, bubbles: true }),
    );
  };

  // jsdom implements none of the pointer-capture methods, so install spies.
  // Returning true from hasPointerCapture models "the drag owns the pointer",
  // which is what routes a release outside the svg back to this element.
  const installCaptureSpies = (svg: SVGSVGElement) => {
    const setPointerCapture = vi.fn();
    const releasePointerCapture = vi.fn();
    Object.assign(svg, {
      setPointerCapture,
      releasePointerCapture,
      hasPointerCapture: () => true,
    });
    return { setPointerCapture, releasePointerCapture };
  };

  it("engages pointer capture on pointerdown so a release outside the svg still ends the drag", () => {
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]} />
    ));
    const svg = container.querySelector("svg")! as unknown as SVGSVGElement;
    const { setPointerCapture, releasePointerCapture } =
      installCaptureSpies(svg);

    firePointer(svg, "pointerdown", 40);
    expect(setPointerCapture).toHaveBeenCalled();

    firePointer(svg, "pointerup", 40);
    expect(releasePointerCapture).toHaveBeenCalled();
  });

  it("clamps the drag range to the plot edge when the pointer moves past it", () => {
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
    const svg = container.querySelector("svg")! as unknown as SVGSVGElement;
    installCaptureSpies(svg);

    // Anchor at the left edge (clientX=36 → px=0 → x=0), then drag far past
    // the right edge. innerWidth=156 → clamped px=156 → invert → domain max=10.
    firePointer(svg, "pointerdown", 36);
    firePointer(svg, "pointermove", 1000);
    const range = captured!.drag.range();
    expect(range).not.toBeNull();
    expect(range!.start).toBeCloseTo(0, 6);
    expect(range!.end).toBeCloseTo(10, 6);
  });

  it("does not cancel an active captured drag when the pointer leaves the svg", () => {
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
    const svg = container.querySelector("svg")! as unknown as SVGSVGElement;
    installCaptureSpies(svg);

    // Anchor at the left edge, drag past the right edge, then let the pointer
    // leave the element and release — the drag must still commit at the edge.
    firePointer(svg, "pointerdown", 36);
    firePointer(svg, "pointermove", 1000);
    firePointer(svg, "pointerleave", 1000);
    firePointer(svg, "pointerup", 1000);
    const committed = captured!.drag.committed();
    expect(committed).not.toBeNull();
    expect(committed!.end).toBeCloseTo(10, 6);
  });
});

describe("Chart — visible title", () => {
  it("renders a visible HTML <div class='sui-chart__title'> SIBLING of the svg when title is set", () => {
    const { container } = render(() => (
      <Chart
        width={200}
        height={100}
        xDomain={[0, 10]}
        yDomain={[0, 100]}
        title="MSI_F2"
      />
    ));
    const titleEl = container.querySelector(".sui-chart__title");
    expect(titleEl).toBeTruthy();
    // HTML element (not SVG text) — lives outside the <svg>.
    expect(titleEl!.tagName.toLowerCase()).toBe("div");
    expect(titleEl!.textContent).toBe("MSI_F2");
    // Sibling of svg, child of .sui-chart wrapper.
    expect(titleEl!.parentElement?.classList.contains("sui-chart")).toBe(true);
    expect(titleEl!.nextElementSibling?.tagName.toLowerCase()).toBe("svg");
  });

  it("surfaces the title as the SVG <title> aria element for screen readers", () => {
    const { container } = render(() => (
      <Chart
        width={200}
        height={100}
        xDomain={[0, 10]}
        yDomain={[0, 100]}
        title="MSI_F2"
      />
    ));
    const ariaTitle = container.querySelector("svg > title");
    expect(ariaTitle).toBeTruthy();
    expect(ariaTitle!.textContent).toBe("MSI_F2");
  });

  it("omits the visible title element when title prop is absent", () => {
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]} />
    ));
    expect(container.querySelector(".sui-chart__title")).toBeNull();
  });

  it("does NOT bump margin.top when title is set (HTML title lives above the SVG)", () => {
    // innerHeight = height(100) - margin.top(8 default) - margin.bottom(28) = 64
    // Plot clip-rect height = innerHeight + 24 = 88.
    const { container } = render(() => (
      <Chart
        width={200}
        height={100}
        xDomain={[0, 10]}
        yDomain={[0, 100]}
        title="MSI_F2"
      />
    ));
    const rect = container.querySelector("svg > defs > clipPath rect")!;
    expect(parseFloat(rect.getAttribute("height")!)).toBeCloseTo(88, 1);
  });

  it("respects an explicit margin.top override even when title is set", () => {
    // Caller asked for top=4. innerHeight = 100 - 4 - 28 = 68; clip-rect height = 92.
    const { container } = render(() => (
      <Chart
        width={200}
        height={100}
        xDomain={[0, 10]}
        yDomain={[0, 100]}
        title="MSI_F2"
        margin={{ top: 4 }}
      />
    ));
    const rect = container.querySelector("svg > defs > clipPath rect")!;
    expect(parseFloat(rect.getAttribute("height")!)).toBeCloseTo(92, 1);
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
    const id = container
      .querySelector("svg > defs > clipPath")!
      .getAttribute("id")!;
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
    const labels = Array.from(
      container.querySelectorAll(".sui-chart__axis-label"),
    );
    const anyTimeFormatted = labels.some((el) =>
      /[:a-zA-Z/]/.test(el.textContent ?? ""),
    );
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

describe("XAxis rotateLabels", () => {
  it("flips text-anchor to 'end' when rotateLabels is true", () => {
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        <XAxis rotateLabels />
      </Chart>
    ));
    const labels = container.querySelectorAll(".sui-chart__axis-label");
    expect(labels.length).toBeGreaterThan(0);
    labels.forEach((el) => {
      expect(el.getAttribute("text-anchor")).toBe("end");
    });
  });

  it("applies a translate(6, labelOffset) rotate(-45) transform when rotateLabels is true", () => {
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        <XAxis rotateLabels />
      </Chart>
    ));
    const labels = container.querySelectorAll(".sui-chart__axis-label");
    expect(labels[0]?.getAttribute("transform")).toBe(
      "translate(6, 16) rotate(-45)",
    );
  });

  it("axis-title y = labelOffset + 44 (not 18) under rotateLabels", () => {
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        <XAxis label="Time" rotateLabels labelOffset={20} />
      </Chart>
    ));
    const title = container.querySelector(".sui-chart__axis-title");
    expect(title).toBeTruthy();
    // labelOffset (20) + 44 = 64 — clears long diagonal labels.
    expect(parseFloat(title!.getAttribute("y")!)).toBeCloseTo(64, 1);
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
    expect(container.querySelectorAll('[data-emphasized="true"]').length).toBe(
      1,
    );
    setHover!(null);
    expect(container.querySelectorAll('[data-emphasized="true"]').length).toBe(
      0,
    );
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
  it("renders a clipPath for the bottom-margin strip", () => {
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]} />
    ));
    const clipPaths = container.querySelectorAll("svg > defs > clipPath");
    // plot + axis-strip + annotation-lane = 3 (lane collapses to 0 height
    // when annotationLaneHeight is unset, but the clipPath element is
    // always emitted for context stability).
    expect(clipPaths.length).toBe(3);
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

describe("Chart — annotation lane", () => {
  it("annotationLaneHeight context defaults to 0 when prop is omitted", () => {
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
    expect(captured!.annotationLaneHeight()).toBe(0);
  });

  it("annotationLaneHeight context returns the configured value", () => {
    let captured: ReturnType<typeof useChart> | null = null;
    const Probe: Component = () => {
      captured = useChart();
      return null;
    };
    render(() => (
      <Chart
        width={200}
        height={100}
        xDomain={[0, 10]}
        yDomain={[0, 100]}
        annotationLaneHeight={32}
        margin={{ top: 40 }}
      >
        <Probe />
      </Chart>
    ));
    expect(captured!.annotationLaneHeight()).toBe(32);
  });

  it("annotation-lane clipPath rect lives in negative-y above y=0", () => {
    const { container } = render(() => (
      <Chart
        width={200}
        height={100}
        xDomain={[0, 10]}
        yDomain={[0, 100]}
        annotationLaneHeight={32}
        margin={{ top: 40 }}
      />
    ));
    const laneClip = Array.from(
      container.querySelectorAll("svg > defs > clipPath"),
    ).find((el) =>
      /^sui-chart-annotation-lane-clip-/.test(el.getAttribute("id") ?? ""),
    );
    expect(laneClip).toBeTruthy();
    const rect = laneClip!.querySelector("rect")!;
    expect(parseFloat(rect.getAttribute("x")!)).toBeCloseTo(0, 1);
    expect(parseFloat(rect.getAttribute("y")!)).toBeCloseTo(-32, 1);
    // innerWidth = 200 - 36 - 8 = 156
    expect(parseFloat(rect.getAttribute("width")!)).toBeCloseTo(156, 1);
    expect(parseFloat(rect.getAttribute("height")!)).toBeCloseTo(32, 1);
  });

  it("exposes clip.annotationLanePathUrl via context that matches the defs id", () => {
    let captured: ReturnType<typeof useChart> | null = null;
    const Probe: Component = () => {
      captured = useChart();
      return null;
    };
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
      </Chart>
    ));
    const laneClip = Array.from(
      container.querySelectorAll("svg > defs > clipPath"),
    ).find((el) =>
      /^sui-chart-annotation-lane-clip-/.test(el.getAttribute("id") ?? ""),
    )!;
    expect(captured!.clip.annotationLanePathUrl()).toBe(
      `url(#${laneClip.getAttribute("id")})`,
    );
  });
});
