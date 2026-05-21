// Pre-configured SwimlaneChart variants via createSwimlaneChart() factory.
// See ADR-0001: all visual/layout configuration is locked at variant
// definition time — consumers only pass data + render callbacks.

import type { JSX } from "solid-js";
import { createSwimlaneChart, type SwimlaneChartDataProps } from "./SwimlaneChart";

/**
 * LinearFlowSwimlaneChart — DOING-centered linear-progression view.
 *
 * Designed for "current step in a sequential workflow" displays. Consumer
 * passes nodes + edges + a `swimlaneFor` that returns each node's signed
 * distance from the current DOING node (negative = done, 0 = doing, positive
 * = upcoming). The chart keeps col 0 anchored to viewport center, and
 * compresses out-of-window nodes into boundary badges with the mirrored
 * absorb / emerge animation.
 *
 * Locked defaults:
 *   maxDepth=3, responsiveCollapse=true (collapses further when narrow),
 *   centerCol=0, nodeSize=[160, 56], interactive=false (no pan/zoom —
 *   the chart drives itself off data changes), arrows=true.
 */
export const LinearFlowSwimlaneChart = createSwimlaneChart<unknown>({
  maxDepth: 3,
  responsiveCollapse: true,
  centerCol: 0,
  nodeSize: () => [160, 56],
  interactive: false,
  arrows: true,
}) as <T>(props: SwimlaneChartDataProps<T>) => JSX.Element;
