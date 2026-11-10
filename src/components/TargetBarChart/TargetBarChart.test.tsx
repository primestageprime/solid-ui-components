import { describe, expect, it, vi } from "vitest";
import { render } from "@solidjs/testing-library";
import { TargetBarChart } from "./TargetBarChart";
import type { TargetBar, TargetBarSeries } from "./targetBarGeometry";

const bar = (period: number, over: Partial<TargetBar>): TargetBar => ({
  period,
  projected: 0,
  invoiced: 0,
  confirmed: 0,
  planned: 0,
  missing: 0,
  above: 0,
  ...over,
});

const SERIES: readonly TargetBarSeries[] = [
  {
    id: "ext",
    label: "Exterior",
    step: 500,
    bars: [
      bar(0, { projected: 6000, invoiced: 4000, missing: 2000 }),
      bar(1, { projected: 6000, confirmed: 3000, planned: 1000 }),
    ],
  },
  {
    id: "int",
    label: "Interior",
    step: 500,
    bars: [
      bar(0, { projected: 3000, invoiced: 3000, above: 1500 }),
      bar(1, { projected: 4000 }),
    ],
  },
];

const mount = (now = 0.5) =>
  render(() => (
    <TargetBarChart
      series={SERIES}
      periods={[0, 1]}
      periodLabel={(p) => ["Jan", "Feb"][p] ?? ""}
      now={now}
      valueFormat={(v) => `$${v}`}
      onProjectionChange={vi.fn()}
    />
  ));

describe("TargetBarChart", () => {
  it("mounts one projection grip per series per period, an outline per series, and a NOW rule", () => {
    const { container } = mount();
    expect(container.querySelectorAll('[role="slider"]').length).toBe(4);
    expect(container.querySelector('[aria-label="Interior, Feb: projected"]')).toBeTruthy();
    expect(container.querySelectorAll("path.sui-chart__line").length).toBeGreaterThanOrEqual(2);
    expect(container.textContent).toContain("now");
  });

  it("references the mark patterns it defines", () => {
    const { container } = mount();
    const ids = new Set(
      Array.from(container.querySelectorAll("pattern"), (p) => p.id),
    );
    const refs = Array.from(container.querySelectorAll("rect[fill^='url(#']"), (r) =>
      (r.getAttribute("fill") ?? "").slice(5, -1),
    );
    expect(refs.length).toBeGreaterThan(0);
    for (const ref of refs) expect(ids.has(ref)).toBe(true);
  });

  // THE PLOT, READ OFF THE DOM. The `$0` tick sits at the plot's foot, and a
  // tick's group is translated by its y in the plot, so the foot's y IS the
  // plot's height. A grip's column runs from its bar's lid to the foot, so a
  // column's height over the plot's is where that bar stands on the axis.
  const axisOf = (over: { yTop?: number; yMax?: number }) => {
    const { container } = render(() => (
      <TargetBarChart
        series={SERIES}
        periods={[0, 1]}
        periodLabel={(p) => ["Jan", "Feb"][p] ?? ""}
        now={0.5}
        valueFormat={(v) => `$${v}`}
        {...over}
      />
    ));
    const ticks = Array.from(container.querySelectorAll("text.sui-chart__axis-label"), (t) => t.textContent ?? "").filter(
      (t) => t.startsWith("$"),
    );
    const foot = Array.from(container.querySelectorAll("text.sui-chart__axis-label")).find((t) => t.textContent === "$0");
    const plotHeight = Number(/translate\(0, ([\d.]+)\)/.exec(foot?.parentElement?.getAttribute("transform") ?? "")?.[1]);
    // The first column is Exterior's January bar: projected 6000, the tallest.
    const tallest = Number(container.querySelector("rect.sui-chart__value-handle-column")?.getAttribute("height"));
    return { ticks, standsAt: tallest / plotHeight };
  };

  it("ends the plot exactly at `yTop`: a bar at 80% of it draws at 80% of the plot", () => {
    const { ticks, standsAt } = axisOf({ yTop: 7500 });
    expect(standsAt).toBeCloseTo(6000 / 7500, 6);
    expect(ticks).toEqual(["$0", "$2000", "$4000", "$6000"]);
  });

  it("`yTop` wins over `yMax`, whose top is a round one a little above", () => {
    expect(axisOf({ yMax: 7500 }).standsAt).toBeCloseTo(6000 / 10000, 6);
    expect(axisOf({ yMax: 7500, yTop: 7500 }).standsAt).toBeCloseTo(6000 / 7500, 6);
  });

  it("omits the NOW rule when NOW is outside the periods", () => {
    const { container } = mount(40);
    expect(container.textContent).not.toContain("now");
  });
});
