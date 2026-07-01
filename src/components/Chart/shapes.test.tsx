import { describe, it, expect, vi } from "vitest";
import { render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { ShapeGlyph, type Descriptor, type Shape } from "./shapes";

const renderSvg = (descriptor: Descriptor, x = 10, y = 10) =>
  render(() => (
    <svg role="img" aria-label="test">
      <ShapeGlyph descriptor={descriptor} cx={x} cy={y} />
    </svg>
  ));

describe("ShapeGlyph", () => {
  it("renders a <circle> for shape='circle'", () => {
    const { container } = renderSvg({
      color: "var(--sui-accent)",
      shape: "circle",
    });
    expect(container.querySelector("circle")).toBeTruthy();
  });

  it("renders a <path> for shape='chevron'", () => {
    const { container } = renderSvg({
      color: "var(--sui-accent)",
      shape: "chevron",
    });
    expect(container.querySelector("path")).toBeTruthy();
  });

  it("renders a <path> for shape='chevron-down' (apex at bottom)", () => {
    const { container } = renderSvg({
      color: "var(--sui-warning)",
      shape: "chevron-down",
    });
    const path = container.querySelector("path")!;
    expect(path).toBeTruthy();
    // Filled triangle pointing down: apex at +y (bottom), base at -y (top).
    expect(path.getAttribute("d")).toContain("L0,6");
  });

  it("renders chevron + chevron-down as filled triangles (fill = descriptor.color)", () => {
    const up = renderSvg({ color: "var(--sui-accent)", shape: "chevron" });
    const upPath = up.container.querySelector("path")!;
    expect(upPath.getAttribute("fill")).toBe("var(--sui-accent)");
    expect(upPath.getAttribute("d")).toContain("L0,-6");

    const down = renderSvg({
      color: "var(--sui-warning)",
      shape: "chevron-down",
    });
    const downPath = down.container.querySelector("path")!;
    expect(downPath.getAttribute("fill")).toBe("var(--sui-warning)");
  });

  it("renders a <path> for shape='pin'", () => {
    const { container } = renderSvg({
      color: "var(--sui-warning)",
      shape: "pin",
    });
    expect(container.querySelector("path")).toBeTruthy();
  });

  it("renders a <path> for a custom-path descriptor", () => {
    const { container } = renderSvg({
      color: "#fff",
      shape: { path: "M-4,-4 L4,-4 L4,4 L-4,4 Z", viewBox: [8, 8] },
    });
    expect(container.querySelector("path")).toBeTruthy();
  });

  it("applies descriptor.color as fill", () => {
    const { container } = renderSvg({
      color: "var(--sui-warning)",
      shape: "circle",
    });
    expect(container.querySelector("circle")!.getAttribute("fill")).toBe(
      "var(--sui-warning)",
    );
  });

  it("anchors shape at (cx, cy) via translate", () => {
    const { container } = renderSvg(
      { color: "#fff", shape: "chevron" },
      42,
      17,
    );
    const g = container.querySelector("g")!;
    expect(g.getAttribute("transform")).toContain("translate(42");
    expect(g.getAttribute("transform")).toContain("17");
  });

  it("reactively re-renders when descriptor.shape swaps from circle to custom path", () => {
    const [shape, setShape] = createSignal<Shape>("circle");
    const descriptor = (): Descriptor => ({
      color: "var(--sui-accent)",
      shape: shape(),
    });
    const { container } = render(() => (
      <svg role="img" aria-label="test">
        <ShapeGlyph descriptor={descriptor()} cx={10} cy={10} />
      </svg>
    ));
    expect(container.querySelector("circle")).toBeTruthy();
    expect(container.querySelector("path")).toBeFalsy();

    setShape({ path: "M-4,-4 L4,-4 L4,4 L-4,4 Z", viewBox: [8, 8] });
    expect(container.querySelector("circle")).toBeFalsy();
    expect(container.querySelector("path")).toBeTruthy();
  });

  it("warns and renders nothing for an unknown string shape", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { container } = renderSvg({
      color: "#fff",
      shape: "square" as unknown as Shape,
    });
    expect(container.querySelector("circle")).toBeNull();
    expect(container.querySelector("path")).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("reactively updates path data when custom shape swaps to a different custom shape", () => {
    const firstPath = "M-4,-4 L4,-4 L4,4 L-4,4 Z";
    const secondPath = "M-2,-2 L2,-2 L2,2 L-2,2 Z";
    const [shape, setShape] = createSignal<Shape>({
      path: firstPath,
      viewBox: [8, 8],
    });
    const descriptor = (): Descriptor => ({
      color: "var(--sui-accent)",
      shape: shape(),
    });
    const { container } = render(() => (
      <svg role="img" aria-label="test">
        <ShapeGlyph descriptor={descriptor()} cx={10} cy={10} />
      </svg>
    ));
    expect(container.querySelector("path")!.getAttribute("d")).toBe(firstPath);

    setShape({ path: secondPath, viewBox: [4, 4] });
    expect(container.querySelector("path")!.getAttribute("d")).toBe(secondPath);
  });
});
