// ============================================
// TargetBarChart — Composite (Depth 2). Owns no CSS, draws no raw SVG or HTML.
// Composes Chart + Grid + XAxis + YAxis + BarSeries x2 + LineSeries +
// ValueHandle + ReferenceLine + ChartTooltip (Chart parts, Depth 1),
// HatchPattern (SvgMarks, Depth 1), a measured `createBox` host and the
// tooltip's TightStack / SpreadRow / TextSublabel / SteadyMonoMeta.
//
// Per period, N series side by side. Each series' bar is a stack of marks
// inside a hollow PROJECTION outline (Peter, 2026-10-08):
//
//   outline      projected          solid        invoiced
//   translucent  Confirmed, not yet invoiced
//   lighter      Planned            red X-hatch  missing (past shortfall)
//   hatched      above the projection
//
// A `ValueHandle` grip on each outline's lid sets that period's projection
// (drag, arrow keys, or double-click to type one in). The y top is FROZEN
// while a grip is held: it derives from the tallest bar, so a drag that grows
// the tallest bar would rescale the axis under the pointer. A NOW rule marks
// where actuals end. Hover rests 250ms, then a breakdown tooltip follows the
// pointer from bar to bar (`ChartTooltip.openDelay`); it hides during a drag.
//
// The cross-hatch is two stripe patterns crossed: the bar's own segment
// carries one angle, an overlay BarSeries the other (a pattern has one
// angle). The overlay's spacer is fill "none", which SVG does not hit-test.
//
// MEASUREMENT, the StackedTimelineChart way: the first size comes
// synchronously from `getBoundingClientRect` in `onMount`, `observeSize`
// keeps it current, a zero reading is never stored (jsdom, hidden tabs), and
// the chart is drawn 1:1 at that size — so the grips and the tooltip map
// pointer and mark in the same px.
//
// The geometry is `targetBarGeometry.ts`; `targetBarRows` prints it.
// ============================================
import {
  type Component,
  Index,
  Show,
  createMemo,
  createSignal,
  createUniqueId,
  onCleanup,
  onMount,
} from "solid-js";
import { observeSize } from "../../internal/dom/observeSize";
import {
  BarSeries,
  Chart,
  ChartTooltip,
  Grid,
  LineSeries,
  ReferenceLine,
  ValueHandle,
  XAxis,
  YAxis,
  useChart,
} from "../Chart";
import { SpreadRow, TightStack, createBox } from "../Layout";
import { createHatchPattern } from "../SvgMarks";
import { SteadyMonoMeta, TextSublabel } from "../Text";
import {
  type PlacedBar,
  type TargetBar,
  type TargetBarSeries,
  type TargetBarStanding,
  TARGET_BAR_BAND,
  TARGET_BAR_HALF,
  TARGET_BAR_STEP,
  breakdownOf,
  outlineOf,
  placeBars,
  slotOffset,
  tallestOf,
  targetBarAxis,
} from "./targetBarGeometry";

export interface TargetBarChartProps {
  /** One entry per series (a job type, say), drawn side by side per period. */
  readonly series: readonly TargetBarSeries[];
  /** The periods on the x axis, ascending (month indices, say). */
  readonly periods: readonly number[];
  /** A period's name: the x tick and the tooltip's heading. */
  readonly periodLabel: (period: number) => string;
  /** Where actuals end, in period units (fractional inside a period). */
  readonly now: number;
  /** A value's text: the y ticks and the tooltip's figures. */
  readonly valueFormat: (value: number) => string;
  /**
   * A HELD y ceiling (`createAxisWaterMarks`: grows with the data, shrinks
   * only when the reader asks). Omitted, the axis fits the bars.
   */
  readonly yMax?: number;
  /**
   * A grip moved: the pointer's value for that series' projection in that
   * period, unclamped and unsnapped — snapping and any floor are the
   * caller's rule. Called on every move and once more on release.
   */
  readonly onProjectionChange?: (
    seriesId: string,
    period: number,
    value: number,
  ) => void;
  /** A bar was double-clicked: type a projection in. */
  readonly onProjectionEnter?: (seriesId: string, period: number) => void;
}

const MARGIN = { top: 12, right: 12, bottom: 26, left: 52 };

/** What an unmeasured chart draws at: a plausible panel, never zero. */
const TARGET_BAR_FALLBACK_SIZE = { width: 960, height: 280 } as const;

