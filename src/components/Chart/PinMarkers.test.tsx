import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { createSignal, type Component, type JSX } from "solid-js";
import { Chart } from "./Chart";
import { PinMarkers, type Pin } from "./PinMarkers";
import { CompactPinMarkers, WarningPinMarkers } from "./PinMarkers.variants";
import { useChart } from "./context";
import { slotId, type Id } from "./slot-types";

const wrapper = (slot: () => JSX.Element) =>
  render(() => (
    <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
      {slot()}
    </Chart>
  ));

describe("PinMarkers — render", () => {
  it("renders one glyph group per pin", () => {
    const pins: Pin[] = [
      {
        id: slotId("a"),
        x: 2,
        descriptor: { color: "var(--sui-warning)", shape: "pin" },
      },
      {
        id: slotId("b"),
        x: 5,
        descriptor: { color: "var(--sui-accent)", shape: "circle" },
      },
    ];
    const { container } = wrapper(() => <PinMarkers data={pins} />);
    expect(container.querySelectorAll(".sui-chart__pin-marker").length).toBe(2);
  });
});

describe("PinMarkers — reactivity", () => {
  it("toggling selectedId flips data-selected on the matched pin", () => {
    const [sel, setSel] = createSignal<Id | null>(null);
    const pins: Pin[] = [
      { id: slotId("a"), x: 5, descriptor: { color: "#fff", shape: "pin" } },
    ];
    const { container } = wrapper(() => (
      <PinMarkers data={pins} selectedId={sel()} />
    ));
    expect(
      container
        .querySelector(".sui-chart__pin-marker")!
        .getAttribute("data-selected"),
    ).toBeNull();
    setSel(slotId("a"));
    expect(
      container
        .querySelector(".sui-chart__pin-marker")!
        .getAttribute("data-selected"),
    ).toBe("true");
  });
});

describe("PinMarkers — callbacks", () => {
  it("onClick fires on pointerdown with pin + event", () => {
    const pin: Pin = {
      id: slotId("a"),
      x: 5,
      descriptor: { color: "#fff", shape: "pin" },
    };
    const calls: Pin[] = [];
    const { container } = wrapper(() => (
      <PinMarkers data={[pin]} onClick={(p) => calls.push(p)} />
    ));
    fireEvent.pointerDown(container.querySelector(".sui-chart__pin-marker")!);
    expect(calls).toEqual([pin]);
  });

  it("onDelete fires on dblclick", () => {
    const pin: Pin = {
      id: slotId("a"),
      x: 5,
      descriptor: { color: "#fff", shape: "pin" },
    };
    const calls: Pin[] = [];
    const { container } = wrapper(() => (
      <PinMarkers data={[pin]} onDelete={(p) => calls.push(p)} />
    ));
    fireEvent.dblClick(container.querySelector(".sui-chart__pin-marker")!);
    expect(calls).toEqual([pin]);
  });

  it("onHover fires with pin on pointerenter and null on pointerleave", () => {
    const pin: Pin = {
      id: slotId("a"),
      x: 5,
      descriptor: { color: "#fff", shape: "pin" },
    };
    const calls: Array<Pin | null> = [];
    const { container } = wrapper(() => (
      <PinMarkers data={[pin]} onHover={(p) => calls.push(p)} />
    ));
    const marker = container.querySelector(".sui-chart__pin-marker")!;
    fireEvent.pointerEnter(marker);
    fireEvent.pointerLeave(marker);
    expect(calls).toEqual([pin, null]);
  });
});

describe("PinMarkers — renderPin escape hatch", () => {
  it("invokes renderPin with pin + render context including selection state", () => {
    const [sel, setSel] = createSignal<Id | null>(null);
    const pin: Pin = {
      id: slotId("a"),
      x: 5,
      descriptor: { color: "#fff", shape: "pin" },
    };
    const calls: Array<{ id: Id; selected: boolean; cx: number; cy: number }> =
      [];
    const { container } = wrapper(() => (
      <PinMarkers
        data={[pin]}
        selectedId={sel()}
        renderPin={(p, rctx) => {
          calls.push({
            id: p.id,
            selected: rctx.selected,
            cx: rctx.cx,
            cy: rctx.cy,
          });
          return (
            <text class="ghost-pin-test-sentinel" x={rctx.cx} y={rctx.cy}>
              X
            </text>
          );
        }}
      />
    ));
    // Sentinel rendered (escape hatch path active).
    expect(container.querySelector(".ghost-pin-test-sentinel")).toBeTruthy();
    // Initial render captured selected=false; cx/cy are numeric.
    expect(calls.length).toBeGreaterThan(0);
    const first = calls[0];
    expect(first.id).toBe("a");
    expect(first.selected).toBe(false);
    expect(typeof first.cx).toBe("number");
    expect(typeof first.cy).toBe("number");
    // Selection change re-invokes render fn with selected=true.
    setSel(slotId("a"));
    const last = calls[calls.length - 1];
    expect(last.selected).toBe(true);
  });
});

