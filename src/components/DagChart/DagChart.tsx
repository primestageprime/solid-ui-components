import { createMemo, createEffect, createSignal, on, For, onMount, onCleanup } from "solid-js";
import type { DAGProps, PositionedNode } from "./types";
import { computeLayout } from "./layout";
import { collapseGraph } from "./collapse";
import { createPanZoom } from "./pan-zoom";
import "./DagChart.css";

const RESPONSIVE_BREAKPOINT = 640;

type Rect = { x: number; y: number; width: number; height: number };
type Point = { x: number; y: number };

/** Clip a point to the boundary of a rectangle, moving it along the line from center to point. */
function clipToRect(point: Point, center: Point, rect: Rect): Point {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  if (dx === 0 && dy === 0) return point;

  const halfW = rect.width / 2;
  const halfH = rect.height / 2;

  // Find the intersection with the rectangle boundary
  const scaleX = dx !== 0 ? halfW / Math.abs(dx) : Infinity;
  const scaleY = dy !== 0 ? halfH / Math.abs(dy) : Infinity;
  const scale = Math.min(scaleX, scaleY);

  return { x: center.x + dx * scale, y: center.y + dy * scale };
}

/** Convert an array of {x,y} points into a smooth SVG path, clipping endpoints to node boundaries. */
function buildEdgePath(
  points: Point[],
  sourceRect: Rect | undefined,
  targetRect: Rect | undefined,
): string {
  if (points.length < 2) return "";

  // Clone points so we can modify endpoints
  const pts = points.map((p) => ({ ...p }));

  // Clip start point to source node boundary
  if (sourceRect && pts.length >= 2) {
    const center = { x: sourceRect.x, y: sourceRect.y };
    pts[0] = clipToRect(pts[1], center, sourceRect);
  }

  // Clip end point to target node boundary
  if (targetRect && pts.length >= 2) {
    const center = { x: targetRect.x, y: targetRect.y };
    pts[pts.length - 1] = clipToRect(pts[pts.length - 2], center, targetRect);
  }

  const start = pts[0];
  const end = pts[pts.length - 1];

  if (pts.length === 2) {
    return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
  }

  let d = `M ${start.x} ${start.y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const ctrl = pts[i];
    const next = pts[i + 1];
    const mx = (ctrl.x + next.x) / 2;
    const my = (ctrl.y + next.y) / 2;
    d += ` Q ${ctrl.x} ${ctrl.y} ${mx} ${my}`;
  }
  d += ` L ${end.x} ${end.y}`;
  return d;
}

export function DagChart<T>(props: DAGProps<T>) {
  let svgRef: SVGSVGElement | undefined;
  let containerRef: HTMLDivElement | undefined;

  const [containerWidth, setContainerWidth] = createSignal(0);
  const [containerHeight, setContainerHeight] = createSignal(0);
  const [autoDirection, setAutoDirection] = createSignal<"horizontal" | "vertical">("vertical");

  const direction = createMemo(() => props.direction ?? autoDirection());

  const { transformString, fitToView, handlers } = createPanZoom();

  // Collapse graph around focused node
  const collapsed = createMemo(() =>
    collapseGraph(props.nodes, props.edges, props.focusedNodeId),
  );

  // Extract collapsed nodes as plain DAGNode array for layout
  const collapsedNodes = createMemo(() => collapsed().visibleNodes.map((v) => v.node));
  const collapsedEdges = createMemo(() => collapsed().visibleEdges);

  // Build a lookup from node id → NodeRenderState for merging with layout positions
  const stateMap = createMemo(() =>
    new Map(collapsed().visibleNodes.map((v) => [v.node.id, v.state])),
  );

  // Compute layout
  const layout = createMemo(() =>
    computeLayout(collapsedNodes(), collapsedEdges(), direction(), props.nodeSize),
  );

  // Merge layout positions with node data and render state into PositionedNode[]
  const positionedNodes = createMemo((): PositionedNode<T>[] => {
    const { positions } = layout();
    return collapsedNodes().flatMap((node) => {
      const pos = positions.get(node.id);
      const state = stateMap().get(node.id);
      if (!pos || !state) return [];
      return [{ node, x: pos.x, y: pos.y, width: pos.width, height: pos.height, state }];
    });
  });

  // Fit to view whenever the layout dimensions change
  createEffect(
    on(
      () => [layout().totalWidth, layout().totalHeight] as const,
      ([w, h]) => {
        fitToView(w, h, containerWidth(), containerHeight());
      },
    ),
  );

  // Auto-detect direction from container width via ResizeObserver
  onMount(() => {
    if (!containerRef) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setContainerWidth(width);
      setContainerHeight(height);
      if (!props.direction) {
        setAutoDirection(width < RESPONSIVE_BREAKPOINT ? "vertical" : "horizontal");
      }
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
        class="sui-dag"
        onPointerDown={handlers.onPointerDown}
        onPointerMove={handlers.onPointerMove}
        onPointerUp={handlers.onPointerUp}
        onWheel={handlers.onWheel}
      >
        <g transform={transformString()}>
          {/* Edges */}
          <For each={layout().edges}>
            {(edge) => {
              const positions = layout().positions;
              const sourceRect = positions.get(edge.sourceId);
              const targetRect = positions.get(edge.targetId);
              return (
                <path
                  class="sui-dag__edge"
                  d={buildEdgePath(edge.points, sourceRect, targetRect)}
                />
              );
            }}
          </For>

          {/* Nodes */}
          <For each={positionedNodes()}>
            {(positioned) => (
              <foreignObject
                x={positioned.x - positioned.width / 2}
                y={positioned.y - positioned.height / 2}
                width={positioned.width}
                height={positioned.height}
                class="sui-dag__node-wrapper"
              >
                <div
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => handleNodeClick(positioned.node.id)}
                  style={{ width: "100%", height: "100%", cursor: "pointer" }}
                >
                  {props.renderNode(positioned.node, positioned.state)}
                </div>
              </foreignObject>
            )}
          </For>
        </g>
      </svg>
    </div>
  );
}
