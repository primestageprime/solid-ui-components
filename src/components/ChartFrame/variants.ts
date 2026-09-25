// ============================================
// ChartFrame Curried Variants — Depth 2 (zero CSS)
// ============================================
import type { Component } from "solid-js";
import { type ChartFrameDataProps, createChartFrame } from "./ChartFrame";
import {
  type YAxisLockDialogDataProps,
  createYAxisLockDialog,
} from "./YAxisLockDialog";

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

/** The chart language's words for the lock editor, shared by both fields. */
const Y_AXIS_LOCK_LABELS = {
  title: "Lock the y-axis",
  description:
    "The axis stays at this range until you change it or pick another mode.",
  confirm: "Lock",
  max: "Y max",
  min: "Y min",
  notANumber: "Enter a number",
  notAboveMin: "Max must be greater than min",
} as const;

/** The y-axis lock editor for a money axis: CurrencyInput fields. */
export const YAxisLockDialog: Component<YAxisLockDialogDataProps> =
  createYAxisLockDialog({ labels: Y_AXIS_LOCK_LABELS });

/** The y-axis lock editor for a COUNT axis (hours, headcount): plain
 *  number fields, no currency symbol. */
export const YAxisLockDialogNumber: Component<YAxisLockDialogDataProps> =
  createYAxisLockDialog({ labels: Y_AXIS_LOCK_LABELS, field: "number" });
