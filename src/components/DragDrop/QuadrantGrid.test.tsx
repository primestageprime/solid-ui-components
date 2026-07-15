import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { QuadrantGrid, type QuadrantGridProps } from "./QuadrantGrid";

const cells: QuadrantGridProps["cells"] = [
  { key: "tl", label: "Top Left", color: "#f00", children: <span>a</span> },
  { key: "tr", label: "Top Right", color: "#0f0", children: <span>b</span> },
  { key: "bl", label: "Bottom Left", color: "#00f", children: <span>c</span> },
  { key: "br", label: "Bottom Right", color: "#ff0", children: <span>d</span> },
];

describe("QuadrantGrid", () => {
  it("renders exactly four labeled cells", () => {
    const { container } = render(() => <QuadrantGrid cells={cells} />);
    const root = container.querySelector(".sui-quadrant-grid")!;
    expect(root.querySelectorAll(".sui-quadrant-grid__cell").length).toBe(4);
    expect(root.querySelectorAll(".sui-quadrant-grid__label").length).toBe(4);
  });

  it("renders each cell's label and content", () => {
    const { getByText } = render(() => <QuadrantGrid cells={cells} />);
    expect(getByText("Top Left")).toBeTruthy();
    expect(getByText("Bottom Right")).toBeTruthy();
    expect(getByText("a")).toBeTruthy();
  });

  it("sets the accent color CSS variable per cell", () => {
    const { container } = render(() => <QuadrantGrid cells={cells} />);
    const first = container.querySelector(
      ".sui-quadrant-grid__cell",
    ) as HTMLElement;
    expect(first.style.getPropertyValue("--sui-quadrant-color")).toBe("#f00");
  });

  it("merges a caller class and forwards extra div attributes", () => {
    const { container } = render(() => (
      <QuadrantGrid cells={cells} class="my-grid" data-testid="qg" />
    ));
    const root = container.querySelector(".sui-quadrant-grid") as HTMLElement;
    expect(root.classList.contains("my-grid")).toBe(true);
    expect(root.getAttribute("data-testid")).toBe("qg");
  });
});
