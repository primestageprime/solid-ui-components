// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// ThroughputChart — Composed (Depth 2)
// Composes Chart + Grid + axes + AreaSeries + LineSeries + ReferenceLine
// + Crosshair + ChartTooltip from src/components/Chart. Public API unchanged
// from the prior monolithic implementation; internals are now slot-style.
// ============================================
import { createMemo } from "solid-js";
import {
  Chart,
  Grid,
  XAxis,
  YAxis,
  AreaSeries,
  LineSeries,
  ReferenceLine,
  Crosshair,
  ChartTooltip,
} from "../Chart";

export interface ThroughputPoint {
  timestamp: number; // epoch ms
  rowsPerMinute: number;
}

export interface ThroughputChartProps {
  dataPoints: ThroughputPoint[];
  /** Default 8. */
  windowHours?: number;
}

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
  const mag = Math.pow(10, Math.floor(Math.log10(val)));
  for (const c of [1, 2, 2.5, 5, 10]) if (c * mag >= val) return c * mag;
  return 10 * mag;
};

export function ThroughputChart(props: ThroughputChartProps) {
  const windowHours = () => props.windowHours ?? 8;

  const timeRange = createMemo(() => {
    const end = Date.now();
    const start = end - windowHours() * 60 * 60 * 1000;
    return { start, end };
  });

  const points = createMemo(() => {
    const { start, end } = timeRange();
    return props.dataPoints
      .filter((p) => p.timestamp >= start && p.timestamp <= end)
      .sort((a, b) => a.timestamp - b.timestamp);
  });

  const yMax = createMemo(() => niceMax(Math.max(0, ...points().map((p) => p.rowsPerMinute))));
  const avg = createMemo(() => {
    const pts = points();
    if (pts.length === 0) return 0;
    return Math.round(pts.reduce((s, p) => s + p.rowsPerMinute, 0) / pts.length);
  });
  const peak = createMemo(() => {
    const pts = points();
    return pts.length === 0 ? 0 : Math.round(Math.max(...pts.map((p) => p.rowsPerMinute)));
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
    <div class="sui-throughput-chart" style={{ position: "relative" }}>
      <div
        style={{
          display: "flex",
          "justify-content": "space-between",
          "font-family": '"JetBrains Mono", "Fira Code", monospace',
          "font-size": "11px",
          padding: "0 8px 4px",
        }}
      >
        <span style={{ color: "var(--sui-success)", "font-weight": "600" }}>
          Extraction Throughput
        </span>
        <span style={{ color: "var(--sui-text-muted)" }}>
          avg {fmtNum(avg())} / peak {fmtNum(peak())} rows/min
        </span>
      </div>
      <Chart
        width={800}
        height={260}
        xDomain={[timeRange().start, timeRange().end]}
        yDomain={[0, yMax()]}
        margin={{ top: 8, right: 20, bottom: 28, left: 50 }}
      >
        <Grid />
        <YAxis tickCount={4} tickFormat={fmtNum} />
        <XAxis tickValues={hourTicks()} tickFormat={fmtTime} />
        <AreaSeries data={points()} x={(p) => p.timestamp} y={(p) => p.rowsPerMinute} fillOpacity={0.08} />
        {avg() > 0 && <ReferenceLine orientation="horizontal" value={avg()} label="avg" strokeDasharray="4 4" />}
        <LineSeries data={points()} x={(p) => p.timestamp} y={(p) => p.rowsPerMinute} strokeWidth={2} />
        <Crosshair series={[{ data: points(), x: (p) => p.timestamp, y: (p) => p.rowsPerMinute }]} />
        <ChartTooltip data={points()} x={(p) => p.timestamp}>
          {(p) => (
            <span>
              {fmtTime(p.timestamp)} — <strong>{fmtNum(p.rowsPerMinute)}</strong> rows/min
            </span>
          )}
        </ChartTooltip>
      </Chart>
    </div>
  );
}
