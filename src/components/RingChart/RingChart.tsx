// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// RingChart — Structural (Depth 1). SVG chart; composes no library components.
import { For, Show } from "solid-js";
import "./RingChart.css";

export interface RingChartProps {
  segments: { value: number; color: string; animate?: boolean }[];
  total: number;
  label: string;
  sublabel?: string;
  size?: number;
}

export function RingChart(props: RingChartProps) {
  const size = () => props.size ?? 100;
  const strokeWidth = 10;
  const radius = () => (size() - strokeWidth) / 2;
  const circumference = () => 2 * Math.PI * radius();
  const cx = () => size() / 2;
  const cy = () => size() / 2;

  const arcs = () => {
    const t = props.total;
    if (t === 0) return [];
    let offset = 0;
    return (props.segments ?? []).map((seg) => {
      const pct = Math.min(seg.value / t, Math.max(0, 1 - offset));
      const dashLen = pct * circumference();
      const dashGap = circumference() - dashLen;
      const dashOffset = -offset * circumference();
      offset += pct;
      return { ...seg, dashLen, dashGap, dashOffset };
    });
  };

  return (
    <div
      class="sui-ring-chart"
      style={{ width: `${size()}px`, height: `${size()}px` }}
    >
      <svg
        role="img"
        aria-label={props.label}
        width={size()}
        height={size()}
        viewBox={`0 0 ${size()} ${size()}`}
        class="sui-ring-chart__svg"
      >
        {/* background track */}
        <circle
          cx={cx()}
          cy={cy()}
          r={radius()}
          fill="none"
          stroke-width={strokeWidth}
          class="sui-ring-chart__track"
        />
        <For each={arcs()}>
          {(arc) => (
            <circle
              cx={cx()}
              cy={cy()}
              r={radius()}
              fill="none"
              stroke={arc.color}
              stroke-width={strokeWidth}
              stroke-dasharray={`${arc.dashLen} ${arc.dashGap}`}
              stroke-dashoffset={arc.dashOffset}
              stroke-linecap="butt"
              style={
                arc.animate
                  ? { animation: "ring-pulse 2s ease-in-out infinite" }
                  : {}
              }
            />
          )}
        </For>
      </svg>
      {/* center label */}
      <div class="sui-ring-chart__center">
        <div
          class="sui-ring-chart__label"
          style={{
            "--ring-label-size": `${Math.max(10, Math.min(size() / 5, ((size() * 0.7) / Math.max(1, props.label.length)) * 1.6))}px`,
          }}
        >
          {props.label}
        </div>
        <Show when={props.sublabel}>
          <div
            class="sui-ring-chart__sublabel"
            style={{ "--ring-sublabel-size": `${Math.max(9, size() / 10)}px` }}
          >
            {props.sublabel}
          </div>
        </Show>
      </div>
      {/* inject keyframes */}
      <style>{`
        @keyframes ring-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
