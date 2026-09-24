// lastReviewedAt: 2026-09-23
// lastReviewedBy: claude
// ============================================
// BuilderBoardBelowChart — Composite (Depth 2)
//
// The BuilderBoard for a page that sits BELOW the app shell's persistent
// chart. Panel A is the shell's chart — one instance that never remounts
// across pages — so this board draws only B, C and D:
//
//   ┌───────────────────────────────────┐
//   │ B  the series being changed       │  the remainder (HalfFillColumn:
//   ├──────────────────────────┬────────┤   the one growing child)
//   │ C  the changes           │ D rail │  `lowerHeight` px — C|D keeps the
//   └──────────────────────────┴────────┘   bottom half below the tab bar
//
// The C|D row's height is NOT a proportion of this board's own box: it is
// half the space below the app's tab bar, which this board cannot see. The
// app gets it — and the chart height, which gives way to keep B at its floor
// — from the pure `builderBoardBelowChart` (geometry.ts), and passes
// `lowerHeight` here, so the rects the function prints are the rects drawn.
// `observeBuilderBoardBelowChart` prints them as a table.
//
// Same vocabulary as BuilderBoard: no CSS, no intrinsic element; Layout and
// Surface variants only. The one stated number rides on the C|D column as
// measured geometry.
// ============================================
import { type Component, type JSX, mergeProps, splitProps } from "solid-js";
import {
  FillPaneRailGrid,
  HalfFillColumn,
  NoShrinkColumn,
  ScrollFillColumn,
  ViewportColumn,
} from "../Layout";
import { FillCardSurface } from "../Surface";
import type { RailWidth } from "./geometry";

export interface BuilderBoardBelowChartProps {
  /** The top card: the one series this builder changes. */
  panelB: JSX.Element;
  /** The bottom-left card: the controls. Scrolls inside its card. */
  panelC: JSX.Element;
  /** The bottom-right card: the instrument, held to the rail's width. */
  panelD: JSX.Element;
  /** Height of the C|D row in px — `builderBoardBelowChart(...).lowerHeight`. */
  lowerHeight: number;
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
    "lowerHeight",
    "rail",
  ]);
  const Rail = RAIL_GRID[local.rail];
  // Measured geometry from the pure core, never a literal.
  const lowerStyle = (): JSX.CSSProperties => ({
    height: `${Math.max(0, local.lowerHeight)}px`,
  });
  return (
    <ViewportColumn data-builder-board="below-chart">
      <HalfFillColumn data-builder-board-panel="b">
        <FillCardSurface>{local.panelB}</FillCardSurface>
      </HalfFillColumn>
      <NoShrinkColumn data-builder-board-half="bottom" style={lowerStyle()}>
        <Rail>
          <FillCardSurface data-builder-board-panel="c">
            <ScrollFillColumn>{local.panelC}</ScrollFillColumn>
          </FillCardSurface>
          <FillCardSurface data-builder-board-panel="d">
            {local.panelD}
          </FillCardSurface>
        </Rail>
      </NoShrinkColumn>
    </ViewportColumn>
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
