// ============================================
// BuilderBoard geometry — the headless observation.
//
// The four rects for a viewport, pinned as numbers and PRINTED as a table so
// a wrong split reads as wrong beside its neighbours. The last test reads
// Layout.css so the gap constants the model states cannot drift from the
// stylesheet the frame actually resolves against.
// ============================================
import { readFileSync } from "node:fs";
import { join as joinPath } from "node:path";
import { describe, expect, it } from "vitest";
import { NATURAL_GAUGE_WIDTH } from "../RateGauge/geometry";
import {
  builderBoardRects,
  builderBoardTable,
  GAP_PX,
  HALF_GUTTER,
  PAIR_GUTTER,
  RAIL_WIDTH_PX,
} from "./geometry";

const LAPTOP = { width: 1200, height: 700 };

describe("builderBoardRects", () => {
  it("halves the height around one sm gutter and quarters the top half around one xs gutter", () => {
    const r = builderBoardRects(LAPTOP);
    // Top half: A + B + xs gutter; bottom half: C (and D) — equal halves.
    expect(r.a.height + PAIR_GUTTER + r.b.height).toBe(r.c.height);
    expect(r.c.height).toBe((700 - HALF_GUTTER) / 2);
    expect(r.a.height).toBe(r.b.height);
    // The column is exactly consumed: nothing left over, nothing overflowing.
    expect(r.c.y + r.c.height).toBe(700);
  });

  it("holds the rail to the gauge's natural width and hands the pane the rest", () => {
    const r = builderBoardRects(LAPTOP);
    expect(r.d.width).toBe(NATURAL_GAUGE_WIDTH);
    expect(r.c.width + HALF_GUTTER + r.d.width).toBe(1200);
    expect(r.d.x).toBe(r.c.width + HALF_GUTTER);
    expect(r.d.height).toBe(r.c.height);
  });

  it("gives A and B the full width", () => {
    const r = builderBoardRects(LAPTOP);
    expect(r.a.width).toBe(1200);
    expect(r.b.width).toBe(1200);
    expect(r.a.x).toBe(0);
    expect(r.b.y).toBe(r.a.height + PAIR_GUTTER);
  });

  it("keeps the rail the same width at every viewport — only the pane moves", () => {
    const narrow = builderBoardRects({ width: 1000, height: 600 });
    const wide = builderBoardRects({ width: 2000, height: 1000 });
    expect(narrow.d.width).toBe(wide.d.width);
    expect(wide.c.width - narrow.c.width).toBe(1000);
  });

  it("names every rail token's width", () => {
    expect(RAIL_WIDTH_PX.gauge).toBe(NATURAL_GAUGE_WIDTH);
  });
});

describe("builderBoardTable — the printed observation", () => {
  it("prints one row per panel with whole-px numbers", () => {
    const table = builderBoardTable({ width: 1439, height: 801 });
    console.log(`\n${table}\n`);
    const lines = table.split("\n");
    expect(lines).toHaveLength(5);
    expect(lines[0]).toMatch(/^panel\s+x\s+y\s+width\s+height$/);
    expect(lines[1]).toMatch(/^A cashflow\s+0\s+0\s+1439\s+196$/);
    expect(lines[2]).toMatch(/^B series\s+0\s+200\s+1439\s+196$/);
    expect(lines[3]).toMatch(/^C changes\s+0\s+405\s+1139\s+397$/);
    expect(lines[4]).toMatch(/^D rail\s+1147\s+405\s+292\s+397$/);
  });
});

describe("GAP_PX agrees with Layout.css", () => {
  const css = readFileSync(joinPath(__dirname, "..", "Layout", "Layout.css"), "utf8");
  const gapOf = (step: string): number => {
    const m = css.match(new RegExp(`\\.stack--gap-${step}\\s*\\{\\s*gap:\\s*(\\d+)px`));
    if (m === null) throw new Error(`no .stack--gap-${step} rule in Layout.css`);
    return Number(m[1]);
  };
  it("xs", () => expect(GAP_PX.xs).toBe(gapOf("xs")));
  it("sm", () => expect(GAP_PX.sm).toBe(gapOf("sm")));
});
