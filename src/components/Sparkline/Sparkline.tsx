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
// connection-health strips see HeartbeatSparkline. For a series whose range
// and typical band matter as well as its shape, see DistributionSparkline.
// ============================================
import { type Component, type JSX, Show, splitProps } from "solid-js";
import { filter } from "../../fn";
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
  /**
   * A level the line is read DOWN against: a floor the values must stay
   * above. Drawn as a dashed rule across the strip, and folded into the
   * scale so the rule is always on the rect. Line mode only.
   */
  floor?: number;
  /** A level the line is read UP against: a goal the values aim for. Drawn
   *  and scaled like `floor`. Line mode only. */
  goal?: number;
  /** Mark the last value with a dot in the line's colour. Line mode only. */
  endDot?: boolean;
  /** The floor rule's stroke. Default `var(--sui-danger)`. */
  floorColor?: string;
  /** The goal rule's stroke. Default `var(--sui-success)`. */
  goalColor?: string;
}

/** The values and the levels, so the scale holds every rule on the rect. */
const scaleOf = (
  v: number[],
  levels: readonly number[],
): { lo: number; span: number } => {
  const all = [...v, ...levels];
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  return { lo, span: hi - lo || 1 };
};

const PAD = 1.5; // keep stroke inside the rect bounds

/** y of a value on a rect of height `h`, with the scale given. */
const yOf = (val: number, lo: number, span: number, h: number): number =>
  PAD + (1 - (val - lo) / span) * (h - PAD * 2);

function linePoints(
  v: number[],
  w: number,
  h: number,
  levels: readonly number[] = [],
): string {
  if (v.length === 0) return "";
  if (v.length === 1 && levels.length === 0)
    return `0,${(h / 2).toFixed(1)} ${w},${(h / 2).toFixed(1)}`;
  const { lo, span } = scaleOf(v, levels);
  if (v.length === 1) {
    const y = yOf(v[0], lo, span, h).toFixed(1);
    return `0,${y} ${w},${y}`;
  }
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
    "floor",
    "goal",
    "endDot",
    "floorColor",
    "goalColor",
  ]);

  const w = () => local.width ?? 80;
  const h = () => local.height ?? 20;
  const mode = () => local.mode ?? "line";

  /** The levels in play: the rules are line-mode marks. */
  const levels = (): number[] =>
    mode() === "line"
      ? filter((l: number | undefined): l is number => l !== undefined, [local.floor, local.goal])
      : [];

  const points = () => {
    const v = local.values ?? [];
    return mode() === "sawtooth"
      ? sawtoothPoints(v, w(), h())
      : linePoints(v, w(), h(), levels());
  };

  const stroke = () => local.color ?? "var(--sui-accent)";

  /** y of a level, on the same scale as the line. Null with no values. */
  const levelY = (level: number): number | null => {
    const v = local.values ?? [];
    if (v.length === 0) return null;
    const { lo, span } = scaleOf(v, levels());
    return yOf(level, lo, span, h());
  };
  const endDot = (): { cx: number; cy: number } | null => {
    const v = local.values ?? [];
    if (mode() !== "line" || !local.endDot || v.length === 0) return null;
    const { lo, span } = scaleOf(v, levels());
    return { cx: w(), cy: yOf(v[v.length - 1], lo, span, h()) };
  };

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
        <Show when={mode() === "line" && local.floor !== undefined && levelY(local.floor)}>
          {(y) => (
            <line
              class="sui-sparkline__rule sui-sparkline__rule--floor"
              x1="0"
              x2={w()}
              y1={y()}
              y2={y()}
              stroke={local.floorColor ?? "var(--sui-danger)"}
            />
          )}
        </Show>
        <Show when={mode() === "line" && local.goal !== undefined && levelY(local.goal)}>
          {(y) => (
            <line
              class="sui-sparkline__rule sui-sparkline__rule--goal"
              x1="0"
              x2={w()}
              y1={y()}
              y2={y()}
              stroke={local.goalColor ?? "var(--sui-success)"}
            />
          )}
        </Show>
        <polyline
          class="sui-sparkline__line"
          points={points()}
          stroke={stroke()}
        />
        <Show when={endDot()}>
          {(d) => (
            <circle
              class="sui-sparkline__end"
              cx={d().cx}
              cy={d().cy}
              fill={stroke()}
            />
          )}
        </Show>
      </svg>
    </span>
  );
};
