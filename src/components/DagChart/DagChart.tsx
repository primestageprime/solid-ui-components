// ============================================
// DagChart — Atomic (Depth 1)
// Owns CSS (DagChart.css), no component imports.
// SVG directed acyclic graph using dagre layout.
// Nodes colored by status, clickable, with arrow edges.
// ============================================
import { Component, splitProps, For, Show, createMemo, createSignal } from "solid-js";
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
  duration?: string;   // formatted elapsed time for done nodes, e.g. "12m", "1h 23m"
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

const NODE_W = 480;
const NODE_H = 180;
const COMPACT_W = 220;
const COMPACT_H = 50;
const PAD = 24;
const ARROW_SIZE = 6;
const INNER_PAD = 14;
const AVATAR_SIZE = 28;
const AVATAR_GAP = 6;

/** Character threshold for showing "(more…)" — ~3 lines at ~55 chars each */
const DESC_MORE_THRESHOLD = 140;

const statusClass = (status: ColorVariant): string => {
  switch (status) {
    case "success": return "sui-dag__node--success";
    case "warning": return "sui-dag__node--warning";
    case "danger":  return "sui-dag__node--danger";
    default:        return "sui-dag__node--pending";
  }
};

const isCompact = (status: ColorVariant): boolean =>
  status !== "warning";  // only in_progress (warning) gets full size

const truncate = (text: string, max: number): string =>
  text.length <= max ? text : text.slice(0, max - 1) + "…";

