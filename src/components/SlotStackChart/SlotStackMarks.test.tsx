import { describe, expect, it } from "vitest";
import { render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { Chart } from "../Chart";
import { SlotStackMarks } from "./SlotStackMarks";
import type { SlotStackSeries } from "./slotStackGeometry";

const SERIES: readonly SlotStackSeries[] = [
  {
    id: "a",
    label: "A",
    slots: [{ period: 0, expected: 40, filled: 28, unfilled: 12, overflow: 0 }],
  },
  {
    id: "b",
    label: "B",
    slots: [{ period: 0, expected: 20, filled: 20, unfilled: 0, overflow: 10 }],
  },
];

/* A 200 x 200 plot with no inset: period 0 spans the width, 1 value = 2px. */
const NO_MARGIN = { top: 0, right: 0, bottom: 0, left: 0 };
const BASE = { paintId: "t", periods: [0], totalLabel: "Total", band: 0.5, gap: 2, title: () => "part" };

describe("SlotStackMarks", () => {
  it("draws the layout it is handed by the chart's scales, in whole pixels", () => {
    const { container } = render(() => (
      <Chart width={200} height={200} xDomain={[-0.5, 0.5]} yDomain={[0, 100]} margin={NO_MARGIN}>
        <SlotStackMarks series={SERIES} {...BASE} />
      </Chart>
    ));
    const rects = [...container.querySelectorAll(".sui-slot-stack__fill")].map((r) =>
      ["x", "y", "width", "height"].map((a) => Number(r.getAttribute(a))),
    );
    expect(rects).toEqual([
      [50, 144, 100, 56], // A filled: 28 of 100 from the floor
      [50, 80, 100, 40], // B filled: sits on A's slot (top 120), 20 tall
      [50, 60, 100, 20], // B overflow: straight out of B's fill
    ]);
    // A's slot ends 2px short of B's floor: ground, not a stroke.
    const dashed = container.querySelector(".sui-slot-stack__dashed");
    expect(dashed?.getAttribute("d")).toBe("M50.75 144V122.75H149.25V144");
  });

  it("draws NO border on the overflow: two paths per chart here, both round the container", () => {
    const { container } = render(() => (
      <Chart width={200} height={200} xDomain={[-0.5, 0.5]} yDomain={[0, 100]} margin={NO_MARGIN}>
        <SlotStackMarks series={SERIES} {...BASE} />
      </Chart>
    ));
    const paths = [...container.querySelectorAll(".sui-slot-stack path")];
    expect(paths.map((p) => p.getAttribute("class"))).toEqual([
      "sui-slot-stack__solid", // A's fill
      "sui-slot-stack__dashed", // A's unfilled rest
      "sui-slot-stack__solid", // B's fill, open at the top where the stripes begin
    ]);
    expect(paths[2].getAttribute("d")).toBe("M50.75 80V119.25H149.25V80");
    expect(container.querySelector(".sui-slot-stack__heavy")).toBeNull();
    // No path reaches above B's container top (y 80) into the overflow (60..80).
    const overflow = container.querySelector('[data-part="overflow"]');
    expect(overflow?.getAttribute("stroke")).toBeNull();
  });

  it("paints each series from its place, or from the caller's paint", () => {
    const { container } = render(() => (
      <Chart width={200} height={200} xDomain={[-0.5, 0.5]} yDomain={[0, 100]} margin={NO_MARGIN}>
        <SlotStackMarks series={SERIES} {...BASE} paintOfSeries={(i) => `ink-${i}`} />
      </Chart>
    ));
    const fills = [...container.querySelectorAll(".sui-slot-stack__fill")].map((r) => r.getAttribute("fill"));
    expect(fills).toEqual(["ink-0", "ink-1", "url(#t-hatch-1)"]);
    expect(container.querySelector('pattern[id="t-hatch-1"] rect')?.getAttribute("fill")).toBe("ink-1");
    expect(container.querySelector(".sui-slot-stack__dashed")?.getAttribute("stroke")).toBe("ink-0");
  });

  it("with totals, draws the column's one slot in neutral ink, never a series colour", () => {
    const { container } = render(() => (
      <Chart width={200} height={200} xDomain={[-0.5, 0.5]} yDomain={[0, 100]} margin={NO_MARGIN}>
        <SlotStackMarks
          series={SERIES}
          totals={[{ period: 0, expected: 60, filled: 48, unfilled: 12, overflow: 0 }]}
          expand="never"
          {...BASE}
        />
      </Chart>
    ));
    const slots = [...container.querySelectorAll(".sui-slot-stack__slot")];
    expect(slots.map((s) => s.getAttribute("data-slot"))).toEqual(["total"]);
    expect(container.querySelector(".sui-slot-stack__fill")?.getAttribute("fill")).toBe(
      "var(--sui-text-secondary)",
    );
    expect(container.querySelector(".sui-slot-stack__dashed")?.getAttribute("stroke")).toBe(
      "var(--sui-text-secondary)",
    );
  });

  it("follows the chart when its size changes", () => {
    const [width, setWidth] = createSignal(200);
    const { container } = render(() => (
      <Chart width={width()} height={200} xDomain={[-0.5, 0.5]} yDomain={[0, 100]} margin={NO_MARGIN}>
        <SlotStackMarks series={SERIES} {...BASE} />
      </Chart>
    ));
    const widthOf = () => container.querySelector(".sui-slot-stack__fill")?.getAttribute("width");
    expect(widthOf()).toBe("100");
    setWidth(400);
    expect(widthOf()).toBe("200");
  });
});
