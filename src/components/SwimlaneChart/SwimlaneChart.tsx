import {
  createMemo,
  createEffect,
  createSignal,
  on,
  For,
  onMount,
  onCleanup,
  type JSX,
} from "solid-js";
import type { DAGNode, DAGEdge, NodeRenderState } from "../DagChart/types";
import { createPanZoom } from "../DagChart/pan-zoom";
import { DagArrowMarker, DagSvgNode, DagSvgEdge, bezierThroughChannelPath } from "../DagChart/svg";
import { computeSwimlaneLayout } from "./layout";
import "./SwimlaneChart.css";

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
};

const DEFAULT_SIZE: [number, number] = [180, 60];

export function SwimlaneChart<T>(props: SwimlaneChartProps<T>) {
  let svgRef: SVGSVGElement | undefined;
  let containerRef: HTMLDivElement | undefined;

  const [containerWidth, setContainerWidth] = createSignal(0);
  const [containerHeight, setContainerHeight] = createSignal(0);

  const { transformString, centerOnPoint, fitToView, pointerHandlers, onWheel } = createPanZoom();

  const nodeSize = (node: DAGNode<T>): [number, number] =>
    props.nodeSize ? props.nodeSize(node) : DEFAULT_SIZE;

  // Responsive sizing constants. Arrows compress until they hit the
  // minimum visible length, then we start collapsing outer-ring nodes
  // into summary stubs via maxDepth reduction.
  const MIN_ARROW_PX = 50;
  const H_PADDING_PX = 32;
  const DEPTH_STEP_PX = 100; // each ring of collapse buys ~100px

  const widestNodeWidth = createMemo(() => {
    let max = 0;
    for (const n of props.nodes) {
      const [w] = nodeSize(n);
      if (w > max) max = w;
    }
    return max || DEFAULT_SIZE[0];
  });

  // Width required to display `2*depth + 1` columns (i.e., depth rings on
  // each side of center) at minimum arrow length. Boundary badges sit
  // outside that — accounted for via BADGE_EXTENT.
  const BADGE_EXTENT = 50; // STUB_LENGTH (28) + 2*BADGE_RADIUS (22)
  const widthForDepth = (depth: number) => {
    const nw = widestNodeWidth();
    const cols = 2 * depth + 1;
    // cols columns + (cols-1) arrows + 2 boundary badges (only when outer
    // ring is collapsed, i.e., when depth < userMaxDepth) + padding
    return cols * nw + (cols - 1) * MIN_ARROW_PX + 2 * BADGE_EXTENT + 2 * H_PADDING_PX;
  };

  // Largest depth that fits in the container, capped at userMaxDepth.
  // Discrete: step down by 1 until we fit (or hit 0).
  const effectiveMaxDepth = createMemo(() => {
    const userMax = props.maxDepth ?? 2;
    const cw = containerWidth();
    if (cw === 0) return userMax;
    for (let d = userMax; d > 0; d--) {
      if (cw >= widthForDepth(d)) return d;
    }
    return 0;
  });

  const effectiveColumnGap = createMemo(() => {
    const cw = containerWidth();
    const nw = widestNodeWidth();
    const userDefault = props.columnGap ?? 260;
    if (cw === 0) return userDefault;
    const depth = effectiveMaxDepth();
    const minGap = nw + MIN_ARROW_PX;
    const cols = 2 * depth + 1;
    if (cols <= 1) return minGap;
    // Center-to-center gap that uses the available horizontal space.
    //   cw = (cols-1)*gap + nw + 2*BADGE_EXTENT + 2*padding
    //   gap = (cw - nw - 2*BADGE_EXTENT - 2*padding) / (cols-1)
    const fittable = (cw - nw - 2 * BADGE_EXTENT - 2 * H_PADDING_PX) / (cols - 1);
    return Math.max(minGap, Math.min(fittable, userDefault));
  });
  // Retained for forward compat; not used in the new discrete algorithm.
  void DEPTH_STEP_PX;

  const layout = createMemo(() => {
    try {
      return computeSwimlaneLayout(props.nodes, props.edges, {
        swimlaneFor: props.swimlaneFor,
        nodeSize,
        maxDepth: effectiveMaxDepth(),
        columnGap: effectiveColumnGap(),
        rowGap: props.rowGap ?? 80,
      });
    } catch (err) {
      console.error("[SwimlaneChart] layout failed:", err);
      return { positions: new Map(), edges: [], totalWidth: 0, totalHeight: 0, summaries: [] };
    }
  });

  // Visible items: real nodes whose IDs appear in layout.positions, plus synthetic summary nodes.
  type Item = {
    id: string;
    node: DAGNode<T>;
    x: number;
    y: number;
    width: number;
    height: number;
    state: NodeRenderState;
  };

  const items = createMemo((): Item[] => {
    const positions = layout().positions;
    const out: Item[] = [];
    for (const node of props.nodes) {
      const pos = positions.get(node.id);
      if (!pos) continue;
      out.push({
        id: node.id,
        node,
        x: pos.x,
        y: pos.y,
        width: pos.width,
        height: pos.height,
        state: { kind: "normal" },
      });
    }
    // Summaries are NOT rendered as node boxes — they become boundary
    // badges on the arrows. See boundaryBadges() below.
    return out;
  });

  // Animation layer: track items that just disappeared and keep rendering
  // them with `leaving=true` for one animation cycle before removing them
  // from the DOM. Lets the consumer's CSS shrink them out gracefully.
  const NODE_LEAVE_MS = 220;
  const [leavingItems, setLeavingItems] = createSignal<Item[]>([]);

  createEffect(
    on(items, (current, prev) => {
      if (!prev) return;
      const currentIds = new Set(current.map((i) => i.id));
      const newlyLeft = prev.filter((p) => !currentIds.has(p.id));
      if (newlyLeft.length === 0) return;
      // Drop any items in the leaving set that have re-appeared in the
      // current visible set, then append the new ones.
      setLeavingItems((prevLeaving) => {
        const stillLeaving = prevLeaving.filter((p) => !currentIds.has(p.id));
        const stillLeavingIds = new Set(stillLeaving.map((p) => p.id));
        const fresh = newlyLeft.filter((n) => !stillLeavingIds.has(n.id));
        return [...stillLeaving, ...fresh];
      });
      const removedIds = new Set(newlyLeft.map((n) => n.id));
      setTimeout(() => {
        setLeavingItems((prevLeaving) =>
          prevLeaving.filter((p) => !removedIds.has(p.id)),
        );
      }, NODE_LEAVE_MS);
    }),
  );

  const edgeViews = createMemo(() => {
    const positions = layout().positions;
    return layout().edges.flatMap((e) => {
      const s = positions.get(e.sourceId);
      const t = positions.get(e.targetId);
      if (!s || !t) return [];
      // Skip synthetic edges to/from collapsed-summary placeholders —
      // those render as boundary badges, not full arrows.
      if (
        e.sourceId.startsWith("__collapsed_") ||
        e.targetId.startsWith("__collapsed_")
      ) {
        return [];
      }
      // Path follows the edge's data direction (source -> target) so the
      // arrowhead (marker-end) lands at the target = dependent.
      return [{
        d: bezierThroughChannelPath(s, t),
        isSummary: false,
        key: `${e.sourceId}|${e.targetId}`,
      }];
    });
  });

  // Boundary badges: one short stub + count circle per summary group.
  // Replaces the previous "summary node" boxes. Position is the outer
  // edge of the visible anchor in the direction of the collapsed nodes.
  const STUB_LENGTH = 28;
  const BADGE_RADIUS = 11;

  // Aggregate summaries by (anchor, side) so each visible anchor gets at
  // most one badge per side, and the count reflects the entire collapsed
  // subtree on that side — not just the closest ring of hidden nodes.
  const boundaryBadges = createMemo(() => {
    const positions = layout().positions;
    const edges = layout().edges;
    const gap = effectiveColumnGap();

    type Aggregated = { anchorId: string; dir: -1 | 1; count: number };
    const grouped = new Map<string, Aggregated>();

    for (const s of layout().summaries) {
      const anchorPos = positions.get(s.anchorId);
      if (!anchorPos) continue;
      // Anchor's col index from its center x.
      const anchorCol = gap > 0 ? Math.round(anchorPos.x / gap) : 0;
      let dir: -1 | 1;
      if (s.column < anchorCol) dir = -1;
      else if (s.column > anchorCol) dir = 1;
      else {
        const edge = edges.find(
          (e) => e.sourceId === s.id || e.targetId === s.id,
        );
        dir = edge && edge.targetId === s.anchorId ? -1 : 1;
      }
      const key = `${s.anchorId}|${dir}`;
      const existing = grouped.get(key);
      if (existing) existing.count += s.collapsedCount;
      else grouped.set(key, { anchorId: s.anchorId, dir, count: s.collapsedCount });
    }

    return Array.from(grouped.entries()).flatMap(([key, g]) => {
      const anchorPos = positions.get(g.anchorId);
      if (!anchorPos) return [];
      const dir = g.dir;
      const anchorOuterX = anchorPos.x + dir * (anchorPos.width / 2);
      // Both sides flow left -> right (dep-flow direction). The line ends
      // at the badge's *inner* edge so the arrowhead is always visible
      // next to the badge, never hidden underneath it. The badge then sits
      // outside the arrowhead.
      //   Left:  [N]──→ DOING   (arrowhead at DOING's left edge, badge further left)
      //   Right: DOING ──→[N]   (arrowhead at badge's left edge, badge further right)
      const arrowStart =
        dir === -1
          ? anchorOuterX - STUB_LENGTH
          : anchorOuterX;
      const arrowEnd =
        dir === -1
          ? anchorOuterX
          : anchorOuterX + STUB_LENGTH;
      const badgeX =
        dir === -1
          ? arrowStart - BADGE_RADIUS
          : arrowEnd + BADGE_RADIUS;
      return [{
        key,
        d: `M ${arrowStart} ${anchorPos.y} L ${arrowEnd} ${anchorPos.y}`,
        badgeX,
        badgeY: anchorPos.y,
        count: g.count,
      }];
    });
  });

  // Bounding box of all positioned content (real nodes + boundary badges).
  const viewBounds = createMemo(() => {
    const positions = layout().positions;
    if (positions.size === 0) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0, centerX: 0, centerY: 0, width: 0, height: 0 };
    }
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of positions.values()) {
      minX = Math.min(minX, p.x - p.width / 2);
      maxX = Math.max(maxX, p.x + p.width / 2);
      minY = Math.min(minY, p.y - p.height / 2);
      maxY = Math.max(maxY, p.y + p.height / 2);
    }
    for (const b of boundaryBadges()) {
      minX = Math.min(minX, b.badgeX - BADGE_RADIUS);
      maxX = Math.max(maxX, b.badgeX + BADGE_RADIUS);
      minY = Math.min(minY, b.badgeY - BADGE_RADIUS);
      maxY = Math.max(maxY, b.badgeY + BADGE_RADIUS);
    }
    return {
      minX, maxX, minY, maxY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
      width: maxX - minX,
      height: maxY - minY,
    };
  });

  // Always pin DOING (x=0) to the viewport horizontal center at scale 1.
  // Node sizes are bounded below by their natural dimensions — we never
  // scale the chart down to fit a too-narrow container; instead the chart
  // overflows the container (clipped by CSS overflow:hidden), or the user
  // pans interactively.
  void fitToView;
  createEffect(
    on(
      () => [viewBounds(), containerWidth(), containerHeight()] as const,
      ([bounds, cw, ch]) => {
        if (cw === 0 || ch === 0) return;
        centerOnPoint(0, bounds.centerY, cw, ch);
      },
    ),
  );

  const interactive = () => props.interactive !== false;
  const arrows = () => props.arrows !== false;

  // Wheel listener with { passive: false } so preventDefault works. Skipped when non-interactive.
  onMount(() => {
    const svg = svgRef;
    if (!svg) return;
    if (!interactive()) return;
    const handler = onWheel as EventListener;
    svg.addEventListener("wheel", handler, { passive: false });
    onCleanup(() => svg.removeEventListener("wheel", handler));
  });

  // ResizeObserver — capture container size for centering math.
  onMount(() => {
    if (!containerRef) return;
    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setContainerWidth(width);
      setContainerHeight(height);
    });

    observer.observe(containerRef);
    onCleanup(() => observer.disconnect());
  });

  const handleNodeClick = (nodeId: string) => {
    props.onNodeClick?.(nodeId);
  };

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
      <svg
        ref={svgRef}
        class="sui-swimlane"
        onPointerDown={interactive() ? pointerHandlers.onPointerDown : undefined}
        onPointerMove={interactive() ? pointerHandlers.onPointerMove : undefined}
        onPointerUp={interactive() ? pointerHandlers.onPointerUp : undefined}
      >
        <defs>
          <DagArrowMarker id="sui-swimlane-arrow" pathClass="sui-swimlane__arrow" />
        </defs>
        <g transform={transformString()}>
          {/* Edges */}
          <For each={edgeViews()}>
            {(edge) => (
              <DagSvgEdge
                class={`sui-swimlane__edge${
                  edge.isSummary ? " sui-swimlane__edge--summary" : ""
                }`}
                d={edge.d}
                arrowMarkerId={arrows() ? "sui-swimlane-arrow" : undefined}
              />
            )}
          </For>

          {/* Boundary badges — short stub arrows + count circles at the
              outer edge of anchors that have collapsed neighbors. */}
          <For each={boundaryBadges()}>
            {(b) => (
              <g class="sui-swimlane__boundary">
                <path
                  class="sui-swimlane__edge"
                  d={b.d}
                  marker-end={arrows() ? "url(#sui-swimlane-arrow)" : undefined}
                />
                <circle
                  class="sui-swimlane__boundary-badge"
                  cx={b.badgeX}
                  cy={b.badgeY}
                  r={BADGE_RADIUS}
                />
                <text
                  class="sui-swimlane__boundary-badge-text"
                  x={b.badgeX}
                  y={b.badgeY}
                  text-anchor="middle"
                  dominant-baseline="central"
                >
                  {b.count}
                </text>
              </g>
            )}
          </For>

          {/* Nodes (real only — summaries become boundary badges).
              Leaving items keep their last position while their CSS
              animation shrinks them out. */}
          <For each={items()}>
            {(item) => (
              <DagSvgNode
                node={item.node}
                state={item.state}
                x={item.x}
                y={item.y}
                width={item.width}
                height={item.height}
                wrapperClass="sui-swimlane__node-wrapper"
                onClick={handleNodeClick}
                renderNode={props.renderNode}
              />
            )}
          </For>
          <For each={leavingItems()}>
            {(item) => (
              <DagSvgNode
                node={item.node}
                state={item.state}
                x={item.x}
                y={item.y}
                width={item.width}
                height={item.height}
                wrapperClass="sui-swimlane__node-wrapper"
                renderNode={props.renderNode}
                leaving
                /* Slide toward chart center: left-side nodes slide right,
                   right-side nodes slide left. Distance scales with node
                   width so the motion reads cleanly at any size. */
                leavingOffsetX={
                  item.x < 0
                    ? item.width * 0.7
                    : item.x > 0
                      ? -item.width * 0.7
                      : 0
                }
              />
            )}
          </For>
        </g>
      </svg>
    </div>
  );
}
