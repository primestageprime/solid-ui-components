// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// Crosshair — Structural (Depth 1). SVG chart slot; composes no library components.
// Chart slot: Crosshair — vertical guide + dot at hovered series points.
import { For, Show, createMemo } from "solid-js";
import { buildCrosshair } from "./crosshairMark";
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

  // Value-addressed: each series' nearest point to the hovered x can sit at
  // a slightly different x than the guide, so every point supplies its own.
  // See crosshairMark.ts for why `ScrubChartCrosshair` (index-addressed) does not.
  const mark = createMemo(() => {
    const hx = ctx.hoverX();
    if (hx == null) return null;
    const points: { id: string; x: number; y: number; stroke?: string }[] = [];
    (props.series ?? []).forEach((s, i) => {
      const p = nearestPoint(s.data, s.x, hx);
      if (p == null) return;
      points.push({
        id: String(i),
        x: ctx.xScale()(s.x(p)),
        y: ctx.yScale()(s.y(p)),
        stroke: s.stroke,
      });
    });
    return buildCrosshair({
      x: ctx.xScale()(hx),
      points,
      plotTop: 0,
      plotBottom: ctx.innerHeight(),
    });
  });

  return (
    <Show when={mark()}>
      {(m) => (
        // biome-ignore lint/a11y/noAriaHiddenOnFocusable: decorative SVG chrome; <g> has no tabindex/handlers and is not actually focusable
        <g class="sui-chart__crosshair" aria-hidden="true">
          <Show when={guide()}>
            <line
              class="sui-chart__crosshair-guide"
              x1={m().guide.x1}
              x2={m().guide.x2}
              y1={m().guide.y1}
              y2={m().guide.y2}
            />
          </Show>
          <For each={m().dots}>
            {(d) => (
              <circle
                class="sui-chart__crosshair-dot"
                cx={d.cx}
                cy={d.cy}
                r={3.5}
                stroke={d.stroke}
              />
            )}
          </For>
        </g>
      )}
    </Show>
  );
}
