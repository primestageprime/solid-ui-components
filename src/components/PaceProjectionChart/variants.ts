// ============================================
// PaceProjectionChart Curried Variants — Depth 2 (zero CSS)
// ============================================
import type { Component } from "solid-js";
import {
  createPaceProjectionChart,
  type PaceProjectionChartDataProps,
} from "./PaceProjectionChart";

/** Several series racing to one total, each with its projected finish, the plan and today. */
export const PaceProjectionChart: Component<PaceProjectionChartDataProps> =
  createPaceProjectionChart();
