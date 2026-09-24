// The board below a shell chart — the headless observation. Four windows,
// each printed as a table so a wrong split reads as wrong beside its
// neighbours, then the invariants every row must keep. The chart heights fed
// in follow thorcasting's decided policy (Q7: 30% of the space below the tab
// bar, min 220, NO max) — app policy, stated here only as test input.
import { describe, expect, it } from "vitest";
import {
  B_MIN_HEIGHT,
  CD_SHARE,
  HALF_GUTTER,
  PAIR_GUTTER,
  builderBoardBelowChart,
  observeBuilderBoardBelowChart,
  type BelowChartInput,
} from "./geometry";

const TAB = 48;
const LEGEND = 20;
const q7 = (h: number) => Math.max(220, 0.3 * (h - TAB));
const input = (width: number, height: number): BelowChartInput => ({
  viewport: { width, height },
  tabBarH: TAB,
  chartH: q7(height),
  legendH: LEGEND,
});

const HUGE = input(2560, 1440);
const LAPTOP = input(1440, 900);
const SHORT = input(1280, 600);
const TINY = input(800, 200);

describe("builderBoardBelowChart", () => {
  it("prints each window", () => {
    expect(observeBuilderBoardBelowChart(HUGE)).toBe(
      [
        "panel            y  width  height",
        "A chart         48   2560     418",
        "B series       490   2560     246",
        "C changes      744   2260     696",
        "D rail         744    292     696",
        "chart as asked",
      ].join("\n"),
    );
    expect(observeBuilderBoardBelowChart(LAPTOP)).toBe(
      [
        "panel            y  width  height",
        "A chart         48   1440     238",
        "B series       310   1440     156",
        "C changes      474   1140     426",
        "D rail         474    292     426",
        "chart gave way 18px to hold B at 156px",
      ].join("\n"),
    );
  });

  it("keeps C|D at the bottom share of the space below the tab bar in every window", () => {
    for (const w of [HUGE, LAPTOP, SHORT, TINY]) {
      const r = builderBoardBelowChart(w);
      const below = w.viewport.height - TAB;
      expect(r.lowerHeight).toBe(below * CD_SHARE);
      expect(r.c.y + r.c.height).toBe(w.viewport.height);
      expect(r.d.height).toBe(r.c.height);
      // The column is exactly consumed: chart, legend, gutters, B, C|D.
      expect(r.b.y + r.b.height + HALF_GUTTER).toBe(r.c.y);
      expect(r.b.y).toBe(TAB + r.chartH + LEGEND + PAIR_GUTTER);
    }
  });

  it("uses a huge window — no upper clamp on the chart", () => {
    const r = builderBoardBelowChart(HUGE);
    expect(r.chartH).toBe(HUGE.chartH);
    expect(r.chartGaveWay).toBe(0);
    expect(r.b.height).toBeGreaterThan(B_MIN_HEIGHT);
  });

  it("makes the chart give way on a short window so B holds its floor", () => {
    const r = builderBoardBelowChart(SHORT);
    expect(r.b.height).toBe(B_MIN_HEIGHT);
    expect(r.chartGaveWay).toBeGreaterThan(0);
    expect(r.chartH + r.chartGaveWay).toBe(SHORT.chartH);
    expect(observeBuilderBoardBelowChart(SHORT)).toContain("chart gave way");
  });

  it("never goes negative in a degenerate window", () => {
    const r = builderBoardBelowChart(TINY);
    expect(r.chartH).toBe(0);
    expect(r.b.height).toBeGreaterThanOrEqual(0);
    expect(r.lowerHeight).toBe(76);
  });
});
