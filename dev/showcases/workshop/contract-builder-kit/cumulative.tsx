// ============================================
// CumulativeDivergence — the running Σ(booked − hope) across all three types,
// month by month from January: is the mix ahead of or behind the total target?
// COMPOSED from SUI, no CSS of its own, on the SAME month axis as PeriodBars:
//
//   Chart (index x, responsive) + Grid + YAxis + XAxis (month ticks)
//   AreaSeries x4       the running total filled against zero: green above
//                       (ahead), red below (behind), split exactly at each
//                       zero crossing; solid to the last actual month,
//                       translucent from NOW on (Peter, 2026-10-08)
//   LineSeries x2       the running total through the bar ends: solid up to
//                       NOW, dashed after it
//   ReferenceLine x2    the zero baseline, and NOW
//
// Why not ChannelChart / ChannelDivergenceChart (the larger find hits): they
// draw their own x axis and size, so they cannot share this month axis or a
// NOW rule with the bars above, and they have no way to tell actual months
// from outlook months; their floor/ceiling band has no meaning against a zero
// baseline. The sides are AreaSeries with their own `fill` (which paints since
// #272 fixed Chart.css's override); DeviationBand would need CSS classes.
// ============================================
import { type Component, createMemo } from "solid-js";
import {
  AreaSeries,
  Chart,
  Grid,
  LineSeries,
  ReferenceLine,
  XAxis,
  YAxis,
  fn,
} from "../../../../src";
import {
  type Config,
  monthLabel,
  monthsOf,
  cumulativeDelta,
  money,
  monthOf,
  monthPosition,
} from "../contract-builder-model";

const { filter, map } = fn;

const WIDTH = 960;
const HEIGHT = 220;
const MARGIN = { top: 12, right: 12, bottom: 26, left: 52 };

const AHEAD = "var(--sui-success)";
const BEHIND = "var(--sui-danger)";

interface Vertex {
  readonly x: number;
  readonly y: number;
}

interface Point {
  readonly month: number;
  readonly value: number;
  /** Before NOW's month: actual. From it on: signed future work vs hope. */
  readonly past: boolean;
}

/** A round span that holds every value and zero, in $5k steps. */
const span = (values: readonly number[]): readonly [number, number] => {
  const step = 5000;
  const lo = Math.floor(Math.min(0, ...values) / step) * step;
  const hi = Math.ceil(Math.max(0, ...values) / step) * step;
  return [lo, hi === lo ? lo + step : hi];
};

export const CumulativeDivergence: Component<{
  readonly config: Config;
  readonly today: string;
  /**
   * A HELD y extent (`createAxisWaterMarks`: grows with the data, shrinks
   * only when the reader asks). Omitted, the axis fits the data both ways.
   */
  readonly held?: readonly [number, number] | null;
  /** The last month drawn (the horizon); omitted, December. */
  readonly lastMonth?: number;
  /**
   * A MEASURED box to draw at, in px. Given, the chart fills exactly that box
   * (a BuilderBoard panel); omitted, it scales to its width at a fixed aspect.
   */
  readonly size?: { readonly width: number; readonly height: number };
}> = (props) => {
  const last = () => props.lastMonth ?? monthsOf(props.config).length - 1;
  const points = createMemo((): readonly Point[] =>
    map(
      (m: number) => ({
        month: m,
        value: cumulativeDelta(props.config, m, props.today),
        past: m < monthOf(props.today),
      }),
      filter((m: number) => m <= last(), monthsOf(props.config)),
    ),
  );
  const domain = createMemo(() =>
    span(props.held ? [...props.held] : map((p: Point) => p.value, points())),
  );
  /** About five round ticks, whatever the span: $5k, $10k, $25k, $50k… steps. */
  const ticks = createMemo(() => {
    const [lo, hi] = domain();
    const raw = (hi - lo) / 5;
    const step = [5000, 10000, 25000, 50000, 100000].find((x) => x >= raw) ?? 250000;
    const first = Math.ceil(lo / step) * step;
    return Array.from({ length: Math.floor((hi - first) / step) + 1 }, (_v, k) => first + k * step);
  });
  /* The dashed outlook starts at the last actual month so the line is
     unbroken where solid hands over to dashed. */
  const actual = createMemo(() => filter((p: Point) => p.past, points()));
  const outlook = createMemo(() =>
    filter((p: Point) => p.month >= monthOf(props.today) - 1, points()),
  );
  /*
   * THE AREA (Peter, 2026-10-08): the running total filled against zero —
   * green above, red below — split EXACTLY at each zero crossing (a crossing
   * vertex is inserted between two months of opposite sign), so each side
   * takes its own colour. Solid up to the last actual month; translucent from
   * there on, under the dashed outlook line.
   */
  const boundary = () => monthOf(props.today) - 1;
  const traced = createMemo((): readonly Vertex[] => {
    const ps = points();
    const out: Vertex[] = [];
    for (let k = 0; k < ps.length; k++) {
      const p = ps[k];
      const prev = ps[k - 1];
      if (prev && Math.sign(prev.value) * Math.sign(p.value) < 0) {
        const t = prev.value / (prev.value - p.value);
        out.push({ x: prev.month + t, y: 0 });
      }
      out.push({ x: p.month, y: p.value });
    }
    return out;
  });
  const part = (side: 1 | -1, past: boolean) => () =>
    map(
      (v: Vertex) => ({ x: v.x, y: side > 0 ? Math.max(0, v.y) : Math.min(0, v.y) }),
      filter((v: Vertex) => (past ? v.x <= boundary() : v.x >= boundary()), traced()),
    );
  return (
    <Chart
      responsive={props.size === undefined}
      width={props.size?.width ?? WIDTH}
      height={props.size?.height ?? HEIGHT}
      xDomain={[-0.5, last() + 0.5]}
      yDomain={[domain()[0], domain()[1]]}
      margin={MARGIN}
    >
      <Grid tickCount={4} />
      <YAxis tickValues={ticks()} tickFormat={money} />
      <XAxis
        tickValues={filter((m: number) => m <= last(), monthsOf(props.config))}
        tickFormat={(m) => monthLabel(Math.round(m))}
      />
      <AreaSeries data={part(1, true)()} x={(v) => v.x} y={(v) => v.y} baseline={0} fill={AHEAD} fillOpacity={0.55} />
      <AreaSeries data={part(-1, true)()} x={(v) => v.x} y={(v) => v.y} baseline={0} fill={BEHIND} fillOpacity={0.55} />
      <AreaSeries data={part(1, false)()} x={(v) => v.x} y={(v) => v.y} baseline={0} fill={AHEAD} fillOpacity={0.2} />
      <AreaSeries data={part(-1, false)()} x={(v) => v.x} y={(v) => v.y} baseline={0} fill={BEHIND} fillOpacity={0.2} />
      <LineSeries
        data={actual()}
        x={(p) => p.month}
        y={(p) => p.value}
        stroke="var(--sui-text-primary)"
        strokeWidth={1.5}
      />
      <LineSeries
        data={outlook()}
        x={(p) => p.month}
        y={(p) => p.value}
        stroke="var(--sui-text-primary)"
        strokeWidth={1.5}
        strokeDasharray="4 3"
      />
      <ReferenceLine orientation="horizontal" value={0} stroke="var(--sui-text-muted)" />
      <ReferenceLine
        orientation="vertical"
        value={monthPosition(props.today)}
        label="now"
        stroke="var(--sui-text-primary)"
        strokeDasharray="4 3"
      />
    </Chart>
  );
};
