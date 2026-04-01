import { createMemo, createEffect, createSignal, on, For, onMount, onCleanup } from "solid-js";
import type { DAGProps, PositionedNode } from "./types";
import { computeLayout } from "./layout";
import { collapseGraph } from "./collapse";
import { createPanZoom } from "./pan-zoom";
import "./DagChart.css";

const RESPONSIVE_BREAKPOINT = 640;

type Rect = { x: number; y: number; width: number; height: number };
type Point = { x: number; y: number };

/**
 * Find where the line from `from` toward `to` exits `rect` (centered at `from`).
 * Returns the intersection point on the rectangle boundary.
 */
function clipToRectBoundary(from: Point, to: Point, rect: Rect): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 0 && dy === 0) return from;

  const halfW = rect.width / 2;
  const halfH = rect.height / 2;

  const scaleX = dx !== 0 ? halfW / Math.abs(dx) : Infinity;
  const scaleY = dy !== 0 ? halfH / Math.abs(dy) : Infinity;
  const scale = Math.min(scaleX, scaleY);

  return { x: from.x + dx * scale, y: from.y + dy * scale };
}

/** Convert points into a smooth SVG path, clipping endpoints to node boundaries. */
function buildEdgePath(
  points: Point[],
  sourceRect: Rect | undefined,
  targetRect: Rect | undefined,
): string {
  if (points.length < 2) return "";

  const pts = points.map((p) => ({ ...p }));

  // Clip start: from source center outward toward the next waypoint
  if (sourceRect) {
    const center = { x: sourceRect.x, y: sourceRect.y };
    pts[0] = clipToRectBoundary(center, pts[1], sourceRect);
  }

  // Clip end: from target center outward toward the previous waypoint
  if (targetRect) {
    const center = { x: targetRect.x, y: targetRect.y };
    pts[pts.length - 1] = clipToRectBoundary(center, pts[pts.length - 2], targetRect);
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

  const { transformString, fitToView, pointerHandlers, onWheel } = createPanZoom();

  // Always layout the FULL graph to preserve node ordering across focus changes
  const fullLayout = createMemo(() =>
    computeLayout(props.nodes, props.edges, direction(), props.nodeSize),
  );

  // Collapse determines which nodes are visible and which become summaries
  const collapsed = createMemo(() =>
    collapseGraph(props.nodes, props.edges, props.focusedNodeId),
  );

  const stateMap = createMemo(() =>
    new Map(collapsed().visibleNodes.map((v) => [v.node.id, v.state])),
  );

  // Merge full-graph positions with collapse state.
  // Real nodes use their full-graph position. Summary nodes (__collapsed_<beyondId>)
  // use the position of the first hidden node from the full graph.
  const DEFAULT_SIZE: [number, number] = [180, 60];

  const positionedNodes = createMemo((): PositionedNode<T>[] => {
    const positions = fullLayout().positions;
    return collapsed().visibleNodes.flatMap(({ node, state }) => {
      const pos = positions.get(node.id);
      if (pos) {
        return [{ node, x: pos.x, y: pos.y, width: pos.width, height: pos.height, state }];
      }
      // Summary node: extract beyondId from __collapsed_<beyondId> and use its position
      const beyondId = node.id.startsWith("__collapsed_") ? node.id.slice(12) : null;
      const fallbackPos = beyondId ? positions.get(beyondId) : undefined;
      if (fallbackPos) {
        const size = props.nodeSize ? props.nodeSize(node) : DEFAULT_SIZE;
        return [{ node, x: fallbackPos.x, y: fallbackPos.y, width: size[0], height: size[1], state }];
      }
      return [];
    });
  });

  // Positions map: real nodes from full layout + summary nodes from positionedNodes
  const positions = createMemo(() => {
    const map = new Map(fullLayout().positions);
    for (const pn of positionedNodes()) {
      if (!map.has(pn.node.id)) {
        map.set(pn.node.id, { x: pn.x, y: pn.y, width: pn.width, height: pn.height });
      }
    }
    return map as ReadonlyMap<string, { x: number; y: number; width: number; height: number }>;
  });

  // Edges: filter full-graph edges to visible pairs + summary edges from collapse
  const visibleEdges = createMemo(() => collapsed().visibleEdges);

  // Fit to view based on visible nodes' bounding box
  const viewBounds = createMemo(() => {
    const nodes = positionedNodes();
    if (nodes.length === 0) return { width: 0, height: 0 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
      minX = Math.min(minX, n.x - n.width / 2);
      minY = Math.min(minY, n.y - n.height / 2);
      maxX = Math.max(maxX, n.x + n.width / 2);
      maxY = Math.max(maxY, n.y + n.height / 2);
    }
    return { width: maxX - minX, height: maxY - minY };
  });

  createEffect(
    on(
      () => [viewBounds().width, viewBounds().height] as const,
      ([w, h]) => fitToView(w, h, containerWidth(), containerHeight()),
    ),
  );

  // Attach wheel handler imperatively with { passive: false } so preventDefault works
  onMount(() => {
    if (!svgRef) return;
    const handler = onWheel as EventListener;
    svgRef.addEventListener("wheel", handler, { passive: false });
    onCleanup(() => svgRef!.removeEventListener("wheel", handler));
  });

  // Auto-detect direction from container width via ResizeObserver
  onMount(() => {
    if (!containerRef) return;
    if (typeof ResizeObserver === "undefined") return;

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
        onPointerDown={pointerHandlers.onPointerDown}
        onPointerMove={pointerHandlers.onPointerMove}
        onPointerUp={pointerHandlers.onPointerUp}
      >
        <g transform={transformString()}>
          {/* Edges */}
          <For each={visibleEdges()}>
            {(edge) => {
              const sourceRect = positions().get(edge.source);
              const targetRect = positions().get(edge.target);
              if (!sourceRect || !targetRect) return null;

              // Check if the full layout has a computed path for this edge
              const fullEdge = fullLayout().edges.find(
                (e) => e.sourceId === edge.source && e.targetId === edge.target,
              );
              const points = fullEdge
                ? fullEdge.points
                : [{ x: sourceRect.x, y: sourceRect.y }, { x: targetRect.x, y: targetRect.y }];

              return (
                <path
                  class="sui-dag__edge"
                  d={buildEdgePath(points, sourceRect, targetRect)}
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
