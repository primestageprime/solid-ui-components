// ============================================
// PeriodBars — per month, one bar per job type (O / I / F side by side),
// Peter's sketch, top right. COMPOSED from SUI, no CSS of its own:
//
//   Chart (index x, responsive) + Grid + YAxis + XAxis (month ticks)
//   HatchPattern x6     per type colour: a stripe (above the hope) and a
//                       stripeless flat tint (signed, not yet invoiced)
//   BarSeries x3        one per type, offset −⅓ / 0 / +⅓ inside the month;
//                       segments [invoiced (solid), planned (tint),
//                       above the hope (hatched)]. NO `segmentGap`: the
//                       gap is cut off each lower segment's top, which
//                       opened a seam under the outline (Peter, 2026-10-07:
//                       "what's with the weird gap at the top of the bar?").
//                       Texture and alpha already separate the marks.
//   ValueHandle x3      a grip on each outline's top edge: drag it to set
//                       that month's hoped jobs for that type (whole jobs,
//                       min 0); double-click the column to type a count in.
//                       `<Index>` over the types so a recompute mid-drag
//                       does not remount the grip under the pointer.
//   LineSeries x3       the projection as a HOLLOW OUTLINE: three sides of a
//                       box per bar, NaN between bars. What the outline holds
//                       and the bar does not fill is the remainder.
//
// So (Peter, 2026-10-07): outline = projected; solid inside it = invoiced;
// translucent inside it = signed, not yet invoiced; hatched above it = booked
// beyond the hope (invoiced or not); empty outline = not yet booked.
//
// A bar click `console.table`s its cell — the headless check on what the bar
// was drawn from.
// ============================================
import {
  type Component,
  For,
  Index,
  Show,
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  on,
  onCleanup,
} from "solid-js";
import {
  AreaSeries,
  BarSeries,
  Chart,
  ChartTooltip,
  SpreadRow,
  SteadyMonoMeta,
  TextSublabel,
  TightStack,
  useChart,
  Grid,
  HatchPattern,
  LineSeries,
  ReferenceLine,
  ValueHandle,
  XAxis,
  YAxis,
  fn,
} from "../../../../src";
import {
  type Cell,
  type Config,
  type JobType,
  monthLabel,
  monthName,
  monthsOf,
  cellsOfType,
  jobsAt,
  missingOf,
  money,
  monthPosition,
  tallest,
} from "../contract-builder-model";

const { filter, flatMap, map } = fn;

const WIDTH = 960;
const HEIGHT = 280;
const MARGIN = { top: 12, right: 12, bottom: 26, left: 52 };

/** Slot per type inside a month, in data units; the bar fills BAND of it. */
const STEP = 0.3;
const BAND = 0.86;
const HALF = (STEP * BAND) / 2;

/** The type colours, in config order. */
export const TYPE_COLORS: readonly string[] = [
  "var(--sui-series-1)",
  "var(--sui-series-2)",
  "var(--sui-series-3)",
];

/** Centre the group: three types sit at −1/0/+1 slots, one type at 0. */
const offsetOf = (i: number, n: number): number => (i - (n - 1) / 2) * STEP;

interface Pt {
  readonly x: number;
  readonly y: number;
}
const BREAK: Pt = { x: Number.NaN, y: Number.NaN };

/** Left side, top, right side of each projection box, broken between bars. */
const outlineOf = (cells: readonly Cell[], offset: number): readonly Pt[] =>
  flatMap(
    (c: Cell): Pt[] =>
      c.projected <= 0
        ? []
        : [
            { x: c.month + offset - HALF, y: 0 },
            { x: c.month + offset - HALF, y: c.projected },
            { x: c.month + offset + HALF, y: c.projected },
            { x: c.month + offset + HALF, y: 0 },
            BREAK,
          ],
    cells,
  );

