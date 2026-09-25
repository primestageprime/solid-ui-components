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
// SIZE-RESPONSIVE CHROME (G17): the measured box also decides what the chart
// can afford — 3 y ticks and a tighter inset under 200px tall, every other x
// label under 400px wide. The rule is the pure `stackedTimelineLayout`
// (./layout.ts); no prop turns it on.
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
import { find, map } from "../../fn";
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
import { type Margin, useChart } from "../Chart/context";
import { seriesPaint } from "../Chart/StackedAreaSeries";
import { stackBuckets } from "../Chart/stackedArea";
import { GrowFillBox } from "../Layout";
import { type TimeValue, timeOf } from "../LevelsTimeline/geometry";
import { stackedTimelineLayout, thinTicks } from "./layout";

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

/**
 * The rule a click WOULD leave, drawn while the pointer is over the plot.
 *
 * It reads `ctx.hoverX()` — the SAME mapping `Chart.onPick` reports from — so
 * the ghost cannot drift from where the click actually lands. It then snaps
 * that raw x onto the caller's own bucket grid and draws at the bucket's
 * START, because that is where a rule for that bucket goes.
 *
 * THE GRID IS WHY THIS IS SAFE. `Chart.onPick` is deliberately unsnapped: the
 * root does not know whose calendar it is on. A ghost drawn on the raw x
 * would therefore promise a position the caller's own snapping then moves,
 * which is worse than no ghost at all. Given `columns` the chart DOES know
 * the grid, so it can keep the promise — and that is the only case it draws.
 *
 * `GhostPin` is the same idea for a glyph, and anchors to `hoverX` too.
 */
const GhostPickRule: Component<{
	buckets: readonly { from: number; to: number }[];
}> = (props) => {
	const ctx = useChart();
	const at = createMemo(() => {
		const x = ctx.hoverX();
		if (x === null) return undefined;
		return find(
			(bucket: { from: number; to: number }) =>
				x >= bucket.from && x < bucket.to,
			props.buckets,
		)?.from;
	});
	return (
		<Show when={at()}>
			{(from) => (
				<ReferenceLine
					orientation="vertical"
					value={new Date(from())}
					opacity={GHOST_OPACITY}
				/>
			)}
		</Show>
	);
};

/** The selected rule's accent. It matches whatever picked the change. */
const SELECTED_RULE = "var(--sui-accent)";

/** Faint enough to read as "not yet", against a real rule's 0.6. */
const GHOST_OPACITY = 0.24;

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
	/**
	 * Which event is SELECTED, as its index in `events`. Its rule goes solid,
	 * accented and full-strength, and its number takes the accent too; every
	 * other rule stays dashed and recessive. Out of range, or omitted, selects
	 * nothing.
	 *
	 * THE INDEX IS THE IDENTITY, for the same reason the rules render through
	 * `Index` and not `For`: callers rebuild the event list wholesale on every
	 * edit, so an id would have to survive a rebuild this component never sees.
	 * A caller holding ids maps one to its position.
	 *
	 * Solid-versus-dashed carries the state on its own, so the accent is a
	 * second cue and never the only one.
	 */
	selectedEvent?: number;
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

	/* What this box can afford: tick counts, x-label thinning and the inset. */
	const layout = createMemo(() => stackedTimelineLayout(box(), props.yDomain, props.margin));
	const xTicks = createMemo(() => {
		const values = props.xTickValues;
		return values === undefined
			? undefined
			: thinTicks(values, layout().xLabelStep);
	});

	/* The bucketed stack, in DATA units. `stackBuckets` reads the same
	   `valueAt` the band mark reads, so a column and a band can never disagree
	   about what a series holds at a moment. */
	const buckets = createMemo(() => {
		const edges = props.columns;
		if (edges === undefined || edges.length === 0) return [];
		const series = map(
			(one: StackedAreaSeriesData) => ({
				id: one.id,
				label: one.label,
				points: map(
					(point: { at: number | Date; value: number }) => ({
						at: timeOf(point.at),
						value: point.value,
					}),
					one.points,
				),
			}),
			props.series,
		);
		return stackBuckets(series, [
			...map(timeOf, edges),
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
				margin={layout().margin}
				onPick={(at) => props.onPick?.(at instanceof Date ? at : new Date(at))}
			>
				<Grid />
				<YAxis tickValues={layout().yTickValues} tickFormat={props.yTickFormat} />
				<XAxis
					tickCount={layout().xTickCount}
					tickValues={xTicks()}
					tickFormat={props.xTickFormat}
				/>
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
							map(
								(value: number, index: number) => ({
									value,
									fill: seriesPaint(index),
									key: index,
								}),
								bucket.values,
							)
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
					{(event, index) => (
						/* `Index` keeps a row's nodes, so the selection has to reach an
						   ALREADY-DRAWN rule. It does: Solid compiles a JSX prop into a
						   getter, so reading `props.selectedEvent` inside one of these
						   expressions stays reactive. (A spread is reactive too — these
						   are separate ternaries for reading, not for correctness.) What
						   WOULD break it is hoisting the comparison into a const above
						   the JSX; a test pins the re-style against that. */
						<ReferenceLine
							orientation="vertical"
							value={new Date(timeOf(event().at))}
							label={event().label}
							color={index === props.selectedEvent ? SELECTED_RULE : undefined}
							labelColor={
								index === props.selectedEvent ? SELECTED_RULE : undefined
							}
							strokeDasharray={
								index === props.selectedEvent ? "none" : undefined
							}
							strokeWidth={index === props.selectedEvent ? 2 : undefined}
							opacity={index === props.selectedEvent ? 1 : undefined}
						/>
					)}
				</Index>
				{/* The ghost goes AFTER the real rules, so a hovered month that
				    already carries one does not paint the ghost underneath it. It
				    draws only where a pick can be promised: `onPick` to act on it
				    and `columns` to say where it lands. */}
				<Show when={props.onPick !== undefined && buckets().length > 0}>
					<GhostPickRule buckets={buckets()} />
				</Show>
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
