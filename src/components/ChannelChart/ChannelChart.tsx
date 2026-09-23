// ============================================
// ChannelChart — Composite (Depth 2). A band (the CHANNEL) with a running
// value inside it, optionally stacked above a diverging-bar plot that shares
// its period axis. Composes `Chart` ×2 + `Grid` + `XAxis` / `YAxis` +
// `AreaSeries` (with `lower`) + `LineSeries` + `PointSeries` + `BarSeries` +
// `ReferenceLine` + `ChartLabels` + `ChartTooltip` (Structural, Depth 1),
// `Legend` (Atomic), `MutedEmptyState` and `FillColumn` / `GrowFillBox` /
// `TightStack` (curried Layout) and Text variants. Owns no CSS: tone colours
// are SUI token strings passed as `fill` / `stroke` props to the slots.
//
// WHAT IT DRAWS: per period `i`, a band `lo..hi` (cumulative projection),
// the cumulative actual as a line with a marker per period (toned when out of
// band, the last one larger), and — in the divergence variant — one bar per
// period of the signed distance OUTSIDE the per-period band, around zero.
//
// EVERYTHING IS DECIDED HEADLESSLY in `./channelGeometry.ts` (`channelModel`):
// domains, explicit ticks, the ONE margin both plots share (left from the
// widest tick label across BOTH plots, right from the widest end label),
// marker and bar tones, bar and end labels. This file only maps that model
// onto slots, so the margin measured is the margin drawn.
//
// MEASUREMENT, the documented way (StackedTimelineChart's pattern): the first
// size comes synchronously from `getBoundingClientRect` in `onMount`, then
// `observeSize` keeps it current. Width and height are taken independently and
// a zero reading is never stored, so an unmeasured chart draws at
// `CHANNEL_CHART_FALLBACK_SIZE` rather than blank.
// ============================================
import {
	type Component,
	createMemo,
	createSignal,
	mergeProps,
	onCleanup,
	onMount,
	Show,
} from "solid-js";
import { map } from "../../fn";
import { observeSize } from "../../internal/dom/observeSize";
import {
	AreaSeries,
	BarSeries,
	Chart,
	ChartLabels,
	ChartTooltip,
	Grid,
	LineSeries,
	PointSeries,
	ReferenceLine,
	XAxis,
	YAxis,
} from "../Chart";
import { MutedEmptyState } from "../Feedback";
import { FillColumn, GrowFillBox, TightStack } from "../Layout";
import { Legend } from "../Legend";
import { BODY_LABEL_GAP, LABEL_ROW_HEIGHT } from "../Chart/labelPlacement";
import { measureLabelWidth } from "../ScrubChart/helpers";
import { TextLabel, TextSublabel, TextValue } from "../Text";
import {
	type ChannelBar,
	type ChannelBarTone,
	type ChannelEndLabel,
	type ChannelMarker,
	type ChannelMarkerTone,
	type ChannelPeriod,
	type ChannelRow,
	barLabelAnchor,
	barSegmentsOf,
	channelModel,
	periodIndexAt,
} from "./channelGeometry";

/** Colours, as CSS colour strings (SUI tokens by default). */
export interface ChannelChartTones {
	/** The channel fill and its edges. */
	readonly band: string;
	/** The running value's line, and an in-band marker. */
	readonly line: string;
	/** Above the band: a marker or a bar. */
	readonly over: string;
	/** Below the band: a marker or a bar. */
	readonly under: string;
	/** A zero bar's flat tick, and the zero rule. */
	readonly zero: string;
}

export const DEFAULT_CHANNEL_CHART_TONES: ChannelChartTones = {
	band: "var(--sui-accent)",
	line: "var(--sui-text-primary)",
	over: "var(--sui-danger)",
	under: "var(--sui-warning)",
	zero: "var(--sui-text-muted)",
};

/** Legend text. Supplied, a legend renders under the plots. */
export interface ChannelChartLegend {
	readonly band: string;
	readonly line: string;
	readonly over: string;
	readonly under: string;
}

export interface ChannelChartProps {
	/** One entry per period, in order. The x axis is the index. */
	periods: readonly ChannelPeriod[];
	/**
	 * Every number the chart prints — y ticks, end labels, bar labels, the
	 * tooltip — goes through this, so money formatting stays the caller's.
	 */
	formatValue: (n: number) => string;
	/** Accessible name; the chart renders as `role="img"`. */
	ariaLabel: string;
	/** The selected period's key: a solid rule on both plots. */
	selectedKey?: string;
	/** A click on either plot, snapped to the nearest period. */
	onPickPeriod?: (key: string) => void;
	/** Shown instead of the plots when `periods` is empty. */
	emptyMessage?: string;
	/** Legend text; omitted, no legend. */
	legend?: ChannelChartLegend;
	/** Draw the diverging-bar plot under the channel. Presentational — curried. */
	showDivergence?: boolean;
	/** Height share of the divergence plot, 0..1. Default 0.45. Curried. */
	divergenceShare?: number;
	/** Label each bar with its signed value. Curried. */
	labelBars?: boolean;
	/** Label the last period's value, ceiling and floor. Curried. */
	labelEnds?: boolean;
	/** Marker radius in px; the last marker draws 1.4× larger. Curried. */
	markerRadius?: number;
	/** Colours. Curried. */
	tones?: ChannelChartTones;
}

