// ============================================
// DagChart — Atomic (Depth 1)
// Owns CSS (DagChart.css), no component imports.
// SVG directed acyclic graph using dagre layout.
// Nodes colored by status, clickable, with arrow edges.
// ============================================
import { Component, splitProps, For, Show, createMemo } from "solid-js";
import dagre from "dagre";
import type { ColorVariant } from "../../types";
import "./DagChart.css";

export interface DagNode {
  id: string;
  label: string;
  status: ColorVariant;
  metadata?: Record<string, string>;
  sublabel?: string;
  avatar?: string;
  estimate?: string;
  tags?: string[];
  description?: string;
  files?: string[];
}

export interface DagEdge {
  source: string;
  target: string;
}

export interface DagChartProps {
  nodes: DagNode[];
  edges: DagEdge[];
  onNodeClick?: (id: string) => void;
  direction?: "TB" | "LR";
  height?: number;
}

const NODE_W = 240;
const NODE_H = 90;
const PAD = 24;
const ARROW_SIZE = 6;
const INNER_PAD = 10;

/** Map a ColorVariant status to a CSS modifier class */
const statusClass = (status: ColorVariant): string => {
  switch (status) {
    case "success": return "sui-dag__node--success";
    case "warning": return "sui-dag__node--warning";
    case "danger":  return "sui-dag__node--danger";
    default:        return "sui-dag__node--pending";
  }
};

/** Truncate text with ellipsis at a character limit */
const truncate = (text: string, max: number): string =>
  text.length <= max ? text : text.slice(0, max - 1) + "…";

