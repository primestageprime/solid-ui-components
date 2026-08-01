import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { ScenarioGlyph } from "./ScenarioGlyph";

describe("ScenarioGlyph", () => {
  it("wraps a ShapeGlyph in an inline <svg>", () => {
    const { container } = render(() => (
      <ScenarioGlyph color="#a855f7" shape="diamond" filled />
    ));
    const svg = container.querySelector("svg")!;
    expect(svg).toBeTruthy();
    expect(container.querySelector("path")).toBeTruthy();
  });

  it("renders filled (colour as fill) when filled", () => {
    const { container } = render(() => (
      <ScenarioGlyph color="#a855f7" shape="square" filled />
    ));
    expect(container.querySelector("path")!.getAttribute("fill")).toBe(
      "#a855f7",
    );
  });

  it("renders hollow (no fill, colour as stroke) when not filled", () => {
    const { container } = render(() => (
      <ScenarioGlyph color="#22d3ee" shape="chevron" />
    ));
    const path = container.querySelector("path")!;
    expect(path.getAttribute("fill")).toBe("none");
    expect(path.getAttribute("stroke")).toBe("#22d3ee");
  });

  it("supports circle (baseline) as a hollow ring", () => {
    const { container } = render(() => (
      <ScenarioGlyph color="#3b82f6" shape="circle" />
    ));
    const circle = container.querySelector("circle")!;
    expect(circle.getAttribute("fill")).toBe("none");
    expect(circle.getAttribute("stroke")).toBe("#3b82f6");
  });

  it("passes through the title for hover identification", () => {
    const { container } = render(() => (
      <ScenarioGlyph color="#ec4899" shape="pentagon" title="Scenario X" />
    ));
    expect(container.querySelector("span")!.getAttribute("title")).toBe(
      "Scenario X",
    );
  });
});
