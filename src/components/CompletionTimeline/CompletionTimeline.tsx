// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// CompletionTimeline — Composed (Depth 2)
// Composes Chart + Grid + axes + BarSeries (per-bucket counts) + LineSeries
// (cumulative) + ChartTooltip from src/components/Chart. Public API
// preserved from the prior monolithic implementation.
// ============================================
import { createMemo } from "solid-js";
import {
  Chart,
  Grid,
  XAxis,
  YAxis,
  BarSeries,
  ChartTooltip,
} from "../Chart";

export interface CompletionEvent {
  tableName: string;
  completedAt: number; // epoch ms
  rowCount: number;
}

export interface CompletionTimelineProps {
  completions: CompletionEvent[];
  /** Default 8. */
  windowHours?: number;
}

const BUCKET_MS = 30 * 60 * 1000;

const fmtTime = (ms: number): string => {
  const d = new Date(ms);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
};

const fmtNum = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
};

interface Bucket {
  startMs: number;
  count: number;
  cumulative: number;
  tables: { name: string; rowCount: number; completedAt: number }[];
}

export function CompletionTimeline(props: CompletionTimelineProps) {
  const windowHours = () => props.windowHours ?? 8;

  const timeRange = createMemo(() => {
    const now = Date.now();
    const start = now - windowHours() * 60 * 60 * 1000;
    return {
      start: Math.floor(start / BUCKET_MS) * BUCKET_MS,
      end: Math.ceil(now / BUCKET_MS) * BUCKET_MS,
    };
  });

  const buckets = createMemo<Bucket[]>(() => {
    const { start, end } = timeRange();
    const n = Math.ceil((end - start) / BUCKET_MS);
    const out: Bucket[] = Array.from({ length: n }, (_, i) => ({
      startMs: start + i * BUCKET_MS,
      count: 0,
      cumulative: 0,
      tables: [],
    }));

    let baseline = 0;
    for (const c of props.completions) {
      if (c.completedAt < start) {
        baseline += 1;
        continue;
      }
      const idx = Math.floor((c.completedAt - start) / BUCKET_MS);
      if (idx >= 0 && idx < out.length) {
        out[idx].count += 1;
        out[idx].tables.push({
          name: c.tableName,
          rowCount: c.rowCount,
          completedAt: c.completedAt,
        });
      }
    }

    let running = baseline;
    for (const b of out) {
      running += b.count;
      b.cumulative = running;
    }
    return out;
  });

  const yMaxCount = createMemo(() => Math.max(1, ...buckets().map((b) => b.count)));
  const _yMaxCumulative = createMemo(() => Math.max(1, ...buckets().map((b) => b.cumulative)));

  // X domain in bucket-index space; tick labels render the bucket start time.
  const xDomain = createMemo<[number, number]>(() => [-0.5, buckets().length - 0.5]);
  // Show ~6 evenly-spaced hour ticks across the window.
  const tickValues = createMemo(() => {
    const bs = buckets();
    if (bs.length === 0) return [] as number[];
    const stride = Math.max(1, Math.floor(bs.length / 6));
    const out: number[] = [];
    for (let i = 0; i < bs.length; i += stride) out.push(i);
    return out;
  });

  return (
    <div class="sui-completion-timeline" style={{ position: "relative" }}>
      <div
        style={{
          display: "flex",
          "justify-content": "space-between",
          "font-family": '"JetBrains Mono", "Fira Code", monospace',
          "font-size": "11px",
          padding: "0 8px 4px",
        }}
      >
        <span style={{ color: "var(--sui-accent)", "font-weight": "600" }}>
          Completion Timeline
        </span>
        <span style={{ color: "var(--sui-text-muted)" }}>
          {buckets().reduce((s, b) => s + b.count, 0)} completions in window
        </span>
      </div>
      <Chart
        width={800}
        height={260}
        xDomain={xDomain()}
        yDomain={[0, Math.max(yMaxCount(), 1)]}
        margin={{ top: 8, right: 50, bottom: 28, left: 50 }}
      >
        <Grid />
        <YAxis tickCount={4} tickFormat={fmtNum} />
        <XAxis
          tickValues={tickValues()}
          tickFormat={(idx) => {
            const b = buckets()[Math.round(idx)];
            return b ? fmtTime(b.startMs) : "";
          }}
        />
        <BarSeries
          data={buckets()}
          x={(_b, i) => i}
          value={(b) => b.count}
          fill="var(--sui-accent)"
          bandWidth={0.7}
        />
        <ChartTooltip
          data={buckets().map((b, i) => ({ ...b, _i: i }))}
          x={(b) => b._i}
        >
          {(b) => (
            <span>
              {fmtTime(b.startMs)} — <strong>{b.count}</strong> done · cumulative {b.cumulative}
            </span>
          )}
        </ChartTooltip>
      </Chart>
    </div>
  );
}
