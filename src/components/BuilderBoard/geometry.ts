// ============================================
// BuilderBoard geometry — pure, headless, no DOM, no Solid.
//
// Lowercase filename ON PURPOSE (same disposition as RateGauge/geometry.ts):
// `isEntryPath` in scripts/render-coverage.mjs treats any PascalCase `.tsx`
// under src/components/ as a component owing a showcase and a depth header.
//
// The frame `BuilderBoard.tsx` draws is FOUR CARDS in a viewport-filling
// column — two charts stacked in the top half, a controls pane beside a
// fixed-width instrument rail in the bottom half — and every size in it is a
// consequence of the Layout variants it composes. This file states that
// arithmetic once so an agent can read the four rects as a table for any
// viewport without a browser, and so a test can pin them.
//
//   ┌───────────────────────────────────┐  ┐
//   │ A  cashflow                       │  │ top half
//   ├───────────────────────────────────┤  │ (A over B, each a
//   │ B  the series being changed       │  │  HalfFillColumn)
//   ├──────────────────────────┬────────┤  ┘
//   │ C  changes (scrolls)     │ D rail │  ┐ bottom half
//   │                          │ gauge  │  │ (FillPaneRailGrid)
//   └──────────────────────────┴────────┘  ┘
//
// Every number is a token the library already owns: the Stack gap steps
// (Layout.css) and the gauge's own natural width (RateGauge/geometry.ts).
// Nothing here is typed in as a pixel a consumer could have chosen.
// ============================================
import { join, map } from "../../fn";
import { NATURAL_GAUGE_WIDTH } from "../RateGauge/geometry";

/** The Stack/Row/Grid gap steps, in px, as `Layout.css` states them.
 *  `builderBoard.test.ts` reads the stylesheet and asserts these agree with
 *  it, so the model cannot drift from the frame it describes. */
export const GAP_PX = { xs: 4, sm: 8 } as const;

/** The gutter between the top half and the bottom half, and between the pane
 *  and the rail: `ViewportColumn` and `FillPaneRailGrid` both bake `sm`. */
export const HALF_GUTTER = GAP_PX.sm;

/** The gutter between the two stacked charts: `HalfFillColumn` bakes `xs`,
 *  one step tighter than the halves — the two charts belong to one another
 *  and read as a pair. */
export const PAIR_GUTTER = GAP_PX.xs;

/** The width tokens the rail may be held to. `gauge` is `RateGauge`'s own
 *  derived natural width — the one size at which its label column is
 *  unclamped and its ring is full. A second instrument that wants a stated
 *  width adds its token here, not a pixel at a call site. */
export type RailWidth = "gauge";

export const RAIL_WIDTH_PX: Readonly<Record<RailWidth, number>> = {
  gauge: NATURAL_GAUGE_WIDTH,
};

/** A viewport the frame is asked to fill, in px. */
export interface Viewport {
  readonly width: number;
  readonly height: number;
}

/** One panel's outer box, in px from the frame's top-left corner. */
export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export type PanelId = "a" | "b" | "c" | "d";

/** The four cards' rects for one viewport. */
export type BuilderBoardRects = Readonly<Record<PanelId, Rect>>;

/**
 * The four rects, derived exactly as the flex/grid layout resolves them:
 *
 *   • the column splits its height into two equal halves around one `sm`
 *     gutter (`HalfFillColumn` is `flex: 1 1 0`, so the split ignores
 *     content);
 *   • the top half splits again into A over B around one `xs` gutter;
 *   • the bottom half is a `minmax(0, 1fr)` pane track beside a rail track
 *     stated at the rail token's width, around one `sm` gutter.
 *
 * Fractional pixels are left as they fall — the browser rounds at paint time
 * and a model that rounded first would disagree with it by a pixel at odd
 * heights. Callers that print round for themselves (`builderBoardTable`).
 */
