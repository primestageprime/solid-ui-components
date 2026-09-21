// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// Series (LineSeries / etc.) — Structural (Depth 1). SVG chart slot; composes no library components.
import {
	type Component,
	createEffect,
	createMemo,
	createUniqueId,
	For,
	onCleanup,
	Show,
} from "solid-js";
import { useChart } from "./context";
import { buildReferenceLine } from "./referenceLine";
import { slotId as brandSlotId } from "./slot-types";

interface SeriesBase<T> {
	data: readonly T[];
	x: (d: T) => number;
	y: (d: T) => number;
	/** Skip points where x or y is NaN. Default true. */
	skipMissing?: boolean;
}

// ── The missing-value boundary ───────────────────────────────────────────
//
// Two conventions for "this point has no value" live in this repo. They are
// scoped, not competing, and this ticket has been filed twice:
//
// - `Chart` (this file) takes NaN plus `skipMissing`. The datum type `T`
//   belongs to the caller, so `Chart` cannot state what an absent value looks
//   like inside it. It reads the caller's `x`/`y` accessors and treats the
//   number they return as the whole contract; NaN is the only absent number.
// - `CashflowScrubChart` takes `null` (see `CashflowScrubChart/helpers.ts`,
//   `buildLineSegments`). Its accessors are cell-indexed and it owns the cell
//   type, so a cell legitimately holds no value and `null` says exactly that.
//
// Do not converge them. Both `null` and NaN-plus-`skipMissing` appear in
// public props, so either move is a breaking public API change.
//
// Inside `Chart`, `buildLine`, `PointSeries` and `AreaSeries`'s
// baseline-closing loop all share this one test. The closing loop once tested
// `Number.isNaN(xv)` alone, so a trailing NaN `y` closed the fill past the
// drawn line; dside task 45210 fixed that.
const isMissingPoint = (
	skipMissing: boolean,
	xv: number,
	yv: number,
): boolean => skipMissing && (Number.isNaN(xv) || Number.isNaN(yv));

const buildLine = <T,>(
	data: readonly T[],
	x: (d: T) => number,
	y: (d: T) => number,
	xs: (v: number) => number,
	ys: (v: number) => number,
	skipMissing: boolean,
): string => {
	let path = "";
	let need = true;
	for (const d of data) {
		const xv = x(d);
		const yv = y(d);
		if (isMissingPoint(skipMissing, xv, yv)) {
			need = true;
			continue;
		}
		const X = xs(xv).toFixed(2);
		const Y = ys(yv).toFixed(2);
		path += need ? `M${X},${Y}` : `L${X},${Y}`;
		need = false;
	}
	return path;
};

// ---- LineSeries ----
export interface LineSeriesProps<T> extends SeriesBase<T> {
	stroke?: string;
	strokeWidth?: number;
	strokeDasharray?: string;
	class?: string;
}

export function LineSeries<T>(props: LineSeriesProps<T>) {
	const ctx = useChart();
	const d = createMemo(() =>
		buildLine(
			props.data,
			props.x,
			props.y,
			ctx.xScale(),
			ctx.yScale(),
			props.skipMissing ?? true,
		),
	);
	return (
		<g clip-path={ctx.clip.plotPathUrl()}>
			<path
				class={`sui-chart__line${props.class ? ` ${props.class}` : ""}`}
				d={d()}
				stroke={props.stroke}
				stroke-width={props.strokeWidth ?? 2}
				stroke-dasharray={props.strokeDasharray}
				fill="none"
				stroke-linejoin="round"
				stroke-linecap="round"
			/>
		</g>
	);
}

// ---- AreaSeries ----
export interface AreaSeriesProps<T> extends SeriesBase<T> {
	/** Fill color. */
	fill?: string;
	fillOpacity?: number;
	/** Y value for the baseline (in data domain). Default = bottom of yDomain. */
	baseline?: number;
	class?: string;
}