/** A hope as steps: flat across each whole month, so the area reads per month. */
const stepsOf = (cells: readonly Cell[]): readonly Pt[] =>
  flatMap(
    (c: Cell): Pt[] => [
      { x: c.month - 0.5, y: c.projected },
      { x: c.month + 0.5, y: c.projected },
    ],
    cells,
  );

/** A round y top a little above the tallest bar. */
const niceTop = (v: number): number => Math.max(1000, Math.ceil((v * 1.08) / 5000) * 5000);

/** The "missing" mark: money hoped for in a past month and not got. */
export const MISSING_COLOR = "var(--sui-danger)";

export const PeriodBars: Component<{
  readonly config: Config;
  /** ISO "now": the NOW rule, and which months' shortfall is missing. */
  readonly today: string;
  /**
   * A HELD y ceiling (`createAxisWaterMarks`: grows with the tallest bar,
   * shrinks only when the reader asks). Omitted, the axis fits the bars.
   */
  readonly ceiling?: number;
  /** The last month drawn (the horizon); omitted, December. */
  readonly lastMonth?: number;
  /**
   * How the HOPE is drawn: `"bars"` (the default) a hollow outline per type per
   * month; `"area"` each type's hope as a translucent STEPPED area across the
   * whole month — "this month's target" — with the booked marks over it and
   * the grips on its top edge. Peter is comparing the two.
   */
  readonly hopeAs?: "bars" | "area";
  /**
   * A MEASURED width to draw at, in px (the height stays fixed). Given, the
   * chart is drawn 1:1 — which the hover tooltip needs, since it positions in
   * chart units; omitted, it scales to its container at a fixed aspect.
   */
  readonly width?: number;
  /** Show the per-bar breakdown on hover (debounced). */
  readonly tooltip?: boolean;
  /** A grip set one type's hope in one month to `count` whole jobs. */
  readonly onSetCount?: (type: JobType, month: number, count: number) => void;
  /** A bar was double-clicked: type a count in. */
  readonly onEnterCount?: (type: JobType, month: number) => void;
}> = (props) => {
  /* The y top is FROZEN while a grip is held: it is derived from the tallest
     bar, so a drag that grows the tallest bar would rescale the axis under the
     pointer and the grip would run away from it. */
  const [frozenTop, setFrozenTop] = createSignal<number | null>(null);
  const last = () => props.lastMonth ?? monthsOf(props.config).length - 1;
  const uid = createUniqueId();
  const hatchId = (i: number) => `cb-hatch-${uid}-${i}`;
  const tintId = (i: number) => `cb-tint-${uid}-${i}`;
  const lightId = (i: number) => `cb-light-${uid}-${i}`;
  /* Cross-hatch = two stripe patterns crossed: the bar's own segment carries
     one angle, an overlay BarSeries the other (a pattern has one angle). */
  const missA = `cb-miss-a-${uid}`;
  const missB = `cb-miss-b-${uid}`;
  const series = createMemo(() =>
    map(
      (t: JobType, i: number) => ({
        t,
        i,
        n: props.config.types.length,
        cells: filter((c: Cell) => c.month <= last(), cellsOfType(props.config, t.id)),
      }),
      props.config.types,
    ),
  );
  const liveTop = createMemo(() => niceTop(props.ceiling ?? tallest(props.config)));
  const top = () => frozenTop() ?? liveTop();
  return (
    <Chart
      responsive={props.width === undefined}
      width={props.width ?? WIDTH}
      height={HEIGHT}
      xDomain={[-0.5, last() + 0.5]}
      yDomain={[0, top()]}
      margin={MARGIN}
    >
      <defs>
        <For each={TYPE_COLORS}>
          {(color, i) => (
            <>
              <HatchPattern
                id={hatchId(i())}
                color={color}
                groundOpacity={0.15}
                stripeOpacity={0.9}
              />
              <HatchPattern
                id={tintId(i())}
                color={color}
                groundOpacity={0.35}
                stripeOpacity={0}
              />
              <HatchPattern
                id={lightId(i())}
                color={color}
                groundOpacity={0.14}
                stripeOpacity={0}
              />
            </>
          )}
        </For>
        <HatchPattern id={missA} color={MISSING_COLOR} angle={45} groundOpacity={0.1} stripeOpacity={0.8} />
        <HatchPattern id={missB} color={MISSING_COLOR} angle={-45} groundOpacity={0} stripeOpacity={0.8} />
      </defs>
      <Grid tickCount={4} />
      <YAxis
        tickValues={Array.from({ length: top() / 5000 + 1 }, (_v, k) => k * 5000)}
        tickFormat={money}
      />
      <XAxis
        tickValues={filter((m: number) => m <= last(), monthsOf(props.config))}
        tickFormat={(m) => monthLabel(Math.round(m))}
      />
      <Show when={props.hopeAs === "area"}>
        <Index each={series()}>
          {(s) => (
            <>
              <AreaSeries
                data={stepsOf(s().cells)}
                x={(p) => p.x}
                y={(p) => p.y}
                fill={TYPE_COLORS[s().i]}
                fillOpacity={0.16}
              />
              <LineSeries
                data={stepsOf(s().cells)}
                x={(p) => p.x}
                y={(p) => p.y}
                stroke={TYPE_COLORS[s().i]}
                strokeWidth={1.5}
              />
            </>
          )}
        </Index>
      </Show>
      <Index each={series()}>
        {(s) => (
          <>
            <BarSeries
              data={s().cells}
              x={(c) => c.month + offsetOf(s().i, s().n)}
              step={STEP}
              bandWidth={BAND}
              segments={(c) => [
                { value: c.invoicedWithin, fill: TYPE_COLORS[s().i], key: "invoiced" },
                {
                  value: c.plannedWithin - c.estimateWithin,
                  fill: `url(#${tintId(s().i)})`,
                  key: "planned",
                },
                { value: c.estimateWithin, fill: `url(#${lightId(s().i)})`, key: "estimate" },
                { value: missingOf(c, props.today), fill: `url(#${missA})`, key: "missing" },
                { value: c.unplanned, fill: `url(#${hatchId(s().i)})`, key: "unplanned" },
              ]}
              onBarClick={(c) => console.table([{ ...c, name: s().t.name }])}
            />
            {/* The second stripe of the cross. Its spacer is fill "none", which
                SVG does not hit-test, so clicks still reach the bar beneath. */}
            <BarSeries
              data={s().cells}
              x={(c) => c.month + offsetOf(s().i, s().n)}
              step={STEP}
              bandWidth={BAND}
              segments={(c) => [
                { value: c.within, fill: "none", key: "spacer" },
                { value: missingOf(c, props.today), fill: `url(#${missB})`, key: "missing" },
              ]}
            />
            <Show when={props.hopeAs !== "area"}>
              <LineSeries
                data={outlineOf(s().cells, offsetOf(s().i, s().n))}
                x={(p) => p.x}
                y={(p) => p.y}
                stroke={TYPE_COLORS[s().i]}
                strokeWidth={1.5}
              />
            </Show>
            <ValueHandle
              data={s().cells}
              x={(c) => c.month + offsetOf(s().i, s().n)}
              width={STEP * BAND}
              value={(c) => c.projected}
              color={() => TYPE_COLORS[s().i]}
              label={(c) => `${s().t.name}, ${monthName(c.month)}: projected jobs`}
              step={() => s().t.typical}
              onDragStart={() => setFrozenTop(liveTop())}
              onDrag={(c, _i, y) => props.onSetCount?.(s().t, c.month, jobsAt(s().t, y))}
              onDragEnd={(c, _i, y) => {
                props.onSetCount?.(s().t, c.month, jobsAt(s().t, y));
                setFrozenTop(null);
              }}
              onDoubleClick={(c) => props.onEnterCount?.(s().t, c.month)}
            />
          </>
        )}
      </Index>
      <ReferenceLine
        orientation="vertical"
        value={monthPosition(props.today)}
        label="now"
        stroke="var(--sui-text-primary)"
        strokeDasharray="4 3"
      />
      <Show when={props.tooltip}>
        <BarTip
          points={flatMap(
            (x: { t: JobType; i: number; n: number; cells: readonly Cell[] }) =>
              map((c: Cell) => ({ c, x: c.month + offsetOf(x.i, x.n), name: x.t.name }), x.cells),
            series(),
          )}
          today={props.today}
          dragging={frozenTop() !== null}
        />
      </Show>
    </Chart>
  );
};