describe("PinMarkers — emphasizeNearestX", () => {
  const pins: Pin[] = [
    { id: slotId("a"), x: 1, descriptor: { color: "#fff", shape: "pin" } },
    { id: slotId("b"), x: 5, descriptor: { color: "#fff", shape: "pin" } },
    { id: slotId("c"), x: 9, descriptor: { color: "#fff", shape: "pin" } },
  ];

  it("does not emphasize when hoverX is null", () => {
    const { container } = wrapper(() => (
      <PinMarkers data={pins} emphasizeNearestX />
    ));
    expect(container.querySelectorAll('[data-emphasized="true"]').length).toBe(
      0,
    );
  });

  it("flags exactly one pin as emphasized when hoverX is set", () => {
    let setHover: ((x: number | null) => void) | null = null;
    const Probe: Component = () => {
      const ctx = useChart();
      setHover = ctx.setHoverX;
      return null;
    };
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        <Probe />
        <PinMarkers data={pins} emphasizeNearestX />
      </Chart>
    ));
    // hoverX=4 → pin "b" at x=5 is nearest.
    setHover!(4);
    const flagged = container.querySelectorAll<SVGGElement>(
      '.sui-chart__pin-marker[data-emphasized="true"]',
    );
    expect(flagged.length).toBe(1);
    expect(flagged[0].getAttribute("data-id")).toBe("b");
    // hoverX=9.4 → pin "c" at x=9 is nearest.
    setHover!(9.4);
    const flagged2 = container.querySelectorAll<SVGGElement>(
      '.sui-chart__pin-marker[data-emphasized="true"]',
    );
    expect(flagged2.length).toBe(1);
    expect(flagged2[0].getAttribute("data-id")).toBe("c");
  });
});

describe("PinMarkers — emphasizedIds", () => {
  it("flips data-emphasized on matching pins", () => {
    const pins: Pin[] = [
      { id: slotId("a"), x: 2, descriptor: { color: "#fff", shape: "pin" } },
      { id: slotId("b"), x: 5, descriptor: { color: "#fff", shape: "pin" } },
    ];
    const { container } = wrapper(() => (
      <PinMarkers data={pins} emphasizedIds={new Set([slotId("a")])} />
    ));
    const markers = container.querySelectorAll<SVGGElement>(
      ".sui-chart__pin-marker",
    );
    expect(markers[0]?.getAttribute("data-emphasized")).toBe("true");
    expect(markers[1]?.getAttribute("data-emphasized")).toBeNull();
  });

  it("emphasizedIds is independent of selectedId (both can apply)", () => {
    const pin: Pin = {
      id: slotId("a"),
      x: 5,
      descriptor: { color: "#fff", shape: "pin" },
    };
    const { container } = wrapper(() => (
      <PinMarkers
        data={[pin]}
        selectedId={slotId("a")}
        emphasizedIds={new Set([slotId("a")])}
      />
    ));
    const marker = container.querySelector(".sui-chart__pin-marker")!;
    expect(marker.getAttribute("data-selected")).toBe("true");
    expect(marker.getAttribute("data-emphasized")).toBe("true");
  });

  it("does NOT scale the glyph (external emphasis is attribute-only)", () => {
    // External emphasis must mirror HighlightSegments: flip the data
    // attribute, leave geometry alone. Only `emphasizeNearestX` is
    // allowed to grow the glyph.
    const pin: Pin = {
      id: slotId("a"),
      x: 5,
      descriptor: { color: "#fff", shape: "circle", size: 10 },
    };
    const baseline = wrapper(() => <PinMarkers data={[pin]} />);
    const emphasized = wrapper(() => (
      <PinMarkers data={[pin]} emphasizedIds={new Set([slotId("a")])} />
    ));
    const radius = (root: ParentNode): number =>
      parseFloat(
        root.querySelector(".sui-chart__pin-marker circle")!.getAttribute("r")!,
      );
    expect(radius(emphasized.container)).toBeCloseTo(
      radius(baseline.container),
      5,
    );
  });
});

