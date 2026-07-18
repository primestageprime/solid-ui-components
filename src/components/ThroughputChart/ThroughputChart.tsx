// lastReviewedAt: 2026-06-18
// lastReviewedBy: peter.stradinger
// ============================================
// ThroughputChart — Composed (Depth 2)
//
// Two modes, ONE component:
//
//   RATE (default) — instantaneous rows/min over a time window: area + line +
//     average reference + crosshair tooltip. Driven by `dataPoints`
//     (`{ timestamp, rowsPerMinute }[]`). This is the original behaviour and is
//     fully preserved when the completion props below are absent.
//
//   COMPLETION (opt-in) — PROGRESS over a window: per-hour completed-item
//     `bars` + a `cumulative`-% line on one shared 0–100 axis (bars scaled by
//     the busiest bucket so the two series coexist without a second axis).
//     Triggered by passing `completions` (raw events the chart buckets itself).
//     Self-sizing — the chart measures its own width, so a consumer hosts no
//     bucketing and no measurement code. Built for an ETL "tables done / hr +
//     % complete" header, but item-agnostic.
//
// Composes the Chart family (Grid / axes / AreaSeries / LineSeries / BarSeries /
// ReferenceLine / Crosshair / ChartTooltip) + Legend.
// ============================================
import { createMemo, createSignal, onCleanup, onMount, Show } from "solid-js";
import {
  Chart,
  Grid,
  XAxis,
  YAxis,
  AreaSeries,
  BarSeries,
  LineSeries,
  ReferenceLine,
  Crosshair,
  ChartTooltip,
} from "../Chart";
import { Legend } from "../Legend";
import { SpreadRow } from "../Layout/variants";
import { mean, pluck, sortBy } from "../../fn";
import "./ThroughputChart.css";

export interface ThroughputPoint {
  timestamp: number; // epoch ms
  rowsPerMinute: number;
}

/** One completion the chart buckets onto the timeline (COMPLETION mode). */
export interface CompletionPoint {
  /** Epoch ms the item completed. */
  completedAt: number;
}

export interface ThroughputChartProps {
  // ---- RATE mode (default) ----
  /** Rows/min series. Optional only so COMPLETION mode can omit it. */
  dataPoints?: ThroughputPoint[];
  /** Window width in hours. Default 8 (rate) / required size (completion). */
  windowHours?: number;

  // ---- COMPLETION mode (opt-in: pass `completions`) ----
  /** Completion events; presence switches the chart to COMPLETION mode. The
   *  component buckets these per hour itself and filters to the window. */
  completions?: CompletionPoint[];
  /** "now" epoch ms — the right edge of the completion window. Default now. */
  now?: number;
  /** Total item count — the denominator for the cumulative-% line. */
  totalCount?: number;
  /** Items completed BEFORE the window opened, so the cumulative line starts
   *  at the right baseline instead of 0. Default 0. */
  baselineCompleted?: number;
  /** Legend label for the bars. Default "Completed / hr". */
  barsLabel?: string;
  /** Legend label for the cumulative line. Default "Cumulative %". */
  cumulativeLabel?: string;
  /** Chart height in px. Default 200 (completion) / 260 (rate). */
  height?: number;
  /** Fallback width before the ResizeObserver reports (completion mode).
   *  Default 1000. */
  initialWidth?: number;
}

const HOUR_MS = 3_600_000;

const fmtTime = (ms: number): string => {
  const d = new Date(ms);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
};

const fmtNum = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
};

const niceMax = (val: number): number => {
  if (val <= 0) return 100;
  const mag = 10 ** Math.floor(Math.log10(val));
  for (const c of [1, 2, 2.5, 5, 10]) if (c * mag >= val) return c * mag;
  return 10 * mag;
};

export function ThroughputChart(props: ThroughputChartProps) {
  // COMPLETION mode is selected by supplying `completions`.
  const isCompletion = () => props.completions !== undefined;
  return (
    <Show when={isCompletion()} fallback={<RateChart {...props} />}>
      <CompletionView {...props} />
    </Show>
  );
}

