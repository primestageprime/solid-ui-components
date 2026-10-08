// ============================================
// SignedAreaChart — Composed (Depth 2)
// Composes Chart + Grid + XAxis + YAxis + AreaSeries x4 + LineSeries x2 +
// ReferenceLine x2 from src/components/Chart. Draws no SVG and owns no CSS.
//
// A running total filled against zero: one colour per sign (ahead above,
// behind below), split exactly at each zero crossing, solid before NOW and
// translucent with a dashed outline after it. The geometry is `signedArea.ts`.
//
// Not ChannelChart / ChannelDivergenceChart: they draw their own x axis and
// size, so they cannot share an axis with sibling charts, and their band has
// no meaning against a zero baseline.
// ============================================
import { type Component, Show, createMemo } from "solid-js";
import {
  AreaSeries,
  Chart,
  Grid,
  LineSeries,
  ReferenceLine,
  XAxis,
  YAxis,
} from "../Chart";
import { signedAreaParts, signedExtent, type Vertex } from "./signedArea";

export type SignedAreaPoint = Vertex;

export interface SignedAreaChartProps {
  /** The running total, ascending in x. */
  readonly data: readonly SignedAreaPoint[];
  /** The x where actual hands over to outlook; the NOW rule is drawn here. */
  readonly now: number;
  /** The x extent drawn. */
  readonly xDomain: readonly [number, number];
  /** Where the x axis ticks. */
  readonly xTickValues?: readonly number[];
  readonly xTickFormat?: (x: number) => string;
  readonly yTickFormat?: (y: number) => string;
  /** A held y extent (a grow-only axis); omitted, the axis fits the data and zero. */
  readonly yDomain?: readonly [number, number];
  /** A measured box to draw at, in px; omitted, the chart scales to its width. */
  readonly size?: { readonly width: number; readonly height: number };
}

const WIDTH = 960;
const HEIGHT = 220;
const MARGIN = { top: 12, right: 12, bottom: 26, left: 52 };

const AHEAD = "var(--sui-success)";
const BEHIND = "var(--sui-danger)";
const INK = "var(--sui-text-primary)";
const SOLID = 0.55;
const TRANSLUCENT = 0.2;

const px = (v: Vertex) => v.x;
const py = (v: Vertex) => v.y;

export const SignedAreaChart: Component<SignedAreaChartProps> = (props) => {
  const parts = createMemo(() => signedAreaParts(props.data, props.now));
  const yDomain = createMemo(() => props.yDomain ?? signedExtent(props.data));
  return (
    <Chart
      responsive={props.size === undefined}
      width={props.size?.width ?? WIDTH}
      height={props.size?.height ?? HEIGHT}
      xDomain={[props.xDomain[0], props.xDomain[1]]}
      yDomain={[yDomain()[0], yDomain()[1]]}
      margin={MARGIN}
    >
      <Grid tickCount={4} />
      <YAxis tickCount={5} tickFormat={props.yTickFormat} />
      <XAxis
        tickValues={props.xTickValues ? [...props.xTickValues] : undefined}
        tickFormat={props.xTickFormat}
      />
      <AreaSeries data={parts().pastAbove} x={px} y={py} baseline={0} fill={AHEAD} fillOpacity={SOLID} />
      <AreaSeries data={parts().pastBelow} x={px} y={py} baseline={0} fill={BEHIND} fillOpacity={SOLID} />
      <AreaSeries data={parts().futureAbove} x={px} y={py} baseline={0} fill={AHEAD} fillOpacity={TRANSLUCENT} />
      <AreaSeries data={parts().futureBelow} x={px} y={py} baseline={0} fill={BEHIND} fillOpacity={TRANSLUCENT} />
      <LineSeries data={parts().actual} x={px} y={py} stroke={INK} strokeWidth={1.5} />
      <LineSeries data={parts().outlook} x={px} y={py} stroke={INK} strokeWidth={1.5} strokeDasharray="4 3" />
      <ReferenceLine orientation="horizontal" value={0} stroke="var(--sui-text-muted)" />
      <Show when={props.now >= props.xDomain[0] && props.now <= props.xDomain[1]}>
        <ReferenceLine
          orientation="vertical"
          value={props.now}
          label="now"
          stroke={INK}
          strokeDasharray="4 3"
        />
      </Show>
    </Chart>
  );
};
