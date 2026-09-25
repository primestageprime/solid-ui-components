// lastReviewedAt: 2026-09-23
// lastReviewedBy: claude
// ============================================
// BuilderBoardBelowChart — Composite (Depth 2)
//
// The BuilderBoard for a page that sits BELOW the app shell's persistent
// chart. Panel A is the shell's chart — one instance that never remounts
// across pages — so this board draws only B, C and D, in the layout the pure
// `builderBoardBelowChart` (geometry.ts) chose:
//
//   split                                     stacked
//   ┌───────────────────────────────────┐     ┌────────────────────┐
//   │ B  the remainder (HalfFillColumn) │     │ B  rects.b.height  │
//   ├──────────────────────────┬────────┤     ├────────────────────┤
//   │ C  the changes           │ D rail │     │ C  rects.c.height  │
//   └──────────────────────────┴────────┘     ├────────────────────┤
//     rects.lowerHeight — half the space      │ D  rects.d.height  │
//     below the tab bar                       └────────────────────┘
//                                               page scrolls
//
// The heights are NOT proportions of this board's own box — they depend on
// the app's tab bar and window, which the board cannot see. The app computes
// `rects` once, renders its chart at `rects.chartH`, sizes its scroller by
// `rects.contentHeight` when stacked, and passes `rects` here, so the rects
// the function prints are the rects drawn.
//
// Same vocabulary as BuilderBoard: no CSS, no intrinsic element; Layout and
// Surface variants only. The one stated number rides on the C|D column as
// measured geometry.
//
// Panel D may be a render function given its box — see panelBox.ts.
// ============================================
import { type Component, type JSX, Show, mergeProps, splitProps } from "solid-js";
import {
  FillPaneRailGrid,
  HalfFillColumn,
  NarrowStack,
  NoShrinkColumn,
  ScrollFillColumn,
  ViewportColumn,
} from "../Layout";
import { FillCardSurface } from "../Surface";
import type { BelowChartRects, RailWidth } from "./geometry";
import { type PanelDSlot, createPanelDBox } from "./panelBox";

export interface BuilderBoardBelowChartProps {
  /** The top card: the one series this builder changes. */
  panelB: JSX.Element;
  /** The bottom-left card: the controls. Scrolls inside its card. */
  panelC: JSX.Element;
  /**
   * The bottom-right card: the instrument, held to the rail's width. Either
   * an element, or a render function given an accessor of the card's content
   * box — for an instrument whose layout depends on it
   * (`calloutModeFor(box(), labels)`).
   */
  panelD: PanelDSlot;
  /** The layout and sizes — `builderBoardBelowChart(...)`, the same object
   *  the app sized its chart (and, stacked, its scroller) from. */
  rects: BelowChartRects;
  /** The width token the rail is held to. Default `gauge`. */
  rail?: RailWidth;
}

/** Visual/layout overrides — locked at variant-definition time. */
export type BuilderBoardBelowChartOverrides = Pick<
  BuilderBoardBelowChartProps,
  "rail"
>;

/** Props available to consumers of a curried variant. */
export type BuilderBoardBelowChartDataProps = Omit<
  BuilderBoardBelowChartProps,
  keyof BuilderBoardBelowChartOverrides
>;

const RAIL_GRID: Readonly<
  Record<RailWidth, Component<{ children?: JSX.Element }>>
> = {
  gauge: FillPaneRailGrid,
};

const BuilderBoardBelowChartBase: Component<BuilderBoardBelowChartProps> = (
  rawProps,
) => {
  const props = mergeProps({ rail: "gauge" as const }, rawProps);
  const [local] = splitProps(props, [
    "panelB",
    "panelC",
    "panelD",
    "rects",
    "rail",
  ]);
  const Rail = RAIL_GRID[local.rail];
  // Measured geometry from the pure core, never a literal.
  const heightOf = (px: number): JSX.CSSProperties => ({
    height: `${Math.max(0, px)}px`,
  });
  const cardC = (): JSX.Element => (
    <FillCardSurface data-builder-board-panel="c">
      <ScrollFillColumn>{local.panelC}</ScrollFillColumn>
    </FillCardSurface>
  );
  // Panel D's box: measured once laid out, the core's `rects.d` before.
  const d = createPanelDBox(
    () => local.panelD,
    () => local.rects.d,
  );
  const cardD = (): JSX.Element => (
    <FillCardSurface data-builder-board-panel="d" ref={d.ref}>
      {d.content()}
    </FillCardSurface>
  );
  return (
    <Show
      when={local.rects.layout === "split"}
      fallback={
        // STACKED: one content-height column; each card holds the height the
        // core stated, and the page around it scrolls.
        <NarrowStack data-builder-board="below-chart" data-layout="stacked">
          <NoShrinkColumn style={heightOf(local.rects.b.height)}>
            <FillCardSurface data-builder-board-panel="b">
              {local.panelB}
            </FillCardSurface>
          </NoShrinkColumn>
          <NoShrinkColumn style={heightOf(local.rects.c.height)}>
            {cardC()}
          </NoShrinkColumn>
          <NoShrinkColumn style={heightOf(local.rects.d.height)}>
            {cardD()}
          </NoShrinkColumn>
        </NarrowStack>
      }
    >
      <ViewportColumn data-builder-board="below-chart" data-layout="split">
        <HalfFillColumn data-builder-board-panel="b">
          <FillCardSurface>{local.panelB}</FillCardSurface>
        </HalfFillColumn>
        <NoShrinkColumn
          data-builder-board-half="bottom"
          style={heightOf(local.rects.lowerHeight)}
        >
          <Rail>
            {cardC()}
            {cardD()}
          </Rail>
        </NoShrinkColumn>
      </ViewportColumn>
    </Show>
  );
};

export function createBuilderBoardBelowChart(
  defaults: Partial<BuilderBoardBelowChartOverrides>,
): Component<BuilderBoardBelowChartDataProps> {
  return (props) => (
    <BuilderBoardBelowChartBase {...mergeProps(defaults, props)} />
  );
}

/** The gauge-railed below-chart board — the only rail today. */
export const BuilderBoardBelowChart: Component<BuilderBoardBelowChartDataProps> =
  createBuilderBoardBelowChart({});
