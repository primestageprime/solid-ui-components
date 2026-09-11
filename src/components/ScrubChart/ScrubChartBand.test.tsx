import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { ScrubChart } from "./ScrubChart";
import type { ScrubChartContext } from "./types";
import { ScrubChartBand } from "./ScrubChartBand";
import { dailyCells, type Cell } from "../DateAxis";

type ValueCell = Cell & { v: number };

const baseCells = dailyCells(new Date("2026-05-01"), new Date("2026-05-05"));
const cells: ValueCell[] = baseCells.map((c, i) => ({
  ...c,
  v: [10, 5, -5, -2, 8][i],
}));

/** Renders one `<ScrubChartBand>` inside a real `ScrubChart` frame and hands
 *  back the container plus the `ctx` the chart computed, so assertions check
 *  the mark against the SAME geometry the chart used. */
const renderMark = (
  props: Omit<Parameters<typeof ScrubChartBand<ValueCell>>[0], "ctx" | "items">,
) => {
  let seen: ScrubChartContext<ValueCell> | null = null;
  const result = render(() => (
    <ScrubChart<ValueCell>
      cells={cells}
      selected={0}
      onScrub={() => {}}
      yDomain={[-10, 10]}
      renderCell={() => <span />}
      renderChart={(ctx) => {
        seen = ctx;
        return (
          <svg viewBox={`0 0 ${ctx.width} ${ctx.height}`}>
            <ScrubChartBand ctx={ctx} items={ctx.cells} {...props} />
          </svg>
        );
      }}
    />
  ));
  return { ...result, ctx: seen as unknown as ScrubChartContext<ValueCell> };
};

describe("ScrubChartBand — the ScrubChart adapter", () => {
  it("draws one polygon per run — split at each crossing (v: 10,5,-5,-2,8)", () => {
    const { container } = renderMark({
      series: (c) => c.v,
      reference: () => 0,
      positiveClass: "band-pos",
      negativeClass: "band-neg",
    });
    // pos(i0-i1) → neg(i1-i3) → pos(i3-i4): two positive runs, one negative.
    expect(container.querySelectorAll(".band-pos")).toHaveLength(2);
    expect(container.querySelectorAll(".band-neg")).toHaveLength(1);
  });

  it("uses ctx.cellToX and ctx.yToPlot — frame-absolute, matching the chart's own geometry", () => {
    const { container, ctx } = renderMark({
      series: (c) => c.v,
      reference: () => 0,
      positiveClass: "band-pos",
    });
    const polygon = container.querySelector(".band-pos")!;
    const points = polygon.getAttribute("points")!;
    const x0 = ctx.cellToX(0);
    const y0 = ctx.yToPlot!(10);
    expect(points).toContain(`${x0.toFixed(1)},${y0.toFixed(1)}`);
  });

  it("applies positiveFill / negativeFill per sign", () => {
    const { container } = renderMark({
      series: (c) => c.v,
      reference: () => 0,
      positiveClass: "band-pos",
      negativeClass: "band-neg",
      positiveFill: "green",
      negativeFill: "red",
    });
    expect(container.querySelector(".band-pos")!.getAttribute("fill")).toBe(
      "green",
    );
    expect(container.querySelector(".band-neg")!.getAttribute("fill")).toBe(
      "red",
    );
  });

  it("draws no fill attribute when the caller supplies none", () => {
    const { container } = renderMark({
      series: (c) => c.v,
      reference: () => 0,
      positiveClass: "band-pos",
    });
    expect(container.querySelector(".band-pos")!.getAttribute("fill")).toBe(
      null,
    );
  });

  it("draws stroke=none on every run", () => {
    const { container } = renderMark({
      series: (c) => c.v,
      reference: () => 0,
      positiveClass: "band-pos",
    });
    expect(container.querySelector(".band-pos")!.getAttribute("stroke")).toBe(
      "none",
    );
  });

  it("renders nothing when the chart has no yDomain (ctx.yToPlot is null)", () => {
    let seen: ScrubChartContext<ValueCell> | null = null;
    const { container } = render(() => (
      <ScrubChart<ValueCell>
        cells={cells}
        selected={0}
        onScrub={() => {}}
        renderCell={() => <span />}
        renderChart={(ctx) => {
          seen = ctx;
          return (
            <svg viewBox={`0 0 ${ctx.width} ${ctx.height}`}>
              <ScrubChartBand
                ctx={ctx}
                items={ctx.cells}
                series={(c) => c.v}
                reference={() => 0}
                positiveClass="band-pos"
                negativeClass="band-neg"
              />
            </svg>
          );
        }}
      />
    ));
    void seen;
    expect(container.querySelector(".band-pos")).toBeNull();
    expect(container.querySelector(".band-neg")).toBeNull();
  });
});
