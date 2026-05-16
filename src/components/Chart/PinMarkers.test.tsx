import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { createSignal, type JSX } from "solid-js";
import { Chart } from "./Chart";
import { PinMarkers, type Pin } from "./PinMarkers";
import { WarningPinMarkers } from "./PinMarkers.variants";
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
});

describe("PinMarkers — curried variants", () => {
  it("WarningPinMarkers attaches the warning class", () => {
    const pin: Pin = { id: "a", x: 5, descriptor: { color: "var(--sui-warning)", shape: "pin" } };
    const { container } = wrapper(() => <WarningPinMarkers data={[pin]} />);
    expect(container.querySelector(".sui-chart__pin-markers--warning")).toBeTruthy();
  });
});
