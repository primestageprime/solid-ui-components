// The y-axis strategy vocabulary ChartFrame's split button draws: one row per
// mode — its menu label, its icon, and what the main face does in it.
//
// The mode NAMES are ScrubChart's (`ScrubChartYAxisMode`), not new ones: a
// ScrubChart inside a ChartFrame and the frame's button then speak about the
// same state. Peter's words for them (2026-09-24):
//
//   auto       "Auto-grow | manual shrink"  fit        the axis grows with the
//                                                      data; the button shrinks
//                                                      it to fit.
//   autoscale  "Full auto"                  arrows-up-down  the axis fits both
//                                                      ways — the button has
//                                                      nothing to do, so it is
//                                                      DISABLED and says why.
//   fixed      "Locked"                     lock       the axis holds the
//                                                      reader's range; the
//                                                      button opens its editor.
import { find } from "../../fn";
import type { ModeInfo } from "../ModeSplitButton";
import type { ScrubChartYAxisMode } from "../ScrubChart/types";

export type ChartYAxisMode = ScrubChartYAxisMode;

/** A y-axis mode's row: the `ModeSplitButton` row over the strategy's modes. */
export type ChartYAxisModeInfo = ModeInfo<ChartYAxisMode>;

/** Menu order: the default first. */
export const CHART_Y_AXIS_MODES: readonly ChartYAxisModeInfo[] = [
  {
    mode: "auto",
    label: "Auto-grow | manual shrink",
    icon: "fit",
    action: "Shrink y-axis to fit current values",
    disabled: false,
  },
  {
    mode: "autoscale",
    label: "Full auto",
    icon: "arrows-up-down",
    action: "Y-axis fits automatically — nothing to shrink",
    disabled: true,
  },
  {
    mode: "fixed",
    label: "Locked",
    icon: "lock",
    action: "Set y-axis min and max",
    disabled: false,
  },
];

/** The row for `mode`. */
export const chartYAxisModeInfo = (mode: ChartYAxisMode): ChartYAxisModeInfo =>
  find((info: ChartYAxisModeInfo) => info.mode === mode, CHART_Y_AXIS_MODES) ??
  CHART_Y_AXIS_MODES[0];
