// ============================================
// CumulativeDivergence — the running Σ(booked − hope) across all three types,
// month by month from January: is the mix ahead of or behind the total target?
// COMPOSED from SUI, no CSS of its own, on the SAME month axis as PeriodBars:
//
//   Chart (index x, responsive) + Grid + YAxis + XAxis (month ticks)
//   BarSeries           one signed bar per month, from the zero baseline:
//                       ahead above in green, behind below in red
//   HatchPattern x2     the flat tints for months from NOW on (signed future
//                       work vs hope), so actual and outlook read apart
//   LineSeries x2       the running total through the bar ends: solid up to
//                       NOW, dashed after it
//   ReferenceLine x2    the zero baseline, and NOW
//
// Why not ChannelChart / ChannelDivergenceChart (the larger find hits): they
// draw their own x axis and size, so they cannot share this month axis or a
// NOW rule with the bars above, and they have no way to tell actual months
// from outlook months; their floor/ceiling band has no meaning against a zero
// baseline. An area shaded by side (DeviationBand / AreaSeries) needs CSS
// classes or a fill prop that Chart.css still overrides (`.sui-chart__area`,
// the twin of the LineSeries stroke bug fixed in #269), so the sides are
// signed bars, whose segment fill works.
// ============================================
import { type Component, createMemo, createUniqueId } from "solid-js";
import {
  BarSeries,
  Chart,
  Grid,
  HatchPattern,
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
}> = (props) => {
  const last = () => props.lastMonth ?? monthsOf(props.config).length - 1;
  const uid = createUniqueId();
  const aheadTint = `cb-cum-ahead-${uid}`;
  const behindTint = `cb-cum-behind-${uid}`;
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
  const fillOf = (p: Point): string =>
    p.past
      ? p.value >= 0
        ? AHEAD
        : BEHIND
      : `url(#${p.value >= 0 ? aheadTint : behindTint})`;
  return (
    <Chart
      responsive
      width={WIDTH}
      height={HEIGHT}
      xDomain={[-0.5, last() + 0.5]}
      yDomain={[domain()[0], domain()[1]]}
      margin={MARGIN}
    >
      <defs>
        <HatchPattern id={aheadTint} color={AHEAD} groundOpacity={0.35} stripeOpacity={0} />
        <HatchPattern id={behindTint} color={BEHIND} groundOpacity={0.35} stripeOpacity={0} />
      </defs>
      <Grid tickCount={4} />
      <YAxis tickValues={ticks()} tickFormat={money} />
      <XAxis
        tickValues={filter((m: number) => m <= last(), monthsOf(props.config))}
        tickFormat={(m) => monthLabel(Math.round(m))}
      />
      <BarSeries
        data={points()}
        x={(p) => p.month}
        bandWidth={0.7}
        segments={(p) => [{ value: p.value, fill: fillOf(p), key: "cum" }]}
        onBarClick={(p) => console.table([p])}
      />
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
