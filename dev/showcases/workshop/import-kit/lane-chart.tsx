// LaneChart — src candidate (LaneChart) — needs Peter's yes.
//
// The Manual step's payments-against-configs chart: one lane per config plus
// an Unmatched lane on top. A slot is a lozenge: its width is the slot's
// window and its height grows with the amount. Its fill stacks one layer per
// payment: on time is green, late is dotted yellow. A missing slot is red
// hatch. A 3px bar stands at each payment's arrival day, its height grows with
// the amount. A dashed line links a catch-up payment to its slot. The
// Unmatched lane boxes each month that holds unmatched payments.
//
// No SUI mark draws this (SlotTrack has one height per track and three states;
// SpanLanes packs rows with one bar height; TickSeries has one tick length),
// so this one bench file holds raw SVG inside Chart. The board computes every
// position (import-kit/adapt.ts reads them); this file only draws. The chart
// fills its panel: it measures the panel width on mount (and on resize) and
// scales the board's x positions to it, so every month shows.
import {
	type Component,
	createSignal,
	createUniqueId,
	For,
	onCleanup,
	onMount,
} from "solid-js";
import { Chart } from "../../../../src/components/Chart";
import { HatchPattern } from "../../../../src/components/SvgMarks";
import type { MpBar, MpChart } from "./types";

const NAME_W = 150;
const HEAD_H = 20;
const RIGHT = 8;
/** Width before the first measurement: the board's own track. */
const FALLBACK_W = 0;

/** The chart with every x and width times `k`. A payment bar keeps its 3px width. */
const scaled = (c: MpChart, k: number): MpChart => {
	const bar = (b: MpBar): MpBar => ({ ...b, x: b.x * k });
	return {
		...c,
		trackW: c.trackW * k,
		heads: c.heads.map((h) => ({ ...h, x: h.x * k, w: h.w * k })),
		grid: c.grid.map((g) => ({ ...g, x: g.x * k })),
		unmatched: {
			...c.unmatched,
			boxes: c.unmatched.boxes.map((b) => ({ ...b, x: b.x * k, w: b.w * k })),
			bars: c.unmatched.bars.map(bar),
		},
		lanes: c.lanes.map((l) => ({
			...l,
			slots: l.slots.map((sl) => ({ ...sl, x: sl.x * k, w: sl.w * k })),
			bars: l.bars.map(bar),
			links: l.links.map((k2) => ({ ...k2, x: k2.x * k, w: k2.w * k })),
		})),
	};
};

const KIND_FILL = {
	ontime: "var(--sui-success)",
	late: "var(--sui-warning)",
	unmatched: "var(--sui-warning)",
} as const;

interface Row {
	readonly top: number;
	readonly h: number;
}

/** One lane's y offsets: a mark at `bottom` with height `h` inside a lane at `row`. */
const yOf = (row: Row, bottom: number, h: number): number =>
	row.top + row.h - bottom - h;

const Bars: Component<{ row: Row; bars: readonly MpBar[] }> = (props) => (
	<For each={props.bars}>
		{(b) => (
			<rect
				x={b.x}
				y={yOf(props.row, b.bottom, b.h)}
				width={b.w}
				height={Math.max(1, b.h)}
				fill={KIND_FILL[b.kind]}
				stroke={b.hot ? "var(--sui-accent)" : "none"}
				stroke-width={b.hot ? 1.5 : 0}
				onMouseEnter={b.enter}
				onMouseLeave={b.leave}
			/>
		)}
	</For>
);

export interface LaneChartProps {
	readonly chart: MpChart;
}