// ---------------------------------------------------------------------------
// RATE mode — the original rows/min area + line. Unchanged behaviour.
// ---------------------------------------------------------------------------

function RateChart(props: ThroughputChartProps) {
  const windowHours = () => props.windowHours ?? 8;
  const data = () => props.dataPoints ?? [];

  const timeRange = createMemo(() => {
    const end = Date.now();
    const start = end - windowHours() * 60 * 60 * 1000;
    return { start, end };
  });

  const points = createMemo(() => {
    const { start, end } = timeRange();
    const inWindow = data().filter(
      (p) => p.timestamp >= start && p.timestamp <= end,
    );
    return sortBy((p: ThroughputPoint) => p.timestamp)(inWindow);
  });

  const yMax = createMemo(() =>
    niceMax(Math.max(0, ...points().map((p) => p.rowsPerMinute))),
  );
  const avg = createMemo(() => {
    const pts = points();
    if (pts.length === 0) return 0;
    return Math.round(mean(pluck("rowsPerMinute")(pts)));
  });
  const peak = createMemo(() => {
    const pts = points();
    return pts.length === 0
      ? 0
      : Math.round(Math.max(...pts.map((p) => p.rowsPerMinute)));
  });

  const hourTicks = createMemo(() => {
    const { start, end } = timeRange();
    const hour = 60 * 60 * 1000;
    const out: number[] = [];
    let t = Math.ceil(start / hour) * hour;
    while (t <= end) {
      out.push(t);
      t += hour;
    }
    return out;
  });

  return (
    <div class="sui-throughput-chart">
      <SpreadRow class="sui-throughput-chart__header">
        <span class="sui-throughput-chart__header-title">
          Extraction Throughput
        </span>
        <span class="sui-throughput-chart__header-meta">
          avg {fmtNum(avg())} / peak {fmtNum(peak())} rows/min
        </span>
      </SpreadRow>
      <Chart
        width={800}
        height={props.height ?? 260}
        xDomain={[timeRange().start, timeRange().end]}
        yDomain={[0, yMax()]}
        margin={{ top: 8, right: 20, bottom: 28, left: 50 }}
      >
        <Grid />
        <YAxis tickCount={4} tickFormat={fmtNum} />
        <XAxis tickValues={hourTicks()} tickFormat={fmtTime} />
        <AreaSeries
          data={points()}
          x={(p) => p.timestamp}
          y={(p) => p.rowsPerMinute}
          fillOpacity={0.08}
        />
        {avg() > 0 && (
          <ReferenceLine
            orientation="horizontal"
            value={avg()}
            label="avg"
            strokeDasharray="4 4"
          />
        )}
        <LineSeries
          data={points()}
          x={(p) => p.timestamp}
          y={(p) => p.rowsPerMinute}
          strokeWidth={2}
        />
        <Crosshair
          series={[
            {
              data: points(),
              x: (p) => p.timestamp,
              y: (p) => p.rowsPerMinute,
            },
          ]}
        />
        <ChartTooltip data={points()} x={(p) => p.timestamp}>
          {(p) => (
            <span>
              {fmtTime(p.timestamp)} —{" "}
              <strong>{fmtNum(p.rowsPerMinute)}</strong> rows/min
            </span>
          )}
        </ChartTooltip>
      </Chart>
    </div>
  );
}

// ---------------------------------------------------------------------------
// COMPLETION mode — per-hour completed bars + a cumulative-% line.
// ---------------------------------------------------------------------------

const BAR_FILL = "var(--sui-accent, #4f8ef7)";
const LINE_STROKE = "var(--sui-success, #22c55e)";

interface HourBucket {
  hourIndex: number;
  completedCount: number;
  cumulativePct: number; // 0..100 at the END of this hour
  barScaled: number; // completedCount scaled onto 0..100
}