export function AreaSeries<T>(props: AreaSeriesProps<T>) {
	const ctx = useChart();
	const d = createMemo(() => {
		const xs = ctx.xScale();
		const ys = ctx.yScale();
		const baselineValue = props.baseline ?? ys.domain[0];
		const baseY = ys(baselineValue);
		const top = buildLine(
			props.data,
			props.x,
			props.y,
			xs,
			ys,
			props.skipMissing ?? true,
		);
		if (!top) return "";
		// Find the first and last DRAWN x to close the area along the baseline.
		// The same missing-point test `buildLine` uses, so the fill never runs
		// past the top line (dside task 45210).
		const skipMissing = props.skipMissing ?? true;
		let first: number | null = null;
		let last: number | null = null;
		for (const dd of props.data) {
			const xv = props.x(dd);
			if (isMissingPoint(skipMissing, xv, props.y(dd))) continue;
			if (first === null) first = xv;
			last = xv;
		}
		if (first === null || last === null) return top;
		return `${top} L${xs(last).toFixed(2)},${baseY.toFixed(2)} L${xs(first).toFixed(2)},${baseY.toFixed(2)} Z`;
	});
	return (
		<g clip-path={ctx.clip.plotPathUrl()}>
			<path
				class={`sui-chart__area${props.class ? ` ${props.class}` : ""}`}
				d={d()}
				fill={props.fill}
				fill-opacity={props.fillOpacity ?? 0.18}
				stroke="none"
			/>
		</g>
	);
}

// ---- PointSeries (markers) ----
export interface PointSeriesProps<T> extends SeriesBase<T> {
	/** Marker radius in px. Default 3. */
	radius?: number | ((d: T) => number);
	fill?: string | ((d: T) => string);
	stroke?: string | ((d: T) => string);
	strokeWidth?: number;
	/** Tooltip / aria title per point. */
	title?: (d: T) => string;
	/**
	 * When true and `ctx.hoverX()` is non-null, the datum whose x is closest
	 * to hoverX is rendered with `radius * emphasisScale`. Default false.
	 */
	emphasizeNearestX?: boolean;
	/** Radius multiplier applied to the emphasized point. Default 2. */
	emphasisScale?: number;
	class?: string;
}

export function PointSeries<T>(props: PointSeriesProps<T>) {
	const ctx = useChart();
	const slotId = brandSlotId(createUniqueId());
	const baseRadius = (d: T) =>
		typeof props.radius === "function" ? props.radius(d) : (props.radius ?? 3);
	const fill = (d: T) =>
		typeof props.fill === "function" ? props.fill(d) : props.fill;
	const stroke = (d: T) =>
		typeof props.stroke === "function" ? props.stroke(d) : props.stroke;
	// Nearest datum + its distance to hoverX (DATA-domain units). `null` when
	// emphasis is disabled, no hover, no data, or the nearest is invalid.
	const nearest = createMemo<{ idx: number; dist: number } | null>(() => {
		if (!props.emphasizeNearestX) return null;
		const hx = ctx.hoverX();
		if (hx == null) return null;
		const best = props.data.reduce<{ idx: number; dist: number }>(
			(acc, d, i) => {
				const dist = Math.abs(props.x(d) - hx);
				return dist < acc.dist ? { idx: i, dist } : acc;
			},
			{ idx: -1, dist: Infinity },
		);
		return best.idx < 0 ? null : best;
	});
	const nearestIdx = createMemo(() => nearest()?.idx ?? -1);

	// Report this slot's candidate distance to the chart-level coordinator.
	// The coordinator picks ONE winner across all participating slots.
	createEffect(() => {
		const n = nearest();
		if (n == null) {
			ctx.emphasis.clear(slotId);
		} else {
			ctx.emphasis.report(slotId, n.dist);
		}
	});
	onCleanup(() => ctx.emphasis.clear(slotId));

	const isWinner = () => ctx.emphasis.winnerId() === slotId;
	return (
		<g
			class={`sui-chart__points${props.class ? ` ${props.class}` : ""}`}
			clip-path={ctx.clip.plotPathUrl()}
		>
			<For each={props.data}>
				{(d, i) => {
					const xv = props.x(d);
					const yv = props.y(d);
					if (isMissingPoint(props.skipMissing ?? true, xv, yv)) return null;
					const isEmphasized = () => isWinner() && i() === nearestIdx();
					const r = () =>
						isEmphasized()
							? baseRadius(d) * (props.emphasisScale ?? 2)
							: baseRadius(d);
					return (
						<circle
							cx={ctx.xScale()(xv)}
							cy={ctx.yScale()(yv)}
							r={r()}
							fill={fill(d)}
							stroke={stroke(d)}
							stroke-width={props.strokeWidth}
							data-emphasized={isEmphasized() ? "true" : undefined}
						>
							<Show when={props.title}>
								<title>{props.title!(d)}</title>
							</Show>
						</circle>
					);
				}}
			</For>
		</g>
	);
}

