// ============================================
// PaceProjectionChart — Composite (Depth 2)
// Tags: shows:chart, shows:avatar, does:view, data:multi-series, data:time-series, role:panel
// Composes `Chart` + `Grid` + `XAxis` + `YAxis` + `LineSeries` + vertical
// `ReferenceLine` + `ShapeGlyph` (diamonds) + `GlyphBadge` (initials). Owns
// zero CSS and zero inline style; every paint is a token or the caller's
// series colour (data).
//
// SEVERAL PEOPLE RACING TO THE SAME TOTAL, AND WHERE EACH WILL LAND. Every
// series climbs from 0 toward `total` (chapters read, lessons done, miles
// run). Solid is what happened. From each series' last point a dashed line
// runs to its projected finish at its own pace, cut at the right edge, and an
// initials disc sits where that line ends — so who finishes first, and who
// will not finish in the window, reads at a glance. A dotted line with
// diamond waypoints is the shared plan; a vertical rule marks today.
//
// Not `ActualForecastChart`: that is ONE balance with a range cone. Not
// `TargetBarChart`: bars per period. This is N cumulative lines against one
// shared finish line.
//
// The finish x comes from the caller (it is domain arithmetic: pace, rest
// days, a deadline); the pure `projectionEnd` turns it into the dashed
// segment's end, clipped to the window.
// ============================================
import { type Component, For, Show, createMemo, mergeProps } from "solid-js";
import { filter, find, flatMap, map } from "../../fn";
import {
  Chart,
  Grid,
  LineSeries,
  ReferenceLine,
  ShapeGlyph,
  XAxis,
  YAxis,
  useChart,
} from "../Chart";
import { NarrowStack } from "../Layout";
import { GlyphBadge } from "../SvgMarks";
import { type PacePoint, projectionEnd } from "./paceProjection";

export interface PaceSeries {
  readonly id: string;
  /** Accessible name, e.g. the person's name. */
  readonly label: string;
  /** Line and disc paint (data: the person's colour). */
  readonly color: string;
  /** One or two letters drawn in the disc. */
  readonly initials: string;
  /** Cumulative progress, x ascending. */
  readonly points: readonly PacePoint[];
  /** Projected x at which this series reaches `total`; omit for no projection. */
  readonly finishX?: number | null;
}

export interface PaceTick {
  readonly x: number;
  readonly label: string;
}

export interface PaceProjectionChartProps {
  readonly series: readonly PaceSeries[];
  /** The shared finish line (the top of the y axis). */
  readonly total: number;
  /** The shared plan: drawn dotted, a diamond at each point. */
  readonly plan?: readonly PacePoint[];
  /** x of today: a vertical accent rule. */
  readonly today?: number;
  /** Labelled x ticks (e.g. meeting dates); omit for none. */
  readonly xTicks?: readonly PaceTick[];
  /** Right edge of the window. Defaults to the furthest of today, any point, and the plan. */
  readonly xMax?: number;
}

const WIDTH = 340;
const HEIGHT = 210;
const MARGIN = { top: 12, right: 14, bottom: 22, left: 28 };
const DISC = 15;
const MUTED = "var(--sui-text-secondary)";
const ACCENT = "var(--sui-accent)";
const ON_DISC = "var(--sui-on-accent)";
const GROUND = "var(--sui-bg-elevated)";

/** Plot-local marks that need the chart's scales: plan diamonds and initials discs. */
const PaceMarks: Component<{
  diamonds: readonly PacePoint[];
  discs: readonly { at: PacePoint; color: string; initials: string }[];
}> = (props) => {
  const ctx = useChart();
  const px = (p: PacePoint) => ({ x: ctx.xScale()(p.x), y: ctx.yScale()(p.y) });
  return (
    <g>
      <For each={props.diamonds}>
        {(p) => (
          <ShapeGlyph
            cx={px(p).x}
            cy={px(p).y}
            descriptor={{ shape: "diamond", color: MUTED, size: 8 }}
          />
        )}
      </For>
      <For each={props.discs}>
        {(d) => (
          <GlyphBadge
            box={{
              x: px(d.at).x - DISC / 2,
              y: px(d.at).y - DISC / 2,
              width: DISC,
              height: DISC,
            }}
            color={d.color}
            glyph={{ text: d.initials }}
            glyphColor={ON_DISC}
            ringColor={GROUND}
          />
        )}
      </For>
    </g>
  );
};