/** What an unmeasured chart draws at: a plausible card, never zero. */
export const CHANNEL_CHART_FALLBACK_SIZE = {
	width: 520,
	height: 360,
} as const;

/** Half the height, in px, of a zero bar's flat tick (3px tall). */
const ZERO_TICK_HALF_PX = 1.5;
const END_MARKER_SCALE = 1.4;
const TICK_COUNT = 4;

export const ChannelChart: Component<ChannelChartProps> = (raw) => {
	const props = mergeProps(
		{
			showDivergence: false,
			divergenceShare: 0.45,
			labelBars: false,
			labelEnds: true,
			markerRadius: 4,
			tones: DEFAULT_CHANNEL_CHART_TONES,
			emptyMessage: "No periods to show.",
		},
		raw,
	);

	const [box, setBox] = createSignal<{ width: number; height: number }>(
		CHANNEL_CHART_FALLBACK_SIZE,
	);
	let frame: HTMLDivElement | undefined;
	const take = (width: number, height: number): void => {
		const prev = box();
		const next = {
			width: width > 0 ? width : prev.width,
			height: height > 0 ? height : prev.height,
		};
		if (next.width !== prev.width || next.height !== prev.height) setBox(next);
	};
	onMount(() => {
		if (frame === undefined) return;
		const rect = frame.getBoundingClientRect();
		take(Math.round(rect.width), Math.round(rect.height));
		onCleanup(observeSize(frame, (size) => take(size.width, size.height)));
	});

	const model = createMemo(() =>
		channelModel(props.periods, {
			showDivergence: props.showDivergence,
			labelEnds: props.labelEnds,
			formatValue: props.formatValue,
		}),
	);

	const share = () => Math.min(0.8, Math.max(0.1, props.divergenceShare));
	const topHeight = () =>
		props.showDivergence
			? Math.round(box().height * (1 - share()))
			: box().height;
	const bottomHeight = () => box().height - topHeight();

	const tickValues = () => map((t: { i: number }) => t.i, model().xTicks);
	const tickLabel = (i: number): string =>
		model().xTicks[Math.round(i)]?.label ?? "";

	const selectedIndex = createMemo(() => {
		const key = props.selectedKey;
		if (key === undefined) return -1;
		for (let i = 0; i < props.periods.length; i++) {
			if (props.periods[i].key === key) return i;
		}
		return -1;
	});

	const pick = () => {
		const onPickPeriod = props.onPickPeriod;
		if (onPickPeriod === undefined) return undefined;
		return (x: number | Date) => {
			const i = periodIndexAt(Number(x), props.periods.length);
			if (i >= 0) onPickPeriod(props.periods[i].key);
		};
	};

	const markerFill = (tone: ChannelMarkerTone): string =>
		tone === "over"
			? props.tones.over
			: tone === "under"
				? props.tones.under
				: props.tones.line;
	const barFill = (tone: ChannelBarTone): string =>
		tone === "over"
			? props.tones.over
			: tone === "under"
				? props.tones.under
				: props.tones.zero;

	/* px → data factors for the divergence plot at its current size. */
	const yPerPx = () => {
		const m = model();
		const inner = Math.max(1, bottomHeight() - m.margin.top - m.margin.bottom);
		return (m.divDomain[1] - m.divDomain[0]) / inner;
	};
	const xPerPx = () => {
		const m = model();
		const inner = Math.max(1, box().width - m.margin.left - m.margin.right);
		return (m.xDomain[1] - m.xDomain[0]) / inner;
	};
	/* A zero bar is a flat tick ZERO_TICK_HALF_PX*2 px tall. */
	const halfTick = () => yPerPx() * ZERO_TICK_HALF_PX;
	/* A bar label's anchor, so the body rung centres it over the bar's end. */
	const barAnchor = (b: ChannelBar) =>
		barLabelAnchor(
			b,
			measureLabelWidth(b.label),
			LABEL_ROW_HEIGHT,
			BODY_LABEL_GAP,
			xPerPx(),
			yPerPx(),
		);

	const selectedRule = () => (
		<Show when={selectedIndex() >= 0}>
			<ReferenceLine
				orientation="vertical"
				value={selectedIndex()}
				color={props.tones.band}
				strokeDasharray="none"
				opacity={0.8}
			/>
		</Show>
	);

	const legendItems = () => {
		const legend = props.legend;
		if (legend === undefined) return [];
		return [
			{ color: props.tones.band, label: legend.band },
			{ color: props.tones.line, label: legend.line },
			{ color: props.tones.over, label: legend.over },
			{ color: props.tones.under, label: legend.under },
		];
	};

	return (
		<FillColumn role="img" aria-label={props.ariaLabel}>
			<Show
				when={props.periods.length > 0}
				fallback={<MutedEmptyState message={props.emptyMessage} />}
			>
				<GrowFillBox ref={frame}>
					<Chart
						width={box().width}
						height={topHeight()}
						xDomain={model().xDomain}
						yDomain={model().yDomain}
						margin={model().margin}
						onPick={pick()}
					>
						<Grid tickCount={TICK_COUNT} />
						<YAxis
							tickValues={model().yTicks}
							tickFormat={props.formatValue}
						/>
						<XAxis tickValues={tickValues()} tickFormat={tickLabel} />
						<AreaSeries
							data={model().rows}
							x={(r: ChannelRow) => r.i}
							y={(r: ChannelRow) => r.hi}
							lower={(r: ChannelRow) => r.lo}
							fill={props.tones.band}
						/>
						<LineSeries
							data={model().rows}
							x={(r: ChannelRow) => r.i}
							y={(r: ChannelRow) => r.hi}
							stroke={props.tones.band}
							strokeWidth={1.5}
						/>
						<LineSeries
							data={model().rows}
							x={(r: ChannelRow) => r.i}
							y={(r: ChannelRow) => r.lo}
							stroke={props.tones.band}
							strokeWidth={1.5}
						/>
						{selectedRule()}
						<LineSeries
							data={model().rows}
							x={(r: ChannelRow) => r.i}
							y={(r: ChannelRow) => r.value}
							stroke={props.tones.line}
							strokeWidth={2.5}
						/>
						<PointSeries
							data={model().markers}
							x={(m: ChannelMarker) => m.i}
							y={(m: ChannelMarker) => m.value}
							radius={(m: ChannelMarker) =>
								m.end ? props.markerRadius * END_MARKER_SCALE : props.markerRadius
							}
							fill={(m: ChannelMarker) => markerFill(m.tone)}
							stroke="var(--sui-bg-elevated)"
							strokeWidth={1.5}
						/>
						<ChartLabels
							data={model().endLabels}
							id={(l: ChannelEndLabel) => l.id}
							text={(l: ChannelEndLabel) => l.text}
							width={(l: ChannelEndLabel) => measureLabelWidth(l.text)}
							x={(l: ChannelEndLabel) => l.i}
							y={(l: ChannelEndLabel) => l.value}
							placement={() => "right"}
						/>
						<ChartTooltip
							data={model().rows}
							x={(r: ChannelRow) => r.i}
						>
							{(r: ChannelRow) => (
								<TightStack>
									<TextLabel>{model().xTicks[r.i]?.label}</TextLabel>
									<TextValue>{props.formatValue(r.value)}</TextValue>
									<TextSublabel>
										{`${props.formatValue(r.lo)} – ${props.formatValue(r.hi)}`}
									</TextSublabel>
									<Show when={props.showDivergence && r.diff !== 0}>
										<TextSublabel>
											{`${r.diff > 0 ? "+" : ""}${props.formatValue(r.diff)} outside`}
										</TextSublabel>
									</Show>
								</TightStack>
							)}
						</ChartTooltip>
					</Chart>
					<Show when={props.showDivergence}>
						<Chart
							width={box().width}
							height={bottomHeight()}
							xDomain={model().xDomain}
							yDomain={model().divDomain}
							margin={model().margin}
							onPick={pick()}
						>
							<YAxis
								tickValues={model().divTicks}
								tickFormat={props.formatValue}
							/>
							<XAxis tickValues={tickValues()} tickFormat={tickLabel} />
							{selectedRule()}
							<BarSeries
								data={model().bars}
								x={(b: ChannelBar) => b.i}
								segments={(b: ChannelBar) =>
									map(
										(s: { value: number; tone: ChannelBarTone }) => ({
											value: s.value,
											fill: barFill(s.tone),
										}),
										barSegmentsOf(b, halfTick()),
									)
								}
							/>
							<ReferenceLine
								orientation="horizontal"
								value={0}
								color={props.tones.zero}
								strokeDasharray="none"
								opacity={1}
							/>
							<Show when={props.labelBars}>
								<ChartLabels
									data={model().bars}
									id={(b: ChannelBar) => String(b.i)}
									text={(b: ChannelBar) => b.label}
									width={(b: ChannelBar) => measureLabelWidth(b.label)}
									x={(b: ChannelBar) => barAnchor(b).x}
									y={(b: ChannelBar) => barAnchor(b).y}
									placement={() => "body"}
								/>
							</Show>
						</Chart>
					</Show>
				</GrowFillBox>
				<Show when={legendItems().length > 0}>
					<Legend items={legendItems()} />
				</Show>
			</Show>
		</FillColumn>
	);
};

/** Props that are presentational — locked at curry time. */
export type ChannelChartOverrides = Pick<
	ChannelChartProps,
	| "showDivergence"
	| "divergenceShare"
	| "labelBars"
	| "labelEnds"
	| "markerRadius"
	| "tones"
>;

/** Props left to the call site: data and callbacks only. */
export type ChannelChartDataProps = Omit<
	ChannelChartProps,
	keyof ChannelChartOverrides
>;

export function createChannelChart(
	defaults: ChannelChartOverrides,
): Component<ChannelChartDataProps> {
	return (props) => <ChannelChart {...mergeProps(defaults, props)} />;
}