export const LaneChart: Component<LaneChartProps> = (props) => {
	const hatchId = createUniqueId();
	// A class names this chart's box: Chart takes no ref and no id.
	const boxClass = `lane-chart-${createUniqueId().replace(/[^\w-]/g, "-")}`;
	// The panel width. The Chart is responsive: its box is 100% of the panel
	// whatever the svg size. The svg then gets that width, so the viewBox stays
	// 1:1 with the screen.
	const [boxW, setBoxW] = createSignal(FALLBACK_W);
	onMount(() => {
		const box = document.querySelector(`.${boxClass}`);
		if (!box) return;
		setBoxW(box.getBoundingClientRect().width);
		if (typeof ResizeObserver === "undefined") return;
		const ro = new ResizeObserver(() => setBoxW(box.getBoundingClientRect().width));
		ro.observe(box);
		onCleanup(() => ro.disconnect());
	});
	const k = () => {
		const track = props.chart.trackW;
		const room = boxW() - NAME_W - RIGHT;
		return room > 0 && track > 0 ? room / track : 1;
	};
	const chart = () => scaled(props.chart, k());
	const dotsId = createUniqueId();
	// Lane tops: the Unmatched lane first, then one lane per config.
	const rows = (): Row[] => {
		const hs = [chart().unmatched.h, ...chart().lanes.map((l) => l.h)];
		return hs.map((h, i) => ({
			top: HEAD_H + hs.slice(0, i).reduce((a, v) => a + v, 0),
			h,
		}));
	};
	const height = () => {
		const last = rows().at(-1);
		return last ? last.top + last.h : HEAD_H;
	};
	const unRow = (): Row => rows()[0] ?? { top: HEAD_H, h: 0 };
	const laneRow = (i: number): Row => rows()[i + 1] ?? { top: 0, h: 0 };
	return (
		<Chart
			class={boxClass}
			responsive
			width={NAME_W + chart().trackW + RIGHT}
			height={height()}
			xDomain={[0, chart().trackW]}
			yDomain={[0, height()]}
			margin={{ top: 0, right: RIGHT, bottom: 0, left: NAME_W }}
		>
			<defs>
				<HatchPattern id={hatchId} color="var(--sui-danger)" />
				<pattern id={dotsId} width={4} height={4} patternUnits="userSpaceOnUse">
					<rect width={4} height={4} fill="var(--sui-warning)" opacity={0.08} />
					<circle cx={2} cy={2} r={0.9} fill="var(--sui-warning)" />
				</pattern>
			</defs>
			<For each={chart().heads}>
				{(h) => (
					<text
						x={h.x + h.w / 2}
						y={HEAD_H - 6}
						text-anchor="middle"
						font-size="11"
						font-weight="700"
						fill={h.fresh ? "var(--sui-accent)" : "var(--sui-text-muted)"}
					>
						{h.label}
					</text>
				)}
			</For>
			<For each={chart().grid}>
				{(g) => (
					<line
						x1={g.x}
						x2={g.x}
						y1={HEAD_H}
						y2={height()}
						stroke={g.strong ? "var(--sui-border-bright)" : "var(--sui-border)"}
					/>
				)}
			</For>
			<For each={rows()}>
				{(r) => (
					<line
						x1={-NAME_W}
						x2={chart().trackW}
						y1={r.top}
						y2={r.top}
						stroke="var(--sui-border)"
					/>
				)}
			</For>
			{/* Unmatched lane */}
			<text
				x={-NAME_W + 4}
				y={unRow().top + 16}
				font-size="13"
				fill="var(--sui-text-secondary)"
			>
				Unmatched
			</text>
			<text
				x={-NAME_W + 4}
				y={unRow().top + 32}
				font-size="11"
				font-family="var(--sui-font-mono, monospace)"
				fill="var(--sui-warning)"
			>
				{chart().unmatched.total}
			</text>
			<For each={chart().unmatched.boxes}>
				{(b) => (
					<rect
						x={b.x}
						y={yOf(unRow(), b.bottom, b.h)}
						width={b.w}
						height={b.h}
						rx={4}
						fill="none"
						stroke="var(--sui-warning)"
						stroke-dasharray="3 3"
					/>
				)}
			</For>
			<Bars row={unRow()} bars={chart().unmatched.bars} />
			{/* One lane per config */}
			<For each={chart().lanes}>
				{(l, i) => (
					<g>
						<text
							x={-NAME_W + 4}
							y={laneRow(i()).top + 16}
							font-size="13"
							fill="var(--sui-text-secondary)"
						>
							{l.name}
						</text>
						<text
							x={-NAME_W + 4}
							y={laneRow(i()).top + 32}
							font-size="11"
							font-family="var(--sui-font-mono, monospace)"
							fill="var(--sui-text-muted)"
						>
							{l.sub}
						</text>
						<For each={l.slots}>
							{(s) => (
								<g>
									<title>{s.title}</title>
									<rect
										x={s.x}
										y={yOf(laneRow(i()), s.bottom, s.h)}
										width={s.w}
										height={s.h}
										rx={3}
										fill={s.missing ? `url(#${hatchId})` : "none"}
										stroke={
											s.missing ? "var(--sui-danger)" : "var(--sui-warning)"
										}
										stroke-opacity={0.6}
									/>
									<For each={s.parts}>
										{(p) => (
											<rect
												x={s.x}
												y={yOf(laneRow(i()), s.bottom + p.bottom, p.h)}
												width={s.w}
												height={p.h}
												fill={
													p.kind === "ontime"
														? "var(--sui-success)"
														: `url(#${dotsId})`
												}
												fill-opacity={p.kind === "ontime" ? 0.3 : 1}
												stroke={p.hot ? "var(--sui-accent)" : "none"}
												stroke-width={p.hot ? 1.5 : 0}
												onMouseEnter={p.enter}
												onMouseLeave={p.leave}
											/>
										)}
									</For>
								</g>
							)}
						</For>
						<For each={l.links}>
							{(k) => (
								<line
									x1={k.x}
									x2={k.x + k.w}
									y1={yOf(laneRow(i()), k.bottom, 0)}
									y2={yOf(laneRow(i()), k.bottom, 0)}
									stroke="var(--sui-warning)"
									stroke-dasharray="3 3"
								/>
							)}
						</For>
						<Bars row={laneRow(i())} bars={l.bars} />
					</g>
				)}
			</For>
		</Chart>
	);
};