interface TipPoint {
  readonly c: Cell;
  readonly x: number;
  readonly name: string;
}

/** Show after the pointer has rested this long; hide at once. */
const TIP_DELAY_MS = 250;

/**
 * The per-bar breakdown, in SUI's `ChartTooltip` (portalled into the chart's
 * overlay, nearest datum, flips left/right at the edges). DEBOUNCED here: it
 * appears TIP_DELAY_MS after the pointer enters the plot and then follows it
 * from bar to bar without flicker; it hides the moment the pointer leaves, and
 * while a grip is dragged. It sits BESIDE its bar (x offset past half the bar
 * plus the armed grip's overhang), so it never covers that bar's grip, and at
 * the top of the plot, so a low bar's tooltip is never cut off below it.
 */
const BarTip: Component<{
  readonly points: readonly TipPoint[];
  readonly today: string;
  readonly dragging: boolean;
}> = (props) => {
  const ctx = useChart();
  const [shown, setShown] = createSignal(false);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stop = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
  createEffect(
    on([ctx.hoverX, () => props.dragging], ([hx, dragging]) => {
      if (hx == null || dragging) {
        stop();
        setShown(false);
        return;
      }
      if (!shown() && timer === undefined) {
        timer = setTimeout(() => {
          timer = undefined;
          setShown(true);
        }, TIP_DELAY_MS);
      }
    }),
  );
  onCleanup(stop);
  const besideBar = () => Math.abs(ctx.xScale()(HALF) - ctx.xScale()(0)) + 3 + 10;
  return (
    <ChartTooltip
      data={shown() ? props.points : []}
      x={(p) => p.x}
      offset={{ x: besideBar(), y: 0 }}
      maxWidth={240}
    >
      {(p) => <TipBody p={p} today={props.today} />}
    </ChartTooltip>
  );
};

