// ============================================
// BuilderBoard — Composite (Depth 2)
//
// The ONE frame a scenario builder draws its four panels in:
//
//   ┌───────────────────────────────────┐  ┐
//   │ A  the cashflow                   │  │ top half — A over B,
//   ├───────────────────────────────────┤  │ equal fill cards that
//   │ B  the series being changed       │  │ hand their charts a height
//   ├──────────────────────────┬────────┤  ┘
//   │ C  the changes           │ D rail │  ┐ bottom half — C takes what
//   │    (scrolls internally)  │ gauge  │  │ the rail leaves; the rail
//   └──────────────────────────┴────────┘  ┘ is a stated width
//
// It owns NO CSS and renders NO intrinsic element. Every box is a Layout or
// Surface variant this library already ships — `ViewportColumn`,
// `HalfFillColumn`, `FillPaneRailGrid`, `FillCardSurface`, `ScrollFillColumn`
// — and this file only fixes the ORDER they nest in. That order is the
// deliverable: three builder pages composed the same five variants three
// different ways (a 60% pane so the gauge resized with the window; a stated
// 200px box so the bottom half sat at content height and left the page
// empty; an inline min-height floor) and drew three different pictures of
// one board. Sizes are a property of the frame, so every tab is identical by
// construction and a page cannot re-decide them.
//
// The frame's numbers are decided in `geometry.ts`, which prints them as a
// table for any viewport without a browser; `geometry.test.ts` pins them.
//
// ## What a slot is
//
// Each slot is a CARD'S CONTENT — whatever a page draws inside its
// `FillCardSurface`: typically a title row, then a `GrowFillBox` around a
// chart or a `GrowCenterColumn` around an instrument. The frame draws the
// card. It does not draw titles, because a title row on this board carries
// controls (the fit-y-axis button on A, the change chips and Reset on C) that
// belong to the page.
//
// C alone is wrapped in a `ScrollFillColumn`: it is the one panel whose
// content is a LIST (dials, cards, a hire form) that can outgrow its half,
// and a list that grows past its card must scroll inside it rather than push
// the board past the viewport — the topbar, the strip and the charts stay
// put while the controls move. A chart or a gauge is sized to its card and
// never overflows it, so A, B and D get no scroll region to fight with.
//
// ## The top of the fill chain
//
// `ViewportColumn` is `height: 100%`, which resolves against a parent of
// DEFINITE height and computes to `auto` against one that is not. Put the
// board in a sized cell — a page's growing body region, a bench frame with a
// height — and it fills it; put it in a content-sized block and it collapses
// to its content, which is the same failure a bare chart has there. The
// frame does not carry a height of its own, because the app's chrome is what
// knows how tall the viewport is beneath it.
//
// ## Overrides
//
// `rail` is the width token the instrument rail is held to. `gauge` is
// `RateGauge`'s own derived natural width — the one size at which its label
// column is unclamped and its ring is full — and it is the only token today.
// A pixel never crosses into a consumer: the token is resolved in
// `geometry.ts` and the track is `FillPaneRailGrid`'s.
// ============================================
import {
  type Component,
  type JSX,
  Show,
  createSignal,
  mergeProps,
  onCleanup,
  onMount,
  splitProps,
} from "solid-js";
import { observeSize } from "../../internal/dom/observeSize";
import {
  FillPaneRailGrid,
  HalfFillColumn,
  NarrowStack,
  ScrollFillColumn,
  ViewportColumn,
  createStack,
} from "../Layout";
import { FillCardSurface } from "../Surface";
import {
  RAIL_WIDTH_PX,
  type RailWidth,
  C_STACKED_HEIGHT,
  D_STACKED_HEIGHT,
  STACKED_CHART_HEIGHT,
  builderBoardLayoutFor,
  builderBoardStackedRects,
} from "./geometry";
import { type PanelDSlot, createPanelDBox } from "./panelBox";

export interface BuilderBoardProps {
  /** The top card: the cashflow the whole scenario resolves to. */
  panelA: JSX.Element;
  /** The second card: the one series this builder changes. */
  panelB: JSX.Element;
  /** The bottom-left card: the controls. Scrolls inside its card. */
  panelC: JSX.Element;
  /**
   * The bottom-right card: the instrument, held to the rail's width. Either
   * an element, or a render function given an accessor of the card's content
   * box — for an instrument whose layout depends on it
   * (`calloutModeFor(box(), labels)`). See panelBox.tsx.
   */
  panelD: PanelDSlot;
  /** The width token the rail is held to. Default `gauge`. */
  rail?: RailWidth;
}

/** Visual/layout overrides — locked at variant-definition time. */
export type BuilderBoardOverrides = Pick<BuilderBoardProps, "rail">;

/** Props available to consumers of a curried BuilderBoard variant. */
export type BuilderBoardDataProps = Omit<
  BuilderBoardProps,
  keyof BuilderBoardOverrides
>;