export const DagChart: Component<DagChartProps> = (props) => {
  const [local] = splitProps(props, [
    "nodes", "edges", "onNodeClick", "direction", "height",
  ]);
  const [expandedId, setExpandedId] = createSignal<string | null>(null);

  const layout = createMemo(() => {
    const g = new dagre.graphlib.Graph();
    g.setGraph({
      rankdir: local.direction ?? "TB",
      nodesep: 50,
      ranksep: 70,
      marginx: PAD,
      marginy: PAD,
    });
    g.setDefaultEdgeLabel(() => ({}));

    for (const node of local.nodes) {
      const compact = isCompact(node.status);
      g.setNode(node.id, {
        width: compact ? COMPACT_W : NODE_W,
        height: compact ? COMPACT_H : NODE_H,
      });
    }
    for (const edge of local.edges) {
      g.setEdge(edge.source, edge.target);
    }

    dagre.layout(g);

    const nodePositions = new Map<string, { x: number; y: number; w: number; h: number }>();
    for (const id of g.nodes()) {
      const n = g.node(id);
      if (n) nodePositions.set(id, { x: n.x, y: n.y, w: n.width, h: n.height });
    }

    const edgePaths: { points: Array<{ x: number; y: number }> }[] = [];
    for (const e of g.edges()) {
      const edgeData = g.edge(e);
      if (edgeData?.points) edgePaths.push({ points: edgeData.points });
    }

    const graph = g.graph();
    const width = (graph.width ?? 300) + PAD;
    const height = (graph.height ?? 200) + PAD;

    return { nodePositions, edgePaths, width, height };
  });

  const svgW = () => layout().width;
  const svgH = () => local.height ?? layout().height;

  const edgePath = (points: Array<{ x: number; y: number }>): string => {
    if (points.length === 0) return "";
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y}`;
    }
    return d;
  };

  /** Overlay data for the expanded description (if any). */
  const expandedOverlay = createMemo(() => {
    const id = expandedId();
    if (!id) return null;
    const node = local.nodes.find((n) => n.id === id);
    const pos = layout().nodePositions.get(id);
    if (!node?.description || !pos) return null;
    return { node, pos };
  });

  const COMPACT_AVATAR = 16;
  const COMPACT_PAD = 10;

  interface NodeRenderProps {
    node: DagNode;
    p: { x: number; y: number; w: number; h: number };
    onNodeClick?: (id: string) => void;
  }

  const CompactNode: Component<NodeRenderProps> = (cProps) => {
    const left = () => cProps.p.x - cProps.p.w / 2;
    const top = () => cProps.p.y - cProps.p.h / 2;
    const centerY = () => cProps.p.y;
    const right = () => left() + cProps.p.w;
    const clipId = () => `sui-dag-avatar-c-${cProps.node.id}`;
    const hasAvatar = () => !!cProps.node.avatar;
    const hasDuration = () => !!cProps.node.duration;
    const textX = () =>
      hasAvatar()
        ? left() + COMPACT_PAD + COMPACT_AVATAR + 6
        : left() + COMPACT_PAD;
    const maxLabel = () => hasDuration() ? 20 : 25;

    return (
      <g
        class={`sui-dag__node ${statusClass(cProps.node.status)} ${cProps.onNodeClick ? "sui-dag__node--clickable" : ""}`}
        onClick={() => cProps.onNodeClick?.(cProps.node.id)}
      >
        <rect
          x={left()} y={top()} width={cProps.p.w} height={cProps.p.h}
          rx={6} ry={6} class="sui-dag__node-rect"
        />
        <Show when={hasAvatar()}>
          <defs>
            <clipPath id={clipId()}>
              <circle cx={left() + COMPACT_PAD + COMPACT_AVATAR / 2} cy={centerY()} r={COMPACT_AVATAR / 2} />
            </clipPath>
          </defs>
          <image
            href={cProps.node.avatar}
            x={left() + COMPACT_PAD} y={centerY() - COMPACT_AVATAR / 2}
            width={COMPACT_AVATAR} height={COMPACT_AVATAR}
            clip-path={`url(#${clipId()})`} class="sui-dag__node-avatar"
          />
          <Show when={cProps.node.sublabel}>
            <rect
              x={left() + COMPACT_PAD} y={centerY() - COMPACT_AVATAR / 2}
              width={COMPACT_AVATAR} height={COMPACT_AVATAR} fill="transparent"
            >
              <title>{cProps.node.sublabel}</title>
            </rect>
          </Show>
        </Show>
        <text
          x={textX()} y={centerY()} text-anchor="start" dominant-baseline="central"
          class="sui-dag__node-label sui-dag__node-label--compact"
        >
          {truncate(cProps.node.label, maxLabel())}
        </text>
        <Show when={hasDuration()}>
          <text
            x={right() - COMPACT_PAD} y={centerY()} text-anchor="end" dominant-baseline="central"
            class="sui-dag__node-duration"
          >
            {cProps.node.duration}
          </text>
        </Show>
      </g>
    );
  };

  interface FullNodeProps extends NodeRenderProps {
    expandedId: () => string | null;
    setExpandedId: (id: string | null) => void;
  }

  const FullNode: Component<FullNodeProps> = (fProps) => {
    const hasAvatar = () => !!fProps.node.avatar;
    const hasSublabel = () => !!fProps.node.sublabel;
    const hasEstimate = () => !!fProps.node.estimate;
    const hasTags = () => !!fProps.node.tags && fProps.node.tags.length > 0;
    const hasDescription = () => !!fProps.node.description;
    const hasFiles = () => !!fProps.node.files && fProps.node.files.length > 0;
    const isLongDesc = () =>
      hasDescription() && fProps.node.description!.length > DESC_MORE_THRESHOLD;

    const left = () => fProps.p.x - NODE_W / 2;
    const top = () => fProps.p.y - NODE_H / 2;
    const right = () => left() + NODE_W;
    const bottom = () => top() + NODE_H;
    const clipId = () => `sui-dag-avatar-${fProps.node.id}`;

    const topRowY = () => top() + 28;
    const descY = () => top() + 50;
    const bottomRowY = () => bottom() - 24;

    const avatarX = () => left() + INNER_PAD;
    const avatarCenterY = () => bottomRowY();
    const sublabelX = () =>
      hasAvatar()
        ? avatarX() + AVATAR_SIZE + AVATAR_GAP
        : left() + INNER_PAD;

    return (
      <g
        class={`sui-dag__node ${statusClass(fProps.node.status)} ${fProps.onNodeClick ? "sui-dag__node--clickable" : ""}`}
        onClick={() => fProps.onNodeClick?.(fProps.node.id)}
      >
        <rect
          x={left()}
          y={top()}
          width={NODE_W}
          height={NODE_H}
          rx={8}
          ry={8}
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
          {truncate(fProps.node.label, 50)}
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
            {fProps.node.estimate}
          </text>
        </Show>

        {/* Description: 3-line clamp with (more…) */}
        <Show when={hasDescription()}>
          <foreignObject
            x={left() + INNER_PAD}
            y={descY()}
            width={NODE_W - INNER_PAD * 2}
            height={82}
          >
            <div class="sui-dag__desc-wrap">
              <div class="sui-dag__desc-clamp">
                {fProps.node.description}
              </div>
              <Show when={isLongDesc()}>
                <span
                  class="sui-dag__desc-more"
                  onClick={(e: MouseEvent) => {
                    e.stopPropagation();
                    fProps.setExpandedId(fProps.node.id);
                  }}
                >
                  (more…)
                </span>
              </Show>
            </div>
          </foreignObject>
        </Show>

        {/* Bottom-left: avatar */}
        <Show when={hasAvatar()}>
          <defs>
            <clipPath id={clipId()}>
              <circle
                cx={avatarX() + AVATAR_SIZE / 2}
                cy={avatarCenterY()}
                r={AVATAR_SIZE / 2}
              />
            </clipPath>
          </defs>
          <image
            href={fProps.node.avatar}
            x={avatarX()}
            y={avatarCenterY() - AVATAR_SIZE / 2}
            width={AVATAR_SIZE}
            height={AVATAR_SIZE}
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
            {fProps.node.sublabel}
          </text>
        </Show>

        {/* Bottom-right: file count with tooltip */}
        <Show when={hasFiles()}>
          <text
            x={right() - INNER_PAD}
            y={bottomRowY()}
            text-anchor="end"
            dominant-baseline="central"
            class="sui-dag__node-files"
          >
            {fProps.node.files!.length === 1
              ? "1 file"
              : `${fProps.node.files!.length} files`}
            <title>{fProps.node.files!.join("\n")}</title>
          </text>
        </Show>

        {/* Bottom-right: tags (offset left if files also present) */}
        <Show when={hasTags()}>
          <text
            x={
              hasFiles()
                ? right() - INNER_PAD - 60
                : right() - INNER_PAD
            }
            y={bottomRowY()}
            text-anchor="end"
            dominant-baseline="central"
            class="sui-dag__node-tags"
          >
            {fProps.node.tags!.join(", ")}
          </text>
        </Show>
      </g>
    );
  };

  return (
    <svg
      class="sui-dag"
      viewBox={`0 0 ${svgW()} ${svgH()}`}
      preserveAspectRatio="xMidYMin meet"
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
          const compact = () => isCompact(node.status);

          return (
            <Show when={pos()}>
              {(p) => (
                <Show when={!compact()} fallback={
                  <CompactNode node={node} p={p()} onNodeClick={local.onNodeClick} />
                }>
                  <FullNode node={node} p={p()} onNodeClick={local.onNodeClick} expandedId={expandedId} setExpandedId={setExpandedId} />
                </Show>
              )}
            </Show>
          );
        }}
      </For>

      {/* Expanded description overlay — painted last so it sits on top */}
      <Show when={expandedOverlay()}>
        {(data) => {
          const n = () => data().node;
          const pos = () => data().pos;
          const overlayX = () => pos().x - NODE_W / 2;
          const overlayY = () => pos().y - NODE_H / 2 + 44;
          const overlayW = NODE_W;
          const descLen = () => n().description?.length ?? 0;
          const overlayH = () =>
            Math.min(400, Math.max(80, Math.ceil(descLen() / 55) * 20 + 50));

          return (
            <g>
              {/* Invisible click-away backdrop */}
              <rect
                x={0}
                y={0}
                width={svgW()}
                height={svgH()}
                fill="transparent"
                onClick={() => setExpandedId(null)}
              />
              {/* Overlay card */}
              <rect
                x={overlayX()}
                y={overlayY()}
                width={overlayW}
                height={overlayH()}
                rx={8}
                ry={8}
                class="sui-dag__expanded-bg"
              />
              <foreignObject
                x={overlayX() + INNER_PAD}
                y={overlayY() + 10}
                width={overlayW - INNER_PAD * 2}
                height={overlayH() - 20}
              >
                <div class="sui-dag__desc-full">
                  <div class="sui-dag__desc-full-text">
                    {n().description}
                  </div>
                  <span
                    class="sui-dag__desc-less"
                    onClick={(e: MouseEvent) => {
                      e.stopPropagation();
                      setExpandedId(null);
                    }}
                  >
                    (less)
                  </span>
                </div>
              </foreignObject>
            </g>
          );
        }}
      </Show>
    </svg>
  );
};
