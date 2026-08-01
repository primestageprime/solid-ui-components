/**
 * Tiny router demo: 3×3 grid of (source → target) cases at every
 * relative position around the source. Each cell renders a small SVG
 * with two rects and the orthogonal-router's path between them.
 *
 * Used to isolate `orthogonalAvoidingObstacles` from SwimlaneChart so
 * we can verify the routing logic per-case without all the layout,
 * port-assignment, and badge plumbing in between.
 */
import { type Component, For, JSX } from "solid-js";
import {
  orthogonalAvoidingObstacles,
  bezierAvoidingObstacles,
  type ObstacleRect,
} from "../../src/internal/dag-svg";

const CELL_W = 360;
const CELL_H = 240;
const NODE_W = 64;
const NODE_H = 36;

interface Case {
  id: string;
  label: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  obstacles?: Array<{ x: number; y: number }>;
}

// 3×3: source fixed at center, target at each of 9 positions (incl. center).
// dx is chosen so the inner-edge channel between source and target is wide
// enough to keep a ≥5px straight-line run before the arrowhead on every
// case. Channel = dx − NODE_W. With NODE_W=64 and marker width 7,
// dx=120 yields a 56px channel → ~28px clean line per side. Plenty.
const dx = 120;
const dy = 70;
const cx = CELL_W / 2;
const cy = CELL_H / 2;
const CASES: Case[] = [
  {
    id: "NW",
    label: "target up-left",
    from: { x: cx, y: cy },
    to: { x: cx - dx, y: cy - dy },
  },
  {
    id: "N",
    label: "target up",
    from: { x: cx, y: cy },
    to: { x: cx, y: cy - dy },
  },
  {
    id: "NE",
    label: "target up-right",
    from: { x: cx, y: cy },
    to: { x: cx + dx, y: cy - dy },
  },
  {
    id: "W",
    label: "target left",
    from: { x: cx, y: cy },
    to: { x: cx - dx, y: cy },
  },
  {
    id: "C",
    label: "target right + obstacle (Ma → T2a)",
    from: { x: cx - dx, y: cy },
    to: { x: cx + dx, y: cy },
    obstacles: [{ x: cx, y: cy }],
  },
  {
    id: "E",
    label: "target right",
    from: { x: cx, y: cy },
    to: { x: cx + dx, y: cy },
  },
  {
    id: "SW",
    label: "target down-left",
    from: { x: cx, y: cy },
    to: { x: cx - dx, y: cy + dy },
  },
  {
    id: "S",
    label: "target down",
    from: { x: cx, y: cy },
    to: { x: cx, y: cy + dy },
  },
  {
    id: "SE",
    label: "target down-right",
    from: { x: cx, y: cy },
    to: { x: cx + dx, y: cy + dy },
  },
];

function rectOf(p: { x: number; y: number }) {
  return { x: p.x, y: p.y, width: NODE_W, height: NODE_H };
}

const Cell: Component<{ c: Case; style: "orthogonal" | "bezier" }> = (p) => {
  const fromRect = () => rectOf(p.c.from);
  const toRect = () => rectOf(p.c.to);
  const obstacles = (): ObstacleRect[] =>
    (p.c.obstacles ?? []).map((o, i) => ({
      id: `obs-${i}`,
      x: o.x,
      y: o.y,
      width: NODE_W,
      height: NODE_H,
    }));
  const path = () =>
    p.style === "orthogonal"
      ? orthogonalAvoidingObstacles(fromRect(), toRect(), obstacles())
      : bezierAvoidingObstacles(fromRect(), toRect(), obstacles());

  return (
    <div class="router-demo__cell">
      <div class="router-demo__cell-label">
        <span class="router-demo__cell-id">{p.c.id}</span> · {p.c.label}
      </div>
      <svg
        width={CELL_W}
        height={CELL_H}
        viewBox={`0 0 ${CELL_W} ${CELL_H}`}
        class="router-demo__cell-svg"
      >
        <defs>
          <marker
            id={`router-arrow-${p.c.id}-${p.style}`}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill="var(--sui-accent)" />
          </marker>
        </defs>
        {/* Obstacles first so they sit visually behind edges */}
        <For each={p.c.obstacles ?? []}>
          {(o) => (
            <rect
              x={o.x - NODE_W / 2}
              y={o.y - NODE_H / 2}
              width={NODE_W}
              height={NODE_H}
              fill="var(--sui-bg-secondary)"
              stroke="var(--sui-text-muted)"
              stroke-dasharray="3 2"
              rx={3}
            />
          )}
        </For>
        {/* Source */}
        <rect
          x={p.c.from.x - NODE_W / 2}
          y={p.c.from.y - NODE_H / 2}
          width={NODE_W}
          height={NODE_H}
          fill="rgba(var(--sui-accent-rgb), 0.08)"
          stroke="var(--sui-accent)"
          rx={3}
        />
        <text
          x={p.c.from.x}
          y={p.c.from.y}
          text-anchor="middle"
          dominant-baseline="central"
          fill="var(--sui-text-primary)"
          font-size="10"
          font-family="ui-monospace"
        >
          FROM
        </text>
        {/* Target */}
        <rect
          x={p.c.to.x - NODE_W / 2}
          y={p.c.to.y - NODE_H / 2}
          width={NODE_W}
          height={NODE_H}
          fill="rgba(var(--sui-success-rgb), 0.10)"
          stroke="var(--sui-success)"
          rx={3}
        />
        <text
          x={p.c.to.x}
          y={p.c.to.y}
          text-anchor="middle"
          dominant-baseline="central"
          fill="var(--sui-text-primary)"
          font-size="10"
          font-family="ui-monospace"
        >
          TO
        </text>
        {/* Edge */}
        <path
          d={path()}
          fill="none"
          stroke="var(--sui-accent)"
          stroke-width={1.5}
          marker-end={`url(#router-arrow-${p.c.id}-${p.style})`}
          class="router-demo__path"
        />
      </svg>
    </div>
  );
};

export const RouterDemoGrid: Component<{ style: "orthogonal" | "bezier" }> = (
  p,
) => (
  <div
    class="router-demo__grid"
    style={{ "--router-cell-w": `${CELL_W + 18}px` }}
  >
    <For each={CASES}>{(c) => <Cell c={c} style={p.style} />}</For>
  </div>
);
