import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { ChartCanvasMd, ChartCanvasLg, createChartCanvas } from "./index";

describe("ChartCanvas", () => {
  it("renders a canvas inside the positioned container", () => {
    const { container } = render(() => <ChartCanvasMd />);
    const root = container.firstElementChild! as HTMLElement;
    expect(root.className).toMatch(/sui-chart-canvas/);
    const canvas = root.querySelector("canvas");
    expect(canvas).not.toBeNull();
    expect(canvas!.className).toMatch(/sui-chart-canvas__canvas/);
  });

  it("bakes the variant height as an inline style (Md → 240px, Lg → 300px)", () => {
    const md = render(() => <ChartCanvasMd />);
    expect((md.container.firstElementChild as HTMLElement).style.height).toBe(
      "240px",
    );

    const lg = render(() => <ChartCanvasLg />);
    expect((lg.container.firstElementChild as HTMLElement).style.height).toBe(
      "300px",
    );
  });

  it("forwards the ref to the canvas element", () => {
    let el: HTMLCanvasElement | undefined;
    render(() => <ChartCanvasMd ref={(c) => (el = c)} />);
    expect(el).toBeInstanceOf(HTMLCanvasElement);
  });

  it("renders an overlay slot (children) above the canvas", () => {
    const { getByText, container } = render(() => (
      <ChartCanvasMd>
        <div>no data</div>
      </ChartCanvasMd>
    ));
    expect(getByText("no data")).toBeTruthy();
    // Overlay is a sibling of the canvas inside the same positioned container.
    expect(container.querySelector(".sui-chart-canvas canvas")).not.toBeNull();
  });

  it("createChartCanvas bakes a custom numeric height as px", () => {
    const Custom = createChartCanvas({ height: 175 });
    const { container } = render(() => <Custom />);
    expect((container.firstElementChild as HTMLElement).style.height).toBe(
      "175px",
    );
  });
});