export const builderBoardRects = (
  viewport: Viewport,
  rail: RailWidth = "gauge",
): BuilderBoardRects => {
  const half = (viewport.height - HALF_GUTTER) / 2;
  const chart = (half - PAIR_GUTTER) / 2;
  const railWidth = RAIL_WIDTH_PX[rail];
  const paneWidth = viewport.width - railWidth - HALF_GUTTER;
  const bottomY = half + HALF_GUTTER;
  return {
    a: { x: 0, y: 0, width: viewport.width, height: chart },
    b: { x: 0, y: chart + PAIR_GUTTER, width: viewport.width, height: chart },
    c: { x: 0, y: bottomY, width: paneWidth, height: half },
    d: { x: paneWidth + HALF_GUTTER, y: bottomY, width: railWidth, height: half },
  };
};

const PANEL_NAMES: Readonly<Record<PanelId, string>> = {
  a: "A cashflow",
  b: "B series",
  c: "C changes",
  d: "D rail",
};

const PANEL_ORDER: readonly PanelId[] = ["a", "b", "c", "d"];

const cell = (value: number | string, width: number): string =>
  String(value).padStart(width);

/**
 * The rects as a fixed-width text table — the headless observation, for an
 * agent or a test log. One row per panel, rounded to whole px.
 *
 *     panel        x     y  width  height
 *     A cashflow   0     0   1200     198
 *     ...
 */
export const builderBoardTable = (
  viewport: Viewport,
  rail: RailWidth = "gauge",
): string => {
  const rects = builderBoardRects(viewport, rail);
  const header = `${"panel".padEnd(12)}${cell("x", 6)}${cell("y", 6)}${cell("width", 7)}${cell("height", 8)}`;
  const rows = map((id: PanelId) => {
    const r = rects[id];
    return `${PANEL_NAMES[id].padEnd(12)}${cell(Math.round(r.x), 6)}${cell(Math.round(r.y), 6)}${cell(Math.round(r.width), 7)}${cell(Math.round(r.height), 8)}`;
  }, PANEL_ORDER);
  return join("\n", [header, ...rows]);
};

// ── The board BELOW a shell chart ─────────────────────────────────────────
//
// On a builder page inside the app shell, panel A (the cashflow) is the
// SHELL's chart — one persistent instance above the page body — so the board
// draws only B, C and D beneath it:
//
//   ┌───────────────────────────────────┐ ┐ tabBarH
//   ├───────────────────────────────────┤ ┘
//   │ A  shell chart (+ legend)         │   chartH (may give way) + legendH
//   ├───────────────────────────────────┤   xs gutter
//   │ B  the series being changed       │   the REMAINDER, never under B_MIN
//   ├──────────────────────────┬────────┤   sm gutter
//   │ C  changes               │ D rail │   CD_SHARE of the space below the
//   └──────────────────────────┴────────┘   tab bar — the bottom half
//
// C|D keeps the bottom half of the space below the tab bar whatever the
// chart does, so the controls sit in the same place on every builder. B takes
// what the chart leaves of the top half. When the chart would leave B less
// than `B_MIN_HEIGHT`, the CHART gives way (the shell renders it shorter) —
// B is the series being edited and must stay legible; the chart is only its
// context. The chart height policy itself (share of the window, its min) is
// the APP's, and arrives here as `chartH`.

/** The share of the space below the tab bar that C|D takes. */
export const CD_SHARE = 0.5;

/**
 * B's floor, in px: the smallest card that still shows a series. A card title
 * row (~28px: one `sm` button row) + a `sm` gap + a 120px plot — the height at
 * which ScrubChart's corner footprint (28px) and a three-tick y axis still
 * leave a readable line. Below it the chart above gives way instead.
 */
export const B_MIN_HEIGHT = 28 + GAP_PX.sm + 120;

/** The gutters the below-chart board stacks with. Defaults are the frame's
 *  own tokens: `xs` between the chart block and B (they read as a pair, like
 *  A over B on the full board), `sm` between B and the bottom half. */
export interface BelowChartGaps {
  readonly chartToB: number;
  readonly bToCD: number;
}

export const DEFAULT_BELOW_CHART_GAPS: BelowChartGaps = {
  chartToB: PAIR_GUTTER,
  bToCD: HALF_GUTTER,
};

