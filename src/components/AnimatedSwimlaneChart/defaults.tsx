// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// src/components/AnimatedSwimlaneChart/defaults.tsx
import type { JSX } from "solid-js";
import type { StatusFlowNode, StatusFlowColumn, StatusFlowBreakpoint } from "../StatusFlowChart";
import { DEFAULT_LANE_LAYOUT_CONFIG, computeBreakpoints, type LaneLayoutConfig } from "../../internal/animation/breakpoints";
import { DEFAULT_TIMING, type LaneTimingConfig } from "../../internal/animation/trajectories";

/**
 * What a card renderer is handed: the node plus animation-derived state
 * (current rect, current status — may differ from node.status while a
 * card is mid-tick and a parent is auto-flipping).
 */
export interface RenderNodeContext {
  /** Effective status this tick (resolved parent status etc.). */
  effectiveStatus: string;
  /** True when this card sits on the parent row of its lane. */
  isParent: boolean;
}

export interface AnimatedSwimlaneDefaults {
  columns: StatusFlowColumn[];
  centerStatus: string;
  terminalStatus: string;
  nodeSize: [number, number];
  columnGap: number;
  rowGap: number;
  laneGap: number;
  lanePadding: number;
  parentGap: number;
  lozengeWidth: number;
  lozengeGap: number;
  breakpoints: StatusFlowBreakpoint[];
  timing: LaneTimingConfig;
  routingStyle: "orthogonal" | "bezier";
  renderNode: (node: StatusFlowNode, ctx: RenderNodeContext) => JSX.Element;
  renderPopover: ((node: StatusFlowNode) => JSX.Element | null) | null;
}

export const DEFAULT_COLUMNS: StatusFlowColumn[] = [
  { label: "DONE", statuses: ["DONE"] },
  { label: "DOING", statuses: ["DOING"] },
  { label: "TODO", statuses: ["TODO"] },
];

/**
 * Width-driven visible-col table. Derived from `computeBreakpoints`
 * against the default layout config and capped at depth 4 (9 visible
 * cols) which is more than any realistic chart needs.
 */
export const DEFAULT_BREAKPOINTS: StatusFlowBreakpoint[] =
  computeBreakpoints(DEFAULT_LANE_LAYOUT_CONFIG, 4).map((b) => ({
    minWidth: b.minWidth,
    visibleCols: b.visibleCols,
  }));

/**
 * Pre-knob default + an arrow-settle window. This mirrors the workshop's
 * MixedShapesRow boot config so the production component looks exactly
 * like the workshop preview.
 */
export const DEFAULT_TIMING_PRESET: LaneTimingConfig = {
  ...DEFAULT_TIMING,
  arrowSettleMs: 200,
  arrowPathMs: 0,
};

/** Built-in card renderer — minimal opaque status pill + title + subtitle. */
export const defaultRenderNode = (
  node: StatusFlowNode,
  ctx: RenderNodeContext,
): JSX.Element => (
  <div
    class="sui-asc__card"
    data-status={ctx.effectiveStatus}
    data-parent={ctx.isParent ? "" : undefined}
  >
    <div class="sui-asc__card-status">{ctx.effectiveStatus}</div>
    <div class="sui-asc__card-title">{node.title}</div>
    {node.subtitle && <div class="sui-asc__card-subtitle">{node.subtitle}</div>}
  </div>
);

/** Built-in popover: title + status. Consumers pass `null` to opt out. */
export const defaultRenderPopover = (node: StatusFlowNode): JSX.Element => (
  <div class="sui-asc__popover">
    <div class="sui-asc__popover-status">{node.status}</div>
    <div class="sui-asc__popover-title">{node.title}</div>
    {node.subtitle && <div class="sui-asc__popover-subtitle">{node.subtitle}</div>}
  </div>
);

export const ANIMATED_SWIMLANE_DEFAULTS: AnimatedSwimlaneDefaults = {
  columns: DEFAULT_COLUMNS,
  centerStatus: "DOING",
  terminalStatus: "DONE",
  // 50% wider than the base card width; taller to fit a 3-line title.
  nodeSize: [DEFAULT_LANE_LAYOUT_CONFIG.cardWidth * 1.5, 104],
  columnGap: DEFAULT_LANE_LAYOUT_CONFIG.cardGap,
  rowGap: 16,
  laneGap: 20,
  lanePadding: 16,
  parentGap: 16,
  lozengeWidth: DEFAULT_LANE_LAYOUT_CONFIG.lozengeWidth,
  lozengeGap: DEFAULT_LANE_LAYOUT_CONFIG.lozengeGap,
  breakpoints: DEFAULT_BREAKPOINTS,
  timing: DEFAULT_TIMING_PRESET,
  routingStyle: "orthogonal",
  renderNode: defaultRenderNode,
  renderPopover: defaultRenderPopover,
};

/** Map a partial `LaneLayoutConfig` override back together with the defaults. */
export function resolveLayoutConfig(
  overrides: Partial<LaneLayoutConfig> = {},
): LaneLayoutConfig {
  return { ...DEFAULT_LANE_LAYOUT_CONFIG, ...overrides };
}
