// ============================================
// SwimlaneChart — responsive-sizing math (pure, no Solid/DOM).
//
// The chart is "responsive" in a specific sense: as the container shrinks it
// first compresses the arrows between columns, and once those hit a minimum
// visible length it starts COLLAPSING outer-ring nodes into "+N" boundary
// badges (horizontal/depth overflow) and overflowing rows into bottom badges
// (vertical/row overflow). All of that is driven by a few closed-form
// formulas that depend only on measured pixel widths/heights and the node
// box size — never on the graph data itself.
//
// These helpers are the pure kernels of those formulas. The component wraps
// each in a createMemo so it re-runs when the relevant signal changes; the
// arithmetic lives here so it can be read (and unit-reasoned) without Solid
// in the way. Every function is deterministic and side-effect free.
//
// Constants are ENCAPSULATED here rather than configurable from the call
// site — they encode the visual system, not per-consumer knobs.
// ============================================
import type { DAGNode } from "../DagChart/types";
import { DEFAULT_SIZE } from "./types";

/** Minimum visible arrow length before nodes start collapsing (px). */
export const MIN_ARROW_PX = 50;
/** Horizontal container padding reserved on each side (px). */
export const H_PADDING_PX = 32;
/** Vertical container padding reserved on each side (px). */
export const V_PADDING_PX = 24;
/** Outer badge slot reserved past the last visible node: STUB_LENGTH (28)
 *  + 2·BADGE_RADIUS (22). Kept as a literal so the depth/gap formulas stay
 *  a pure function of pixel width. */
export const BADGE_EXTENT = 50;

/** Widest node box across the graph, floored at the default node width. */
export const widestNodeWidth = <T>(
  nodes: DAGNode<T>[],
  nodeSize: (node: DAGNode<T>) => [number, number],
): number => {
  const max = nodes.reduce((acc, n) => Math.max(acc, nodeSize(n)[0]), 0);
  return max || DEFAULT_SIZE[0];
};

/** Tallest node box across the graph, floored at the default node height. */
export const tallestNodeHeight = <T>(
  nodes: DAGNode<T>[],
  nodeSize: (node: DAGNode<T>) => [number, number],
): number => {
  const max = nodes.reduce((acc, n) => Math.max(acc, nodeSize(n)[1]), 0);
  return max || DEFAULT_SIZE[1];
};

/**
 * Pixel width required to display `depth` rings on each side of center at the
 * minimum arrow length. DOING is anchored to the viewport center and layout
 * positions nodes by col VALUE (not occupied-col index), so the reserved
 * space is symmetric: `depth` min-gaps per side, plus one full node width,
 * plus a badge slot and padding on each edge.
 */
export const widthForDepth = (depth: number, nodeWidth: number): number => {
  const minGap = nodeWidth + MIN_ARROW_PX;
  return 2 * depth * minGap + nodeWidth + 2 * BADGE_EXTENT + 2 * H_PADDING_PX;
};

/**
 * Largest depth (≤ userMax) whose `widthForDepth` fits the container width.
 * Discrete: steps down by 1 until it fits, or 0 if even one ring won't.
 * `containerWidth === 0` (unmeasured) returns `userMax`.
 */
export const fitDepth = (
  userMax: number,
  containerWidth: number,
  nodeWidth: number,
): number => {
  if (containerWidth === 0) return userMax;
  for (let d = userMax; d > 0; d--) {
    if (containerWidth >= widthForDepth(d, nodeWidth)) return d;
  }
  return 0;
};

/**
 * Column gap that packs `depth` symmetric rings into the container width,
 * clamped between the min gap and the caller's default. `2·depth` gaps span
 * from the outer-left node center to the outer-right node center; the
 * remaining width pays for one full node plus badge slots and padding.
 * `depth <= 0` degenerates to the min gap.
 */
export const fitColumnGap = (
  depth: number,
  containerWidth: number,
  nodeWidth: number,
  userDefault: number,
): number => {
  const minGap = nodeWidth + MIN_ARROW_PX;
  if (depth <= 0) return minGap;
  const fittable =
    (containerWidth - nodeWidth - 2 * BADGE_EXTENT - 2 * H_PADDING_PX) /
    (2 * depth);
  return Math.max(minGap, Math.min(fittable, userDefault));
};

/**
 * How many rows fit in the container height given the row gap and tallest
 * node. Columns with more nodes than this collapse their overflow into the
 * bottom "+N" badge (see layout.ts maxRows). At least 1.
 */
export const fitRows = (
  containerHeight: number,
  rowGap: number,
  nodeHeight: number,
): number => {
  const usable = containerHeight - 2 * V_PADDING_PX - nodeHeight;
  return Math.max(1, Math.floor(usable / rowGap) + 1);
};
