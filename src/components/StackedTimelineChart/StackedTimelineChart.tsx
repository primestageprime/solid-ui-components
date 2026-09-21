// StackedTimelineChart — Composite (Depth 2). Stacked bands over time that FILL
// their box, with a captioned horizontal rule, one numbered vertical rule per
// event, a hover readout and a pick. Composes `Chart` + `Grid` + `XAxis` /
// `YAxis` + `StackedAreaSeries` + `ReferenceLine` + `ChartTooltip` (all
// Structural, Depth 1) inside a `GrowFillBox` (Layout, Depth 1). Owns no CSS.
//
// WHY IT EXISTS: `Chart` takes its width and height in PIXELS — it has no
// "fill" and measures nothing — so every screen that wants a chart to take the
// rest of a card re-writes the same measurement, and the Hourly Board's "Work
// Mix" did exactly that around a stack with a threshold rule and change flags.
// This is that picture, once.
//
// MEASUREMENT, the documented way (AGENT_GUIDE, 2026-09-16 layout rules): the
// FIRST size comes synchronously from `getBoundingClientRect` in `onMount` (a
// ref-time `clientHeight` is 0, and `observeSize` defers through rAF, which a
// hidden tab never runs), and `observeSize` keeps it current afterwards. A zero
// reading is never stored — jsdom and hidden tabs measure everything as zero —
// so an unmeasured chart draws at `FALLBACK_SIZE` rather than blank.
//
// THE PICK IS NOT SNAPPED. The chart does not know whose calendar it is on, so
// `onPick` reports the raw date and the caller snaps (to an ISO week, a month,
// whatever its grid is) — the same contract `Chart.onPick` states.
import {
	type Component,
	createMemo,
	createSignal,
	Index,
	mergeProps,
	onCleanup,
	onMount,
	Show,
} from "solid-js";
import { observeSize } from "../../internal/dom/observeSize";
import type { StackedAreaCurve, StackedAreaSeriesData } from "../Chart";
import {
	BarSeries,
	Chart,
	ChartTooltip,
	Grid,
	ReferenceLine,
	StackedAreaSeries,
	XAxis,
	YAxis,
} from "../Chart";
import type { Margin } from "../Chart/context";
import { seriesPaint } from "../Chart/StackedAreaSeries";
import { stackBuckets } from "../Chart/stackedArea";
import { GrowFillBox } from "../Layout";
import { type TimeValue, timeOf } from "../LevelsTimeline/geometry";

/** One event on the timeline: a numbered vertical rule at `at`. */
export interface StackedTimelineEvent {
	readonly at: TimeValue;
	/** The rule's caption — usually the event's number. */
	readonly label: string;
}

/** A captioned horizontal rule across the stack, e.g. "full-time" at 40. */
export interface StackedTimelineRule {
	readonly value: number;
	readonly label: string;
}

export interface StackedTimelineChartProps {
	/** The stack, BOTTOM FIRST. Step-valued, as `StackedAreaSeries` reads it. */
	series: readonly StackedAreaSeriesData[];
	xDomain: [Date, Date];
	/** Fixed, so bands stay comparable across edits. */
	yDomain: [number, number];
	/** Where the x ticks sit, as timestamps. Omit for the scale's own ticks. */
	xTickValues?: readonly number[];
	/** One captioned rule across the stack. */
	rule?: StackedTimelineRule;
	/** One numbered vertical rule each. */
	events?: readonly StackedTimelineEvent[];
	/** The readout under the pointer, from its raw timestamp. Omit for none. */
	hoverLabel?: (at: number) => string;
	/** A click on the plot, as the RAW date under the pointer. */
	onPick?: (at: Date) => void;
	/**
	 * Bucket STARTS. Supplied, the stack draws as COLUMNS — one per bucket,
	 * holding what each series carries at that bucket's start — instead of as
	 * bands, and `curve` no longer applies. The last bucket runs to
	 * `xDomain[1]`, so 24 month starts draw 24 columns.
	 *
	 * WHY THE CALLER OWNS THEM: a bucket is a fact of the caller's calendar,
	 * and this chart knows no calendar — the same reason `onPick` reports a raw
	 * date. Supply them when the x-axis carries BUCKETS rather than a
	 * continuum: a month's cash, a week's hours. A bucket has no interior, so a
	 * band drawn across one states a figure the model never produced.
	 *
	 * Unequal buckets (a 28-day month beside a 31-day one) draw at ONE width,
	 * each centred on its own true midpoint: the position is exact and the
	 * width is nominal.
	 */
	columns?: readonly TimeValue[];
	/**
	 * How the stack crosses a change. `"smoothStep"` (the default) spends x on
	 * the crossing: the band rises before the change and falls after it, which
	 * is the picture of a quantity that varies continuously. `"linear"` spends
	 * none — a value holds flat across its own step and the change lands square
	 * on its own x.
	 *
	 * Choose `"linear"` when the x-axis carries BUCKETS rather than a continuum
	 * — a month's cash, a week's hours. A bucket has no interior, so the
	 * smoothed shoulders draw a figure the model never produced, and a
	 * one-bucket spike reads as a rise and a fall instead of one payment.
	 * Presentational — curried.
	 */
	curve?: StackedAreaCurve;
	/**
	 * A column's width as a fraction of its bucket, so the remainder is the
	 * GUTTER that makes the buckets read as separate. Default 0.84. Ignored
	 * without `columns`. Presentational — curried.
	 */
	columnWidth?: number;
	/**
	 * Pixels of GROUND left between a column's stacked segments. Default 1;
	 * 0 lets them meet directly. Ignored without `columns`.
	 *
	 * It is not decoration. The series palette is held inside a narrow
	 * lightness band, so two neighbouring bands come out near EQUILUMINANT and
	 * the boundary between them carries hue but almost no luminance. The eye
	 * finds edges by luminance, so that boundary reads as soft and the two
	 * segments stop looking like they share a width. Presentational — curried.
	 */
	segmentGap?: number;
	/** Plot inset. Presentational — curried. */
	margin?: Partial<Margin>;
	/** X tick text. Presentational — curried. */
	xTickFormat?: (value: number) => string;
	/** Y tick text. Presentational — curried. */
	yTickFormat?: (value: number) => string;
}

