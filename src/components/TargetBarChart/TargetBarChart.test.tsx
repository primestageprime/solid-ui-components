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

  it("omits the NOW rule when NOW is outside the periods", () => {
    const { container } = mount(40);
    expect(container.textContent).not.toContain("now");
  });
});
