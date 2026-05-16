import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { ShapeGlyph, type Descriptor } from "./shapes";

const renderSvg = (descriptor: Descriptor, x = 10, y = 10) =>
  render(() => (
    <svg>
      <ShapeGlyph descriptor={descriptor} cx={x} cy={y} />
    </svg>
  ));

describe("ShapeGlyph", () => {
  it("renders a <circle> for shape='circle'", () => {
    const { container } = renderSvg({ color: "var(--sui-accent)", shape: "circle" });
    expect(container.querySelector("circle")).toBeTruthy();
  });

  it("renders a <path> for shape='chevron'", () => {
    const { container } = renderSvg({ color: "var(--sui-accent)", shape: "chevron" });
    expect(container.querySelector("path")).toBeTruthy();
  });

  it("renders a <path> for shape='pin'", () => {
    const { container } = renderSvg({ color: "var(--sui-warning)", shape: "pin" });
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
    const { container } = renderSvg({ color: "var(--sui-warning)", shape: "circle" });
    expect(container.querySelector("circle")!.getAttribute("fill")).toBe("var(--sui-warning)");
  });

  it("anchors shape at (cx, cy) via translate", () => {
    const { container } = renderSvg({ color: "#fff", shape: "chevron" }, 42, 17);
    const g = container.querySelector("g")!;
    expect(g.getAttribute("transform")).toContain("translate(42");
    expect(g.getAttribute("transform")).toContain("17");
  });
});
