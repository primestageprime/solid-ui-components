// ScrubChart `chrome` — "own" (the default) draws the chart's own controls,
// exactly as before; "frame" draws none of them, and the chart still follows
// the controlled props a ChartFrame + createYAxisStrategy set.
import { render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { describe, expect, it } from "vitest";
import { type Cell, dailyCells } from "../DateAxis";
import { ScrubChart, createScrubChart } from "./ScrubChart";
import type { ScrubChartContext, ScrubChartYAxisMode } from "./types";

const d = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);
const cells: Cell[] = dailyCells(d("2026-05-01"), d("2026-05-10"));

/** Every control the chart can draw for itself. */
const CONTROLS = [
  ".sui-scrub-chart__y-axis-mode",
  ".sui-scrub-chart__y-fit",
  ".sui-scrub-chart__y-axis-hit",
  ".sui-scrub-chart__expand",
  ".sui-scrub-chart__top-action",
];

const drawn = (root: HTMLElement) =>
  CONTROLS.filter((selector) => root.querySelector(selector) !== null);

const mount = (
  chrome: "own" | "frame" | undefined,
  mode: ScrubChartYAxisMode | undefined,
  yFit: boolean,
) => {
  let ctx: ScrubChartContext<Cell> | null = null;
  const { container } = render(() => (
    <ScrubChart
      chrome={chrome}
      cells={cells}
      yDomain={[0, 4]}
      formatYLabel={(v) => String(v)}
      yAxisMode={mode}
      onYRangeChange={() => {}}
      yFitDomain={yFit ? () => [0, 4] : undefined}
      chartHeight={200}
      chartHeightExpanded={400}
      topAction
      renderChart={(c) => {
        ctx = c;
        return <svg />;
      }}
      renderCell={() => <div />}
    />
  ));
  return { container, ctx: () => ctx! };
};

describe("ScrubChart chrome", () => {
  it('"own" (and the default) draws every control the props ask for', () => {
    expect(drawn(mount(undefined, "fixed", false).container)).toEqual([
      ".sui-scrub-chart__y-axis-mode",
      ".sui-scrub-chart__y-axis-hit",
      ".sui-scrub-chart__expand",
      ".sui-scrub-chart__top-action",
    ]);
    expect(drawn(mount("own", undefined, true).container)).toEqual([
      ".sui-scrub-chart__y-fit",
      ".sui-scrub-chart__expand",
      ".sui-scrub-chart__top-action",
    ]);
  });

  it('"frame" draws none of them, whatever the props ask for', () => {
    expect(drawn(mount("frame", "fixed", false).container)).toEqual([]);
    expect(drawn(mount("frame", undefined, true).container)).toEqual([]);
  });

  it('"frame" gives the corner\'s column back to the plot', () => {
    const own = mount("own", "fixed", false).ctx();
    const frame = mount("frame", "fixed", false).ctx();
    expect(frame.plotLeft).toBeLessThan(own.plotLeft);
  });

  it('"frame" still follows the controlled domain and expanded state', () => {
    const [domain, setDomain] = createSignal<[number, number]>([0, 4]);
    const [expanded, setExpanded] = createSignal(false);
    let ctx: ScrubChartContext<Cell> | null = null;
    const Framed = createScrubChart({ chrome: "frame", chartHeight: 200 });
    render(() => (
      <Framed
        cells={cells}
        yDomain={domain()}
        yFitTransition={false}
        chartHeightExpanded={400}
        expandTransition={false}
        expanded={expanded()}
        renderChart={(c) => {
          ctx = c;
          return <svg />;
        }}
        renderCell={() => <div />}
      />
    ));
    const top = () => ctx!.yToPlot!(4);
    const before = top();
    setDomain([0, 8]);
    expect(top()).toBeGreaterThan(before); // 4 sits lower on a 0..8 axis
    expect(ctx!.height).toBe(200);
    setExpanded(true);
    expect(ctx!.height).toBe(400);
  });
});