/** Show the breakdown after the pointer has rested this long. */
const TOOLTIP_DELAY_MS = 250;

/** The armed grip's overhang plus a gap, beyond half a bar, in px. */
const TOOLTIP_CLEARANCE = 13;

/** Never sized by its content: fills a definite parent, else takes an aspect. */
const MeasuredHost = createBox({
  grow: true,
  style: {
    "flex-basis": "0%",
    "min-height": "0",
    "min-width": "0",
    width: "100%",
    height: "100%",
    "aspect-ratio": "960 / 280",
  },
});

/* The mark textures, in the series colour. */
const HatchedPattern = createHatchPattern({ groundOpacity: 0.15, stripeOpacity: 0.9 });
const TranslucentPattern = createHatchPattern({ groundOpacity: 0.35, stripeOpacity: 0 });
const LighterPattern = createHatchPattern({ groundOpacity: 0.14, stripeOpacity: 0 });
const MissingPatternA = createHatchPattern({
  angle: 45,
  groundOpacity: 0.1,
  stripeOpacity: 0.8,
});
const MissingPatternB = createHatchPattern({
  angle: -45,
  groundOpacity: 0,
  stripeOpacity: 0.8,
});

const MISSING_COLOR = "var(--sui-danger)";
const SERIES_TOKENS = 8;
const seriesColor = (i: number): string => `var(--sui-series-${(i % SERIES_TOKENS) + 1})`;

const STANDING_LABEL: Record<TargetBarStanding, string> = {
  above: "Over the projection",
  missing: "Missing",
  remaining: "Still projected",
  on: "On the projection",
};

export const TargetBarChart: Component<TargetBarChartProps> = (props) => {
  const [box, setBox] = createSignal<{ width: number; height: number }>(
    TARGET_BAR_FALLBACK_SIZE,
  );
  let frame: HTMLDivElement | undefined;
  const take = (width: number, height: number): void => {
    if (width <= 0 || height <= 0) return;
    setBox({ width, height });
  };
  onMount(() => {
    if (frame === undefined) return;
    const rect = frame.getBoundingClientRect();
    take(Math.round(rect.width), Math.round(rect.height));
    onCleanup(observeSize(frame, (size) => take(size.width, size.height)));
  });

  const uid = createUniqueId();
  const paint = (kind: string, i: number): string => `tb-${kind}-${uid}-${i}`;
  const missA = `tb-miss-a-${uid}`;
  const missB = `tb-miss-b-${uid}`;

  const liveAxis = createMemo(() => targetBarAxis(props.yMax ?? tallestOf(props.series)));
  const [frozen, setFrozen] = createSignal<ReturnType<typeof targetBarAxis> | null>(null);
  const axis = () => frozen() ?? liveAxis();
  const dragging = () => frozen() !== null;

  const first = () => props.periods[0] ?? 0;
  const last = () => props.periods[props.periods.length - 1] ?? 0;
  const offsetOf = (i: number): number => slotOffset(i, props.series.length);

  return (
    <MeasuredHost ref={frame}>
      <Chart
        width={box().width}
        height={box().height}
        xDomain={[first() - 0.5, last() + 0.5]}
        yDomain={[0, axis().top]}
        margin={MARGIN}
      >
        <Index each={props.series}>
          {(_s, i) => (
            <>
              <HatchedPattern id={paint("hatch", i)} color={seriesColor(i)} />
              <TranslucentPattern id={paint("tint", i)} color={seriesColor(i)} />
              <LighterPattern id={paint("light", i)} color={seriesColor(i)} />
            </>
          )}
        </Index>
        <MissingPatternA id={missA} color={MISSING_COLOR} />
        <MissingPatternB id={missB} color={MISSING_COLOR} />
        <Grid tickCount={4} />
        <YAxis tickValues={[...axis().ticks]} tickFormat={props.valueFormat} />
        <XAxis tickValues={[...props.periods]} tickFormat={(p) => props.periodLabel(Math.round(p))} />
        <Index each={props.series}>
          {(s, i) => (
            <>
              <BarSeries
                data={s().bars}
                x={(b) => b.period + offsetOf(i)}
                step={TARGET_BAR_STEP}
                bandWidth={TARGET_BAR_BAND}
                segments={(b) => [
                  { value: b.invoiced, fill: seriesColor(i), key: "invoiced" },
                  { value: b.confirmed, fill: `url(#${paint("tint", i)})`, key: "confirmed" },
                  { value: b.planned, fill: `url(#${paint("light", i)})`, key: "planned" },
                  { value: b.missing, fill: `url(#${missA})`, key: "missing" },
                  { value: b.above, fill: `url(#${paint("hatch", i)})`, key: "above" },
                ]}
              />
              <BarSeries
                data={s().bars}
                x={(b) => b.period + offsetOf(i)}
                step={TARGET_BAR_STEP}
                bandWidth={TARGET_BAR_BAND}
                segments={(b) => [
                  {
                    value: b.invoiced + b.confirmed + b.planned,
                    fill: "none",
                    key: "spacer",
                  },
                  { value: b.missing, fill: `url(#${missB})`, key: "missing" },
                ]}
              />
              <LineSeries
                data={outlineOf(s().bars, offsetOf(i))}
                x={(p) => p.x}
                y={(p) => p.y}
                stroke={seriesColor(i)}
                strokeWidth={1.5}
              />
              <ValueHandle<TargetBar>
                data={s().bars}
                x={(b) => b.period + offsetOf(i)}
                width={TARGET_BAR_STEP * TARGET_BAR_BAND}
                value={(b) => b.projected}
                color={() => seriesColor(i)}
                label={(b) => `${s().label}, ${props.periodLabel(b.period)}: projected`}
                step={() => s().step}
                onDragStart={() => setFrozen(liveAxis())}
                onDrag={(b, _j, y) => props.onProjectionChange?.(s().id, b.period, y)}
                onDragEnd={(b, _j, y) => {
                  props.onProjectionChange?.(s().id, b.period, y);
                  setFrozen(null);
                }}
                onDoubleClick={(b) => props.onProjectionEnter?.(s().id, b.period)}
              />
            </>
          )}
        </Index>
        <Show when={props.now >= first() - 0.5 && props.now <= last() + 0.5}>
          <ReferenceLine
            orientation="vertical"
            value={props.now}
            label="now"
            stroke="var(--sui-text-primary)"
            strokeDasharray="4 3"
          />
        </Show>
        <BarTooltip
          points={dragging() ? [] : placeBars(props.series)}
          periodLabel={props.periodLabel}
          valueFormat={props.valueFormat}
        />
      </Chart>
    </MeasuredHost>
  );
};

