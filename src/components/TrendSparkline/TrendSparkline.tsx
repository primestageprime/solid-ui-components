// ============================================
// TrendSparkline — Atomic (Depth 1)
// Owns CSS (TrendSparkline.css), no component imports.
// A tiny VALUE sparkline (data + trend color, no axes): the series scaled
// into a fixed rect, stroked by trajectory — UP green, DOWN red, FLAT grey.
// `trendOf(initial, final)` is the exported pure color rule.
//   <TrendSparkline values={balances} trend={trendOf(first, last)} />
// (HeartbeatSparkline is the 0..1 connection-health strip; this one plots
// arbitrary values — projected balances, totals, …)
// ============================================
import { Component, JSX, splitProps } from "solid-js";
import "./TrendSparkline.css";

export type SparklineTrend = "up" | "down" | "flat";

/** The color rule: final above initial → up/green; below → down/red;
 *  EXACTLY equal → flat/grey. */
export const trendOf = (initial: number, final: number): SparklineTrend =>
  final > initial ? "up" : final < initial ? "down" : "flat";

export interface TrendSparklineProps
  extends Omit<JSX.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** The series, oldest first. Scaled to the rect's value range. */
  values: number[];
  trend: SparklineTrend;
  /** Pixel width of the sparkline rect. Default 120. */
  width?: number;
  /** Pixel height of the sparkline rect. Default 24. */
  height?: number;
  /** Max points rendered — longer series are evenly DOWNSAMPLED. Default 80. */
  capacity?: number;
  /** Explicit [min, max] value domain. When provided, OVERRIDES the per-series
   *  auto-scale so a group of sparklines drawn together can share ONE scale
   *  (apples-to-apples heights). Omit for per-series auto-scaling (default). A
   *  degenerate domain (min===max) falls back to auto-scaling. */
  yDomain?: [number, number];
}

export const TrendSparkline: Component<TrendSparklineProps> = (props) => {
  const [local, others] = splitProps(props, [
    "values", "trend", "width", "height", "capacity", "yDomain", "class",
  ]);
  const w = () => local.width ?? 120;
  const h = () => local.height ?? 24;

  // Even downsample keeping first + last (the trend endpoints).
  const sampled = () => {
    const v = local.values ?? [];
    const cap = Math.max(2, local.capacity ?? 80);
    if (v.length <= cap) return v;
    const step = (v.length - 1) / (cap - 1);
    return Array.from({ length: cap }, (_, i) => v[Math.round(i * step)]);
  };

  const points = () => {
    const v = sampled();
    if (v.length === 0) return "";
    if (v.length === 1) return `0,${h() / 2} ${w()},${h() / 2}`;
    // A shared domain (when valid) overrides the per-series auto-scale, so a
    // group of sparklines renders on one common scale; otherwise auto-scale.
    const dom = local.yDomain;
    const shared = dom && dom[0] !== dom[1];
    const lo = shared ? Math.min(dom![0], dom![1]) : Math.min(...v);
    const hi = shared ? Math.max(dom![0], dom![1]) : Math.max(...v);
    const span = hi - lo || 1;
    const PAD = 1.5; // keep the stroke inside the rect
    const plotH = h() - PAD * 2;
    return v
      .map((val, i) => {
        const x = (i / (v.length - 1)) * w();
        const y = PAD + (1 - (val - lo) / span) * plotH;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  };

  const rootClass = () =>
    `sui-trend-sparkline sui-trend-sparkline--${local.trend}${local.class ? ` ${local.class}` : ""}`;

  return (
    <span class={rootClass()} {...others}>
      <svg
        width={w()}
        height={h()}
        viewBox={`0 0 ${w()} ${h()}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <polyline class="sui-trend-sparkline__line" points={points()} />
      </svg>
    </span>
  );
};
