// ============================================
// SwimlaneChart — public prop/variant types + shared render constants.
//
// This module is the type surface of the SwimlaneChart Primitive. It holds
// the three names re-exported through the folder barrel:
//
//   • SwimlaneChartProps<T>      — the full prop contract a raw
//                                  <SwimlaneChart> accepts.
//   • SwimlaneChartOverrides     — the union of prop keys a curried variant
//                                  freezes at definition time (visual/layout
//                                  knobs that must not drift per consumer).
//   • SwimlaneChartDataProps<T>  — what a curried variant still exposes to
//                                  its consumers (Props minus the Overrides).
//
// It also owns the handful of numeric render constants shared between the
// composition-root component (which needs them for its layout memos) and the
// extracted SVG sub-components in `badges.tsx` / `nodes.tsx` (which need them
// to position the rendered pills and to compute enter/leave slide offsets).
// Defining them once here keeps the two readers from drifting apart.
//
// Pure types + constants only — no Solid reactivity, no DOM, no side effects.
// ============================================
import type { JSX } from "solid-js";
import type { DAGNode, DAGEdge, NodeRenderState } from "../DagChart/types";

export type SwimlaneChartProps<T> = {
  nodes: DAGNode<T>[];
  edges: DAGEdge[];
  /**
   * Returns the column for a node — any signed integer. The chart picks
   * the center automatically (median of the col range). Passing 0/1/2
   * still works for legacy 3-lane kanban (center = 1).
   */
  swimlaneFor: (node: DAGNode<T>) => number;
  /**
   * Render callback. Receives the node and its render state.
   * For summary nodes the state is `{ kind: "collapsed", collapsedCount }`
   * and `node.data` is `{}` cast to T — consumers should render a stub
   * (e.g. "+3") in that case.
   */
  renderNode: (node: DAGNode<T>, state: NodeRenderState) => JSX.Element;
  /** Optional node size. Defaults to [180, 60]. */
  nodeSize?: (node: DAGNode<T>) => [number, number];
  /** Max graph distance from DOING for visibility. Default 2. */
  maxDepth?: number;
  /** Horizontal gap between column centers. Default 260. */
  columnGap?: number;
  /** Vertical gap between node centers within a column. Default 80. */
  rowGap?: number;
  onNodeClick?: (nodeId: string) => void;
  /** Render arrowheads. Default true. */
  arrows?: boolean;
  /** Enable pan/zoom interaction. Default true. */
  interactive?: boolean;
  /**
   * Which logical column should sit at the chart's horizontal center.
   * Default 0. Pass a moving value (e.g. follow the DOING column) to
   * have the chart slide its content under a static viewport.
   */
  centerCol?: number;
  /**
   * When false, ignore the container-width-driven depth reduction and
   * always render at `maxDepth`. Use this when you want a stable visible
   * set across status / col changes (e.g. an animated chain demo).
   */
  responsiveCollapse?: boolean;
  /**
   * Edge routing style. Default `"orthogonal"` — strict right-angle
   * routing with 3-segment Z paths (5-segment U over obstacles), hard
   * 90° corners, cardinal-direction arrowheads, and per-edge ports so
   * parallel connections fan instead of stacking. `"bezier"` keeps the
   * smooth-curve variant for callers who prefer it.
   */
  routingStyle?: "bezier" | "orthogonal";
};

/** Props that are visual/layout overrides — locked at variant-definition time.
 *  A curried variant freezes these so every consumer-app instance renders the
 *  same way, while still exposing data + behavior props (nodes, edges, etc.). */
export type SwimlaneChartOverrides =
  | "maxDepth"
  | "columnGap"
  | "rowGap"
  | "nodeSize"
  | "arrows"
  | "interactive"
  | "centerCol"
  | "responsiveCollapse";

/** Props that remain available to consumers of a curried SwimlaneChart variant. */
export type SwimlaneChartDataProps<T> = Omit<
  SwimlaneChartProps<T>,
  SwimlaneChartOverrides
>;

/** Default node box size [width, height] when `nodeSize` is not provided. */
export const DEFAULT_SIZE: [number, number] = [180, 60];

// Side-aware badge geometry. The boundary badge sits OUTSIDE the outermost
// visible node on its side at (anchorOuterX + dir·(STUB + BADGE_RADIUS)).
// edgeViews, boundaryBadges and the rendered pills all read these so a
// visible→hidden edge terminates exactly where the badge draws.
export const STUB_LENGTH = 28;
export const BADGE_RADIUS = 11;

/**
 * Visible item: a real node whose id appears in `layout.positions`, mirrored
 * into a keyed store so its DOM identity (and thus CSS transitions on x/y)
 * survive layout recomputes. Summaries are NOT items — they become boundary
 * badges on the arrows.
 */
export type SwimlaneItem<T> = {
  id: string;
  node: DAGNode<T>;
  x: number;
  y: number;
  width: number;
  height: number;
  state: NodeRenderState;
};

/**
 * Bottom row-overflow placeholder: a "+N" pill beneath a column whose node
 * count exceeds the height cap (maxRows). Distinct from the side boundary
 * badges, which absorb horizontal/depth overflow.
 */
export type SwimlaneBottomBadge = {
  key: string;
  x: number;
  y: number;
  count: number;
};