export const PaceProjectionChart: Component<PaceProjectionChartProps> = (
  props,
) => {
  const xMax = createMemo(() =>
    Math.max(
      props.xMax ?? 0,
      props.today ?? 0,
      ...map((p: PacePoint) => p.x, props.plan ?? []),
      ...(props.xMax === undefined
        ? map(
            (p: PacePoint) => p.x,
            flatMap((s: PaceSeries) => [...s.points], props.series),
          )
        : []),
      1,
    ),
  );
  const projections = createMemo(() =>
    map((s: PaceSeries) => {
      const last = s.points[s.points.length - 1];
      const end = projectionEnd(s.points, s.finishX, props.total, xMax());
      return { s, last, end, disc: end ?? last };
    }, props.series),
  );
  const yTicks = () => [
    0,
    Math.round(props.total / 3),
    Math.round((2 * props.total) / 3),
    props.total,
  ];
  const tickLabel = (x: number) =>
    find((t: PaceTick) => t.x === x, props.xTicks ?? [])?.label ?? "";
  const summary = () =>
    `Progress toward ${props.total} for ${props.series.length} ${props.series.length === 1 ? "person" : "people"}, with projected finishes`;
  return (
    // The wrapper carries the accessible name: Chart's own `title` would also
    // print a visible heading, and the caller already has one.
    <NarrowStack role="img" aria-label={summary()}>
      <Chart
        width={WIDTH}
        height={HEIGHT}
        xDomain={[0, xMax()]}
        yDomain={[0, props.total]}
        margin={MARGIN}
        responsive
      >
        <Grid horizontal tickCount={3} />
        <YAxis hideLine tickValues={yTicks()} />
        <XAxis
          hideLine
          tickValues={map((t: PaceTick) => t.x, props.xTicks ?? [])}
          tickFormat={tickLabel}
        />
        <Show when={props.today !== undefined}>
          <ReferenceLine
            orientation="vertical"
            value={props.today as number}
            color={ACCENT}
            strokeDasharray="none"
            opacity={1}
          />
        </Show>
        <Show when={(props.plan?.length ?? 0) > 1}>
          <LineSeries
            data={props.plan ?? []}
            x={(p) => p.x}
            y={(p) => p.y}
            stroke={MUTED}
            strokeWidth={1.5}
            strokeDasharray="2 4"
          />
        </Show>
        <For each={projections()}>
          {(p) => (
            <>
              <Show when={p.end && p.last}>
                <LineSeries
                  data={[p.last as PacePoint, p.end as PacePoint]}
                  x={(d) => d.x}
                  y={(d) => d.y}
                  stroke={p.s.color}
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                />
              </Show>
              <LineSeries
                data={p.s.points}
                x={(d) => d.x}
                y={(d) => d.y}
                stroke={p.s.color}
                strokeWidth={2}
              />
            </>
          )}
        </For>
        <PaceMarks
          diamonds={props.plan ?? []}
          discs={map(
            (p: ReturnType<typeof projections>[number]) => ({
              at: p.disc as PacePoint,
              color: p.s.color,
              initials: p.s.initials,
            }),
            filter(
              (p: ReturnType<typeof projections>[number]) =>
                p.disc !== undefined,
              projections(),
            ),
          )}
        />
      </Chart>
    </NarrowStack>
  );
};

/** Props that are visual/static overrides — none today; one look. */
export type PaceProjectionChartOverrides = Record<string, never>;

/** Props that remain available to consumers of a curried PaceProjectionChart variant. */
export type PaceProjectionChartDataProps = PaceProjectionChartProps;

export function createPaceProjectionChart(
  defaults: Partial<PaceProjectionChartOverrides> = {},
): Component<PaceProjectionChartDataProps> {
  return (props) => <PaceProjectionChart {...mergeProps(defaults, props)} />;
}