function CompletionView(props: ThroughputChartProps) {
  const height = () => props.height ?? 200;
  const windowHours = () => props.windowHours ?? 48;
  const now = () => props.now ?? Date.now();

  // Self-measure: a Chart needs an explicit pixel width, so the component
  // measures its own container rather than make the consumer wire a ref.
  let containerRef: HTMLDivElement | undefined;
  const [width, setWidth] = createSignal(props.initialWidth ?? 1000);
  onMount(() => {
    if (!containerRef) return;
    if (typeof ResizeObserver === "undefined") {
      const rect = containerRef.getBoundingClientRect();
      if (rect.width > 0) setWidth(Math.floor(rect.width));
      return;
    }
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setWidth(Math.floor(w));
    });
    ro.observe(containerRef);
    const rect = containerRef.getBoundingClientRect();
    if (rect.width > 0) setWidth(Math.floor(rect.width));
    onCleanup(() => ro.disconnect());
  });

  // Bucket the completions into one slot per hour, carrying the cumulative %.
  const buckets = createMemo<HourBucket[]>(() => {
    const windowMs = windowHours() * HOUR_MS;
    const windowStart = now() - windowMs;
    const total = props.totalCount ?? 0;
    const within = (props.completions ?? []).filter(
      (c) => c.completedAt >= windowStart && c.completedAt <= now(),
    );
    let running = Math.max(0, props.baselineCompleted ?? 0);
    const raw: Omit<HourBucket, "barScaled">[] = [];
    for (let h = 0; h < windowHours(); h++) {
      const start = windowStart + h * HOUR_MS;
      const end = start + HOUR_MS;
      const inBucket = within.filter(
        (c) => c.completedAt >= start && c.completedAt < end,
      ).length;
      running += inBucket;
      raw.push({
        hourIndex: h,
        completedCount: inBucket,
        cumulativePct: total > 0 ? (running / total) * 100 : 0,
      });
    }
    // Scale the bars onto the shared 0–100 axis (busiest bucket → full height).
    const max = Math.max(1, ...raw.map((b) => b.completedCount));
    return raw.map((b) => ({
      ...b,
      barScaled: (b.completedCount / max) * 100,
    }));
  });

  const xDomain = (): [number, number] => [0, windowHours() - 1];
  const yDomain: [number, number] = [0, 100];

  // One tick every 6 hours, labelled relative ("-48h" … "now").
  const tickValues = createMemo(() =>
    Array.from({ length: Math.floor(windowHours() / 6) + 1 }, (_, i) => i * 6),
  );
  const tickFormat = (v: number) => {
    const hoursAgo = windowHours() - v;
    return hoursAgo === 0 ? "now" : `-${hoursAgo}h`;
  };

  return (
    <div
      class="sui-throughput-chart sui-throughput-chart--completion"
      ref={containerRef}
    >
      <Legend
        items={[
          { color: BAR_FILL, label: props.barsLabel ?? "Completed / hr" },
          {
            color: LINE_STROKE,
            label: props.cumulativeLabel ?? "Cumulative %",
          },
        ]}
        orientation="horizontal"
      />
      <Chart
        width={width()}
        height={height()}
        xDomain={xDomain()}
        yDomain={yDomain}
        margin={{ top: 8, right: 12, bottom: 32, left: 40 }}
      >
        <Grid horizontal vertical={false} tickCount={5} />
        <BarSeries
          data={buckets()}
          x={(_d, i) => i}
          value={(d) => d.barScaled}
          fill={BAR_FILL}
          bandWidth={0.7}
        />
        <LineSeries
          data={buckets()}
          x={(d) => d.hourIndex}
          y={(d) => d.cumulativePct}
          stroke={LINE_STROKE}
          strokeWidth={2}
        />
        <XAxis
          tickValues={tickValues()}
          tickFormat={tickFormat}
          rotateLabels={false}
        />
        <YAxis tickCount={5} tickFormat={(v) => `${v}%`} label="% complete" />
      </Chart>
    </div>
  );
}
