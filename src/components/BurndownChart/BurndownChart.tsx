// ============================================
// BurndownChart — Composed (Depth 2)
// Composes Chart + Grid + axes + BarSeries (stacked +/-) + ReferenceLine
// + LineSeries (trend/projection) from src/components/Chart. Public API
// preserved from the prior monolithic implementation.
// ============================================
import { createMemo } from "solid-js";
import {
  Chart,
  Grid,
  XAxis,
  YAxis,
  BarSeries,
  LineSeries,
  ReferenceLine,
} from "../Chart";

export interface BurndownBar {
  label: string;
  planned_complete: number;
  planned_incomplete: number;
  unplanned_complete: number;
  unplanned_incomplete: number;
}

export type BurndownSegmentKind =
  | "planned_complete"
  | "planned_incomplete"
  | "unplanned_complete"
  | "unplanned_incomplete";

export interface BurndownChartProps {
  bars: BurndownBar[];
  onSegmentClick?: (barIndex: number, segment: BurndownSegmentKind) => void;
  /** Default 300. */
  height?: number;
}

const COLOR = {
  pi: "var(--sui-burndown-pi, #3a4a5e)",
  pc: "var(--sui-burndown-pc, #5fb37c)",
  uc: "var(--sui-burndown-uc, #e0a14a)",
  ui: "var(--sui-burndown-ui, #e57373)",
};

export function BurndownChart(props: BurndownChartProps) {
  const height = () => props.height ?? 300;

  const yDomain = createMemo<[number, number]>(() => {
    const above = Math.max(
      1,
      ...props.bars.map((b) => b.planned_complete + b.planned_incomplete),
    );
    const below = Math.max(
      0,
      ...props.bars.map((b) => b.unplanned_complete + b.unplanned_incomplete),
    );
    return [-Math.max(below, above * 0.25), above];
  });

  const trend = createMemo(() => {
    const bars = props.bars;
    if (bars.length < 2) return null;
    const first = bars[0].planned_incomplete;
    const last = bars[bars.length - 1].planned_incomplete;
    const n = bars.length;
    let xEnd = n - 1;
    let yEnd = last;
    let projDays: number | null = null;
    if (last > 0 && first > last) {
      const rate = (first - last) / (n - 1);
      const extra = last / rate;
      projDays = Math.ceil(extra);
      xEnd = n - 1 + extra;
      yEnd = 0;
    }
    return { first, last, n, xEnd, yEnd, projDays };
  });

  const xDomain = createMemo<[number, number]>(() => {
    const t = trend();
    const max = t ? Math.max(props.bars.length - 0.5, t.xEnd + 0.5) : props.bars.length - 0.5;
    return [-0.5, max];
  });

  const tickValues = createMemo(() => props.bars.map((_, i) => i));

  return (
    <Chart
      width={Math.max(400, props.bars.length * 64 + 100)}
      height={height()}
      xDomain={xDomain()}
      yDomain={yDomain()}
      margin={{ top: 16, right: 32, bottom: 32, left: 44 }}
    >
      <Grid />
      <YAxis tickCount={6} />
      <XAxis tickValues={tickValues()} tickFormat={(v) => props.bars[Math.round(v)]?.label ?? ""} />
      <ReferenceLine y={0} stroke="currentColor" strokeDasharray="" />
      <BarSeries
        data={props.bars}
        x={(_b, i) => i}
        bandWidth={0.65}
        segments={(b) => [
          { value: b.planned_incomplete, fill: COLOR.pi, key: "planned_incomplete" },
          { value: b.planned_complete, fill: COLOR.pc, key: "planned_complete" },
          { value: -b.unplanned_complete, fill: COLOR.uc, key: "unplanned_complete" },
          { value: -b.unplanned_incomplete, fill: COLOR.ui, key: "unplanned_incomplete" },
        ]}
        onSegmentClick={(bar, seg) =>
          props.onSegmentClick?.(props.bars.indexOf(bar), seg.key as BurndownSegmentKind)
        }
      />
      {trend() && (
        <>
          <LineSeries
            data={[
              { x: 0, y: trend()!.first },
              { x: trend()!.n - 1, y: trend()!.last },
            ]}
            x={(d) => d.x}
            y={(d) => d.y}
            stroke="var(--sui-text-muted, #9bb)"
            strokeWidth={1.5}
          />
          {trend()!.projDays !== null && (
            <LineSeries
              data={[
                { x: trend()!.n - 1, y: trend()!.last },
                { x: trend()!.xEnd, y: trend()!.yEnd },
              ]}
              x={(d) => d.x}
              y={(d) => d.y}
              stroke="var(--sui-text-muted, #9bb)"
              strokeDasharray="4 4"
            />
          )}
        </>
      )}
    </Chart>
  );
}