describe("PinMarkers — lane prop", () => {
  it("defaults to plot-data lane: group uses plot clip-path", () => {
    const pin: Pin = {
      id: slotId("a"),
      x: 5,
      descriptor: { color: "#fff", shape: "pin" },
    };
    const { container } = wrapper(() => <PinMarkers data={[pin]} />);
    const group = container.querySelector(".sui-chart__pin-markers")!;
    expect(group.getAttribute("data-lane")).toBe("plot-data");
    expect(group.getAttribute("clip-path")).toMatch(/^url\(#sui-chart-clip-/);
  });

  it("lane='annotation' uses the annotation-lane clip-path", () => {
    const pin: Pin = {
      id: slotId("a"),
      x: 5,
      descriptor: { color: "#fff", shape: "pin" },
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
        <PinMarkers data={[pin]} lane="annotation" />
      </Chart>
    ));
    const group = container.querySelector(".sui-chart__pin-markers")!;
    expect(group.getAttribute("data-lane")).toBe("annotation");
    expect(group.getAttribute("clip-path")).toMatch(
      /^url\(#sui-chart-annotation-lane-clip-/,
    );
  });

  // ShapeGlyph positions via `<g transform="translate(cx, cy)">` so we
  // parse the y component out of the transform string.
  const cyFromTransform = (el: Element): number => {
    const m = el
      .getAttribute("transform")!
      .match(/translate\(\s*[\d.-]+\s*,\s*(-?[\d.]+)\s*\)/);
    return Number(m![1]);
  };

  it("lane='annotation' centers glyph at -annotationLaneHeight/2 (ignores pin.y)", () => {
    const pin: Pin = {
      id: slotId("a"),
      x: 5,
      y: 50,
      descriptor: { color: "#fff", shape: "circle" },
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
        <PinMarkers data={[pin]} lane="annotation" />
      </Chart>
    ));
    const glyph = container.querySelector(".sui-chart__pin-marker > g")!;
    // -32 / 2 = -16
    expect(cyFromTransform(glyph)).toBeCloseTo(-16, 1);
  });

  it("lane='annotation' falls back to cy=0 when chart has no lane configured", () => {
    // When a consumer asks for annotation lane but the Chart didn't reserve
    // one, glyphs collapse to y=0 (plot-top) — safe degrade, no off-canvas.
    const pin: Pin = {
      id: slotId("a"),
      x: 5,
      y: 50,
      descriptor: { color: "#fff", shape: "circle" },
    };
    const { container } = wrapper(() => (
      <PinMarkers data={[pin]} lane="annotation" />
    ));
    const glyph = container.querySelector(".sui-chart__pin-marker > g")!;
    expect(cyFromTransform(glyph)).toBeCloseTo(0, 1);
  });

  it("default (plot-data) lane still resolves pin.y through the y-scale", () => {
    // Baseline sanity check that the new prop didn't break the existing
    // y-scale path. innerHeight = 100 - 8 - 28 = 64; y-scale linear over
    // [64, 0]. y=50 with domain [0,100] → 64 * (1 - 50/100) = 32.
    const pin: Pin = {
      id: slotId("a"),
      x: 5,
      y: 50,
      descriptor: { color: "#fff", shape: "circle" },
    };
    const { container } = wrapper(() => <PinMarkers data={[pin]} />);
    const glyph = container.querySelector(".sui-chart__pin-marker > g")!;
    expect(cyFromTransform(glyph)).toBeCloseTo(32, 1);
  });
});

describe("PinMarkers — curried variants", () => {
  it("WarningPinMarkers attaches the warning class", () => {
    const pin: Pin = {
      id: slotId("a"),
      x: 5,
      descriptor: { color: "var(--sui-warning)", shape: "pin" },
    };
    const { container } = wrapper(() => <WarningPinMarkers data={[pin]} />);
    expect(
      container.querySelector(".sui-chart__pin-markers--warning"),
    ).toBeTruthy();
  });

  it("Warning renders a larger glyph than Compact for identical input", () => {
    // Locks variant differentiation: same data must produce a larger glyph
    // under Warning (size=16) than under Compact (size=8). Uses a circle
    // shape so size flows directly to the rendered radius — independent of
    // path scaling. If anyone later swaps the baked `size` defaults this
    // test catches it.
    const pin: Pin = {
      id: slotId("a"),
      x: 5,
      descriptor: { color: "#fff", shape: "circle" },
    };
    const radiusOf = (root: ParentNode): number =>
      parseFloat(
        root.querySelector(".sui-chart__pin-marker circle")!.getAttribute("r")!,
      );
    const warning = wrapper(() => <WarningPinMarkers data={[pin]} />);
    const compact = wrapper(() => <CompactPinMarkers data={[pin]} />);
    expect(radiusOf(warning.container)).toBeGreaterThan(
      radiusOf(compact.container),
    );
  });
});
