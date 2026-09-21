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
	 */
	step?: number;
	/** Y value to stack against. Default 0. */
	baseline?: number;
	/** Default fill when a segment doesn't specify one. */
	fill?: string;
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
	const step = () => props.step ?? 1;
	const baseline = () => props.baseline ?? 0;
	return (
		<g
			class={`sui-chart__bars${props.class ? ` ${props.class}` : ""}`}
			clip-path={ctx.clip.plotPathUrl()}
		>
			<For each={props.data}>
				{(d, i) => {
					const xs = ctx.xScale();
					const ys = ctx.yScale();
					const center = props.x(d, i());
					// Slot pixel width: distance to the next-integer center in data space.
					const slotPx =
						Math.abs(xs(center + step()) - xs(center)) ||
						(xs.range[1] - xs.range[0]) / Math.max(1, props.data.length);
					const bw = slotPx * bandWidth();
					const xPx = xs(center) - bw / 2;
					const _baseY = ys(baseline());

					const segs: readonly BarSegment[] = props.segments
						? props.segments(d)
						: [{ value: props.value?.(d) ?? 0 }];

					let posCursor = baseline();
					let negCursor = baseline();

					return (
						<For each={segs}>
							{(seg, si) => {
								if (seg.value === 0) return null;
								const top = seg.value > 0 ? posCursor + seg.value : negCursor;
								const bottom =
									seg.value > 0 ? posCursor : negCursor + seg.value;
								if (seg.value > 0) posCursor += seg.value;
								else negCursor += seg.value;
								const yPx = ys(top);
								const hPx = Math.abs(ys(bottom) - ys(top));
								const interactive = () =>
									props.onBarClick != null || props.onSegmentClick != null;
								const click = (e: MouseEvent) => {
									e.stopPropagation();
									props.onSegmentClick?.(d, seg, si());
									props.onBarClick?.(d, i());
								};
								return (
									// biome-ignore lint/a11y/noStaticElementInteractions: interactive role/tabIndex + Enter/Space keyboard parity are wired dynamically when a click handler is provided; the analyzer can't see the conditional role
									<rect
										class="sui-chart__bar"
										classList={{ "sui-chart__bar--interactive": interactive() }}
										role={interactive() ? "button" : undefined}
										tabIndex={interactive() ? 0 : undefined}
										x={xPx}
										y={yPx}
										width={bw}
										height={hPx}
										fill={seg.fill ?? props.fill}
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
					);
				}}
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
				<line
					y1={props.label ? CAPTION_RULE_CLEARANCE : 0}
					y2={ctx.innerHeight()}
					x1={ctx.xScale()(resolved().value)}
					x2={ctx.xScale()(resolved().value)}
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