export const DagChart: Component<DagChartProps> = (props) => {
  const [local] = splitProps(props, [
    "nodes", "edges", "onNodeClick", "direction", "height",
  ]);

  const layout = createMemo(() => {
    const g = new dagre.graphlib.Graph();
    g.setGraph({
      rankdir: local.direction ?? "TB",
      nodesep: 40,
      ranksep: 60,
      marginx: PAD,
      marginy: PAD,
    });
    g.setDefaultEdgeLabel(() => ({}));

    for (const node of local.nodes) {
      g.setNode(node.id, { width: NODE_W, height: NODE_H });
    }
    for (const edge of local.edges) {
      g.setEdge(edge.source, edge.target);
    }

    dagre.layout(g);

    const nodePositions = new Map<string, { x: number; y: number }>();
    for (const id of g.nodes()) {
      const n = g.node(id);
      if (n) nodePositions.set(id, { x: n.x, y: n.y });
    }

    const edgePaths: { points: Array<{ x: number; y: number }> }[] = [];
    for (const e of g.edges()) {
      const edgeData = g.edge(e);
      if (edgeData?.points) {
        edgePaths.push({ points: edgeData.points });
      }
    }

    const graph = g.graph();
    const width = (graph.width ?? 300) + PAD;
    const height = (graph.height ?? 200) + PAD;

    return { nodePositions, edgePaths, width, height };
  });

  const svgW = () => layout().width;
  const svgH = () => local.height ?? layout().height;

  /** Build SVG path through dagre edge points */
  const edgePath = (points: Array<{ x: number; y: number }>): string => {
    if (points.length === 0) return "";
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y}`;
    }
    return d;
  };

  return (
    <svg
      class="sui-dag"
      width={svgW()}
      height={svgH()}
      viewBox={`0 0 ${svgW()} ${svgH()}`}
    >
      <defs>
        <marker
          id="sui-dag-arrow"
          viewBox={`0 0 ${ARROW_SIZE * 2} ${ARROW_SIZE * 2}`}
          refX={ARROW_SIZE * 2}
          refY={ARROW_SIZE}
          markerWidth={ARROW_SIZE}
          markerHeight={ARROW_SIZE}
          orient="auto"
        >
          <path
            d={`M 0 0 L ${ARROW_SIZE * 2} ${ARROW_SIZE} L 0 ${ARROW_SIZE * 2} Z`}
            class="sui-dag__arrow"
          />
        </marker>
      </defs>

      {/* Edges */}
      <For each={layout().edgePaths}>
        {(ep) => (
          <path
            d={edgePath(ep.points)}
            class="sui-dag__edge"
            marker-end="url(#sui-dag-arrow)"
          />
        )}
      </For>

      {/* Nodes */}
      <For each={local.nodes}>
        {(node) => {
          const pos = () => layout().nodePositions.get(node.id);
          const hasAvatar = () => !!node.avatar;
          const hasSublabel = () => !!node.sublabel;
          const hasEstimate = () => !!node.estimate;
          const hasTags = () => !!node.tags && node.tags.length > 0;
          const hasDescription = () => !!node.description;
          const hasFiles = () => !!node.files && node.files.length > 0;
          const avatarSize = 18;
          const avatarGap = 5;

          return (
            <Show when={pos()}>
              {(p) => {
                const left = () => p().x - NODE_W / 2;
                const top = () => p().y - NODE_H / 2;
                const right = () => left() + NODE_W;
                const bottom = () => top() + NODE_H;
                const clipId = () => `sui-dag-avatar-${node.id}`;

                // Three rows
                const topRowY = () => top() + 18;
                const midRowY = () => p().y;
                const bottomRowY = () => bottom() - 14;

                // Avatar in bottom-left
                const avatarX = () => left() + INNER_PAD;
                const avatarCenterY = () => bottomRowY();

                // Sublabel text: next to avatar if present, else at left
                const sublabelX = () =>
                  hasAvatar()
                    ? avatarX() + avatarSize + avatarGap
                    : left() + INNER_PAD;

                return (
                  <g
                    class={`sui-dag__node ${statusClass(node.status)} ${local.onNodeClick ? "sui-dag__node--clickable" : ""}`}
                    onClick={() => local.onNodeClick?.(node.id)}
                  >
                    <rect
                      x={left()}
                      y={top()}
                      width={NODE_W}
                      height={NODE_H}
                      rx={6}
                      ry={6}
                      class="sui-dag__node-rect"
                    />

                    {/* Top-left: task name */}
                    <text
                      x={left() + INNER_PAD}
                      y={topRowY()}
                      text-anchor="start"
                      dominant-baseline="central"
                      class="sui-dag__node-label"
                    >
                      {truncate(node.label, 28)}
                    </text>

                    {/* Top-right: estimate */}
                    <Show when={hasEstimate()}>
                      <text
                        x={right() - INNER_PAD}
                        y={topRowY()}
                        text-anchor="end"
                        dominant-baseline="central"
                        class="sui-dag__node-estimate"
                      >
                        {node.estimate}
                      </text>
                    </Show>

                    {/* Center-left: description */}
                    <Show when={hasDescription()}>
                      <text
                        x={left() + INNER_PAD}
                        y={midRowY()}
                        text-anchor="start"
                        dominant-baseline="central"
                        class="sui-dag__node-description"
                      >
                        {truncate(node.description!, 34)}
                      </text>
                    </Show>

                    {/* Center-right: file count with hover tooltip */}
                    <Show when={hasFiles()}>
                      <text
                        x={right() - INNER_PAD}
                        y={midRowY()}
                        text-anchor="end"
                        dominant-baseline="central"
                        class="sui-dag__node-files"
                      >
                        {node.files!.length === 1 ? "1 file" : `${node.files!.length} files`}
                        <title>{node.files!.join("\n")}</title>
                      </text>
                    </Show>

                    {/* Bottom-left: avatar */}
                    <Show when={hasAvatar()}>
                      <defs>
                        <clipPath id={clipId()}>
                          <circle
                            cx={avatarX() + avatarSize / 2}
                            cy={avatarCenterY()}
                            r={avatarSize / 2}
                          />
                        </clipPath>
                      </defs>
                      <image
                        href={node.avatar}
                        x={avatarX()}
                        y={avatarCenterY() - avatarSize / 2}
                        width={avatarSize}
                        height={avatarSize}
                        clip-path={`url(#${clipId()})`}
                        class="sui-dag__node-avatar"
                      />
                    </Show>

                    {/* Bottom-left: worker name */}
                    <Show when={hasSublabel()}>
                      <text
                        x={sublabelX()}
                        y={bottomRowY()}
                        text-anchor="start"
                        dominant-baseline="central"
                        class="sui-dag__node-sublabel"
                      >
                        {node.sublabel}
                      </text>
                    </Show>

                    {/* Bottom-right: tags */}
                    <Show when={hasTags()}>
                      <text
                        x={right() - INNER_PAD}
                        y={bottomRowY()}
                        text-anchor="end"
                        dominant-baseline="central"
                        class="sui-dag__node-tags"
                      >
                        {node.tags!.join(", ")}
                      </text>
                    </Show>
                  </g>
                );
              }}
            </Show>
          );
        }}
      </For>
    </svg>
  );
};
