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

describe("SlotStackMarks", () => {
  it("draws the layout it is handed by the chart's scales, in whole pixels", () => {
    const { container } = render(() => (
      <Chart width={200} height={200} xDomain={[-0.5, 0.5]} yDomain={[0, 100]} margin={NO_MARGIN}>
        <SlotStackMarks series={SERIES} paintId="t" band={0.5} gap={2} heavy={3} title={() => "part"} />
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
    expect(container.querySelector(".sui-slot-stack__heavy")?.getAttribute("d")).toBe(
      "M51.5 80V61.5H148.5V80",
    );
  });

  it("paints each series from its place, or from the caller's paint", () => {
    const { container } = render(() => (
      <Chart width={200} height={200} xDomain={[-0.5, 0.5]} yDomain={[0, 100]} margin={NO_MARGIN}>
        <SlotStackMarks
          series={SERIES}
          paintId="t"
          band={0.5}
          gap={2}
          heavy={3}
          title={() => "part"}
          paintOfSeries={(i) => `ink-${i}`}
        />
      </Chart>
    ));
    const fills = [...container.querySelectorAll(".sui-slot-stack__fill")].map((r) => r.getAttribute("fill"));
    expect(fills).toEqual(["ink-0", "ink-1", "url(#t-hatch-1)"]);
    expect(container.querySelector('pattern[id="t-hatch-1"] rect')?.getAttribute("fill")).toBe("ink-1");
    expect(container.querySelector(".sui-slot-stack__dashed")?.getAttribute("stroke")).toBe("ink-0");
  });

  it("follows the chart when its size changes", () => {
    const [width, setWidth] = createSignal(200);
    const { container } = render(() => (
      <Chart width={width()} height={200} xDomain={[-0.5, 0.5]} yDomain={[0, 100]} margin={NO_MARGIN}>
        <SlotStackMarks series={SERIES} paintId="t" band={0.5} gap={2} heavy={3} title={() => "part"} />
      </Chart>
    ));
    const widthOf = () => container.querySelector(".sui-slot-stack__fill")?.getAttribute("width");
    expect(widthOf()).toBe("100");
    setWidth(400);
    expect(widthOf()).toBe("200");
  });
});
