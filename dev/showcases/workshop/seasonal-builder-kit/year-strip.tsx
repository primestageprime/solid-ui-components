// ============================================
// YearStrip — a builder's year: each season a stepped band stacked on the ones
// under it (the longest lowest), the top edge of the stack the day's total, a
// projected stop hatched over its last week. COMPOSED from SUI, no CSS of its own:
//
//   Chart (numeric day x, responsive) + Grid + YAxis + XAxis (month ticks)
//   StackedAreaSeries        the bands, in the model's stacking order, `linear`
//                            so a season starts and stops square on its day
//   HatchPattern             the amber stripe
//   AreaSeries (`lower`) x2  the hatched tail of a projected stop, and a tint
//                            over the selected season
//   ReferenceLine            "today"
//
// A click on the strip picks the season on top of the stack on that day (the
// `Chart`'s `onPick` reports an x, not a band). Recorded in
// docs/handoffs/seasonal-builder-sui-gaps.md: StackedAreaSeries paints from the
// series palette and takes no hover, selection or hatch, so the last two are the
// overlays below.
// ============================================
import { type Component, For, createMemo, createUniqueId } from "solid-js";
import {
  AreaSeries,
  Chart,
  Grid,
  HatchPattern,
  ReferenceLine,
  StackedAreaSeries,
  XAxis,
  YAxis,
  fn,
} from "../../../../src";
import {
  type Band,
  type Ctx,
  MONTHS,
  MONTH_STARTS,
  NDAYS,
  type Season,
  type Step,
  TODAY,
  dayDate,
  runsOf,
  tailSteps,
} from "../seasonal-builder-model";

const { flatMap, map } = fn;

const WIDTH = 1000;
const HEIGHT = 250;
const MARGIN = { top: 10, right: 12, bottom: 26, left: 48 };

/** One vertex of a stepped band: its top, its floor, and the day it sits on. */
interface Vertex {
  readonly x: number;
  readonly hi: number;
  readonly lo: number;
}
const GAP: Vertex = { x: Number.NaN, hi: Number.NaN, lo: Number.NaN };

/** A season's steps as a band outline: two vertices a day, a break between runs. */
const outline = (steps: readonly Step[]): readonly Vertex[] =>
  flatMap(
    (run: readonly Step[]): Vertex[] => [
      ...flatMap(
        (p: Step): Vertex[] => [
          { x: p.d, hi: p.hi, lo: p.lo },
          { x: p.d + 1, hi: p.hi, lo: p.lo },
        ],
        run,
      ),
      GAP,
    ],
    runsOf(steps),
  );

/** A season's level as step points for the stack: up at each run's start, down after its end. */
const stackPoints = (steps: readonly Step[], level: number) =>
  flatMap(
    (run: readonly Step[]) => [
      { at: run[0].d, value: level },
      { at: run[run.length - 1].d + 1, value: 0 },
    ],
    runsOf(steps),
  );

const monthOf = (day: number): string => MONTHS[dayDate(day).getUTCMonth()];

export const YearStrip: Component<{
  readonly bands: readonly Band[];
  readonly ctx: Ctx;
  /** The selected season's index in the list the bands came from. */
  readonly selected: number;
  /** The y-axis top, in the strip's own unit. */
  readonly top: number;
  readonly format: (v: number) => string;
  /** The season on top of the stack at a clicked day, or `null`. */
  readonly onPick: (day: number) => void;
}> = (props) => {
  const hatch = `season-hatch-${createUniqueId()}`;
  const series = createMemo(() =>
    map(
      (b: Band) => ({
        id: b.season.name,
        label: b.season.name,
        points: stackPoints(b.steps, b.season.level),
      }),
      props.bands,
    ),
  );
  const tails = createMemo(() =>
    map(
      (b: Band) => outline(tailSteps(b.season as Season, b.steps, props.ctx)),
      props.bands,
    ),
  );
  const picked = createMemo(() => {
    const hit = props.bands.find((b) => b.i === props.selected);
    return hit ? outline(hit.steps) : [];
  });
  return (
    <Chart
      responsive
      width={WIDTH}
      height={HEIGHT}
      xDomain={[0, NDAYS]}
      yDomain={[0, props.top]}
      margin={MARGIN}
      onPick={(x) => props.onPick(Math.floor(Number(x)))}
    >
      <defs>
        <HatchPattern id={hatch} color="var(--sui-warning)" />
      </defs>
      <Grid tickCount={2} />
      <YAxis
        tickValues={[0, props.top / 2, props.top]}
        tickFormat={props.format}
      />
      <XAxis
        tickValues={MONTH_STARTS}
        tickFormat={(d) => monthOf(Math.round(d))}
      />
      <StackedAreaSeries curve="linear" series={series()} />
      <AreaSeries
        data={picked()}
        x={(v) => v.x}
        y={(v) => v.hi}
        lower={(v) => v.lo}
        fill="var(--sui-accent)"
        fillOpacity={0.35}
      />
      <For each={tails()}>
        {(tail) => (
          <AreaSeries
            data={tail}
            x={(v) => v.x}
            y={(v) => v.hi}
            lower={(v) => v.lo}
            fill={`url(#${hatch})`}
            fillOpacity={1}
          />
        )}
      </For>
      <ReferenceLine
        orientation="vertical"
        value={TODAY}
        label="today"
        color="var(--sui-accent)"
      />
    </Chart>
  );
};
