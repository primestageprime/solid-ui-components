import { createMemo, For, Show, createSignal } from "solid-js";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ThroughputPoint {
  timestamp: number;     // epoch ms
  rowsPerMinute: number;
}

export interface ThroughputChartProps {
  dataPoints: ThroughputPoint[];
  windowHours?: number;  // default 8
}

// ─── Theme ─────────────────────────────────────────────────────────────────────

const CYAN = "#00d4ff";
const GREEN = "#00ff88";
const DIM = "#7aa8c0";
const GRID_COLOR = "rgba(255,255,255,0.06)";
const AXIS_COLOR = "rgba(255,255,255,0.15)";
const BG_COLOR = "rgba(255,255,255,0.02)";
const LABEL_COLOR = "#7aa8c0";
const LINE_COLOR = "#00ff88";
const FILL_COLOR = "rgba(0,255,136,0.08)";
const DOT_COLOR = "#00ff88";

// ─── Layout ────────────────────────────────────────────────────────────────────

const PAD = { top: 28, right: 20, bottom: 36, left: 50 };

function fmtTime(ms: number): string {
  const d = new Date(ms);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

function niceMax(val: number): number {
  if (val <= 0) return 100;
  const mag = Math.pow(10, Math.floor(Math.log10(val)));
  const candidates = [1, 2, 2.5, 5, 10];
  for (const c of candidates) {
    if (c * mag >= val) return c * mag;
  }
  return 10 * mag;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function ThroughputChart(props: ThroughputChartProps) {
  const windowHours = () => props.windowHours ?? 8;
  const [hoverIdx, setHoverIdx] = createSignal<number | null>(null);
  const [tooltip, setTooltip] = createSignal<{ x: number; y: number; point: ThroughputPoint } | null>(null);

  // Time range
  const timeRange = createMemo(() => {
    const now = Date.now();
    const start = now - windowHours() * 60 * 60 * 1000;
    return { start, end: now };
  });

  // Filter to window + sort
  const points = createMemo(() => {
    const { start, end } = timeRange();
    return props.dataPoints
      .filter((p) => p.timestamp >= start && p.timestamp <= end)
      .sort((a, b) => a.timestamp - b.timestamp);
  });

  // Y max
  const yMax = createMemo(() => {
    const max = Math.max(0, ...points().map((p) => p.rowsPerMinute));
    return niceMax(max);
  });

  // Y ticks
  const yTicks = createMemo(() => {
    const max = yMax();
    const count = 4;
    const step = max / count;
    const ticks: number[] = [];
    for (let i = 0; i <= count; i++) ticks.push(step * i);
    return ticks;
  });

  // X-axis time labels (every 1 hour)
  const xLabels = createMemo(() => {
    const { start, end } = timeRange();
    const hourMs = 60 * 60 * 1000;
    const labels: { ms: number; label: string }[] = [];
    let t = Math.ceil(start / hourMs) * hourMs;
    while (t <= end) {
      labels.push({ ms: t, label: fmtTime(t) });
      t += hourMs;
    }
    return labels;
  });

  // Rolling average stats
  const avgThroughput = createMemo(() => {
    const pts = points();
    if (pts.length === 0) return 0;
    const sum = pts.reduce((s, p) => s + p.rowsPerMinute, 0);
    return Math.round(sum / pts.length);
  });

  const peakThroughput = createMemo(() => {
    const pts = points();
    if (pts.length === 0) return 0;
    return Math.round(Math.max(...pts.map((p) => p.rowsPerMinute)));
  });

  return (
    <div style={{ position: "relative" }}>
      <svg
        width="100%"
        viewBox="0 0 800 300"
        preserveAspectRatio="xMidYMid meet"
        style={{ display: "block" }}
      >
        {/* Background */}
        <rect x={0} y={0} width={800} height={300} fill={BG_COLOR} rx="6" />

        {/* Title */}
        <text
          x={PAD.left}
          y={18}
          fill={GREEN}
          font-size="12"
          font-family="'JetBrains Mono', 'Fira Code', monospace"
          font-weight="600"
        >
          Extraction Throughput
        </text>

        {/* Stats */}
        <text
          x={800 - PAD.right}
          y={18}
          fill={DIM}
          font-size="10"
          font-family="'JetBrains Mono', 'Fira Code', monospace"
          text-anchor="end"
        >
          avg {fmtNum(avgThroughput())} / peak {fmtNum(peakThroughput())} rows/min
        </text>

        {/* Inner chart */}
        {(() => {
          const innerW = 800 - PAD.left - PAD.right;
          const innerH = 300 - PAD.top - PAD.bottom;

          const scaleX = (ms: number) => {
            const { start, end } = timeRange();
            const range = end - start;
            if (range <= 0) return PAD.left;
            return PAD.left + ((ms - start) / range) * innerW;
          };

          const scaleY = (val: number) => {
            const max = yMax();
            if (max <= 0) return PAD.top + innerH;
            return PAD.top + innerH - (val / max) * innerH;
          };

          // Build smooth line path
          const linePath = createMemo(() => {
            const pts = points();
            if (pts.length === 0) return "";
            if (pts.length === 1) {
              const x = scaleX(pts[0].timestamp);
              const y = scaleY(pts[0].rowsPerMinute);
              return `M ${x} ${y}`;
            }

            // Simple monotone line — no Catmull-Rom (prevents X-axis backtracking)
            const mapped = pts.map((p) => ({
              x: scaleX(p.timestamp),
              y: scaleY(p.rowsPerMinute),
            }));

            let d = `M ${mapped[0].x} ${mapped[0].y}`;
            for (let i = 1; i < mapped.length; i++) {
              d += ` L ${mapped[i].x} ${mapped[i].y}`;
            }
            return d;
          });

          // Fill area path
          const fillPath = createMemo(() => {
            const pts = points();
            if (pts.length < 2) return "";
            const first = scaleX(pts[0].timestamp);
            const last = scaleX(pts[pts.length - 1].timestamp);
            const bottom = PAD.top + innerH;
            return `${linePath()} L ${last} ${bottom} L ${first} ${bottom} Z`;
          });

          return (
            <>
              {/* Y grid lines + labels */}
              <For each={yTicks()}>
                {(tick) => (
                  <>
                    <line
                      x1={PAD.left}
                      y1={scaleY(tick)}
                      x2={PAD.left + innerW}
                      y2={scaleY(tick)}
                      stroke={GRID_COLOR}
                      stroke-width="1"
                    />
                    <text
                      x={PAD.left - 8}
                      y={scaleY(tick) + 3}
                      text-anchor="end"
                      fill={LABEL_COLOR}
                      font-size="10"
                      font-family="'JetBrains Mono', 'Fira Code', monospace"
                    >
                      {fmtNum(tick)}
                    </text>
                  </>
                )}
              </For>

              {/* Axes */}
              <line
                x1={PAD.left} y1={PAD.top}
                x2={PAD.left} y2={PAD.top + innerH}
                stroke={AXIS_COLOR} stroke-width="1"
              />
              <line
                x1={PAD.left} y1={PAD.top + innerH}
                x2={PAD.left + innerW} y2={PAD.top + innerH}
                stroke={AXIS_COLOR} stroke-width="1"
              />

              {/* X-axis time labels */}
              <For each={xLabels()}>
                {(label) => (
                  <text
                    x={scaleX(label.ms)}
                    y={PAD.top + innerH + 16}
                    text-anchor="middle"
                    fill={LABEL_COLOR}
                    font-size="10"
                    font-family="'JetBrains Mono', 'Fira Code', monospace"
                  >
                    {label.label}
                  </text>
                )}
              </For>

              {/* Average line */}
              <Show when={avgThroughput() > 0}>
                <line
                  x1={PAD.left}
                  y1={scaleY(avgThroughput())}
                  x2={PAD.left + innerW}
                  y2={scaleY(avgThroughput())}
                  stroke="rgba(0,255,136,0.25)"
                  stroke-width="1"
                  stroke-dasharray="4 4"
                />
                <text
                  x={PAD.left + innerW + 2}
                  y={scaleY(avgThroughput()) + 3}
                  fill="rgba(0,255,136,0.4)"
                  font-size="8"
                  font-family="'JetBrains Mono', monospace"
                >
                  avg
                </text>
              </Show>

              {/* Fill area */}
              <Show when={fillPath()}>
                <path d={fillPath()} fill={FILL_COLOR} />
              </Show>

              {/* Line */}
              <Show when={linePath()}>
                <path
                  d={linePath()}
                  fill="none"
                  stroke={LINE_COLOR}
                  stroke-width="2"
                  stroke-linejoin="round"
                  stroke-linecap="round"
                />
              </Show>

              {/* Data points (hoverable) */}
              <For each={points()}>
                {(point, i) => {
                  const x = scaleX(point.timestamp);
                  const y = scaleY(point.rowsPerMinute);
                  const isHovered = () => hoverIdx() === i();

                  return (
                    <>
                      {/* Invisible wider hit area */}
                      <circle
                        cx={x}
                        cy={y}
                        r={10}
                        fill="transparent"
                        onMouseEnter={(e) => {
                          setHoverIdx(i());
                          const rect = (e.target as SVGCircleElement).ownerSVGElement!.getBoundingClientRect();
                          setTooltip({
                            x: e.clientX - rect.left,
                            y: e.clientY - rect.top - 10,
                            point,
                          });
                        }}
                        onMouseLeave={() => {
                          setHoverIdx(null);
                          setTooltip(null);
                        }}
                        style={{ cursor: "pointer" }}
                      />
                      {/* Visible dot */}
                      <Show when={isHovered()}>
                        {/* Vertical guide line */}
                        <line
                          x1={x} y1={PAD.top}
                          x2={x} y2={PAD.top + innerH}
                          stroke="rgba(0,255,136,0.2)"
                          stroke-width="1"
                          stroke-dasharray="2 3"
                        />
                        <circle
                          cx={x}
                          cy={y}
                          r="5"
                          fill={DOT_COLOR}
                          stroke="#0a1420"
                          stroke-width="2"
                        />
                      </Show>
                    </>
                  );
                }}
              </For>
            </>
          );
        })()}
      </svg>

      {/* Tooltip */}
      <Show when={tooltip()}>
        {(tip) => (
          <div
            style={{
              position: "absolute",
              left: `${tip().x}px`,
              top: `${tip().y - 8}px`,
              transform: "translate(-50%, -100%)",
              background: "rgba(10,20,32,0.95)",
              border: "1px solid rgba(0,255,136,0.3)",
              "border-radius": "6px",
              padding: "8px 12px",
              "pointer-events": "none",
              "z-index": "10",
              "white-space": "nowrap",
            }}
          >
            <div style={{
              "font-family": "'JetBrains Mono', monospace",
              "font-size": "11px",
              color: GREEN,
              "margin-bottom": "2px",
            }}>
              {fmtTime(tip().point.timestamp)}
            </div>
            <div style={{
              "font-family": "'JetBrains Mono', monospace",
              "font-size": "12px",
              color: "#e0f4ff",
            }}>
              {fmtNum(tip().point.rowsPerMinute)} rows/min
            </div>
          </div>
        )}
      </Show>
    </div>
  );
}
