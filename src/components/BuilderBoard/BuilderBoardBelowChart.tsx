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
// PANEL D'S BOX. An instrument that must pick between two layouts at one
// breakpoint (RateGauge's leaders vs corners, `calloutModeFor`) needs the box
// it will be drawn in — and inside a curried board the app can't reach D's
// card to measure it. So `panelD` may also be a render function taking an
// ACCESSOR of D's content box (the card, less its padding). It is an accessor,
// not a value, so a resize re-runs only what reads it and never remounts the
// instrument. Until the card is measured (first paint, jsdom) the box is
// `rects.d` — the card's outer size, which the core already stated. A plain
// element renders exactly as before and nothing is measured.
// ============================================
import {
  type Accessor,
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
  NoShrinkColumn,
  ScrollFillColumn,
  ViewportColumn,
} from "../Layout";
import { FillCardSurface } from "../Surface";
import type { BelowChartRects, RailWidth } from "./geometry";

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
  panelD: JSX.Element | ((box: Accessor<PanelBox>) => JSX.Element);
  /** The layout and sizes — `builderBoardBelowChart(...)`, the same object
   *  the app sized its chart (and, stacked, its scroller) from. */
  rects: BelowChartRects;
  /** The width token the rail is held to. Default `gauge`. */
  rail?: RailWidth;
}

/** A panel's content box in px. */
export interface PanelBox {
  readonly width: number;
  readonly height: number;
}

/**
 * The box panel D's render function sees: the measured content box once the
 * card has one, else the card's stated rect (`rects.d`). A zero measurement
 * is "not laid out yet", never the answer.
 */
export const panelBoxOf = (
  measured: PanelBox | undefined,
  stated: PanelBox,
): PanelBox =>
  measured !== undefined && measured.width > 0 && measured.height > 0
    ? { width: measured.width, height: measured.height }
    : { width: stated.width, height: stated.height };

/** An element's content box: client size less its padding. */
const contentBoxOf = (el: HTMLElement): PanelBox => {
  const cs = getComputedStyle(el);
  const px = (v: string): number => Number.parseFloat(v) || 0;
  return {
    width: el.clientWidth - px(cs.paddingLeft) - px(cs.paddingRight),
    height: el.clientHeight - px(cs.paddingTop) - px(cs.paddingBottom),
  };
};

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
  // Panel D's measured box — only watched when D asks for it.
  const [measured, setMeasured] = createSignal<PanelBox | undefined>();
  const box = (): PanelBox => panelBoxOf(measured(), local.rects.d);
  // observeSize is the TRIGGER only: it reports the border box where the
  // browser has one, and D wants the content box, so re-measure on each fire.
  const measureD = (el: HTMLElement): void => {
    if (typeof local.panelD !== "function") return;
    const measure = (): void => {
      setMeasured(contentBoxOf(el));
    };
    onMount(() => {
      measure();
      onCleanup(observeSize(el, measure));
    });
  };
  const contentD = (): JSX.Element => {
    const d = local.panelD;
    return typeof d === "function"
      ? (d as (b: Accessor<PanelBox>) => JSX.Element)(box)
      : d;
  };
  const cardD = (): JSX.Element => (
    <FillCardSurface data-builder-board-panel="d" ref={measureD}>
      {contentD()}
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
