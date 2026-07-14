// ============================================
// Sparkline — Atomic (Depth 0)
// Owns CSS (Sparkline.css), no component imports.
// Generic inline SVG polyline: arbitrary values → tiny chart strip.
// Two render modes:
//   "line"     — smooth polyline connecting all values (default).
//   "sawtooth" — drops to baseline between each sample; useful for
//                period-by-period values (throughput, batch counts).
// Color is driven by the `color` prop (explicit CSS string or custom
// property). For trend-colored sparklines see TrendSparkline; for
// connection-health strips see HeartbeatSparkline.
// ============================================
import { type Component, type JSX, splitProps } from "solid-js";
import "./Sparkline.css";

export type SparklineMode = "line" | "sawtooth";

export interface SparklineProps
  extends Omit<JSX.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** Data values, oldest first. Auto-scaled to the rect's height range. */
  values: number[];
  /** Render mode: straight polyline (default) or sawtooth (drops to baseline between samples). */
  mode?: SparklineMode;
  /** Explicit CSS color string — e.g. "var(--sui-accent)" or "#6fcf97".
   *  Defaults to var(--sui-accent). */
  color?: string;
  /** Pixel width of the sparkline rect. Default 80. */
  width?: number;
  /** Pixel height of the sparkline rect. Default 20. */
  height?: number;
}

const PAD = 1.5; // keep stroke inside the rect bounds

function linePoints(v: number[], w: number, h: number): string {
  if (v.length === 0) return "";
  if (v.length === 1) return `0,${(h / 2).toFixed(1)} ${w},${(h / 2).toFixed(1)}`;
  const lo = Math.min(...v);
  const hi = Math.max(...v);
  const span = hi - lo || 1;
  const plotH = h - PAD * 2;
  return v
    .map((val, i) => {
      const x = (i / (v.length - 1)) * w;
      const y = PAD + (1 - (val - lo) / span) * plotH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function sawtoothPoints(v: number[], w: number, h: number): string {
  if (v.length === 0) return "";
  const lo = Math.min(...v);
  const hi = Math.max(...v);
  const span = hi - lo || 1;
  const plotH = h - PAD * 2;
  const baseline = (PAD + plotH).toFixed(1);
  const pts: string[] = [];
  for (let i = 0; i < v.length; i++) {
    const x = (v.length === 1 ? w / 2 : (i / (v.length - 1)) * w).toFixed(1);
    const y = (PAD + (1 - (v[i] - lo) / span) * plotH).toFixed(1);
    pts.push(`${x},${baseline}`, `${x},${y}`);
    if (i < v.length - 1) {
      const xNext = ((i + 1) / (v.length - 1)) * w;
      pts.push(`${xNext.toFixed(1)},${baseline}`);
    }
  }
  return pts.join(" ");
}

export const Sparkline: Component<SparklineProps> = (props) => {
  const [local, others] = splitProps(props, [
    "values",
    "mode",
    "color",
    "width",
    "height",
    "class",
  ]);

  const w = () => local.width ?? 80;
  const h = () => local.height ?? 20;
  const mode = () => local.mode ?? "line";

  const points = () => {
    const v = local.values ?? [];
    return mode() === "sawtooth"
      ? sawtoothPoints(v, w(), h())
      : linePoints(v, w(), h());
  };

  const stroke = () => local.color ?? "var(--sui-accent)";

  const rootClass = () => {
    const parts = ["sui-sparkline", `sui-sparkline--${mode()}`];
    if (local.class) parts.push(local.class);
    return parts.join(" ");
  };

  return (
    <span class={rootClass()} {...others}>
      <svg
        width={w()}
        height={h()}
        viewBox={`0 0 ${w()} ${h()}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <polyline
          class="sui-sparkline__line"
          points={points()}
          stroke={stroke()}
        />
      </svg>
    </span>
  );
};