const TipRow: Component<{ readonly label: string; readonly value: string }> = (props) => (
  <SpreadRow>
    <TextSublabel>{props.label}</TextSublabel>
    <SteadyMonoMeta>{props.value}</SteadyMonoMeta>
  </SpreadRow>
);

const TipBody: Component<{ readonly p: TipPoint; readonly today: string }> = (props) => {
  const c = () => props.p.c;
  const notInvoiced = () => c().planned - c().invoiced - c().estimated;
  const result = () => {
    const missing = missingOf(c(), props.today);
    if (c().unplanned > 0) return { label: "Over the projection", value: `+${money(c().unplanned)}` };
    if (missing > 0) return { label: "Missing", value: money(missing) };
    if (c().remainder > 0) return { label: "Still projected", value: money(c().remainder) };
    return { label: "On the projection", value: money(0) };
  };
  return (
    <TightStack>
      <TextSublabel>{`${props.p.name} · ${monthName(c().month)}`}</TextSublabel>
      <TipRow label="Projected" value={money(c().projected)} />
      <TipRow label="Confirmed, invoiced" value={money(c().invoiced)} />
      <TipRow label="Confirmed, not yet invoiced" value={money(notInvoiced())} />
      <TipRow label="Planned" value={money(c().estimated)} />
      <TipRow label={result().label} value={result().value} />
    </TightStack>
  );
};
