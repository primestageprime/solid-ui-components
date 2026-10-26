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
// position (import-kit/adapt.ts reads them); this file only draws.
import { type Component, createUniqueId, For } from "solid-js";
import { Chart } from "../../../../src/components/Chart";
import { HatchPattern } from "../../../../src/components/SvgMarks";
import type { MpBar, MpChart } from "./types";

const NAME_W = 150;
const HEAD_H = 20;

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
	const dotsId = createUniqueId();
	// Lane tops: the Unmatched lane first, then one lane per config.
	const rows = (): Row[] => {
		const hs = [props.chart.unmatched.h, ...props.chart.lanes.map((l) => l.h)];
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
			width={NAME_W + props.chart.trackW + 8}
			height={height()}
			xDomain={[0, props.chart.trackW]}
			yDomain={[0, height()]}
			margin={{ top: 0, right: 8, bottom: 0, left: NAME_W }}
		>
			<defs>
				<HatchPattern id={hatchId} color="var(--sui-danger)" />
				<pattern id={dotsId} width={4} height={4} patternUnits="userSpaceOnUse">
					<rect width={4} height={4} fill="var(--sui-warning)" opacity={0.08} />
					<circle cx={2} cy={2} r={0.9} fill="var(--sui-warning)" />
				</pattern>
			</defs>
			<For each={props.chart.heads}>
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
			<For each={props.chart.grid}>
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
						x2={props.chart.trackW}
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
				{props.chart.unmatched.total}
			</text>
			<For each={props.chart.unmatched.boxes}>
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
			<Bars row={unRow()} bars={props.chart.unmatched.bars} />
			{/* One lane per config */}
			<For each={props.chart.lanes}>
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
