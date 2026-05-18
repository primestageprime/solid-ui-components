import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { createSignal, type Component, type JSX } from "solid-js";
import { Chart } from "./Chart";
import { PinMarkers, type Pin } from "./PinMarkers";
import { WarningPinMarkers } from "./PinMarkers.variants";
import { useChart } from "./context";
import type { Id } from "./slot-types";

const wrapper = (slot: () => JSX.Element) =>
  render(() => (
    <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
      {slot()}
    </Chart>
  ));

describe("PinMarkers — render", () => {
  it("renders one glyph group per pin", () => {
    const pins: Pin[] = [
      { id: "a", x: 2, descriptor: { color: "var(--sui-warning)", shape: "pin" } },
      { id: "b", x: 5, descriptor: { color: "var(--sui-accent)", shape: "circle" } },
    ];
    const { container } = wrapper(() => <PinMarkers data={pins} />);
    expect(container.querySelectorAll(".sui-chart__pin-marker").length).toBe(2);
  });
});

describe("PinMarkers — reactivity", () => {
  it("toggling selectedId flips data-selected on the matched pin", () => {
    const [sel, setSel] = createSignal<Id | null>(null);
    const pins: Pin[] = [{ id: "a", x: 5, descriptor: { color: "#fff", shape: "pin" } }];
    const { container } = wrapper(() => <PinMarkers data={pins} selectedId={sel()} />);
    expect(container.querySelector(".sui-chart__pin-marker")!.getAttribute("data-selected")).toBeNull();
    setSel("a");
    expect(container.querySelector(".sui-chart__pin-marker")!.getAttribute("data-selected")).toBe("true");
  });
});

describe("PinMarkers — callbacks", () => {
  it("onClick fires on pointerdown with pin + event", () => {
    const pin: Pin = { id: "a", x: 5, descriptor: { color: "#fff", shape: "pin" } };
    const calls: Pin[] = [];
    const { container } = wrapper(() => <PinMarkers data={[pin]} onClick={(p) => calls.push(p)} />);
    fireEvent.pointerDown(container.querySelector(".sui-chart__pin-marker")!);
    expect(calls).toEqual([pin]);
  });

  it("onDelete fires on dblclick", () => {
    const pin: Pin = { id: "a", x: 5, descriptor: { color: "#fff", shape: "pin" } };
    const calls: Pin[] = [];
    const { container } = wrapper(() => <PinMarkers data={[pin]} onDelete={(p) => calls.push(p)} />);
    fireEvent.dblClick(container.querySelector(".sui-chart__pin-marker")!);
    expect(calls).toEqual([pin]);
  });

  it("onHover fires with pin on pointerenter and null on pointerleave", () => {
    const pin: Pin = { id: "a", x: 5, descriptor: { color: "#fff", shape: "pin" } };
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
    const pin: Pin = { id: "a", x: 5, descriptor: { color: "#fff", shape: "pin" } };
    const calls: Array<{ id: Id; selected: boolean; cx: number; cy: number }> = [];
    const { container } = wrapper(() => (
      <PinMarkers
        data={[pin]}
        selectedId={sel()}
        renderPin={(p, rctx) => {
          calls.push({ id: p.id, selected: rctx.selected, cx: rctx.cx, cy: rctx.cy });
          return <text class="ghost-pin-test-sentinel" x={rctx.cx} y={rctx.cy}>X</text>;
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
    setSel("a");
    const last = calls[calls.length - 1];
    expect(last.selected).toBe(true);
  });
});

describe("PinMarkers — emphasizeNearestX", () => {
  const pins: Pin[] = [
    { id: "a", x: 1, descriptor: { color: "#fff", shape: "pin" } },
    { id: "b", x: 5, descriptor: { color: "#fff", shape: "pin" } },
    { id: "c", x: 9, descriptor: { color: "#fff", shape: "pin" } },
  ];

  it("does not emphasize when hoverX is null", () => {
    const { container } = wrapper(() => (
      <PinMarkers data={pins} emphasizeNearestX />
    ));
    expect(container.querySelectorAll('[data-emphasized="true"]').length).toBe(0);
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

describe("PinMarkers — curried variants", () => {
  it("WarningPinMarkers attaches the warning class", () => {
    const pin: Pin = { id: "a", x: 5, descriptor: { color: "var(--sui-warning)", shape: "pin" } };
    const { container } = wrapper(() => <WarningPinMarkers data={[pin]} />);
    expect(container.querySelector(".sui-chart__pin-markers--warning")).toBeTruthy();
  });
});
