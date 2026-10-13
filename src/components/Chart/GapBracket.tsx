// lastReviewedAt: 2026-10-13
// lastReviewedBy: adlai.arnold
// GapBracket — Structural (Depth 1). SVG chart slot; composes no library components.
// ============================================
// The `Chart` ADAPTER for the dimension bracket, per
// docs/adr/0010-a-mark-is-a-core-plus-one-adapter-per-context.md.
// `buildGapBracket` (`./gapBracketGeometry.ts`) is the CORE. This adapter reads
// `useChart()` and converts `from`/`to` through `yScale` and `x` through
// `xScale`; with no `x` the stem stands in the right margin, `offset` px
// past the plot edge, which is where a chart says how far apart two lines
// END. Not `ReferenceLine`, which marks one value; this marks the distance
// between two.
//
// `label` draws the caption at the midpoint. A composite that places its
// gutter words through the label ladder passes no `label` and adds the
// caption as a `"right"` item at the midpoint value instead, so the ladder
// keeps it clear of the lines' own end captions.
// ============================================
import { type Component, createMemo, Show } from "solid-js";
import { useChart } from "./context";
import { buildGapBracket } from "./gapBracketGeometry";

export interface GapBracketProps {
	/** One end of the gap, in the y domain. */
	readonly from: number;
	/** The other end, in the y domain. Order does not matter. */
	readonly to: number;
	/** The stem's x in the x domain. Omitted, the stem stands past the plot's right edge. */
	readonly x?: number | Date;
	/** Px past `x` (or past the plot edge) the stem stands. Default `4`. */
	readonly offset?: number;
	/** Length of each end tick, toward the plot. Default `4`. */
	readonly tick?: number;
	/** A caption at the midpoint, right of the stem. */
	readonly label?: string;
	/** Stroke paint. Default `currentColor`. */
	readonly stroke?: string;
	readonly strokeWidth?: number;
	readonly class?: string;
}

const toScalar = (v: number | Date): number =>
	v instanceof Date ? v.getTime() : v;

/** The midpoint of two y-domain values: where a ladder caption for the gap sits. */
export const gapMidpoint = (from: number, to: number): number =>
	(from + to) / 2;

export const GapBracket: Component<GapBracketProps> = (props) => {
	const ctx = useChart();
	const mark = createMemo(() => {
		const base =
			props.x === undefined
				? ctx.innerWidth()
				: ctx.xScale()(toScalar(props.x));
		return buildGapBracket({
			x: base + (props.offset ?? 4),
			y1: ctx.yScale()(props.from),
			y2: ctx.yScale()(props.to),
			tick: props.tick,
		});
	});
	const stroke = () => props.stroke ?? "currentColor";
	return (
		<Show when={mark().extent > 0}>
			<g
				class={`sui-chart__gap-bracket${props.class ? ` ${props.class}` : ""}`}
				pointer-events="none"
			>
				<line
					class="sui-chart__gap-bracket-stem"
					x1={mark().stem.x1}
					x2={mark().stem.x2}
					y1={mark().stem.y1}
					y2={mark().stem.y2}
					stroke={stroke()}
					stroke-width={props.strokeWidth ?? 1}
				/>
				<line
					x1={mark().ticks[0].x1}
					x2={mark().ticks[0].x2}
					y1={mark().ticks[0].y1}
					y2={mark().ticks[0].y2}
					stroke={stroke()}
					stroke-width={props.strokeWidth ?? 1}
				/>
				<line
					x1={mark().ticks[1].x1}
					x2={mark().ticks[1].x2}
					y1={mark().ticks[1].y1}
					y2={mark().ticks[1].y2}
					stroke={stroke()}
					stroke-width={props.strokeWidth ?? 1}
				/>
				<Show when={props.label}>
					<text
						class="sui-chart__label sui-chart__gap-bracket-label"
						x={mark().caption.x}
						y={mark().caption.y}
						text-anchor={mark().caption.textAnchor}
					>
						{props.label}
					</text>
				</Show>
			</g>
		</Show>
	);
};
