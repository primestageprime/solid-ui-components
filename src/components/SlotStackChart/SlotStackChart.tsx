// ============================================
// SlotStackChart — Composite (Depth 2). A stacked column per period whose
// segments FILL or OVERFLOW an expected container.
// Tags: shows:chart, shows:bar, does:view, does:hover, data:time-series, data:multi-series, data:grouped, role:panel
// Composes Chart + Grid + XAxis + YAxis + ReferenceLine (Chart parts, Depth
// 1), SlotStackMarks (Depth 1, this folder) and a measured `createBox` host.
// Owns no CSS of its own; the marks' CSS is SlotStackMarks'.
//
// WHY IT EXISTS: `StackedTimelineChart` takes one flat fill per series, so a
// segment cannot say how it stands against what was expected of it. Here
// each series' segment is a SLOT (Peter, 2026-11-10, thorcasting's "Projected
// dollars by job type"):
//
//   the slot      a container the size of the expectation; slots stack
//   solid         what fills it, from the bottom, with a solid border
//   dashed        what is still empty: sides and top, no line where the
//                 fill ends, so the amount reads as FILLING the container
//   striped       what came on top: it OVERFLOWS the container with no line
//                 at the join and no border of its own
//
// TWO STATES PER COLUMN (Peter, 2026-11-10: "let's simplify. By default show
// just the two values. (expected and actual)... When hovering with a mouse,
// show the breakdown by type. Show the B approach. That will mean that the
// bar will shift around on hover, but I want to see if that's ok."). Given
// `totals`, a column at rest is ONE slot in the default blue, its own expected and
// actual, and the hovered column is its per-series slots. The column's
// height may change between the two and is not held or animated; the y axis
// covers both states, so only the bar moves. `expand` forces either state
// ("always" / "never") so a screen can change its mind without a release.
//
// THE CALLER SPLITS, THE CHART LAYS OUT. Every slot arrives as `expected`,
// `filled`, `unfilled` and `overflow` (and, optionally, the filled and
// overflow parts by status). The chart derives no part from another; a slot
// is as tall as `filled + unfilled + overflow`.
//
// READ-ONLY BY CONSTRUCTION: no grip, nothing focusable, and no prop that
// could add one. Hover is the only interaction, and it is read from the
// Chart root's own pointer signal: this component adds no listener. A part
// answers the pointer with its hover text.
//
// MEASUREMENT, the StackedTimelineChart way: the first size comes
// synchronously from `getBoundingClientRect` in `onMount`, `observeSize`
// keeps it current, a zero reading is never stored (jsdom, hidden tabs), and
// the box decides the chrome (`slotStackChrome`): a short panel gets a
// tighter inset and at most four y labels.
//
// The geometry is `slotStackGeometry.ts`; `slotStackRows` prints it.
// ============================================
import {
  type Component,
  Show,
  createMemo,
  createSignal,
  createUniqueId,
  mergeProps,
  onCleanup,
  onMount,
} from "solid-js";
import { observeSize } from "../../internal/dom/observeSize";
import { Chart, Grid, ReferenceLine, XAxis, YAxis } from "../Chart";
import type { Margin } from "../Chart/context";
import { createBox } from "../Layout";
import { thinTicks } from "../StackedTimelineChart/layout";
import { targetBarAxis } from "../TargetBarChart/targetBarGeometry";
import { SlotStackMarks } from "./SlotStackMarks";
import {
  type SlotStackExpand,
  type SlotStackSeries,
  type SlotStackSlot,
  type SlotStackWords,
  SLOT_STACK_WORDS,
  slotPartTitle,
  slotStackChrome,
  slotStackTallest,
} from "./slotStackGeometry";
import type { SlotStackLabels } from "./slotStackLabels";

export interface SlotStackChartProps {
  /**
   * One entry per series (a job type, say), BOTTOM FIRST. A series' place is
   * its colour (`--sui-series-<n>`), the same rule the other stacks follow.
   */
  readonly series: readonly SlotStackSeries[];
  /**
   * Each column's OWN slot: its expected and actual as two values, netted by
   * the caller (one over and one under may cancel here, which is why the
   * chart cannot add the series up itself). One per period. Given, a column
   * at rest draws this one slot in `totalPaint` and shows its series only
   * when expanded. Omitted, every column is always its series.
   */
  readonly totals?: readonly SlotStackSlot[];
  /**
   * When a column shows its per-series slots instead of its total:
   * "hover" (the default) for the column under the pointer, "always", or
   * "never". Without `totals` there is nothing to collapse to, so every
   * column is its series whatever this says. Data, not a curried look: a
   * screen may flip it at run time.
   */
  readonly expand?: SlotStackExpand;
  /** The periods on the x axis, ascending (month indices, say). */
  readonly periods: readonly number[];
  /** A period's name: the x tick and the hover text. */
  readonly periodLabel: (period: number) => string;
  /** A value's text: the y ticks and the hover text's figures. */
  readonly valueFormat: (value: number) => string;
  /**
   * A HELD y ceiling (`createAxisWaterMarks`: grows with the data, shrinks
   * only when the reader asks). Omitted, the axis fits the tallest column.
   */
  readonly yMax?: number;
  /** A NOW rule, in period units (fractional inside a period). Omit for none. */
  readonly now?: number;
  /** The NOW rule's caption. Default "now". Presentational — curried. */
  readonly nowLabel?: string;
  /**
   * The words the hover text is written in ("filled", "not yet filled",
   * "above expected", and the statuses). A screen's own nouns go here
   * ("arrived", "still projected"). Presentational — curried.
   */
  readonly words?: Partial<SlotStackWords>;
  /**
   * A column's width as a fraction of its period. Default 0.62.
   * Presentational — curried.
   */
  readonly columnWidth?: number;
  /**
   * Pixels of GROUND between two slots of a column. Default 2; 0 lets them
   * meet. Presentational — curried.
   */
  readonly slotGap?: number;
  /** Plot inset. Presentational — curried. */
  readonly margin?: Partial<Margin>;
  /**
   * What a column's own slot (`totals`) is painted with: fill, dashes and
   * stripes alike. Default `var(--sui-accent)`, the chart's normal blue
   * (Peter: "instead of white, use the normal blue default color for the
   * dollars chart"). Hand the same value to `SlotStackLegend`.
   * Presentational — curried.
   */
  readonly totalPaint?: string;
  /**
   * Which columns carry the AMOUNT of each drawn part: "hover" (the default:
   * the column under the pointer, together with its breakdown; at rest
   * nothing is labelled), "always", or "never". An amount nests inside its
   * part when the part can hold it, and otherwise sits beside the column on
   * a leader line. Data, not a curried look: a screen may flip it.
   */
  readonly labels?: SlotStackLabels;
  /**
   * A part's amount as label text. Default: `valueFormat`. The plus (over)
   * and minus (still unfilled) are added by the chart. Presentational —
   * curried.
   */
  readonly labelFormat?: (value: number) => string;
}

