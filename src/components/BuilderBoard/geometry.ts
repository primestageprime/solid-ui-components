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
import {
  NATURAL_GAUGE_WIDTH,
  VIEW_HEIGHT as GAUGE_VIEW_HEIGHT,
} from "../RateGauge/geometry";

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
  return join("\n", rectsTable(builderBoardRects(viewport, rail)));
};

/** The header and one whole-px row per panel. */
const rectsTable = (rects: BuilderBoardRects): readonly string[] => [
  `${"panel".padEnd(12)}${cell("x", 6)}${cell("y", 6)}${cell("width", 7)}${cell("height", 8)}`,
  ...map((id: PanelId) => {
    const r = rects[id];
    return `${PANEL_NAMES[id].padEnd(12)}${cell(Math.round(r.x), 6)}${cell(Math.round(r.y), 6)}${cell(Math.round(r.width), 7)}${cell(Math.round(r.height), 8)}`;
  }, PANEL_ORDER),
];

// ── Single column on a narrow board ──────────────────────────────────────
//
// Below `BUILDER_BOARD_SINGLE_COLUMN_BELOW` the board's OWN width cannot hold
// C beside the 292px rail (at 390px C got ~50px), and viewport halves leave
// every card too short to read. So it goes single column (Peter, 2026-09-25:
// "It should go single column") — A, B, C, D in one scrolling column. A, B and
// D hold stated heights; C takes its NATURAL height (Peter, 2026-09-25: the
// Changes panel shows in full and its dials keep their design height — it
// used to clamp to C_STACKED_HEIGHT, 236px, and squash the dials to their
// 180px floor while scrolling inside itself):
//
//   ┌──────────────────────┐
//   │ A  STACKED_CHART_HEIGHT │
//   ├──────────────────────┤ sm
//   │ B  STACKED_CHART_HEIGHT │
//   ├──────────────────────┤ sm
//   │ C  its content       │  (natural height — the BOARD scrolls)
//   ├──────────────────────┤ sm
//   │ D  D_STACKED_HEIGHT  │  (the rail, full width)
//   └──────────────────────┘
//     the board scrolls
//
// ONE breakpoint, on the board's measured width. A width of 0 is "not laid
// out yet" (first paint, jsdom) and keeps the split board.

/** Narrower than this (the board's own width, px), the board is one column. */
export const BUILDER_BOARD_SINGLE_COLUMN_BELOW = 600;

/** A and B's height in the single column: a card title row + `sm` gap + a
 *  plot tall enough to read a line and a three-tick axis. */
export const STACKED_CHART_HEIGHT = 240;

export type BuilderBoardLayout = "split" | "stacked";

/** THE BREAKPOINT: stacked while the board is laid out and narrower than
 *  `BUILDER_BOARD_SINGLE_COLUMN_BELOW`; split otherwise (including unmeasured). */
export const builderBoardLayoutFor = (width: number): BuilderBoardLayout =>
  width > 0 && width < BUILDER_BOARD_SINGLE_COLUMN_BELOW ? "stacked" : "split";

/** The four rects of the single column at `width` — every card full width.
 *  C's height is its CONTENT's, which only layout knows: pass the measured
 *  `cHeight`, or get `C_STACKED_HEIGHT` as the pre-layout estimate (and D
 *  placed after it). The board draws C at its natural height either way. */
export const builderBoardStackedRects = (
  width: number,
  cHeight: number = C_STACKED_HEIGHT,
): BuilderBoardRects => {
  const bY = STACKED_CHART_HEIGHT + HALF_GUTTER;
  const cY = bY + STACKED_CHART_HEIGHT + HALF_GUTTER;
  const dY = cY + cHeight + HALF_GUTTER;
  return {
    a: { x: 0, y: 0, width, height: STACKED_CHART_HEIGHT },
    b: { x: 0, y: bY, width, height: STACKED_CHART_HEIGHT },
    c: { x: 0, y: cY, width, height: cHeight },
    d: { x: 0, y: dY, width, height: D_STACKED_HEIGHT },
  };
};

/** The layout the board draws in `viewport`, and its rects. */
export const builderBoardLayout = (
  viewport: Viewport,
  rail: RailWidth = "gauge",
): { readonly layout: BuilderBoardLayout; readonly rects: BuilderBoardRects } => {
  const layout = builderBoardLayoutFor(viewport.width);
  return {
    layout,
    rects:
      layout === "stacked"
        ? builderBoardStackedRects(viewport.width)
        : builderBoardRects(viewport, rail),
  };
};

/**
 * The layout as a table — `builderBoardTable`'s rows under a `layout …` line,
 * for whichever layout `viewport` gets. The headless observation of G11.
 */
