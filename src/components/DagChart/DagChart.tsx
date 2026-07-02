// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
import {
  createMemo,
  createEffect,
  createSignal,
  on,
  For,
  Show,
  onMount,
  onCleanup,
} from "solid-js";
import type { DAGProps, PositionedNode } from "./types";
import { computeLayout, type LayoutResult } from "./layout";
import { collapseGraph } from "./collapse";
import { createPanZoom } from "./pan-zoom";
import { clipPolyline, buildEdgePath, polylineMidpoint } from "./edge-path";
import { DagArrowMarker, DagSvgNode, DagSvgEdge } from "../../internal/dag-svg";
import "./DagChart.css";

const _RESPONSIVE_BREAKPOINT = 640;

export function DagChart<T>(props: DAGProps<T>) {
  let svgRef: SVGSVGElement | undefined;
  let containerRef: HTMLDivElement | undefined;

  const [containerWidth, setContainerWidth] = createSignal(0);
  const [containerHeight, setContainerHeight] = createSignal(0);
  const [autoDirection, setAutoDirection] = createSignal<
    "horizontal" | "vertical"
  >("vertical");

  const direction = createMemo(() => props.direction ?? autoDirection());

  const {
    transformString,
    fitToView,
    centerOnPoint,
    pointerHandlers,
    onWheel,
  } = createPanZoom();

  // Always layout the FULL graph to preserve node ordering across focus changes
  const EMPTY: LayoutResult = {
    positions: new Map(),
    edges: [],
    totalWidth: 0,
    totalHeight: 0,
  };

  const fullLayout = createMemo(() => {
    try {
      return computeLayout(
        props.nodes,
        props.edges,
        direction(),
        props.nodeSize,
        props.nodeRank,
      );
    } catch (err) {
      console.error("[DagChart] fullLayout memo failed:", err);
      return EMPTY;
    }
  });

  // Collapse determines which nodes are visible and which become summaries
  const collapsed = createMemo(() =>
    collapseGraph(props.nodes, props.edges, props.focusedNodeId),
  );

  const _stateMap = createMemo(
    () => new Map(collapsed().visibleNodes.map((v) => [v.node.id, v.state])),
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
        return [
          {
            node,
            x: pos.x,
            y: pos.y,
            width: pos.width,
            height: pos.height,
            state,
          },
        ];
      }
      // Summary node: extract beyondId from __collapsed_<beyondId> and use its position
      const beyondId = node.id.startsWith("__collapsed_")
        ? node.id.slice(12)
        : null;
      const fallbackPos = beyondId ? positions.get(beyondId) : undefined;
      if (fallbackPos) {
        const size = props.nodeSize ? props.nodeSize(node) : DEFAULT_SIZE;
        return [
          {
            node,
            x: fallbackPos.x,
            y: fallbackPos.y,
            width: size[0],
            height: size[1],
            state,
          },
        ];
      }
      return [];
    });
  });

  // Positions map: real nodes from full layout + summary nodes from positionedNodes
  const positions = createMemo(() => {
    const map = new Map(fullLayout().positions);
    for (const pn of positionedNodes()) {
      if (!map.has(pn.node.id)) {
        map.set(pn.node.id, {
          x: pn.x,
          y: pn.y,
          width: pn.width,
          height: pn.height,
        });
      }
    }
    return map as ReadonlyMap<
      string,
      { x: number; y: number; width: number; height: number }
    >;
  });

  // Precompute edge SVG path strings reactively (depends on both visibleEdges and layout positions)
  const edgePaths = createMemo(() => {
    const pos = positions();
    const fullEdges = fullLayout().edges;
    // Build a label lookup by (source, target) so we can recover labels from
    // the original DAGEdge[] (collapsed().visibleEdges may strip them).
    const labelByPair = new Map<string, string>();
    for (const e of props.edges) {
      if (e.label) labelByPair.set(`${e.source}|${e.target}`, e.label);
    }
    return collapsed().visibleEdges.flatMap((edge) => {
      const sourceRect = pos.get(edge.source);
      const targetRect = pos.get(edge.target);
      if (!sourceRect || !targetRect) return [];

      const fullEdge = fullEdges.find(
        (e) => e.sourceId === edge.source && e.targetId === edge.target,
      );
      const rawPoints = fullEdge
        ? fullEdge.points
        : [
            { x: sourceRect.x, y: sourceRect.y },
            { x: targetRect.x, y: targetRect.y },
          ];

      // Clip the polyline to the node boundaries so the midpoint (used for
      // both labels and the delete badge) lives in the free space between
      // nodes — otherwise short edges put it inside the target node.
      const clipped = clipPolyline(rawPoints, sourceRect, targetRect);
      const label = labelByPair.get(`${edge.source}|${edge.target}`);
      const mid = polylineMidpoint(clipped);
      return [
        {
          d: buildEdgePath(clipped),
          label,
          midX: mid.x,
          midY: mid.y,
          source: edge.source,
          target: edge.target,
        },
      ];
    });
  });

  // Fit to view: center on focused node if one exists, otherwise fit all visible nodes
  const viewBounds = createMemo(() => {
    const nodes = positionedNodes();
    if (nodes.length === 0)
      return { width: 0, height: 0, centerX: 0, centerY: 0 };
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const n of nodes) {
      minX = Math.min(minX, n.x - n.width / 2);
      minY = Math.min(minY, n.y - n.height / 2);
      maxX = Math.max(maxX, n.x + n.width / 2);
      maxY = Math.max(maxY, n.y + n.height / 2);
    }
    return {
      width: maxX - minX,
      height: maxY - minY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
    };
  });

  // Find the focused node's position for centering
  const focusedPosition = createMemo(() => {
    if (!props.focusedNodeId) return null;
    const node = positionedNodes().find(
      (n) => n.node.id === props.focusedNodeId,
    );
    return node ? { x: node.x, y: node.y } : null;
  });

  createEffect(
    on(
      () =>
        [
          viewBounds(),
          focusedPosition(),
          containerWidth(),
          containerHeight(),
        ] as const,
      ([bounds, focused, cw, ch]) => {
        if (focused) {
          centerOnPoint(focused.x, focused.y, cw, ch);
        } else {
          fitToView(
            bounds.width,
            bounds.height,
            cw,
            ch,
            bounds.centerX,
            bounds.centerY,
          );
        }
      },
    ),
  );

  const interactive = () => props.interactive !== false;
  const arrows = () => props.arrows !== false;

  // Attach wheel handler imperatively with { passive: false } so preventDefault works.
  // Skipped when interactive=false — the chart becomes fit-to-view and static.
  onMount(() => {
    const svg = svgRef;
    if (!svg) return;
    if (!interactive()) return;
    const handler = onWheel as EventListener;
    svg.addEventListener("wheel", handler, { passive: false });
    onCleanup(() => svg.removeEventListener("wheel", handler));
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
        // Default to vertical (most DAGs are deeper than wide). Only switch to
        // horizontal when the container is very wide and short (e.g. landscape > 2:1).
        setAutoDirection(width > height * 2 ? "horizontal" : "vertical");
      }
    });

    observer.observe(containerRef);
    onCleanup(() => observer.disconnect());
  });

  const handleNodeClick = (nodeId: string) => {
    props.onNodeClick?.(nodeId);
  };

  const [hoveredEdge, setHoveredEdge] = createSignal<string | null>(null);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
      <svg
        ref={svgRef}
        class="sui-dag"
        role="img"
        aria-label="Dependency graph"
        onPointerDown={
          interactive() ? pointerHandlers.onPointerDown : undefined
        }
        onPointerMove={
          interactive() ? pointerHandlers.onPointerMove : undefined
        }
        onPointerUp={interactive() ? pointerHandlers.onPointerUp : undefined}
      >
        <defs>
          {/* Arrowhead marker shared by every edge. `currentColor` defers
              to the edge stroke (set in CSS) so theming flows naturally. */}
          <DagArrowMarker id="sui-dag-arrow" pathClass="sui-dag__arrow" />
        </defs>
        <g transform={transformString()}>
          {/* Edges */}
          <For each={edgePaths()}>
            {(edge) => {
              const edgeKey = `${edge.source}|${edge.target}`;
              const deletable = () => !!props.onEdgeClick;
              const deleteEdge = () =>
                props.onEdgeClick?.(edge.source, edge.target);
              return (
                <>
                  <Show when={deletable()}>
                    {/* biome-ignore lint/a11y/useSemanticElements: role="button" on an SVG <path>; a native <button> cannot live inside the SVG coordinate space */}
                    <path
                      class="sui-dag__edge-hitarea"
                      d={edge.d}
                      stroke="transparent"
                      stroke-width="14"
                      fill="none"
                      role="button"
                      tabIndex={0}
                      aria-label={`Delete edge from ${edge.source} to ${edge.target}`}
                      onPointerEnter={() => setHoveredEdge(edgeKey)}
                      onPointerLeave={() =>
                        setHoveredEdge((h) => (h === edgeKey ? null : h))
                      }
                      onClick={deleteEdge}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          deleteEdge();
                        }
                      }}
                    />
                  </Show>
                  <DagSvgEdge
                    class={`sui-dag__edge${
                      props.highlightedEdges?.has(edgeKey)
                        ? " sui-dag__edge--highlighted"
                        : ""
                    }`}
                    d={edge.d}
                    arrowMarkerId={arrows() ? "sui-dag-arrow" : undefined}
                  />
                  <Show when={edge.label}>
                    <g
                      class="sui-dag__edge-label-wrap"
                      transform={`translate(${edge.midX}, ${edge.midY})`}
                    >
                      <rect
                        class="sui-dag__edge-label-bg"
                        x={-(edge.label!.length * 3.5 + 6)}
                        y={-9}
                        width={edge.label!.length * 7 + 12}
                        height={18}
                        rx={9}
                      />
                      <text
                        class="sui-dag__edge-label"
                        text-anchor="middle"
                        dominant-baseline="middle"
                      >
                        {edge.label}
                      </text>
                    </g>
                  </Show>
                </>
              );
            }}
          </For>

          {/* Nodes */}
          <For each={positionedNodes()}>
            {(positioned) => (
              <DagSvgNode
                node={positioned.node}
                state={positioned.state}
                x={positioned.x}
                y={positioned.y}
                width={positioned.width}
                height={positioned.height}
                wrapperClass="sui-dag__node-wrapper"
                onClick={handleNodeClick}
                renderNode={props.renderNode}
              />
            )}
          </For>

          {/* Edge delete badges — drawn LAST so they paint above nodes,
              and rendered unconditionally (opacity-gated) so the hover
              hitbox never disappears mid-cursor-move. */}
          <For each={edgePaths()}>
            {(edge) => {
              const edgeKey = `${edge.source}|${edge.target}`;
              return (
                <Show when={!!props.onEdgeClick}>
                  {/* biome-ignore lint/a11y/useSemanticElements: role="button" on an SVG <g> badge; a native <button> cannot live inside the SVG coordinate space */}
                  <g
                    class="sui-dag__edge-delete"
                    transform={`translate(${edge.midX}, ${edge.midY})`}
                    pointer-events="all"
                    role="button"
                    tabIndex={0}
                    aria-label={`Delete edge from ${edge.source} to ${edge.target}`}
                    onPointerEnter={() => setHoveredEdge(edgeKey)}
                    onPointerLeave={() =>
                      setHoveredEdge((h) => (h === edgeKey ? null : h))
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      props.onEdgeClick?.(edge.source, edge.target);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        props.onEdgeClick?.(edge.source, edge.target);
                      }
                    }}
                    style={{
                      cursor: "pointer",
                      opacity: hoveredEdge() === edgeKey ? 1 : 0,
                      transition: "opacity 0.1s ease",
                    }}
                  >
                    {/* Invisible larger hit circle so the badge always has a
                        clickable area even when its visual opacity is 0. */}
                    <circle r={12} fill="transparent" />
                    <circle r={9} stroke-width={1.5} />
                    <text text-anchor="middle" dominant-baseline="central">
                      ×
                    </text>
                  </g>
                </Show>
              );
            }}
          </For>
        </g>
      </svg>
    </div>
  );
}
