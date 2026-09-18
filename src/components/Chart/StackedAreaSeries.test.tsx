import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { Chart } from "./Chart";
import { StackedAreaSeries } from "./StackedAreaSeries";
import type { StackedSeries } from "./stackedArea";

const SERIES: readonly StackedSeries[] = [
  {
    id: "a",
    label: "A",
    points: [
      { at: 0, value: 12 },
      { at: 3, value: 18 },
    ],
  },
  { id: "b", points: [{ at: 0, value: 8 }] },
  {
    id: "c",
    points: [
      { at: 0, value: 6 },
      { at: 5, value: 0 },
    ],
  },
];

const mount = (curve?: "smoothStep" | "linear") =>
  render(() => (
    <Chart width={400} height={200} xDomain={[0, 12]} yDomain={[0, 50]}>
      <StackedAreaSeries series={SERIES} curve={curve} />
    </Chart>
  ));

describe("StackedAreaSeries — the Chart adapter", () => {
  it("draws one band and one hairline edge per series", () => {
    const { container } = mount();
    expect(
      container.querySelectorAll(".sui-chart__stacked-area-band"),
    ).toHaveLength(3);
    expect(
      container.querySelectorAll(".sui-chart__stacked-area-edge"),
    ).toHaveLength(3);
  });

  it("takes one series-palette slot per band, in stacking order", () => {
    const { container } = mount();
    const bands = container.querySelectorAll(".sui-chart__stacked-area-band");
    expect(bands[0].getAttribute("fill")).toBe(
      "var(--sui-series-1, currentColor)",
    );
    expect(bands[1].getAttribute("fill")).toBe(
      "var(--sui-series-2, currentColor)",
    );
    expect(bands[2].getAttribute("fill")).toBe(
      "var(--sui-series-3, currentColor)",
    );
  });

  it("clips to the plot and emits NaN-free paths", () => {
    const { container } = mount();
    const group = container.querySelector(".sui-chart__stacked-area");
    expect(group?.getAttribute("clip-path")).toMatch(/^url\(#/);
    for (const path of container.querySelectorAll("path")) {
      expect(path.getAttribute("d") ?? "").not.toContain("NaN");
    }
  });

  it("curves by default and steps square under curve='linear'", () => {
    const smooth = mount();
    const first = smooth.container.querySelector(
      ".sui-chart__stacked-area-band",
    );
    expect(first?.getAttribute("d")).toContain("C ");
    const linear = mount("linear");
    const firstLinear = linear.container.querySelector(
      ".sui-chart__stacked-area-band",
    );
    expect(firstLinear?.getAttribute("d")).not.toContain("C ");
  });

  it("draws nothing for an empty stack", () => {
    const { container } = render(() => (
      <Chart width={400} height={200} xDomain={[0, 12]} yDomain={[0, 50]}>
        <StackedAreaSeries series={[]} />
      </Chart>
    ));
    expect(
      container.querySelectorAll(".sui-chart__stacked-area-band"),
    ).toHaveLength(0);
  });
});