// ---- BarSeries ----
export interface BarSegment {
	/** Signed value — positive stacks up from baseline, negative stacks down. */
	value: number;
	fill?: string;
	/** Stable key for keyed iteration / click identification. */
	key?: string | number;
}

export interface BarSeriesProps<T> {
	data: readonly T[];
	/** Bar center on the x scale (typically `(_d, i) => i`). */
	x: (d: T, i: number) => number;
	/** Single-value mode. Mutually exclusive with `segments`. */
	value?: (d: T) => number;
	/** Stacked-bar mode — caller returns segments. */
	segments?: (d: T) => readonly BarSegment[];
	/** Bar width as fraction of slot. Default 0.65. */
	bandWidth?: number;
	/**
	 * One slot in DATA units. The default, 1, suits an index x
	 * (`(_d, i) => i`). A TIME x needs this: `center + 1` is one MILLISECOND
	 * later, so the derived slot comes out near zero — and near zero is not
	 * zero, so the fallback below never fires and every bar renders invisible.
	 * Pass the bucket's width in ms (a month, an hour) and the bars appear.
	 *
	 * **Pass a FUNCTION when the buckets differ in width.** One number spends
	 * the same slot on every datum while each bar still centres on its own
	 * datum, so every bit of the difference lands in the GAPS: months of 28 to
	 * 31 days gave gaps of 4.7 to 6.5 px around a constant 30.6 px bar, and a
	 * rule drawn on a real month boundary then missed the gap's centre.
	 */
	step?: number | ((d: T, i: number) => number);
	/** Y value to stack against. Default 0. */
	baseline?: number;
	/** Default fill when a segment doesn't specify one. */
	fill?: string;
	/**
	 * A paint paletted BETWEEN stacked segments and around each bar, 1px wide.
	 * Pass the chart's own surface colour and it reads as a GAP.
	 *
	 * **Why a stack wants one.** A validated categorical palette is held inside
	 * a narrow lightness band, so two adjacent segments come out near
	 * EQUILUMINANT — this stack's blue and amber sit at luminance .210 and
	 * .206. The eye finds edges by luminance, so a boundary carrying only hue
	 * reads as soft, and its position reads as uncertain: the segments look
	 * like they do not share a width even when they are the same rect. A
	 * surface-coloured hairline puts a luminance step back at that boundary.
	 * Omitted, the segments meet directly, as they always have.
	 */
	separator?: string;
	onBarClick?: (datum: T, index: number) => void;
	onSegmentClick?: (
		datum: T,
		segment: BarSegment,
		segmentIndex: number,
	) => void;
	class?: string;
}

