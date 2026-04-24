import { createMemo, For, Show, createSignal } from "solid-js";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface CompletionEvent {
  tableName: string;
  completedAt: number;   // epoch ms
  rowCount: number;
}

export interface CompletionTimelineProps {
  completions: CompletionEvent[];
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
const BAR_COLOR = "#00d4ff";
const BAR_HOVER_COLOR = "#00ff88";

// ─── Layout ────────────────────────────────────────────────────────────────────

const PAD = { top: 28, right: 20, bottom: 36, left: 50 };

function fmtTime(ms: number): string {
  const d = new Date(ms);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function CompletionTimeline(props: CompletionTimelineProps) {
  const windowHours = () => props.windowHours ?? 8;

  // Bucket size: 30 min
  const BUCKET_MS = 30 * 60 * 1000;

  const [hoverIdx, setHoverIdx] = createSignal<number | null>(null);
  const [tooltip, setTooltip] = createSignal<{ x: number; y: number; bucket: any } | null>(null);

  // Time range
  const timeRange = createMemo(() => {
    const now = Date.now();
    const start = now - windowHours() * 60 * 60 * 1000;
    // Snap start to bucket boundary
    const snappedStart = Math.floor(start / BUCKET_MS) * BUCKET_MS;
    const snappedEnd = Math.ceil(now / BUCKET_MS) * BUCKET_MS;
    return { start: snappedStart, end: snappedEnd };
  });

  // Bucket completions
  interface Bucket {
    startMs: number;
    count: number;        // completions in this bucket
    cumulative: number;   // running total up to and including this bucket
    tables: { name: string; rowCount: number; completedAt: number }[];
  }

  const buckets = createMemo<Bucket[]>(() => {
    const { start, end } = timeRange();
    const numBuckets = Math.ceil((end - start) / BUCKET_MS);
    const result: Bucket[] = [];

    for (let i = 0; i < numBuckets; i++) {
      result.push({
        startMs: start + i * BUCKET_MS,
        count: 0,
        cumulative: 0,
        tables: [],
      });
    }

    // Count completions before the window for the baseline
    let baseline = 0;
    for (const c of props.completions) {
      if (c.completedAt < start) {
        baseline++;
        continue;
      }
      const idx = Math.floor((c.completedAt - start) / BUCKET_MS);
      if (idx >= 0 && idx < result.length) {
        result[idx].count++;
        result[idx].tables.push({
          name: c.tableName,
          rowCount: c.rowCount,
          completedAt: c.completedAt,
        });
      }
    }

    // Compute cumulative
    let running = baseline;
    for (const b of result) {
      running += b.count;
      b.cumulative = running;
    }

    return result;
  });

  // Max cumulative for Y scale
  const yMax = createMemo(() => {
    const b = buckets();
    if (b.length === 0) return 10;
    const max = b[b.length - 1].cumulative;
    // Nice rounding
    if (max <= 10) return 10;
    if (max <= 25) return 25;
    if (max <= 50) return 50;
    const step = Math.pow(10, Math.floor(Math.log10(max)));
    return Math.ceil(max / step) * step;
  });

  // Y ticks
  const yTicks = createMemo(() => {
    const max = yMax();
    const count = 4;
    const step = max / count;
    const ticks: number[] = [];
    for (let i = 0; i <= count; i++) ticks.push(Math.round(step * i));
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
          fill={CYAN}
          font-size="12"
          font-family="'JetBrains Mono', 'Fira Code', monospace"
          font-weight="600"
        >
          Table Completion Timeline
        </text>

        {/* Subtitle */}
        <text
          x={800 - PAD.right}
          y={18}
          fill={DIM}
          font-size="10"
          font-family="'JetBrains Mono', 'Fira Code', monospace"
          text-anchor="end"
        >
          Last {windowHours()}h — {props.completions.length} tables completed
        </text>

        {/* Inner chart area */}
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
                      {tick}
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

              {/* Step line (cumulative) */}
              {(() => {
                const b = buckets();
                if (b.length === 0) return null;

                // Build step path
                let path = `M ${PAD.left} ${scaleY(b[0].cumulative - b[0].count)}`;
                for (let i = 0; i < b.length; i++) {
                  const x1 = scaleX(b[i].startMs);
                  const x2 = scaleX(b[i].startMs + BUCKET_MS);
                  const yPrev = scaleY(b[i].cumulative - b[i].count);
                  const yCurr = scaleY(b[i].cumulative);
                  // Horizontal to start of bucket at prev level
                  path += ` L ${x1} ${yPrev}`;
                  // Step up
                  if (b[i].count > 0) {
                    path += ` L ${x1} ${yCurr}`;
                  }
                  // Horizontal across bucket
                  path += ` L ${x2} ${yCurr}`;
                }

                // Fill area
                const lastBucket = b[b.length - 1];
                const fillPath = path
                  + ` L ${scaleX(lastBucket.startMs + BUCKET_MS)} ${PAD.top + innerH}`
                  + ` L ${PAD.left} ${PAD.top + innerH} Z`;

                return (
                  <>
                    <path d={fillPath} fill="rgba(0,212,255,0.08)" />
                    <path
                      d={path}
                      fill="none"
                      stroke={CYAN}
                      stroke-width="2"
                      stroke-linejoin="round"
                    />
                  </>
                );
              })()}

              {/* Per-bucket bars (new completions in each bucket) */}
              <For each={buckets()}>
                {(bucket, i) => {
                  const b = buckets();
                  const slotW = innerW / b.length;
                  const barW = Math.max(4, slotW * 0.6);
                  const x = scaleX(bucket.startMs) + (slotW - barW) / 2;
                  const barH = bucket.count > 0
                    ? Math.max(3, (bucket.count / yMax()) * innerH)
                    : 0;
                  const y = PAD.top + innerH - barH;

                  return (
                    <Show when={bucket.count > 0}>
                      <rect
                        x={x}
                        y={y}
                        width={barW}
                        height={barH}
                        fill={hoverIdx() === i() ? BAR_HOVER_COLOR : BAR_COLOR}
                        opacity={0.5}
                        rx="2"
                        onMouseEnter={(e) => {
                          setHoverIdx(i());
                          const rect = (e.target as SVGRectElement).ownerSVGElement!.getBoundingClientRect();
                          setTooltip({
                            x: e.clientX - rect.left,
                            y: e.clientY - rect.top - 10,
                            bucket,
                          });
                        }}
                        onMouseLeave={() => {
                          setHoverIdx(null);
                          setTooltip(null);
                        }}
                        style={{ cursor: "pointer" }}
                      />
                    </Show>
                  );
                }}
              </For>

              {/* Dots at step transitions */}
              <For each={buckets()}>
                {(bucket) => (
                  <Show when={bucket.count > 0}>
                    <circle
                      cx={scaleX(bucket.startMs)}
                      cy={scaleY(bucket.cumulative)}
                      r="3"
                      fill={GREEN}
                      stroke="#0a1420"
                      stroke-width="1.5"
                    />
                  </Show>
                )}
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
              border: "1px solid rgba(0,212,255,0.3)",
              "border-radius": "6px",
              padding: "8px 12px",
              "pointer-events": "none",
              "z-index": "10",
              "min-width": "180px",
              "max-width": "280px",
            }}
          >
            <div style={{
              "font-family": "'JetBrains Mono', monospace",
              "font-size": "11px",
              color: CYAN,
              "margin-bottom": "4px",
            }}>
              {fmtTime(tip().bucket.startMs)} - {fmtTime(tip().bucket.startMs + 30 * 60 * 1000)}
            </div>
            <div style={{
              "font-family": "'JetBrains Mono', monospace",
              "font-size": "10px",
              color: DIM,
              "margin-bottom": "4px",
            }}>
              {tip().bucket.count} table{tip().bucket.count !== 1 ? "s" : ""} completed ({tip().bucket.cumulative} total)
            </div>
            <For each={tip().bucket.tables.slice(0, 5)}>
              {(t: any) => (
                <div style={{
                  "font-family": "'JetBrains Mono', monospace",
                  "font-size": "10px",
                  color: "#e0f4ff",
                  "padding": "1px 0",
                }}>
                  {t.name} <span style={{ color: DIM }}>{fmtNum(t.rowCount)} rows</span>
                </div>
              )}
            </For>
            <Show when={tip().bucket.tables.length > 5}>
              <div style={{
                "font-family": "'JetBrains Mono', monospace",
                "font-size": "9px",
                color: DIM,
                "padding-top": "2px",
              }}>
                +{tip().bucket.tables.length - 5} more
              </div>
            </Show>
          </div>
        )}
      </Show>
    </div>
  );
}
