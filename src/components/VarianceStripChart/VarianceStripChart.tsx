// lastReviewedAt: 2026-10-09
// lastReviewedBy: adlai.arnold
// ============================================
// VarianceStripChart — Composite (Depth 2)
// Composes Chart + XAxis + VarianceStrip + Crosshair + ChartTooltip from
// the Chart family. Draws no SVG and owns no CSS.
//
// THE STRIP ON ITS OWN: one bar per day of variance against a forecast,
// across the whole plot, with the x axis under it and the ± extent at the
// left. The same `VarianceStrip` slot sits under a balance plot inside
// `BalanceReviewChart`; this is the chart for a page that wants the strip
// alone.
// ============================================
import { type Component, type JSX, createMemo } from "solid-js";
import { Chart, Crosshair, ChartTooltip, XAxis } from "../Chart";
import { VarianceStrip, type VarianceKind } from "../VarianceStrip";

export interface VarianceStripDay {
  readonly date: Date;
  /** + is better than forecast, − is worse. */
  readonly value: number;
  readonly kind: VarianceKind;
}

export interface VarianceStripChartProps {
  readonly data: readonly VarianceStripDay[];
  /** The x extent. Omitted, the data's first and last day with half a day
   *  either side, so the end bars are whole. */
  readonly xDomain?: readonly [Date, Date];
  /** The ± extent labels and the tooltip's figure. */
  readonly valueFormat: (value: number) => string;
  /** The x-axis tick labels. Omitted, the time scale's own. */
  readonly dateFormat?: (date: Date) => string;
  /** The tooltip's content for a hovered day. Omitted, the date and the figure. */
  readonly tooltip?: (day: VarianceStripDay) => JSX.Element;
  /** A caption above the strip's left edge. */
  readonly title?: string;
  /** The smallest extent the scale takes. Default 1. */
  readonly minExtent?: number;
  readonly size?: { readonly width: number; readonly height: number };
}

const WIDTH = 880;
const HEIGHT = 120;
const MARGIN = { top: 18, right: 12, bottom: 26, left: 56 };
const HALF_DAY_MS = 43_200_000;

export const VarianceStripChart: Component<VarianceStripChartProps> = (props) => {
  const width = () => props.size?.width ?? WIDTH;
  const height = () => props.size?.height ?? HEIGHT;
  const xDomain = createMemo<[Date, Date]>(() => {
    if (props.xDomain) return [props.xDomain[0], props.xDomain[1]];
    const first = props.data[0]?.date.getTime() ?? 0;
    const last = props.data[props.data.length - 1]?.date.getTime() ?? first + 1;
    return [new Date(first - HALF_DAY_MS), new Date(last + HALF_DAY_MS)];
  });
  const x = (d: VarianceStripDay) => d.date.getTime();
  return (
    <Chart
      width={width()}
      height={height()}
      xDomain={xDomain()}
      yDomain={[-1, 1]}
      margin={MARGIN}
      responsive={props.size === undefined}
    >
      <VarianceStrip
        data={props.data}
        x={x}
        value={(d) => d.value}
        kind={(d) => d.kind}
        placement="plot"
        minExtent={props.minExtent}
        format={props.valueFormat}
        title={props.title}
        guide={false}
      />
      <XAxis
        hideLine
        tickFormat={props.dateFormat ? (v) => props.dateFormat?.(new Date(v)) ?? "" : undefined}
      />
      <Crosshair />
      <ChartTooltip data={props.data} x={x}>
        {(d) =>
          props.tooltip ? (
            props.tooltip(d)
          ) : (
            <span>
              {props.dateFormat?.(d.date) ?? d.date.toISOString().substring(0, 10)} · {props.valueFormat(d.value)} · {d.kind}
            </span>
          )
        }
      </ChartTooltip>
    </Chart>
  );
};