export function BarSeries<T>(props: BarSeriesProps<T>) {
	const ctx = useChart();
	const bandWidth = () => props.bandWidth ?? 0.65;
	const stepOf = (d: T, i: number): number => {
		const step = props.step;
		return typeof step === "function" ? step(d, i) : (step ?? 1);
	};
	const baseline = () => props.baseline ?? 0;
	const interactive = () =>
		props.onBarClick != null || props.onSegmentClick != null;

	/* THE GEOMETRY IS A MEMO, not a read inside the row closure. `For` keeps a
	   row's nodes for as long as the datum's identity holds, so a scale read in
	   that closure runs ONCE and never again. A chart that measures its own box
	   draws its first frame at a FALLBACK size (`StackedTimelineChart` does),
	   and the bars then stayed laid out for that first width while the axes
	   moved to the real one — a stack that filled two thirds of its plot.
	   `StackedAreaSeries` never had it, because its geometry has always been a
	   memo over `ctx.xScale()`. Fixed-size consumers never resize, which is why
	   this went unseen. */
	const bars = createMemo(() => {
		const xs = ctx.xScale();
		const ys = ctx.yScale();
		const base = baseline();
		const fallbackSlot =
			(xs.range[1] - xs.range[0]) / Math.max(1, props.data.length);
		return props.data.map((datum, index) => {
			const center = props.x(datum, index);
			// Slot pixel width: the distance to the next centre, one `step` along.
			const slotPx =
				Math.abs(xs(center + stepOf(datum, index)) - xs(center)) || fallbackSlot;
			const width = slotPx * bandWidth();
			const source: readonly BarSegment[] = props.segments
				? props.segments(datum)
				: [{ value: props.value?.(datum) ?? 0 }];
			let posCursor = base;
			let negCursor = base;
			const segments = source
				.map((seg, segIndex) => {
					const top = seg.value > 0 ? posCursor + seg.value : negCursor;
					const bottom = seg.value > 0 ? posCursor : negCursor + seg.value;
					if (seg.value > 0) posCursor += seg.value;
					else negCursor += seg.value;
					return {
						seg,
						segIndex,
						y: ys(top),
						height: Math.abs(ys(bottom) - ys(top)),
					};
				})
				// A zero segment draws no rect. The cursors above already counted
				// it, so dropping it here cannot move the bands above it.
				.filter((placed) => placed.seg.value !== 0);
			return { datum, index, x: xs(center) - width / 2, width, segments };
		});
	});

	return (
		<g
			class={`sui-chart__bars${props.class ? ` ${props.class}` : ""}`}
			clip-path={ctx.clip.plotPathUrl()}
		>
			<For each={bars()}>
				{(bar) => (
					<For each={bar.segments}>
						{(placed) => {
							const click = (e: MouseEvent) => {
								e.stopPropagation();
								props.onSegmentClick?.(bar.datum, placed.seg, placed.segIndex);
								props.onBarClick?.(bar.datum, bar.index);
							};
							return (
								// biome-ignore lint/a11y/noStaticElementInteractions: interactive role/tabIndex + Enter/Space keyboard parity are wired dynamically when a click handler is provided; the analyzer can't see the conditional role
								<rect
									class="sui-chart__bar"
									classList={{ "sui-chart__bar--interactive": interactive() }}
									role={interactive() ? "button" : undefined}
									tabIndex={interactive() ? 0 : undefined}
									x={bar.x}
									y={placed.y}
									width={bar.width}
									height={placed.height}
									fill={placed.seg.fill ?? props.fill}
									stroke={props.separator}
									stroke-width={props.separator === undefined ? undefined : 1}
									onClick={click}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											e.preventDefault();
											click(e as unknown as MouseEvent);
										}
									}}
								/>
							);
						}}
					</For>
				)}
			</For>
		</g>
	);
}

// ---- ReferenceLine ----
export interface ReferenceLineStyleProps {
	stroke?: string;
	strokeWidth?: number;
	strokeDasharray?: string;
	/**
	 * Caption for the rule. Each orientation gives it a different seat:
	 *
	 * - `orientation="horizontal"` — the caption sits at the right plot edge,
	 *   just above the rule, with `text-anchor="end"`.
	 * - `orientation="vertical"` — the caption sits at the top of the plot,
	 *   centred on the rule with `text-anchor="middle"`. It stays
	 *   `CAPTION_EDGE_INSET` px inside each plot edge, and the rule top drops
	 *   `CAPTION_RULE_CLEARANCE` px so the text and the line never overlap.
	 *
	 * The seat is a convention, not a prop. The caller cannot move it.
	 */
	label?: string;
	/** Color override; takes precedence over `stroke`. Defaults via CSS class. */
	color?: string;
}

/**
 * ReferenceLine props.
 *
 * Caller passes `{ orientation, value }`. `value` is read on the x scale
 * when orientation="vertical" and on the y scale when orientation="horizontal".
 * Accepts `number | Date` (Date when the chart has a time domain).
 */
export type ReferenceLineProps = ReferenceLineStyleProps & {
	orientation: "horizontal" | "vertical";
	value: number | Date;
	class?: string;
};

const toScaleValue = (v: number | Date): number =>
	v instanceof Date ? v.getTime() : v;

