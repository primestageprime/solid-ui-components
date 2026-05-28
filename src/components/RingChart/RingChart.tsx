// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
import { For, Show } from "solid-js";

export interface RingChartProps {
  segments: { value: number; color: string; animate?: boolean }[];
  total: number;
  label: string;
  sublabel?: string;
  size?: number;
}

const monoStyle = {
  "font-family": "'JetBrains Mono', 'Fira Code', monospace",
};

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
      style={{
        position: "relative",
        display: "inline-flex",
        "align-items": "center",
        "justify-content": "center",
        width: `${size()}px`,
        height: `${size()}px`,
      }}
    >
      <svg
        width={size()}
        height={size()}
        viewBox={`0 0 ${size()} ${size()}`}
        style={{ transform: "rotate(-90deg)" }}
      >
        {/* background track */}
        <circle
          cx={cx()}
          cy={cy()}
          r={radius()}
          fill="none"
          stroke-width={strokeWidth}
          style={{ stroke: "var(--sui-border-bright)" }}
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
              style={arc.animate ? { animation: "ring-pulse 2s ease-in-out infinite" } : {}}
            />
          )}
        </For>
      </svg>
      {/* center label */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          "text-align": "center",
          "pointer-events": "none",
        }}
      >
        <div
          style={{
            ...monoStyle,
            color: "var(--sui-text-primary)",
            "font-size": `${Math.max(10, Math.min(size() / 5, (size() * 0.7) / Math.max(1, props.label.length) * 1.6))}px`,
            "font-weight": "700",
            "line-height": "1.1",
          }}
        >
          {props.label}
        </div>
        <Show when={props.sublabel}>
          <div
            style={{
              color: "var(--sui-text-secondary)",
              "font-size": `${Math.max(9, size() / 10)}px`,
              "text-transform": "uppercase",
              "letter-spacing": "0.05em",
              "margin-top": "2px",
            }}
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
