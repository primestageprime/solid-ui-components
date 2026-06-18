// lastReviewedAt: 2026-06-18
// lastReviewedBy: peter.stradinger
// ============================================
// CompletionChart — Composed (Depth 2)
//
// A sibling of ThroughputChart in the same module. Where ThroughputChart plots
// instantaneous rows/min, CompletionChart plots PROGRESS over a fixed window:
// per-bucket COMPLETED-ITEM bars + a CUMULATIVE-% line, both on one shared
// 0–100 axis (bars scaled by the busiest bucket, so the two series coexist
// without a second axis). Composes Chart + Grid + axes + BarSeries + LineSeries
// from src/components/Chart; the bars/line colors come from SUI tokens.
//
// Data-only + self-sizing: the caller hands over raw completion events + the
// window/total; the component buckets them itself and measures its own width
// with a ResizeObserver, so a consumer hosts NO charting DOM, no bucketing, and
// no measurement code. Built for an ETL extraction dashboard's "tables done per
// hour + cumulative % complete" header, but item-agnostic.
// ============================================
import { createMemo, createSignal, onCleanup, onMount } from "solid-js";
import {
  Chart,
  Grid,
  XAxis,
  YAxis,
  BarSeries,
  LineSeries,
} from "../Chart";
import { Legend } from "../Legend";

const HOUR_MS = 3_600_000;

/** One completion the chart buckets onto the timeline. */
export interface CompletionPoint {
  /** Epoch ms the item completed. */
  completedAt: number;
}

export interface CompletionChartProps {
  /** Completions within (and the component filters to) the window. */
  completions: CompletionPoint[];
  /** "now" epoch ms — the right edge of the window. */
  now: number;
  /** Window width in hours (one bar per hour). */
  windowHours: number;
  /** Total item count — the denominator for the cumulative-% line. */
  totalCount: number;
  /** Items already completed BEFORE the window opened, so the cumulative line
   *  starts at the right baseline instead of 0. Default 0. */
  baselineCompleted?: number;
  /** Chart height in px (excludes the legend). Default 200. */
  height?: number;
  /** Fallback width before the ResizeObserver reports. Default 1000. */
  initialWidth?: number;
  /** Legend label for the bars. Default "Completed / hr". */
  barsLabel?: string;
  /** Legend label for the cumulative line. Default "Cumulative %". */
  cumulativeLabel?: string;
}

const BAR_FILL = "var(--sui-accent, #4f8ef7)";
const LINE_STROKE = "var(--sui-success, #22c55e)";

interface HourBucket {
  hourIndex: number;
  completedCount: number;
  cumulativePct: number; // 0..100 at the END of this hour
}

export function CompletionChart(props: CompletionChartProps) {
  const height = () => props.height ?? 200;
  const windowHours = () => props.windowHours;

  // Self-measure: a SUI Chart needs an explicit pixel width, so the component
  // measures its own container rather than make the consumer wire a ref.
  let containerRef: HTMLDivElement | undefined;
  const [width, setWidth] = createSignal(props.initialWidth ?? 1000);
  onMount(() => {
    if (!containerRef) return;
    // SSR / jsdom may lack ResizeObserver — fall back to the seeded width.
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
    const windowStart = props.now - windowMs;
    const total = props.totalCount;
    const within = props.completions.filter(
      (c) => c.completedAt >= windowStart && c.completedAt <= props.now,
    );
    let running = Math.max(0, props.baselineCompleted ?? 0);
    const out: HourBucket[] = [];
    for (let h = 0; h < windowHours(); h++) {
      const start = windowStart + h * HOUR_MS;
      const end = start + HOUR_MS;
      const inBucket = within.filter(
        (c) => c.completedAt >= start && c.completedAt < end,
      ).length;
      running += inBucket;
      out.push({
        hourIndex: h,
        completedCount: inBucket,
        cumulativePct: total > 0 ? (running / total) * 100 : 0,
      });
    }
    return out;
  });

  // Scale the bars onto the shared 0–100 axis (busiest bucket → full height).
  const scaled = createMemo(() => {
    const data = buckets();
    const max = Math.max(1, ...data.map((b) => b.completedCount));
    return data.map((b) => ({ ...b, barScaled: (b.completedCount / max) * 100 }));
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
    <div class="sui-completion-chart" ref={containerRef}>
      <Legend
        items={[
          { color: BAR_FILL, label: props.barsLabel ?? "Completed / hr" },
          { color: LINE_STROKE, label: props.cumulativeLabel ?? "Cumulative %" },
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
          data={scaled()}
          x={(_d, i) => i}
          value={(d) => d.barScaled}
          fill={BAR_FILL}
          bandWidth={0.7}
        />
        <LineSeries
          data={scaled()}
          x={(d) => d.hourIndex}
          y={(d) => d.cumulativePct}
          stroke={LINE_STROKE}
          strokeWidth={2}
        />
        <XAxis tickValues={tickValues()} tickFormat={tickFormat} rotateLabels={false} />
        <YAxis tickCount={5} tickFormat={(v) => `${v}%`} label="% complete" />
      </Chart>
    </div>
  );
}
