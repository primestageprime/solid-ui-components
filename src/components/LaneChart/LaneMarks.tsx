// ============================================
// LaneMarks — Primitive (Depth 1). UNSTABLE: exported from `/unstable` only.
// SVG chart slot; composes no library components.
// Tags: shows:mark, shows:timeline, does:hover, data:schedule, role:slot
// Promoted 2026-10-26 on the owner's word, pending Peter's review.
//
// The marks of a LaneChart, drawn inside a `Chart` whose left margin is the
// name column: the month heads, the grid, a rule over each lane, the lane
// names, the Unmatched lane's month boxes, each config lane's slots (one
// layer per payment), catch-up links and payment bars. The data comes in
// already scaled (see `scaleLanes`). Colours come from LaneChart.css; the
// late layers and the missing slots fill from the two pattern ids the
// caller defines. A hover on a bar or a layer calls `onHover` with its key,
// and with null on leave. The mark whose key is `hotKey` gets an accent edge.
// ============================================
import { type Component, For } from "solid-js";
import "./LaneChart.css";
import {
	LANE_HEAD_HEIGHT,
	LANE_NAME_WIDTH,
	type LaneRow,
	laneY,
} from "./laneGeometry";
import type { LaneBar, LaneChartData } from "./types";

export interface LaneMarksProps {
	/** The scaled data. */
	readonly data: LaneChartData;
	/** The Unmatched row first, then one row per lane. */
	readonly rows: readonly LaneRow[];
	/** The chart height in px. */
	readonly height: number;
	/** The id of the pattern that fills a missing slot. */
	readonly hatchId: string;
	/** The id of the pattern that fills a late layer. */
	readonly dotsId: string;
	readonly hotKey?: string;
	readonly onHover?: (key: string | null) => void;
}

const hotClass = (on: boolean): string => (on ? " sui-lane-chart__hot" : "");

const Bars: Component<{
	row: LaneRow;
	bars: readonly LaneBar[];
	hotKey?: string;
	onHover?: (key: string | null) => void;
}> = (props) => (
	<For each={props.bars}>
		{(b) => (
			<rect
				class={`sui-lane-chart__bar sui-lane-chart__bar--${b.kind}${hotClass(props.hotKey === b.key)}`}
				data-key={b.key}
				x={b.x}
				y={laneY(props.row, b.bottom, b.height)}
				width={b.width}
				height={Math.max(1, b.height)}
				onMouseEnter={() => props.onHover?.(b.key)}
				onMouseLeave={() => props.onHover?.(null)}
			/>
		)}
	</For>
);

const LaneLabel: Component<{
	row: LaneRow;
	name: string;
	sub: string;
	warn?: boolean;
}> = (props) => (
	<>
		<text
			class="sui-lane-chart__name"
			x={-LANE_NAME_WIDTH + 4}
			y={props.row.top + 16}
		>
			{props.name}
		</text>
		<text
			class={`sui-lane-chart__sub${props.warn ? " sui-lane-chart__sub--warn" : ""}`}
			x={-LANE_NAME_WIDTH + 4}
			y={props.row.top + 32}
		>
			{props.sub}
		</text>
	</>
);

export const LaneMarks: Component<LaneMarksProps> = (props) => {
	const unRow = (): LaneRow =>
		props.rows[0] ?? { top: LANE_HEAD_HEIGHT, height: 0 };
	const laneRow = (i: number): LaneRow =>
		props.rows[i + 1] ?? { top: 0, height: 0 };
	return (
		<g class="sui-lane-chart">
			<For each={props.data.heads}>
				{(h) => (
					<text
						class={`sui-lane-chart__head${h.fresh ? " sui-lane-chart__head--fresh" : ""}`}
						x={h.x + h.width / 2}
						y={LANE_HEAD_HEIGHT - 6}
						text-anchor="middle"
					>
						{h.label}
					</text>
				)}
			</For>
			<For each={props.data.grid}>
				{(g) => (
					<line
						class={`sui-lane-chart__grid${g.strong ? " sui-lane-chart__grid--strong" : ""}`}
						x1={g.x}
						x2={g.x}
						y1={LANE_HEAD_HEIGHT}
						y2={props.height}
					/>
				)}
			</For>
			<For each={props.rows}>
				{(r) => (
					<line
						class="sui-lane-chart__rule"
						x1={-LANE_NAME_WIDTH}
						x2={props.data.trackWidth}
						y1={r.top}
						y2={r.top}
					/>
				)}
			</For>
			<LaneLabel
				row={unRow()}
				name="Unmatched"
				sub={props.data.unmatched.total}
				warn
			/>
			<For each={props.data.unmatched.boxes}>
				{(b) => (
					<rect
						class="sui-lane-chart__box"
						x={b.x}
						y={laneY(unRow(), b.bottom, b.height)}
						width={b.width}
						height={b.height}
						rx={4}
					/>
				)}
			</For>
			<Bars
				row={unRow()}
				bars={props.data.unmatched.bars}
				hotKey={props.hotKey}
				onHover={props.onHover}
			/>
			<For each={props.data.lanes}>
				{(l, i) => (
					<g>
						<LaneLabel row={laneRow(i())} name={l.name} sub={l.sub} />
						<For each={l.slots}>
							{(s) => (
								<g>
									<rect
										class={`sui-lane-chart__slot sui-lane-chart__slot--${s.missing ? "missing" : "open"}`}
										x={s.x}
										y={laneY(laneRow(i()), s.bottom, s.height)}
										width={s.width}
										height={s.height}
										rx={3}
										fill={s.missing ? `url(#${props.hatchId})` : undefined}
									>
										<title>{s.title}</title>
									</rect>
									<For each={s.parts}>
										{(p) => (
											<rect
												class={`sui-lane-chart__part sui-lane-chart__part--${p.kind}${hotClass(props.hotKey === p.key)}`}
												data-key={p.key}
												x={s.x}
												y={laneY(laneRow(i()), s.bottom + p.bottom, p.height)}
												width={s.width}
												height={p.height}
												fill={
													p.kind === "late" ? `url(#${props.dotsId})` : undefined
												}
												onMouseEnter={() => props.onHover?.(p.key)}
												onMouseLeave={() => props.onHover?.(null)}
											/>
										)}
									</For>
								</g>
							)}
						</For>
						<For each={l.links}>
							{(k) => (
								<line
									class="sui-lane-chart__link"
									x1={k.x}
									x2={k.x + k.width}
									y1={laneY(laneRow(i()), k.bottom, 0)}
									y2={laneY(laneRow(i()), k.bottom, 0)}
								/>
							)}
						</For>
						<Bars
							row={laneRow(i())}
							bars={l.bars}
							hotKey={props.hotKey}
							onHover={props.onHover}
						/>
					</g>
				)}
			</For>
		</g>
	);
};

/** The pattern of a late layer: a faint ground with a dot every 4px. */
export const LaneDotsPattern: Component<{ id: string }> = (props) => (
	<pattern id={props.id} width={4} height={4} patternUnits="userSpaceOnUse">
		<rect class="sui-lane-chart__dots-ground" width={4} height={4} />
		<circle class="sui-lane-chart__dots-dot" cx={2} cy={2} r={0.9} />
	</pattern>
);