export interface BelowChartInput {
  /** The whole window the app draws in, in px. */
  readonly viewport: Viewport;
  /** Height of the app's top bar + tab strip above the chart, in px. */
  readonly tabBarH: number;
  /** The chart height the app's policy asks for, in px. */
  readonly chartH: number;
  /** Height of the chart's legend row, 0 without one, in px. */
  readonly legendH: number;
  /** Gutters; defaults to `DEFAULT_BELOW_CHART_GAPS`. */
  readonly gaps?: Partial<BelowChartGaps>;
  /** The rail's width token. Default `gauge`. */
  readonly rail?: RailWidth;
}

export interface BelowChartRects {
  /** The chart height to render — `chartH`, or less where it gave way. */
  readonly chartH: number;
  /** How many px the chart gave up to keep B at its floor (0 = none). */
  readonly chartGaveWay: number;
  /** B, C and D in viewport coordinates (y from the window's top). */
  readonly b: Rect;
  readonly c: Rect;
  readonly d: Rect;
  /** The C|D row's height — what `BuilderBoardBelowChart` takes. */
  readonly lowerHeight: number;
}

/**
 * B and C|D beneath a shell chart, and the chart height that leaves B at
 * least `B_MIN_HEIGHT`. Pure: every number is a function of the input.
 * When even a zero-height chart cannot give B its floor (a tiny window), the
 * chart is 0 and B takes whatever the top half has left, never negative.
 */
export const builderBoardBelowChart = (input: BelowChartInput): BelowChartRects => {
  const gaps = { ...DEFAULT_BELOW_CHART_GAPS, ...input.gaps };
  const width = input.viewport.width;
  const below = Math.max(0, input.viewport.height - input.tabBarH);
  const lowerHeight = below * CD_SHARE;
  const top = below - lowerHeight - gaps.bToCD;
  const fixed = input.legendH + gaps.chartToB;
  const wantB = top - fixed - input.chartH;
  const chartH =
    wantB >= B_MIN_HEIGHT
      ? input.chartH
      : Math.max(0, top - fixed - B_MIN_HEIGHT);
  const bHeight = Math.max(0, top - fixed - chartH);
  const bY = input.tabBarH + chartH + fixed;
  const cdY = input.tabBarH + below - lowerHeight;
  const railWidth = RAIL_WIDTH_PX[input.rail ?? "gauge"];
  const paneWidth = width - railWidth - HALF_GUTTER;
  return {
    chartH,
    chartGaveWay: input.chartH - chartH,
    b: { x: 0, y: bY, width, height: bHeight },
    c: { x: 0, y: cdY, width: paneWidth, height: lowerHeight },
    d: { x: paneWidth + HALF_GUTTER, y: cdY, width: railWidth, height: lowerHeight },
    lowerHeight,
  };
};

/**
 * The below-chart layout as a fixed-width table — the headless observation.
 * One row per box (the chart first, then B, C, D), whole px, plus a line
 * saying whether the chart gave way.
 *
 *     panel            y  width  height
 *     A chart         48   1440     286
 *     B series       …
 */
export const observeBuilderBoardBelowChart = (input: BelowChartInput): string => {
  const r = builderBoardBelowChart(input);
  const row = (name: string, y: number, w: number, h: number) =>
    `${name.padEnd(12)}${cell(Math.round(y), 6)}${cell(Math.round(w), 7)}${cell(Math.round(h), 8)}`;
  return join("\n", [
    `${"panel".padEnd(12)}${cell("y", 6)}${cell("width", 7)}${cell("height", 8)}`,
    row("A chart", input.tabBarH, input.viewport.width, r.chartH),
    row("B series", r.b.y, r.b.width, r.b.height),
    row("C changes", r.c.y, r.c.width, r.c.height),
    row("D rail", r.d.y, r.d.width, r.d.height),
    r.chartGaveWay > 0
      ? `chart gave way ${Math.round(r.chartGaveWay)}px to hold B at ${B_MIN_HEIGHT}px`
      : "chart as asked",
  ]);
};