/** What an unmeasured chart draws at: a plausible card, never zero. */
export const STACKED_TIMELINE_FALLBACK_SIZE = {
	width: 640,
	height: 220,
} as const;

export const StackedTimelineChart: Component<StackedTimelineChartProps> = (
	props,
) => {
	const [box, setBox] = createSignal<{ width: number; height: number }>(
		STACKED_TIMELINE_FALLBACK_SIZE,
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

	const hover = createMemo(() => props.hoverLabel);

	/* The bucketed stack, in DATA units. `stackBuckets` reads the same
	   `valueAt` the band mark reads, so a column and a band can never disagree
	   about what a series holds at a moment. */
	const buckets = createMemo(() => {
		const edges = props.columns;
		if (edges === undefined || edges.length === 0) return [];
		const series = props.series.map((one) => ({
			id: one.id,
			label: one.label,
			points: one.points.map((point) => ({
				at: timeOf(point.at),
				value: point.value,
			})),
		}));
		return stackBuckets(series, [
			...edges.map(timeOf),
			props.xDomain[1].getTime(),
		]);
	});

	/* EACH column gets its OWN bucket as its slot, never one mean month. With a
	   single mean, every bar still centres on its own bucket while every bar is
	   the same width, so all of the 28-to-31-day difference lands in the GAPS:
	   4.7 px beside 6.5 px around a constant 30.6 px bar, and an event rule on a
	   real month boundary then missed the gap's centre. Per-bucket slots put the
	   boundary back in the middle of every gap. */
	const columnStep = (bucket: { from: number; to: number }): number =>
		bucket.to - bucket.from;

	return (
		<GrowFillBox ref={frame}>
			<Chart
				width={box().width}
				height={box().height}
				xDomain={props.xDomain}
				yDomain={props.yDomain}
				margin={props.margin}
				onPick={(at) => props.onPick?.(at instanceof Date ? at : new Date(at))}
			>
				<Grid />
				<YAxis tickFormat={props.yTickFormat} />
				<XAxis tickValues={props.xTickValues} tickFormat={props.xTickFormat} />
				{/* `columns` selects the mark. One prop, so a caller cannot ask for
				    columns and leave the chart without a bucket grid to draw them on. */}
				<Show
					when={buckets().length > 0}
					fallback={
						<StackedAreaSeries series={props.series} curve={props.curve} />
					}
				>
					<BarSeries
						data={buckets()}
						x={(bucket) => (bucket.from + bucket.to) / 2}
						step={columnStep}
						bandWidth={props.columnWidth ?? 0.84}
						segmentGap={props.segmentGap ?? 1}
						segments={(bucket) =>
							bucket.values.map((value, index) => ({
								value,
								fill: seriesPaint(index),
								key: index,
							}))
						}
					/>
				</Show>
				<Show when={props.rule}>
					{(rule) => (
						<ReferenceLine
							orientation="horizontal"
							value={rule().value}
							label={rule().label}
							strokeDasharray="6 4"
						/>
					)}
				</Show>
				{/* `Index`, not `For`: callers rebuild the event list wholesale on
            every edit, so position IS the identity. */}
				<Index each={props.events ?? []}>
					{(event) => (
						<ReferenceLine
							orientation="vertical"
							value={new Date(timeOf(event().at))}
							label={event().label}
						/>
					)}
				</Index>
				{/* `fallback` with no data: the readout names a moment of the
            calendar, not a point of a series, so it tracks the pointer. */}
				<Show when={hover()}>
					{(label) => (
						<ChartTooltip
							data={[]}
							x={(at: number) => at}
							fallback={(at) => label()(at)}
						>
							{() => null}
						</ChartTooltip>
					)}
				</Show>
			</Chart>
		</GrowFillBox>
	);
};

/** Props that are presentational — locked at curry time. */
export type StackedTimelineChartOverrides = Pick<
	StackedTimelineChartProps,
	
	| "curve"
	| "segmentGap"
	| "columnWidth"
	| "margin"
	| "xTickFormat"
	| "yTickFormat"
>;

/** Props left to the call site: data and callbacks only. */
export type StackedTimelineChartDataProps = Omit<
	StackedTimelineChartProps,
	keyof StackedTimelineChartOverrides
>;

/**
 * Curry the crossing, the inset and the tick text once per screen. Tick text
 * carries the screen's units ("40h", "2025-Q3"), which a library cannot guess,
 * so there is no shipped variant — the consumer curries its own. The crossing
 * curries with them because whether the x-axis carries a continuum or a row of
 * buckets is one fact about a screen's data, not a per-render choice.
 */
export function createStackedTimelineChart(
	defaults: StackedTimelineChartOverrides,
): Component<StackedTimelineChartDataProps> {
	return (props) => <StackedTimelineChart {...mergeProps(defaults, props)} />;
}
