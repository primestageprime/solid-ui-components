// lastReviewedAt: 2026-10-09
// lastReviewedBy: adlai.arnold
// ============================================
// BalanceReviewChart — Composite (Depth 2)
// Composes Chart + Grid + XAxis + YAxis + LineSeries x2 + PointSeries x2 +
// ReferenceLine x2 + GapBracket + ChartLabels + Crosshair + ChartTooltip from
// the Chart family, and VarianceStrip. Draws no SVG and owns no CSS.
//
// THE MONTH AS IT HAPPENED, AGAINST THE FORECAST MADE WHEN IT BEGAN. The
// actual balance runs across the window as one solid line. The forecast
// frozen at the start of the month runs dashed from the day it was made. The
// cash floor is the chart's bottom, as on every cashflow chart. The largest
// variance days carry a dot and a caption, placed by the label ladder so
// they never collide, and never cross a line. In the right gutter a bracket
// spans the two lines' ends with `endLabels.gap` as its caption: how far the
// month landed from the forecast. Under the plot, on the same days,
// `VarianceStrip` draws what each day did that the forecast did not; one
// crosshair spans both.
//
// Not `CashflowScrubChart`, which draws the forecast FORWARD from today with
// a cone; this looks back. Not `SignedAreaChart`, which draws one running
// total; this draws two balances and their day-by-day difference.
//
// The caller states every word: formats, captions and the names of the two
// lines, so the chart carries no vocabulary of its own.
// ============================================
import { type Component, type JSX, Show, createMemo } from "solid-js";
import { filter, find, map } from "../../fn";
import {
  Chart,
  ChartLabels,
  ChartTooltip,
  Crosshair,
  GapBracket,
  Grid,
  LineSeries,
  gapMidpoint,
  PointSeries,
  ReferenceLine,
  XAxis,
  YAxis,
} from "../Chart";
import { measureLabelWidth } from "../ScrubChart/helpers";
import { VarianceStrip, type VarianceKind } from "../VarianceStrip";

export interface BalanceReviewPoint {
  readonly date: Date;
  readonly value: number;
}

export interface BalanceReviewDay {
  readonly date: Date;
  /** + is better than forecast, − is worse. */
  readonly value: number;
  readonly kind: VarianceKind;
}

/** A dot on the actual line with a caption: an event day, or a marker such
 *  as "a month ago". */
export interface BalanceReviewMark {
  readonly date: Date;
  readonly value: number;
  readonly label: string;
}

export interface BalanceReviewChartProps {
  readonly actual: readonly BalanceReviewPoint[];
  /** The frozen forecast. Omitted or empty, no dashed line, no strip. */
  readonly forecast?: readonly BalanceReviewPoint[];
  /** The day the forecast was made: a vertical rule with `labels.forecastMade`. */
  readonly forecastMadeOn?: Date | null;
  /** The cash floor: the chart's bottom and a dotted rule. Null, no floor. */
  readonly floor?: number | null;
  /** One entry per day of variance, for the strip. */
  readonly variance?: readonly BalanceReviewDay[];
  /** Dots with captions on the actual line. */
  readonly marks?: readonly BalanceReviewMark[];
  /** Captions in the right gutter: each line's end, and the gap between
   *  them. `gap` also draws the bracket that spans the two ends. */
  readonly endLabels?: { readonly actual?: string; readonly forecast?: string; readonly gap?: string };
  readonly xDomain: readonly [Date, Date];
  readonly valueFormat: (value: number) => string;
  readonly dateFormat?: (date: Date) => string;
  /** The words on the chart. */
  readonly labels?: {
    readonly floor?: string;
    readonly forecastMade?: string;
    readonly strip?: string;
  };
  /** The tooltip for a hovered day on the actual line. */
  readonly tooltip?: (actual: BalanceReviewPoint, forecast: BalanceReviewPoint | null, day: BalanceReviewDay | null) => JSX.Element;
  /** The strip's height and the gap above it. Defaults 64 and 22. */
  readonly strip?: { readonly height?: number; readonly gap?: number; readonly minExtent?: number };
  readonly size?: { readonly width: number; readonly height: number };
  /** The lines' strokes. Defaults: the primary text colour, and the secondary. */
  readonly colors?: { readonly actual?: string; readonly forecast?: string; readonly floor?: string };
}

