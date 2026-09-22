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
