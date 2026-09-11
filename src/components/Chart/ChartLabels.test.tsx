import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { Chart } from "./Chart";
import { ChartLabels } from "./ChartLabels";

interface Pt {
  t: number;
  v: number;
}

const data: Pt[] = [
  { t: 0, v: 10 },
  { t: 1, v: 90 },
];

describe("ChartLabels", () => {
  it("draws one <text> per item, plot-local, via the shared placeLabels core", () => {
    const { container } = render(() => (
      <Chart
        width={200}
        height={100}
        xDomain={[0, 1]}
        yDomain={[0, 100]}
        margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
      >
        <ChartLabels
          data={data}
          id={(d) => `pt-${d.t}`}
          text={(d) => `${d.v}`}
          width={() => 20}
          x={(d) => d.t}
          y={(d) => d.v}
        />
      </Chart>
    ));
    const texts = container.querySelectorAll(".sui-chart__label");
    expect(texts.length).toBe(2);
    expect(container.querySelector(".sui-chart__labels")).not.toBeNull();
  });
});
