// The board below a shell chart — the headless observation. Five windows,
// each printed as a table so a wrong split reads as wrong beside its
// neighbours, then the invariants each layout keeps. The chart heights fed in
// follow thorcasting's decided policy (Q7: 30% of the space below the tab
// bar, min 220, NO max) — app policy, stated here only as test input.
import { describe, expect, it } from "vitest";
import {
  B_MIN_HEIGHT,
  C_STACKED_HEIGHT,
  CD_SHARE,
  CHART_MIN_HEIGHT,
  D_STACKED_HEIGHT,
  HALF_GUTTER,
  PAIR_GUTTER,
  STACK_BELOW_WIDTH,
  builderBoardBelowChart,
  observeBuilderBoardBelowChart,
  type BelowChartInput,
} from "./geometry";

const TAB = 48;
const LEGEND = 20;
const input = (width: number, height: number): BelowChartInput => ({
  viewport: { width, height },
  tabBarH: TAB,
  chartH: 0.3 * (height - TAB),
  legendH: LEGEND,
  chartMin: CHART_MIN_HEIGHT,
  bMin: B_MIN_HEIGHT,
});

const WINDOWS = {
  "1366x700": input(1366, 700),
  "1440x800": input(1440, 800),
  "1440x900": input(1440, 900),
  "1920x1080": input(1920, 1080),
  "800x1000": input(800, 1000),
};

const ALL = Object.values(WINDOWS);

describe("builderBoardBelowChart", () => {
  it("prints every window", () => {
    const printed = Object.entries(WINDOWS)
      .map(([name, w]) => `${name}\n${observeBuilderBoardBelowChart(w)}`)
      .join("\n\n");
    expect(printed).toMatchInlineSnapshot(`
      "1366x700
      layout stacked
      panel            x     y  width  height
      A chart          0    48   1366     220
      B series         0   292   1366     156
      C changes        0   456   1366     236
      D rail           0   700   1366     216
      content 868px below the tab bar

      1440x800
      layout stacked
      panel            x     y  width  height
      A chart          0    48   1440     226
      B series         0   298   1440     156
      C changes        0   462   1440     236
      D rail           0   706   1440     216
      content 874px below the tab bar

      1440x900
      layout split
      panel            x     y  width  height
      A chart          0    48   1440     238
      B series         0   310   1440     156
      C changes        0   474   1140     426
      D rail        1148   474    292     426
      content 852px below the tab bar; chart gave way 18px

      1920x1080
      layout split
      panel            x     y  width  height
      A chart          0    48   1920     310
      B series         0   382   1920     174
      C changes        0   564   1620     516
      D rail        1628   564    292     516
      content 1032px below the tab bar

      800x1000
      layout stacked
      panel            x     y  width  height
      A chart          0    48    800     286
      B series         0   358    800     156
      C changes        0   522    800     236
      D rail           0   766    800     216
      content 934px below the tab bar"
    `);
  });

  it("never puts the chart under chartMin nor B under bMin", () => {
    for (const w of ALL) {
      const r = builderBoardBelowChart(w);
      expect(r.chartH).toBeGreaterThanOrEqual(CHART_MIN_HEIGHT);
      expect(r.b.height).toBeGreaterThanOrEqual(B_MIN_HEIGHT);
    }
  });

  it("splits only when the top half holds both floors and the window is wide", () => {
    for (const w of ALL) {
      const r = builderBoardBelowChart(w);
      const below = w.viewport.height - TAB;
      const top = below * (1 - CD_SHARE) - HALF_GUTTER;
      const fits = top >= CHART_MIN_HEIGHT + LEGEND + PAIR_GUTTER + B_MIN_HEIGHT;
      expect(r.layout).toBe(fits && w.viewport.width >= STACK_BELOW_WIDTH ? "split" : "stacked");
    }
    expect(builderBoardBelowChart(WINDOWS["800x1000"]).layout).toBe("stacked");
    expect(builderBoardBelowChart(WINDOWS["1920x1080"]).layout).toBe("split");
  });

  it("split: C|D is the bottom share and the column is exactly consumed", () => {
    const w = WINDOWS["1920x1080"];
    const r = builderBoardBelowChart(w);
    const below = w.viewport.height - TAB;
    expect(r.lowerHeight).toBe(below * CD_SHARE);
    expect(r.c.y + r.c.height).toBe(w.viewport.height);
    expect(r.b.y + r.b.height + HALF_GUTTER).toBe(r.c.y);
    expect(r.contentHeight).toBe(below);
  });

  it("stacked: one column, each card at its stated height, content height for the scroller", () => {
    const w = WINDOWS["1366x700"];
    const r = builderBoardBelowChart(w);
    expect(r.chartH).toBe(Math.max(CHART_MIN_HEIGHT, w.chartH));
    expect([r.b.height, r.c.height, r.d.height]).toEqual([
      B_MIN_HEIGHT,
      C_STACKED_HEIGHT,
      D_STACKED_HEIGHT,
    ]);
    expect(r.c.y).toBe(r.b.y + r.b.height + HALF_GUTTER);
    expect(r.d.y).toBe(r.c.y + r.c.height + HALF_GUTTER);
    expect(r.contentHeight).toBe(r.d.y + r.d.height - TAB);
    expect(r.contentHeight).toBeGreaterThan(w.viewport.height - TAB);
  });
});
