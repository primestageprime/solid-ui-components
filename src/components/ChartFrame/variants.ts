// ============================================
// ChartFrame Curried Variants — Depth 2 (zero CSS)
// ============================================
import type { Component } from "solid-js";
import { type ChartFrameDataProps, createChartFrame } from "./ChartFrame";

/** The in-flow height of a framed chart: title row + a plot that reads. */
export const CHART_FRAME_HEIGHT = 320;

/** The standard chart frame: a stated in-flow height, the viewport in full screen. */
export const ChartFrame: Component<ChartFrameDataProps> = createChartFrame({
  height: CHART_FRAME_HEIGHT,
});

/**
 * The frame that takes its parent's height: for a chart in a panel of
 * definite height (BuilderBoard's chart row), where a stated px would fight
 * the panel.
 */
export const FillChartFrame: Component<ChartFrameDataProps> = createChartFrame({
  height: "fill",
});
