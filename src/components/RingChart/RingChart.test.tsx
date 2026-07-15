import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { RingChart } from "./index";

describe("RingChart", () => {
  it("labels the svg and renders the center label/sublabel", () => {
    const { container, getByText } = render(() => (
      <RingChart
        segments={[{ value: 3, color: "#0f0" }]}
        total={4}
        label="75%"
        sublabel="done"
      />
    ));
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("aria-label")).toBe("75%");
    expect(getByText("75%")).toBeTruthy();
    expect(getByText("done")).toBeTruthy();
  });

  it("draws the background track plus one arc circle per segment", () => {
    const { container } = render(() => (
      <RingChart
        segments={[
          { value: 1, color: "#f00" },
          { value: 1, color: "#00f" },
        ]}
        total={4}
        label="2/4"
      />
    ));
    // background track + 2 segment arcs
    expect(container.querySelectorAll("circle").length).toBe(3);
  });

  it("renders only the background track when total is zero", () => {
    const { container } = render(() => (
      <RingChart segments={[{ value: 5, color: "#f00" }]} total={0} label="0" />
    ));
    expect(container.querySelectorAll("circle").length).toBe(1);
  });

  it("caps a segment's arc so it can't exceed the full circumference", () => {
    const size = 100;
    const circumference = 2 * Math.PI * ((size - 10) / 2);
    const { container } = render(() => (
      <RingChart
        segments={[{ value: 10, color: "#f00" }]}
        total={4}
        label="over"
        size={size}
      />
    ));
    const arc = container.querySelectorAll("circle")[1]!;
    const [dashLen] = arc
      .getAttribute("stroke-dasharray")!
      .split(" ")
      .map(Number);
    expect(dashLen).toBeCloseTo(circumference, 5);
  });

  it("honors a custom size on the svg", () => {
    const { container } = render(() => (
      <RingChart
        segments={[{ value: 1, color: "#f00" }]}
        total={2}
        label="x"
        size={200}
      />
    ));
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("width")).toBe("200");
    expect(svg.getAttribute("height")).toBe("200");
  });
});