export const observeBuilderBoard = (
  viewport: Viewport,
  rail: RailWidth = "gauge",
): string => {
  const { layout, rects } = builderBoardLayout(viewport, rail);
  return join("\n", [
    `layout ${layout} (${viewport.width}x${viewport.height})`,
    ...rectsTable(rects),
    ...(layout === "stacked"
      ? [`C natural height (${C_STACKED_HEIGHT} is the pre-layout estimate); D follows C; the board scrolls`]
      : []),
  ]);
};

// ── The board BELOW a shell chart ─────────────────────────────────────────
//
// On a builder page inside the app shell, panel A (the cashflow) is the
// SHELL's chart — one persistent instance above the page body — so the board
// draws only B, C and D beneath it, in one of TWO layouts. Neither minimum is
// ever sacrificed (Peter, 2026-09-23): when the window cannot hold both the
// chart's floor and B's floor in the top half, the board STACKS and the page
// scrolls, rather than shrinking either below its floor.
//
//   "split" — the viewport-filling board        "stacked" — one column
//   ┌──────────────────────────────────┐         ┌──────────────────────┐
//   ├──────────────────────────────────┤ tab bar ├──────────────────────┤
//   │ A  shell chart (+ legend)        │         │ A  chart ≥ chartMin  │
//   ├──────────────────────────────────┤ xs      ├──────────────────────┤
//   │ B  the remainder, ≥ bMin         │         │ B  bMin              │
//   ├─────────────────────────┬────────┤ sm      ├──────────────────────┤
//   │ C  changes              │ D rail │         │ C  C_STACKED_HEIGHT  │
//   └─────────────────────────┴────────┘         ├──────────────────────┤
//     C|D = CD_SHARE of the space below          │ D  D_STACKED_HEIGHT  │
//     the tab bar — the bottom half              └──────────────────────┘
//                                                  page scrolls; the app
//                                                  sizes it by contentHeight
//
// SPLIT when the window is at least `STACK_BELOW_WIDTH` wide AND the top half
// holds chartMin + legend + the xs gutter + bMin (the top half is the space
// below the tab bar less C|D and the sm gutter above it — the gutters are
// real pixels, so the test counts them). Otherwise STACKED. In split mode the
// chart takes what the app asks (`chartH`) unless that would push B under
// `bMin`; then it gives way, but never below `chartMin` — the split test above
// guarantees it never has to. In stacked mode the chart is the larger of
// `chartH` and `chartMin`. The chart height POLICY (share of the window) is
// the APP's, and arrives here as `chartH`.

/** The share of the space below the tab bar that C|D takes (split). */
export const CD_SHARE = 0.5;

/** A card's title row, in px: one `sm` button row. */
const CARD_TITLE_ROW = 28;

/**
 * B's default floor, in px: the smallest card that still shows a series. A
 * card title row + a `sm` gap + a 120px plot — the height at which
 * ScrubChart's corner footprint (28px) and a three-tick y axis still leave a
 * readable line.
 */
export const B_MIN_HEIGHT = CARD_TITLE_ROW + GAP_PX.sm + 120;

/** The chart's default floor, in px (thorcasting Q7: min 220, no max). */
export const CHART_MIN_HEIGHT = 220;

/** Narrower than this, the board stacks whatever the height: C beside a
 *  292px rail leaves C under ~600px, too narrow for its controls. */
export const STACK_BELOW_WIDTH = 900;

/** C's height when stacked, BEFORE layout: a title row + `sm` gap + five 40px
 *  control rows. BuilderBoardBelowChart states C at this height; BuilderBoard
 *  draws C at its natural height and uses this only as the pre-layout
 *  estimate in `builderBoardStackedRects`. */
export const C_STACKED_HEIGHT = CARD_TITLE_ROW + GAP_PX.sm + 5 * 40;

/** D's height when stacked: a title row + `sm` gap + the gauge's own natural
 *  height (RateGauge's viewBox, cut to its content). */
export const D_STACKED_HEIGHT =
  CARD_TITLE_ROW + GAP_PX.sm + Math.ceil(GAUGE_VIEW_HEIGHT);

/** The gutter between the chart block and B. Default `xs`: the chart and B
 *  read as a pair, like A over B on the full board. The B-to-C|D gutter is
 *  NOT an input — `BuilderBoardBelowChart` bakes `sm` there. */
export interface BelowChartGaps {
  readonly chartToB: number;
}

export const DEFAULT_BELOW_CHART_GAPS: BelowChartGaps = {
  chartToB: PAIR_GUTTER,
};

export interface BelowChartInput {
  /** The whole window the app draws in, in px. */
  readonly viewport: Viewport;
  /** Height of the app's top bar + tab strip above the chart, in px. */
  readonly tabBarH: number;
  /** The chart height the app's policy asks for (its share), in px. */
  readonly chartH: number;
  /** Height of the chart's legend row, 0 without one, in px. */
  readonly legendH: number;
  /** The chart's floor. Default `CHART_MIN_HEIGHT` (220). */
  readonly chartMin?: number;
  /** B's floor. Default `B_MIN_HEIGHT` (156). */
  readonly bMin?: number;
  /** Gutters; defaults to `DEFAULT_BELOW_CHART_GAPS`. */
  readonly gaps?: Partial<BelowChartGaps>;
  /** The rail's width token. Default `gauge`. */
  readonly rail?: RailWidth;
}

