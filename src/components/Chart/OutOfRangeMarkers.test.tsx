import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { Chart } from "./Chart";
import { OutOfRangeMarkers } from "./OutOfRangeMarkers";

const mount = (points: { x: number; y: number }[]) =>
  render(() => (
    <Chart width={236} height={100} xDomain={[0, 100]} yDomain={[0, 10]} margin={{ top: 0, right: 0, bottom: 0, left: 36 }}>
      <OutOfRangeMarkers points={points} format={(v) => `$${v}`} tone="danger" />
    </Chart>
  ));

describe("OutOfRangeMarkers", () => {
  it("draws nothing while every value is on the plot", () => {
    const { container } = mount([{ x: 10, y: 2 }, { x: 50, y: 10 }]);
    expect(container.querySelectorAll(".sui-chart__out-of-range-edge")).toHaveLength(0);
  });

  it("marks the peak past the top and the trough past the bottom, with the value", () => {
    const { container } = mount([
      { x: 10, y: 12 },
      { x: 20, y: 15 },
      { x: 90, y: -3 },
    ]);
    const edges = [...container.querySelectorAll<SVGGElement>(".sui-chart__out-of-range-edge")];
    expect(edges.map((e) => e.dataset.edge)).toEqual(["top", "bottom"]);
    expect(container.querySelector<SVGGElement>(".sui-chart__out-of-range")!.dataset.tone).toBe("danger");
    expect(edges[0]!.querySelector("text")!.textContent).toBe("$15");
    expect(edges[1]!.querySelector("text")!.textContent).toBe("$-3");
    // The label is held inside the plot, never past its right edge.
    const labelX = Number(edges[1]!.querySelector("text")!.getAttribute("x"));
    expect(labelX).toBeLessThanOrEqual(200 - 28);
  });
});