/**
 * Distance (px) a vertical caption keeps from each plot edge. The clamp
 * replaces an edge flip: a rule on the plot edge keeps its centred anchor
 * and moves the text inboard instead. Mirrors the `rule` marker in
 * `CashflowScrubChart`.
 */
const CAPTION_EDGE_INSET = 18;
/** Centre a 1px stroke on whole pixels: `round(x) + 0.5` covers [x, x+1]. */
const crisp = (px: number): number => Math.round(px) + 0.5;

/** Baseline (px) of a vertical caption, measured from the plot top. */
const CAPTION_BASELINE_Y = 8;
/** Distance (px) the rule top drops to clear a vertical caption. */
const CAPTION_RULE_CLEARANCE = 15;

/** Holds `x` inside the plot, one caption inset in from each edge. */
const clampCaptionX = (x: number, innerWidth: number): number =>
	Math.min(Math.max(x, CAPTION_EDGE_INSET), innerWidth - CAPTION_EDGE_INSET);

export const ReferenceLine: Component<ReferenceLineProps> = (props) => {
	const ctx = useChart();
	const resolved = createMemo(() => ({
		orientation: props.orientation,
		value: toScaleValue(props.value),
	}));
	const strokeColor = () => props.color ?? props.stroke ?? "currentColor";
	// Plot-local pixels: x1=0 sits at the plot's left edge. `ScrubChart`'s
	// adapter (ScrubChartReferenceLine.tsx) supplies frame-absolute pixels
	// instead — the coordinate difference the two adapters exist to absorb.
	const horizontalMark = createMemo(() =>
		buildReferenceLine({
			y: ctx.yScale()(resolved().value),
			x1: 0,
			x2: ctx.innerWidth(),
			caption: props.label,
		}),
	);

	return (
		<g class={`sui-chart__ref${props.class ? ` ${props.class}` : ""}`}>
			<Show when={resolved().orientation === "horizontal"}>
				<line
					x1={horizontalMark().line.x1}
					x2={horizontalMark().line.x2}
					y1={horizontalMark().line.y1}
					y2={horizontalMark().line.y2}
					stroke={strokeColor()}
					stroke-width={props.strokeWidth ?? 1}
					stroke-dasharray={props.strokeDasharray ?? "4 4"}
					opacity={0.6}
				/>
				<Show when={horizontalMark().caption}>
					{(caption) => (
						<text
							class="sui-chart__ref-label"
							x={caption().x}
							y={caption().y}
							text-anchor={caption().textAnchor}
						>
							{caption().text}
						</text>
					)}
				</Show>
			</Show>
			<Show when={resolved().orientation === "vertical"}>
				{/* THE VERTICAL RULE IS SNAPPED TO A HALF PIXEL, and the horizontal
				    one above deliberately is not.

				    A vertical rule takes its x from the x-scale at a datum, so it
				    lands on a fraction nearly always, and a chart draws a ROW of
				    them, one per event. A 1px stroke centred on a fraction spreads
				    across two device pixels at partial coverage and paints grey,
				    while its neighbour nearer a half lands on one and paints sharp
				    — so a row of rules reads as two different colours. Centred on
				    `round(x) + 0.5` the stroke covers whole pixels instead, which
				    holds at any device pixel ratio and needs no renderer hint.

				    A horizontal rule is the threshold, usually ONE per chart. It
				    has no neighbour to be compared against, and snapping would move
				    it off its own value — the value the reader measures the data
				    against. Do not snap it for symmetry. */}
				<line
					y1={props.label ? CAPTION_RULE_CLEARANCE : 0}
					y2={ctx.innerHeight()}
					x1={crisp(ctx.xScale()(resolved().value))}
					x2={crisp(ctx.xScale()(resolved().value))}
					stroke={strokeColor()}
					stroke-width={props.strokeWidth ?? 1}
					stroke-dasharray={props.strokeDasharray ?? "4 4"}
					opacity={0.6}
				/>
				<Show when={props.label}>
					<text
						class="sui-chart__ref-label"
						x={clampCaptionX(ctx.xScale()(resolved().value), ctx.innerWidth())}
						y={CAPTION_BASELINE_Y}
						text-anchor="middle"
					>
						{props.label}
					</text>
				</Show>
			</Show>
		</g>
	);
};