export type BelowChartLayout = "split" | "stacked";

export interface BelowChartRects {
  /** Which board to draw. */
  readonly layout: BelowChartLayout;
  /** The chart height to render. */
  readonly chartH: number;
  /** Px the chart gave up (split only; never below chartMin). */
  readonly chartGaveWay: number;
  /** B, C and D in viewport coordinates (y from the window's top). */
  readonly b: Rect;
  readonly c: Rect;
  readonly d: Rect;
  /** Split: the C|D row's height. Stacked: C + gutter + D. */
  readonly lowerHeight: number;
  /** Height of everything below the tab bar — chart, legend, B, C, D and
   *  their gutters. Split: the space below the tab bar exactly. Stacked:
   *  what the app's scroller must hold. */
  readonly contentHeight: number;
}

/**
 * The layout beneath a shell chart. Pure: every number is a function of the
 * input. See the section header for the split/stacked rule.
 */
export const builderBoardBelowChart = (input: BelowChartInput): BelowChartRects => {
  const chartToB = input.gaps?.chartToB ?? DEFAULT_BELOW_CHART_GAPS.chartToB;
  const chartMin = input.chartMin ?? CHART_MIN_HEIGHT;
  const bMin = input.bMin ?? B_MIN_HEIGHT;
  const width = input.viewport.width;
  const below = Math.max(0, input.viewport.height - input.tabBarH);
  const lowerSplit = below * CD_SHARE;
  const top = below - lowerSplit - HALF_GUTTER;
  const fixed = input.legendH + chartToB;
  const split = width >= STACK_BELOW_WIDTH && top >= chartMin + fixed + bMin;

  if (split) {
    const chartH = Math.max(chartMin, Math.min(input.chartH, top - fixed - bMin));
    const bY = input.tabBarH + chartH + fixed;
    const cdY = input.tabBarH + below - lowerSplit;
    const railWidth = RAIL_WIDTH_PX[input.rail ?? "gauge"];
    const paneWidth = width - railWidth - HALF_GUTTER;
    return {
      layout: "split",
      chartH,
      chartGaveWay: Math.max(0, input.chartH - chartH),
      b: { x: 0, y: bY, width, height: top - fixed - chartH },
      c: { x: 0, y: cdY, width: paneWidth, height: lowerSplit },
      d: { x: paneWidth + HALF_GUTTER, y: cdY, width: railWidth, height: lowerSplit },
      lowerHeight: lowerSplit,
      contentHeight: below,
    };
  }

  const chartH = Math.max(chartMin, input.chartH);
  const bY = input.tabBarH + chartH + fixed;
  const cY = bY + bMin + HALF_GUTTER;
  const dY = cY + C_STACKED_HEIGHT + HALF_GUTTER;
  return {
    layout: "stacked",
    chartH,
    chartGaveWay: 0,
    b: { x: 0, y: bY, width, height: bMin },
    c: { x: 0, y: cY, width, height: C_STACKED_HEIGHT },
    d: { x: 0, y: dY, width, height: D_STACKED_HEIGHT },
    lowerHeight: C_STACKED_HEIGHT + HALF_GUTTER + D_STACKED_HEIGHT,
    contentHeight: dY + D_STACKED_HEIGHT - input.tabBarH,
  };
};

/**
 * The layout as a fixed-width table — the headless observation. A header
 * line names the layout; then one row per box (the chart first, then B, C,
 * D), whole px; then the content height and whether the chart gave way.
 *
 *     layout split
 *     panel        x     y  width  height
 *     A chart      0    48   1920     310
 *     ...
 */
export const observeBuilderBoardBelowChart = (input: BelowChartInput): string => {
  const r = builderBoardBelowChart(input);
  const row = (name: string, x: number, y: number, w: number, h: number) =>
    `${name.padEnd(12)}${cell(Math.round(x), 6)}${cell(Math.round(y), 6)}${cell(Math.round(w), 7)}${cell(Math.round(h), 8)}`;
  return join("\n", [
    `layout ${r.layout}`,
    `${"panel".padEnd(12)}${cell("x", 6)}${cell("y", 6)}${cell("width", 7)}${cell("height", 8)}`,
    row("A chart", 0, input.tabBarH, input.viewport.width, r.chartH),
    row("B series", r.b.x, r.b.y, r.b.width, r.b.height),
    row("C changes", r.c.x, r.c.y, r.c.width, r.c.height),
    row("D rail", r.d.x, r.d.y, r.d.width, r.d.height),
    `content ${Math.round(r.contentHeight)}px below the tab bar${
      r.chartGaveWay > 0 ? `; chart gave way ${Math.round(r.chartGaveWay)}px` : ""
    }`,
  ]);
};
