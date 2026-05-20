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
import { computeSwimlaneLayout } from "./layout";
import "./SwimlaneChart.css";

export type SwimlaneChartProps<T> = {
  nodes: DAGNode<T>[];
  edges: DAGEdge[];
  /** Returns the column for a node: 0 (TODO), 1 (DOING), 2 (DONE). */
  swimlaneFor: (node: DAGNode<T>) => 0 | 1 | 2;
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

function edgePath(sx: number, sy: number, tx: number, ty: number): string {
  // Horizontal-biased cubic bezier: control points 40% of dx along the source/target.
  const dx = tx - sx;
  const cx1 = sx + dx * 0.4;
  const cx2 = tx - dx * 0.4;
  return `M ${sx} ${sy} C ${cx1} ${sy}, ${cx2} ${ty}, ${tx} ${ty}`;
}

export function SwimlaneChart<T>(props: SwimlaneChartProps<T>) {
  let svgRef: SVGSVGElement | undefined;
  let containerRef: HTMLDivElement | undefined;

  const [containerWidth, setContainerWidth] = createSignal(0);
  const [containerHeight, setContainerHeight] = createSignal(0);

  const { transformString, centerOnPoint, pointerHandlers, onWheel } = createPanZoom();

  const nodeSize = (node: DAGNode<T>): [number, number] =>
    props.nodeSize ? props.nodeSize(node) : DEFAULT_SIZE;

  const layout = createMemo(() => {
    try {
      return computeSwimlaneLayout(props.nodes, props.edges, {
        swimlaneFor: props.swimlaneFor,
        nodeSize,
        maxDepth: props.maxDepth ?? 2,
        columnGap: props.columnGap ?? 260,
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
    for (const s of layout().summaries) {
      const pos = positions.get(s.id);
      if (!pos) continue;
      const syntheticNode: DAGNode<T> = { id: s.id, data: {} as T };
      out.push({
        id: s.id,
        node: syntheticNode,
        x: pos.x,
        y: pos.y,
        width: pos.width,
        height: pos.height,
        state: { kind: "collapsed", collapsedCount: s.collapsedCount },
      });
    }
    return out;
  });

  const edgeViews = createMemo(() => {
    const positions = layout().positions;
    return layout().edges.flatMap((e) => {
      const s = positions.get(e.sourceId);
      const t = positions.get(e.targetId);
      if (!s || !t) return [];
      const isSummary =
        e.sourceId.startsWith("__collapsed_") || e.targetId.startsWith("__collapsed_");
      return [{
        d: edgePath(s.x, s.y, t.x, t.y),
        isSummary,
        key: `${e.sourceId}|${e.targetId}`,
      }];
    });
  });

  // Y-center of the union of positioned node rectangles (for vertical centering).
  const viewBoundsCenterY = createMemo(() => {
    const positions = layout().positions;
    if (positions.size === 0) return 0;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of positions.values()) {
      minY = Math.min(minY, p.y - p.height / 2);
      maxY = Math.max(maxY, p.y + p.height / 2);
    }
    return (minY + maxY) / 2;
  });

  // Pin DOING (x=0) to the viewport horizontal center, vertically center on bounds.
  createEffect(
    on(
      () => [viewBoundsCenterY(), containerWidth(), containerHeight()] as const,
      ([cy, cw, ch]) => {
        if (cw === 0 || ch === 0) return;
        centerOnPoint(0, cy, cw, ch);
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
          <marker
            id="sui-swimlane-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" class="sui-swimlane__arrow" />
          </marker>
        </defs>
        <g transform={transformString()}>
          {/* Edges */}
          <For each={edgeViews()}>
            {(edge) => (
              <path
                class={`sui-swimlane__edge${
                  edge.isSummary ? " sui-swimlane__edge--summary" : ""
                }`}
                d={edge.d}
                marker-end={arrows() ? "url(#sui-swimlane-arrow)" : undefined}
                style={{ "pointer-events": "none" }}
              />
            )}
          </For>

          {/* Nodes (real + summaries) */}
          <For each={items()}>
            {(item) => (
              <foreignObject
                x={item.x - item.width / 2}
                y={item.y - item.height / 2}
                width={item.width}
                height={item.height}
                class="sui-swimlane__node-wrapper"
              >
                <div
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => handleNodeClick(item.id)}
                  style={{ width: "100%", height: "100%", cursor: "pointer" }}
                >
                  {props.renderNode(item.node, item.state)}
                </div>
              </foreignObject>
            )}
          </For>
        </g>
      </svg>
    </div>
  );
}