const WIDTH = 880;
const PLOT_HEIGHT = 300;
const MARGIN = { top: 18, right: 170, bottom: 34, left: 56 };
const DAY_MS = 86_400_000;
const HEADROOM = 1.12;
/** The bracket stands this far past the plot edge: clear of the line ends,
 *  so it reads as a measure beside them and not as a last segment of either
 *  line. Its ticks point back toward the plot. */
const BRACKET_OFFSET = 10;
const BRACKET_TICK = 4;
/** Gutter text stands past the bracket, not under it. */
const GUTTER_INSET = BRACKET_OFFSET + BRACKET_TICK + 2;

/** The ISO day of a date, the key two points on the same day share. */
const isoDay = (d: Date): string => d.toISOString().substring(0, 10);
const sameDay = (a: Date, b: Date): boolean => isoDay(a) === isoDay(b);

export const BalanceReviewChart: Component<BalanceReviewChartProps> = (props) => {
  const hasStrip = () => (props.variance?.length ?? 0) > 0;
  const stripHeight = () => props.strip?.height ?? 64;
  const stripGap = () => props.strip?.gap ?? 22;
  const stripBand = () => (hasStrip() ? stripGap() + stripHeight() : 0);
  const width = () => props.size?.width ?? WIDTH;
  const height = () => props.size?.height ?? PLOT_HEIGHT + stripBand();
  const margin = () => ({ ...MARGIN, bottom: MARGIN.bottom + stripBand() });
  const forecast = () => props.forecast ?? [];
  /** The floor is the bottom; the top leaves headroom over the highest line. */
  const yDomain = createMemo<[number, number]>(() => {
    const values = map((p: BalanceReviewPoint) => p.value, [...props.actual, ...forecast()]);
    const floor = props.floor ?? null;
    const lo = Math.min(floor ?? Number.POSITIVE_INFINITY, ...(values.length ? values : [0]));
    const hi = Math.max(...(values.length ? values : [1]), lo + 1);
    return [lo, lo + (hi - lo) * HEADROOM];
  });
  const x = (p: { readonly date: Date }) => p.date.getTime();
  const actualColor = () => props.colors?.actual ?? "var(--sui-text-primary)";
  const forecastColor = () => props.colors?.forecast ?? "var(--sui-text-secondary)";
  const floorColor = () => props.colors?.floor ?? "var(--sui-danger)";
  const lastActual = () => props.actual[props.actual.length - 1] ?? null;
  const lastForecast = () => forecast()[forecast().length - 1] ?? null;
  /** The bracket needs both ends, a caption, and a gap to span. */
  const gap = () =>
    lastActual() && lastForecast() && props.endLabels?.gap && lastActual()!.value !== lastForecast()!.value
      ? { from: lastActual()!.value, to: lastForecast()!.value, label: props.endLabels.gap, date: lastActual()!.date }
      : null;
  /** Every drawn line, for the ladder: a body caption may not cross one. */
  const polylines = () => [
    map((p: BalanceReviewPoint) => ({ x: p.date.getTime(), y: p.value }), props.actual),
    ...(forecast().length > 0 ? [map((p: BalanceReviewPoint) => ({ x: p.date.getTime(), y: p.value }), forecast())] : []),
  ];
  /** The label ladder. The end captions and the gap caption go first, so they
   *  park on their own rows and a mark caption that falls to the gutter stacks
   *  around them, never the other way round. */
  const labelItems = createMemo(() => [
    ...filter(
      (i: { label: string }) => i.label !== "",
      [
        ...(lastActual() && props.endLabels?.actual
          ? [{ date: lastActual()!.date, value: lastActual()!.value, label: props.endLabels.actual, zone: "right" as const, id: "end-actual" }]
          : []),
        ...(lastForecast() && props.endLabels?.forecast
          ? [{ date: lastForecast()!.date, value: lastForecast()!.value, label: props.endLabels.forecast, zone: "right" as const, id: "end-forecast" }]
          : []),
        ...(gap() ? [{ date: gap()!.date, value: gapMidpoint(gap()!.from, gap()!.to), label: gap()!.label, zone: "right" as const, id: "end-gap" }] : []),
      ],
    ),
    ...map((m: BalanceReviewMark) => ({ ...m, zone: "auto" as const, id: `mark-${m.date.getTime()}` }), props.marks ?? []),
  ]);
  const forecastAt = (date: Date): BalanceReviewPoint | null =>
    find((p: BalanceReviewPoint) => sameDay(p.date, date), forecast()) ?? null;
  const dayAt = (date: Date): BalanceReviewDay | null =>
    find((d: BalanceReviewDay) => sameDay(d.date, date), props.variance ?? []) ?? null;
  const dateWords = (d: Date) => props.dateFormat?.(d) ?? isoDay(d);
  return (
    <Chart
      width={width()}
      height={height()}
      xDomain={[props.xDomain[0], props.xDomain[1]]}
      yDomain={yDomain()}
      margin={margin()}
      responsive={props.size === undefined}
    >
      <Grid horizontal tickCount={4} />
      <YAxis hideLine tickCount={4} tickFormat={props.valueFormat} />
      <XAxis
        hideLine
        labelOffset={16 + stripBand()}
        tickOffset={stripBand()}
        tickFormat={props.dateFormat ? (v) => props.dateFormat?.(new Date(v)) ?? "" : undefined}
      />
      <Show when={props.floor !== null && props.floor !== undefined}>
        <ReferenceLine
          orientation="horizontal"
          value={props.floor as number}
          color={floorColor()}
          labelColor={floorColor()}
          strokeDasharray="2 4"
          strokeWidth={1.5}
          opacity={1}
          label={props.labels?.floor}
        />
      </Show>
      <Show when={props.forecastMadeOn}>
        {(d) => (
          <ReferenceLine orientation="vertical" value={d()} strokeDasharray="3 3" label={props.labels?.forecastMade} />
        )}
      </Show>
      <Show when={forecast().length > 0}>
        <LineSeries data={forecast()} x={x} y={(p) => p.value} stroke={forecastColor()} strokeWidth={1.5} strokeDasharray="5 4" />
      </Show>
      <LineSeries data={props.actual} x={x} y={(p) => p.value} stroke={actualColor()} strokeWidth={2.25} />
      <PointSeries data={props.marks ?? []} x={x} y={(m) => m.value} radius={4} fill={actualColor()} />
      <Show when={gap()}>
        {(g) => <GapBracket from={g().from} to={g().to} offset={BRACKET_OFFSET} tick={BRACKET_TICK} stroke={actualColor()} strokeWidth={1.5} />}
      </Show>
      <ChartLabels
        data={labelItems()}
        id={(i) => i.id}
        text={(i) => i.label}
        width={(i) => measureLabelWidth(i.label)}
        x={(i) => i.date.getTime()}
        y={(i) => i.value}
        placement={(i) => i.zone}
        polylines={polylines()}
        rightInset={gap() ? GUTTER_INSET : 0}
        gutterWidth={margin().right - (gap() ? GUTTER_INSET : 0)}
      />
      <Show when={hasStrip()}>
        <VarianceStrip
          data={props.variance ?? []}
          x={x}
          value={(d) => d.value}
          kind={(d) => d.kind}
          step={DAY_MS}
          placement="below"
          height={stripHeight()}
          gap={stripGap()}
          minExtent={props.strip?.minExtent}
          format={props.valueFormat}
          title={props.labels?.strip}
        />
      </Show>
      <Crosshair
        series={[
          { data: props.actual, x, y: (p: BalanceReviewPoint) => p.value, stroke: actualColor() },
          ...(forecast().length > 0 ? [{ data: forecast(), x, y: (p: BalanceReviewPoint) => p.value, stroke: forecastColor() }] : []),
        ]}
      />
      <ChartTooltip data={props.actual} x={x} maxWidth={260}>
        {(p) =>
          props.tooltip ? (
            props.tooltip(p, forecastAt(p.date), dayAt(p.date))
          ) : (
            <span>
              {dateWords(p.date)} · {props.valueFormat(p.value)}
              {forecastAt(p.date) ? ` · forecast ${props.valueFormat(forecastAt(p.date)!.value)}` : ""}
            </span>
          )
        }
      </ChartTooltip>
    </Chart>
  );
};
