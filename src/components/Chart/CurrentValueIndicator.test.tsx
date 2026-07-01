import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { createSignal, type JSX } from "solid-js";
import { Chart } from "./Chart";
import {
  CurrentValueIndicator,
  type CurrentValue,
} from "./CurrentValueIndicator";
import { AccentCurrentValueIndicator } from "./CurrentValueIndicator.variants";

const wrapper = (slot: () => JSX.Element) =>
  render(() => (
    <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
      {slot()}
    </Chart>
  ));

describe("CurrentValueIndicator — render", () => {
  it("renders nothing when point is null", () => {
    const { container } = wrapper(() => <CurrentValueIndicator point={null} />);
    expect(container.querySelector(".sui-chart__current-value")).toBeNull();
  });

  it("renders a dot at the point position when set", () => {
    const point: CurrentValue = { x: 5, y: 50 };
    const { container } = wrapper(() => (
      <CurrentValueIndicator point={point} />
    ));
    expect(container.querySelector(".sui-chart__current-value")).toBeTruthy();
  });

  it("renders an optional label", () => {
    const point: CurrentValue = { x: 5, y: 50, label: "now" };
    const { container } = wrapper(() => (
      <CurrentValueIndicator point={point} />
    ));
    expect(
      container.querySelector(".sui-chart__current-value-label")!.textContent,
    ).toBe("now");
  });
});

describe("CurrentValueIndicator — reactivity", () => {
  it("dot moves when point.x updates", () => {
    const [pt, setPt] = createSignal<CurrentValue | null>({ x: 2, y: 50 });
    const { container } = wrapper(() => <CurrentValueIndicator point={pt()} />);
    const cx1 = container.querySelector("circle")!.getAttribute("cx");
    setPt({ x: 8, y: 50 });
    const cx2 = container.querySelector("circle")!.getAttribute("cx");
    expect(cx1).not.toBe(cx2);
  });

  it("disappears when point is set to null", () => {
    const [pt, setPt] = createSignal<CurrentValue | null>({ x: 2, y: 50 });
    const { container } = wrapper(() => <CurrentValueIndicator point={pt()} />);
    expect(container.querySelector(".sui-chart__current-value")).toBeTruthy();
    setPt(null);
    expect(container.querySelector(".sui-chart__current-value")).toBeNull();
  });
});

describe("CurrentValueIndicator — labelOffset", () => {
  it("shifts the label x/y by the configured offset", () => {
    const point: CurrentValue = { x: 5, y: 50, label: "now" };
    const { container } = wrapper(() => (
      <CurrentValueIndicator point={point} labelOffset={{ x: 20, y: -12 }} />
    ));
    const circle = container.querySelector("circle")!;
    const text = container.querySelector(".sui-chart__current-value-label")!;
    const cx = parseFloat(circle.getAttribute("cx")!);
    const cy = parseFloat(circle.getAttribute("cy")!);
    expect(parseFloat(text.getAttribute("x")!)).toBeCloseTo(cx + 20, 5);
    expect(parseFloat(text.getAttribute("y")!)).toBeCloseTo(cy - 12, 5);
  });
});

describe("CurrentValueIndicator — curried variants", () => {
  it("AccentCurrentValueIndicator uses accent color + radius 5", () => {
    const point: CurrentValue = { x: 5, y: 50 };
    const { container } = wrapper(() => (
      <AccentCurrentValueIndicator point={point} />
    ));
    const circle = container.querySelector("circle")!;
    expect(circle.getAttribute("r")).toBe("5");
    expect(circle.getAttribute("fill")).toBe("var(--sui-accent)");
  });
});
