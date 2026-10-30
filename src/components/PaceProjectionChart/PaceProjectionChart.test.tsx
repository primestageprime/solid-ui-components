import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { PaceProjectionChart, createPaceProjectionChart } from ".";

const series = [
  {
    id: "a",
    label: "Ann",
    color: "#c96442",
    initials: "AN",
    points: [
      { x: 0, y: 0 },
      { x: 10, y: 6 },
    ],
    finishX: 30,
  },
  {
    id: "b",
    label: "Bo",
    color: "#3b82f6",
    initials: "BO",
    points: [
      { x: 0, y: 0 },
      { x: 10, y: 20 },
    ],
  },
];

describe("PaceProjectionChart", () => {
  it("draws a solid line per series, a dashed projection where a finish is known, and an initials disc each", () => {
    const { container, getByRole } = render(() => (
      <PaceProjectionChart
        series={series}
        total={20}
        plan={[
          { x: 0, y: 0 },
          { x: 14, y: 10 },
          { x: 28, y: 20 },
        ]}
        today={10}
        xTicks={[{ x: 14, label: "Nov 4" }]}
      />
    ));
    expect(getByRole("img").getAttribute("aria-label")).toContain("2 people");
    const dashed = container.querySelectorAll(
      'path.sui-chart__line[stroke-dasharray="4 3"]',
    );
    expect(dashed.length).toBe(1);
    const discs = container.querySelectorAll(".sui-glyph-badge__text");
    expect([...discs].map((d) => d.textContent)).toEqual(["AN", "BO"]);
    expect(container.textContent).toContain("Nov 4");
  });

  it("createPaceProjectionChart yields a data-only variant", () => {
    const Chart = createPaceProjectionChart();
    const { container } = render(() => <Chart series={[]} total={10} />);
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
