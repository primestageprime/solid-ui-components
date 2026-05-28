// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// HeartbeatSparkline — Atomic (Depth 1)
// Owns CSS (HeartbeatSparkline.css), no component imports.
// Rectangular sparkline showing % of heartbeat-timeout used over time.
// 0 = fresh heartbeat, 1 = timeout reached.
// ============================================
import { Component, JSX, splitProps } from "solid-js";
import "./HeartbeatSparkline.css";

export type ConnectionState = "connected" | "disconnected" | "error";

export interface HeartbeatSparklineProps
  extends Omit<JSX.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** Drives stroke/fill color. */
  state: ConnectionState;
  /** Each value 0..1 = fraction of timeout consumed at that tick. Oldest first, latest last. */
  samples: number[];
  /** Pixel width of the sparkline rect. Default 48. */
  width?: number;
  /** Pixel height of the sparkline rect. Default 12. */
  height?: number;
  /** Max samples rendered (latest N kept). Default 60. */
  capacity?: number;
  /** Glow the trailing edge. Useful when state="connected" and you want a "live" feel. */
  pulse?: boolean;
}

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export const HeartbeatSparkline: Component<HeartbeatSparklineProps> = (props) => {
  const [local, others] = splitProps(props, [
    "state",
    "samples",
    "width",
    "height",
    "capacity",
    "pulse",
    "class",
  ]);

  const w = () => local.width ?? 48;
  const h = () => local.height ?? 12;
  const cap = () => local.capacity ?? 60;

  const trimmed = () => {
    const s = local.samples ?? [];
    const c = cap();
    return s.length > c ? s.slice(s.length - c) : s;
  };

  const points = () => {
    const s = trimmed();
    const W = w();
    const H = h();
    const c = cap();
    if (s.length === 0) return "";
    // Anchor latest sample to right edge; older samples extend leftward.
    // Spacing assumes a full window of `cap` samples — partial buffers stay right-anchored.
    const step = c > 1 ? W / (c - 1) : 0;
    const startIdx = c - s.length;
    return s
      .map((v, i) => {
        const x = (startIdx + i) * step;
        const y = H - clamp01(v) * H;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");
  };

  const wrapperClass = () => {
    const cls = ["sui-heartbeat", `sui-heartbeat--${local.state}`];
    if (local.pulse) cls.push("sui-heartbeat--pulse");
    if (local.class) cls.push(local.class);
    return cls.join(" ");
  };

  const lastSample = () => {
    const s = trimmed();
    return s.length > 0 ? clamp01(s[s.length - 1]) : 0;
  };

  return (
    <span class={wrapperClass()} {...others}>
      <svg
        class="sui-heartbeat__svg"
        width={w()}
        height={h()}
        viewBox={`0 0 ${w()} ${h()}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <rect class="sui-heartbeat__bg" x="0" y="0" width={w()} height={h()} />
        <polyline class="sui-heartbeat__line" points={points()} />
        <circle
          class="sui-heartbeat__head"
          cx={w()}
          cy={h() - lastSample() * h()}
          r={1.5}
        />
      </svg>
    </span>
  );
};
