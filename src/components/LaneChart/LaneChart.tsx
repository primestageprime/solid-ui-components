// ============================================
// LaneChart — Composite (Depth 2). UNSTABLE: exported from `/unstable` only.
// Tags: shows:chart, shows:timeline, does:hover, data:schedule, role:panel
// Promoted 2026-10-26 on the owner's word, pending Peter's review.
//
// Payments against configs: one lane per config under an Unmatched lane. A
// slot is a lozenge: its width is the slot's window, its height grows with
// the amount. Its fill stacks one layer per payment: on time is green, late
// is yellow dots. A missing slot is red hatch. A bar stands at each
// payment's arrival day. A dashed line links a catch-up payment to its slot.
// The Unmatched lane boxes each month that holds unmatched payments.
//
// No SUI mark draws this: SlotTrack has one height per track and three
// states, SpanLanes packs rows with one bar height, TickSeries has one tick
// length. So LaneMarks (Depth 1) draws the raw SVG. The consumer computes
// every position (see ./types.ts for the units); this component only fits
// the track to its panel. It measures the panel on mount and on resize
// (observeSize) and scales the x positions, so every month shows.
//
// No CSS of its own: LaneChart.css belongs to LaneMarks. Composes Chart
// (Depth 1), HatchPattern (Depth 1) and LaneMarks (Depth 1).
// ============================================
import {
	type Component,
	createMemo,
	createSignal,
	createUniqueId,
	onCleanup,
	onMount,
} from "solid-js";
import { observeSize } from "../../internal/dom/observeSize";
import { Chart } from "../Chart";
import { HatchPattern } from "../SvgMarks";
import {
	LANE_NAME_WIDTH,
	LANE_RIGHT,
	laneChartHeight,
	laneRows,
	laneScale,
	scaleLanes,
} from "./laneGeometry";
import { LaneDotsPattern, LaneMarks } from "./LaneMarks";
import type { LaneChartData } from "./types";

export interface LaneChartProps {
	readonly data: LaneChartData;
	/** The key of the bar or layer to edge in accent (the hovered payment). */
	readonly hotKey?: string;
	/** Called with a mark's key on hover, and with null on leave. */
	readonly onHover?: (key: string | null) => void;
}

export const LaneChart: Component<LaneChartProps> = (props) => {
	const hatchId = createUniqueId();
	const dotsId = createUniqueId();
	// A class names this chart's box: Chart takes no ref and no id.
	const boxClass = `sui-lane-chart-box-${createUniqueId().replace(/[^\w-]/g, "-")}`;
	const [boxWidth, setBoxWidth] = createSignal(0);
	onMount(() => {
		const box = document.querySelector(`.${boxClass}`);
		if (!box) return;
		const first = box.getBoundingClientRect().width;
		if (first > 0) setBoxWidth(first);
		onCleanup(
			observeSize(box, (size) => size.width > 0 && setBoxWidth(size.width)),
		);
	});
	const data = createMemo(() =>
		scaleLanes(props.data, laneScale(props.data.trackWidth, boxWidth())),
	);
	const rows = createMemo(() => laneRows(data()));
	const height = () => laneChartHeight(rows());
	return (
		<Chart
			class={boxClass}
			responsive
			width={LANE_NAME_WIDTH + data().trackWidth + LANE_RIGHT}
			height={height()}
			xDomain={[0, data().trackWidth]}
			yDomain={[0, height()]}
			margin={{ top: 0, right: LANE_RIGHT, bottom: 0, left: LANE_NAME_WIDTH }}
		>
			<defs>
				<HatchPattern id={hatchId} color="var(--sui-danger)" />
				<LaneDotsPattern id={dotsId} />
			</defs>
			<LaneMarks
				data={data()}
				rows={rows()}
				height={height()}
				hatchId={hatchId}
				dotsId={dotsId}
				hotKey={props.hotKey}
				onHover={props.onHover}
			/>
		</Chart>
	);
};
