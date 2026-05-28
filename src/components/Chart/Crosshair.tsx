// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// Chart slot: Crosshair — vertical guide + dot at hovered series points.
import { Component, For, Show, createMemo } from "solid-js";
import { useChart } from "./context";

export interface CrosshairSeries<T> {
  data: readonly T[];
  x: (d: T) => number;
  y: (d: T) => number;
  /** Marker color. */
  stroke?: string;
}

export interface CrosshairProps<T> {
  /** Series to spotlight at the hovered X. Multiple → multiple dots. */
  series?: CrosshairSeries<T>[];
  /** Show the vertical guide line. Default true. */
  guide?: boolean;
}

const nearestPoint = <T,>(
  data: readonly T[],
  x: (d: T) => number,
  target: number,
): T | null => {
  if (data.length === 0) return null;
  let best: T | null = null;
  let bestDist = Infinity;
  for (const d of data) {
    const dist = Math.abs(x(d) - target);
    if (dist < bestDist) {
      bestDist = dist;
      best = d;
    }
  }
  return best;
};

export function Crosshair<T>(props: CrosshairProps<T>) {
  const ctx = useChart();
  const guide = () => props.guide ?? true;

  const points = createMemo(() => {
    const hx = ctx.hoverX();
    if (hx == null) return [];
    const out: { cx: number; cy: number; stroke?: string }[] = [];
    for (const s of props.series ?? []) {
      const p = nearestPoint(s.data, s.x, hx);
      if (p == null) continue;
      out.push({
        cx: ctx.xScale()(s.x(p)),
        cy: ctx.yScale()(s.y(p)),
        stroke: s.stroke,
      });
    }
    return out;
  });

  return (
    <Show when={ctx.hoverX() != null}>
      <g class="sui-chart__crosshair" aria-hidden="true">
        <Show when={guide()}>
          <line
            class="sui-chart__crosshair-guide"
            x1={ctx.xScale()(ctx.hoverX()!)}
            x2={ctx.xScale()(ctx.hoverX()!)}
            y1={0}
            y2={ctx.innerHeight()}
          />
        </Show>
        <For each={points()}>
          {(p) => (
            <circle
              class="sui-chart__crosshair-dot"
              cx={p.cx}
              cy={p.cy}
              r={3.5}
              stroke={p.stroke}
            />
          )}
        </For>
      </g>
    </Show>
  );
}
