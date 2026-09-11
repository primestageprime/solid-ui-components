import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { ScrubChart } from "./ScrubChart";
import type { ScrubChartContext } from "./types";
import { ScrubChartReferenceLine } from "./ScrubChartReferenceLine";
import { dailyCells, type Cell } from "../DateAxis";

const cells = dailyCells(new Date("2026-05-01"), new Date("2026-05-10"));

/** Renders one `<ScrubChartReferenceLine>` inside a real `ScrubChart` frame
 *  and hands back both the container and the `ctx` the chart computed, so
 *  assertions can check the mark against the SAME geometry the chart used —
 *  not a hand-rolled stub that could drift from the real shape. */
const renderMark = (
  props: Omit<Parameters<typeof ScrubChartReferenceLine>[0], "ctx">,
  withYDomain = true,
) => {
  let seen: ScrubChartContext<Cell> | null = null;
  const result = render(() => (
    <ScrubChart
      cells={cells}
      selected={0}
      onScrub={() => {}}
      yDomain={withYDomain ? [0, 100] : undefined}
      renderCell={() => <span />}
      renderChart={(ctx) => {
        seen = ctx;
        return (
          <svg viewBox={`0 0 ${ctx.width} ${ctx.height}`}>
            <ScrubChartReferenceLine ctx={ctx} {...props} />
          </svg>
        );
      }}
    />
  ));
  return { ...result, ctx: seen as unknown as ScrubChartContext<Cell> };
};

describe("ScrubChartReferenceLine — the ScrubChart adapter", () => {
  it("spans plotLeft to plotRight — frame-absolute, unlike Chart's plot-local rule", () => {
    const { container, ctx } = renderMark({ value: 50, class: "ref-line" });
    const line = container.querySelector(".ref-line")!;
    expect(line.getAttribute("x1")).toBe(String(ctx.plotLeft));
    expect(line.getAttribute("x2")).toBe(String(ctx.plotRight));
  });

  it("draws the rule at yToPlot(value), passing the y-domain value straight through", () => {
    const { container, ctx } = renderMark({ value: 42, class: "ref-line" });
    const line = container.querySelector(".ref-line")!;
    const expectedY = ctx.yToPlot!(42);
    expect(line.getAttribute("y1")).toBe(String(expectedY));
    expect(line.getAttribute("y2")).toBe(String(expectedY));
  });

  it("draws no caption when label is omitted", () => {
    const { container } = renderMark({
      value: 50,
      class: "ref-line",
      labelClass: "ref-caption",
    });
    expect(container.querySelector(".ref-caption")).toBeNull();
  });

  it("anchors the caption at the rule's right end, text-anchor end", () => {
    const { container, ctx } = renderMark({
      value: 50,
      label: "threshold",
      labelClass: "ref-caption",
    });
    const text = container.querySelector(".ref-caption")!;
    expect(text.textContent).toBe("threshold");
    expect(text.getAttribute("text-anchor")).toBe("end");
    expect(Number(text.getAttribute("x"))).toBeCloseTo(ctx.plotRight - 4, 3);
  });

  it("applies class, stroke and strokeDasharray to the line", () => {
    const { container } = renderMark({
      value: 50,
      class: "ref-line",
      stroke: "gold",
      strokeDasharray: "5 4",
      opacity: 0.7,
    });
    const line = container.querySelector(".ref-line")!;
    expect(line.getAttribute("stroke")).toBe("gold");
    expect(line.getAttribute("stroke-dasharray")).toBe("5 4");
    expect(line.getAttribute("opacity")).toBe("0.7");
  });

  it("omits stroke-dasharray and opacity attributes when the caller passes neither", () => {
    // A caller styling entirely through its own stylesheet — CashflowScrubChart's
    // zero line — must get back exactly the attributes it asks for, nothing
    // baked in that a stylesheet rule would have to fight.
    const { container } = renderMark({ value: 0, class: "zero-line" });
    const line = container.querySelector(".zero-line")!;
    expect(line.getAttribute("stroke-dasharray")).toBeNull();
    expect(line.getAttribute("opacity")).toBeNull();
  });

  it("renders nothing when the chart has no yDomain (ctx.yToPlot is null)", () => {
    const { container } = renderMark(
      { value: 50, label: "nope", class: "ref-line" },
      false,
    );
    expect(container.querySelector(".ref-line")).toBeNull();
    expect(container.querySelector("text")).toBeNull();
  });
});
