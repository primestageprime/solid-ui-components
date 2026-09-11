import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { ScrubChart } from "./ScrubChart";
import type { ScrubChartContext } from "./types";
import { ScrubChartCrosshair } from "./ScrubChartCrosshair";
import { dailyCells, type Cell } from "../DateAxis";

const cells = dailyCells(new Date("2026-05-01"), new Date("2026-05-10"));

type ValueCell = Cell & { v: number };
const valueCells: ValueCell[] = cells.map((c, i) => ({ ...c, v: i * 10 }));

/** Renders one `<ScrubChartCrosshair>` inside a real `ScrubChart` frame and
 *  hands back the container plus the `ctx` the chart computed, so
 *  assertions check the mark against the SAME geometry the chart used. */
const renderMark = (
  props: Omit<Parameters<typeof ScrubChartCrosshair<ValueCell>>[0], "ctx">,
  hoverIndex: number | null = 3,
) => {
  let seen: ScrubChartContext<ValueCell> | null = null;
  const result = render(() => (
    <ScrubChart<ValueCell>
      cells={valueCells}
      selected={0}
      onScrub={() => {}}
      yDomain={[0, 100]}
      renderCell={() => <span />}
      renderChart={(ctx) => {
        seen = ctx;
        return (
          <svg viewBox={`0 0 ${ctx.width} ${ctx.height}`}>
            <ScrubChartCrosshair ctx={{ ...ctx, hoverIndex }} {...props} />
          </svg>
        );
      }}
    />
  ));
  return { ...result, ctx: seen as unknown as ScrubChartContext<ValueCell> };
};

describe("ScrubChartCrosshair — the ScrubChart adapter", () => {
  it("draws no guide and no dots without a hover index", () => {
    const { container } = renderMark(
      {
        class: "guide",
        series: [{ id: "primary", value: (c) => c.v, class: "primary" }],
      },
      null,
    );
    expect(container.querySelector(".guide")).toBeNull();
    expect(container.querySelector("circle")).toBeNull();
  });

  it("draws the guide at cellToX(hoverIndex), spanning plotTop to plotBottom", () => {
    const { container, ctx } = renderMark({ class: "guide", series: [] }, 3);
    const line = container.querySelector(".guide")!;
    expect(line.getAttribute("x1")).toBe(String(ctx.cellToX(3)));
    expect(line.getAttribute("x2")).toBe(String(ctx.cellToX(3)));
    expect(line.getAttribute("y1")).toBe(String(ctx.plotTop));
    expect(line.getAttribute("y2")).toBe(String(ctx.plotBottom));
  });

  it("draws one dot per series at yToPlot(value), all sharing the guide's x", () => {
    const { container, ctx } = renderMark(
      {
        dotClass: "dot",
        series: [
          { id: "a", value: (c) => c.v },
          { id: "b", value: (c) => c.v + 5 },
        ],
      },
      3,
    );
    const dots = Array.from(container.querySelectorAll(".dot"));
    expect(dots).toHaveLength(2);
    const guideX = String(ctx.cellToX(3));
    expect(dots[0].getAttribute("cx")).toBe(guideX);
    expect(dots[1].getAttribute("cx")).toBe(guideX);
    expect(Number(dots[0].getAttribute("cy"))).toBeCloseTo(
      ctx.yToPlot!(valueCells[3].v),
      5,
    );
    expect(Number(dots[1].getAttribute("cy"))).toBeCloseTo(
      ctx.yToPlot!(valueCells[3].v + 5),
      5,
    );
  });

  it("skips a series whose value is null at the hovered cell", () => {
    const { container } = renderMark(
      {
        dotClass: "dot",
        series: [
          { id: "a", value: () => null },
          { id: "b", value: (c) => c.v },
        ],
      },
      3,
    );
    expect(container.querySelectorAll(".dot")).toHaveLength(1);
  });

  it("puts dotClass and the series' own class on its dot, base first", () => {
    const { container } = renderMark(
      {
        dotClass: "dot",
        series: [{ id: "a", value: (c) => c.v, class: "my-line" }],
      },
      3,
    );
    const dot = container.querySelector("circle")!;
    expect(dot.getAttribute("class")).toBe("dot my-line");
  });

  it("draws a dot with no class attribute when neither dotClass nor the series' class is set", () => {
    const { container } = renderMark(
      { series: [{ id: "a", value: (c) => c.v }] },
      3,
    );
    const dot = container.querySelector("circle")!;
    expect(dot.getAttribute("class")).toBeNull();
  });

  it("draws no guide when guide is false, but still draws dots", () => {
    const { container } = renderMark(
      {
        guide: false,
        class: "guide",
        dotClass: "dot",
        series: [{ id: "a", value: (c) => c.v }],
      },
      3,
    );
    expect(container.querySelector(".guide")).toBeNull();
    expect(container.querySelectorAll(".dot")).toHaveLength(1);
  });

  it("draws nothing without a y-domain", () => {
    let seen: ScrubChartContext<ValueCell> | null = null;
    const { container } = render(() => (
      <ScrubChart<ValueCell>
        cells={valueCells}
        selected={0}
        onScrub={() => {}}
        renderCell={() => <span />}
        renderChart={(ctx) => {
          seen = ctx;
          return (
            <svg viewBox={`0 0 ${ctx.width} ${ctx.height}`}>
              <ScrubChartCrosshair
                ctx={{ ...ctx, hoverIndex: 3 }}
                class="guide"
                dotClass="dot"
                series={[{ id: "a", value: (c) => c.v }]}
              />
            </svg>
          );
        }}
      />
    ));
    expect(seen).not.toBeNull();
    expect(container.querySelector(".guide")).toBeNull();
    expect(container.querySelector(".dot")).toBeNull();
  });

  it("prefers an explicit hoverIndex prop over ctx.hoverIndex", () => {
    const { container, ctx } = renderMark(
      { hoverIndex: 7, class: "guide", series: [] },
      3,
    );
    const line = container.querySelector(".guide")!;
    expect(line.getAttribute("x1")).toBe(String(ctx.cellToX(7)));
  });
});