/** What an unmeasured chart draws at: a plausible panel, never zero. */
export const SLOT_STACK_FALLBACK_SIZE = { width: 640, height: 220 } as const;

/** Never sized by its content: fills a definite parent, else takes an aspect. */
const MeasuredHost = createBox({
  grow: true,
  style: {
    "flex-basis": "0%",
    "min-height": "0",
    "min-width": "0",
    width: "100%",
    height: "100%",
    "aspect-ratio": "640 / 220",
  },
});

export const SlotStackChart: Component<SlotStackChartProps> = (props) => {
  const [box, setBox] = createSignal<{ width: number; height: number }>(
    SLOT_STACK_FALLBACK_SIZE,
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

  const paintId = `slot-stack-${createUniqueId()}`;
  const words = createMemo(
    (): SlotStackWords => ({ ...SLOT_STACK_WORDS, ...props.words }),
  );
  const axis = createMemo(() =>
    targetBarAxis(
      props.yMax ?? slotStackTallest(props.series, props.totals),
    ),
  );
  const chrome = createMemo(() =>
    slotStackChrome(box(), axis(), props.periods.length, props.margin),
  );
  const first = () => props.periods[0] ?? 0;
  const last = () => props.periods[props.periods.length - 1] ?? 0;
  /* `now` may be 0 (the first period), so it is tested against undefined. */
  const nowInView = (): boolean =>
    props.now !== undefined &&
    props.now >= first() - 0.5 &&
    props.now <= last() + 0.5;

  return (
    <MeasuredHost ref={frame}>
      <Chart
        width={box().width}
        height={box().height}
        xDomain={[first() - 0.5, last() + 0.5]}
        yDomain={[0, axis().top]}
        margin={chrome().margin}
      >
        <Grid tickCount={chrome().gridSteps} />
        <YAxis tickValues={[...chrome().yTicks]} tickFormat={props.valueFormat} />
        <XAxis
          tickValues={thinTicks(props.periods, chrome().xLabelStep)}
          tickFormat={(p) => props.periodLabel(Math.round(p))}
        />
        <SlotStackMarks
          series={props.series}
          paintId={paintId}
          band={props.columnWidth ?? 0.62}
          gap={props.slotGap ?? 2}
          totals={props.totals}
          expand={props.expand}
          periods={props.periods}
          totalLabel={words().total}
          totalPaint={props.totalPaint}
          labels={props.labels}
          labelFormat={props.labelFormat ?? props.valueFormat}
          title={(placed, part, value, status) =>
            slotPartTitle(
              placed,
              part,
              value,
              status,
              props.periodLabel,
              props.valueFormat,
              words(),
            )
          }
        />
        <Show when={nowInView()}>
          <ReferenceLine
            orientation="vertical"
            value={props.now ?? 0}
            label={props.nowLabel ?? "now"}
            stroke="var(--sui-text-primary)"
            strokeDasharray="4 3"
          />
        </Show>
      </Chart>
    </MeasuredHost>
  );
};

/** Props that are presentational — locked at curry time. */
export type SlotStackChartOverrides = Pick<
  SlotStackChartProps,
  | "words"
  | "nowLabel"
  | "columnWidth"
  | "slotGap"
  | "margin"
  | "totalPaint"
  | "labelFormat"
>;

/** Props left to the call site: data only. There are no callbacks. */
export type SlotStackChartDataProps = Omit<
  SlotStackChartProps,
  keyof SlotStackChartOverrides
>;

/**
 * Curry a screen's words, column width, slot gap and inset once. The words
 * are the screen's own nouns, which a library cannot guess, so there is no
 * shipped variant: the consumer curries its own, or uses the base as it is.
 */
export function createSlotStackChart(
  defaults: SlotStackChartOverrides,
): Component<SlotStackChartDataProps> {
  return (props) => <SlotStackChart {...mergeProps(defaults, props)} />;
}
