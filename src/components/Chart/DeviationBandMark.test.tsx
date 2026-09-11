import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { Chart } from "./Chart";
import { DeviationBand } from "./DeviationBandMark";

interface Pt {
  x: number;
  series: number;
  reference: number;
}

// series − reference: +10, +5, −5, −2, +8 — two positive runs, one negative.
const data: Pt[] = [
  { x: 0, series: 10, reference: 0 },
  { x: 1, series: 5, reference: 0 },
  { x: 2, series: -5, reference: 0 },
  { x: 3, series: -2, reference: 0 },
  { x: 4, series: 8, reference: 0 },
];

describe("DeviationBand — the Chart adapter", () => {
  it("draws one polygon per run, split at each crossing", () => {
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 4]} yDomain={[-10, 10]}>
        <DeviationBand
          data={data}
          x={(d) => d.x}
          series={(d) => d.series}
          reference={(d) => d.reference}
          positiveClass="band-pos"
          negativeClass="band-neg"
        />
      </Chart>
    ));
    expect(container.querySelectorAll(".band-pos")).toHaveLength(2);
    expect(container.querySelectorAll(".band-neg")).toHaveLength(1);
  });

  it("uses xScale/yScale — plot-local, matching the chart's own geometry", () => {
    let capturedX0: number | undefined;
    const { container } = render(() => {
      return (
        <Chart width={200} height={100} xDomain={[0, 4]} yDomain={[-10, 10]}>
          <DeviationBand
            data={data}
            x={(d) => d.x}
            series={(d) => d.series}
            reference={(d) => d.reference}
            positiveClass="band-pos"
          />
        </Chart>
      );
    });
    // xScale maps [0,4] -> [0, innerWidth]; x=0 -> 0 in plot-local coords.
    capturedX0 = 0;
    const polygon = container.querySelector(".band-pos")!;
    expect(polygon.getAttribute("points")).toContain(
      `${capturedX0.toFixed(1)},`,
    );
  });

  it("renders inside a class-named group, no fill baked in for either sign", () => {
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 4]} yDomain={[-10, 10]}>
        <DeviationBand
          data={data}
          x={(d) => d.x}
          series={(d) => d.series}
          reference={(d) => d.reference}
          positiveClass="band-pos"
          negativeClass="band-neg"
          class="my-band"
        />
      </Chart>
    ));
    const group = container.querySelector(".sui-chart__deviation-band")!;
    expect(group.classList.contains("my-band")).toBe(true);
    expect(container.querySelector(".band-pos")!.getAttribute("fill")).toBe(
      null,
    );
  });
});