/** The rail is drawn by `FillPaneRailGrid`, whose track is stated at the
 *  gauge's width. A second token would pick a second grid variant here; the
 *  map is total over `RailWidth` so adding a token without a track fails the
 *  build. */
const RAIL_GRID: Readonly<
  Record<RailWidth, Component<{ children?: JSX.Element }>>
> = {
  gauge: FillPaneRailGrid,
};

/** The single column's slots: each holds its card at the height geometry.ts
 *  states for it, and never shrinks — the board scrolls instead. The heights
 *  are the core's constants, so they bake here once, like ChartFrame's
 *  stated height, rather than riding on an inline style. */
const stackedSlot = (height: number) =>
  createStack({ style: { height: `${height}px`, "flex-shrink": "0" } });
const StackedChartSlot = stackedSlot(STACKED_CHART_HEIGHT);
const StackedControlsSlot = stackedSlot(C_STACKED_HEIGHT);
const StackedRailSlot = stackedSlot(D_STACKED_HEIGHT);

export const BuilderBoard: Component<BuilderBoardProps> = (rawProps) => {
  const props = mergeProps({ rail: "gauge" as const }, rawProps);
  const [local] = splitProps(props, [
    "panelA",
    "panelB",
    "panelC",
    "panelD",
    "rail",
  ]);
  const Rail = RAIL_GRID[local.rail];
  // THE BOARD'S OWN WIDTH picks the layout (geometry.ts,
  // `builderBoardLayoutFor`): one breakpoint, single column below it. Read
  // synchronously on mount (a ref-time read is 0, and the observer's first
  // delivery is frozen in a hidden tab), then on every change. Unmeasured
  // (0) keeps the split board.
  const [width, setWidth] = createSignal(0);
  const measureBoard = (el: HTMLElement): void => {
    onMount(() => {
      setWidth(Math.round(el.getBoundingClientRect().width));
      onCleanup(observeSize(el, (size) => setWidth(size.width)));
    });
  };
  const stacked = () => builderBoardLayoutFor(width()) === "stacked";
  const stackedRects = () => builderBoardStackedRects(width());
  // Panel D's box: measured once laid out. Before that, split states only
  // the rail's width (its height is the viewport's, which the board cannot
  // see, so 0); stacked states D's own rect.
  const d = createPanelDBox(
    () => local.panelD,
    () =>
      stacked()
        ? stackedRects().d
        : { width: RAIL_WIDTH_PX[local.rail], height: 0 },
  );
  const cardC = (): JSX.Element => (
    <FillCardSurface data-builder-board-panel="c">
      <ScrollFillColumn>{local.panelC}</ScrollFillColumn>
    </FillCardSurface>
  );
  const cardD = (): JSX.Element => (
    <FillCardSurface data-builder-board-panel="d" ref={d.ref}>
      {d.content()}
    </FillCardSurface>
  );
  return (
    <ViewportColumn
      data-builder-board=""
      data-layout={stacked() ? "stacked" : undefined}
      ref={measureBoard}
    >
      <Show
        when={!stacked()}
        fallback={
          // SINGLE COLUMN: the board scrolls; each card holds the height the
          // core states (geometry.ts), in the slots below.
          <ScrollFillColumn>
            <NarrowStack>
              <StackedChartSlot>
                <FillCardSurface data-builder-board-panel="a">
                  {local.panelA}
                </FillCardSurface>
              </StackedChartSlot>
              <StackedChartSlot>
                <FillCardSurface data-builder-board-panel="b">
                  {local.panelB}
                </FillCardSurface>
              </StackedChartSlot>
              <StackedControlsSlot>{cardC()}</StackedControlsSlot>
              <StackedRailSlot>{cardD()}</StackedRailSlot>
            </NarrowStack>
          </ScrollFillColumn>
        }
      >
        {/* THE TOP HALF, HALVED AGAIN. `HalfFillColumn` is `flex: 1 1 0` — the
          zero basis divides the space BEFORE content is consulted, so a tall
          chart beside a short one still gets exactly half. */}
        <HalfFillColumn data-builder-board-half="top">
          <HalfFillColumn data-builder-board-panel="a">
            <FillCardSurface>{local.panelA}</FillCardSurface>
          </HalfFillColumn>
          <HalfFillColumn data-builder-board-panel="b">
            <FillCardSurface>{local.panelB}</FillCardSurface>
          </HalfFillColumn>
        </HalfFillColumn>

        {/* THE BOTTOM HALF: the pane takes what the rail leaves. The grid's two
          tracks ARE the two cards — a card is a grid item, not a card inside a
          box inside a row — and its `minmax(0, 1fr)` row is what lets the
          cards be shorter than their content. */}
        <HalfFillColumn data-builder-board-half="bottom">
          <Rail>
            {cardC()}
            {cardD()}
          </Rail>
        </HalfFillColumn>
      </Show>
    </ViewportColumn>
  );
};

export function createBuilderBoard(
  defaults: Partial<BuilderBoardOverrides>,
): Component<BuilderBoardDataProps> {
  return (props) => <BuilderBoard {...mergeProps(defaults, props)} />;
}