/**
 * The breakdown beside the hovered bar — past half the bar plus the armed
 * grip's overhang, so it never covers that bar's grip.
 */
const BarTooltip: Component<{
  readonly points: readonly PlacedBar[];
  readonly periodLabel: (period: number) => string;
  readonly valueFormat: (value: number) => string;
}> = (props) => {
  const ctx = useChart();
  const beside = () =>
    Math.abs(ctx.xScale()(TARGET_BAR_HALF) - ctx.xScale()(0)) + TOOLTIP_CLEARANCE;
  return (
    <ChartTooltip<PlacedBar>
      data={props.points}
      x={(p) => p.x}
      offset={{ x: beside(), y: 0 }}
      maxWidth={240}
      openDelay={TOOLTIP_DELAY_MS}
    >
      {(p) => (
        <Breakdown p={p} periodLabel={props.periodLabel} valueFormat={props.valueFormat} />
      )}
    </ChartTooltip>
  );
};

const Row: Component<{ readonly label: string; readonly value: string }> = (props) => (
  <SpreadRow>
    <TextSublabel>{props.label}</TextSublabel>
    <SteadyMonoMeta>{props.value}</SteadyMonoMeta>
  </SpreadRow>
);

const Breakdown: Component<{
  readonly p: PlacedBar;
  readonly periodLabel: (period: number) => string;
  readonly valueFormat: (value: number) => string;
}> = (props) => {
  const b = () => breakdownOf(props.p.bar);
  const fmt = (v: number) => props.valueFormat(v);
  const standing = () =>
    b().standing === "above" ? `+${fmt(b().amount)}` : fmt(b().amount);
  return (
    <TightStack>
      <TextSublabel>{`${props.p.seriesLabel} · ${props.periodLabel(props.p.bar.period)}`}</TextSublabel>
      <Row label="Projected" value={fmt(b().projected)} />
      <Row label="Confirmed, invoiced" value={fmt(b().invoiced)} />
      <Row label="Confirmed, not yet invoiced" value={fmt(b().confirmed)} />
      <Row label="Planned" value={fmt(b().planned)} />
      <Row label={STANDING_LABEL[b().standing]} value={standing()} />
    </TightStack>
  );
};
