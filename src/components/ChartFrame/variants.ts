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

/**
 * The filling frame whose y-axis only ever AUTO-GROWS: one fit button in
 * place of the mode split, for a chart where Full auto and Locked would
 * mean nothing to its reader (the Contract Builder's cash-flow panel). Wire
 * `onYAxisPress` to the caller's `createAxisWaterMarks(...).reset`.
 */
export const FillAutoGrowChartFrame: Component<ChartFrameDataProps> =
  createChartFrame({ height: "fill", yAxisStrategy: "auto-grow-only" });

/**
 * The frame as tall as its chart: for a chart whose height is its data (a
 * lane chart packed into as many rows as it needs), where a stated px leaves
 * an empty band under a short schedule.
 */
export const ContentChartFrame: Component<ChartFrameDataProps> = createChartFrame({
  height: "content",
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
