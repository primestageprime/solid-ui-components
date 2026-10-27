// LaneChart geometry — pure. Scales the track to the panel and stacks the
// lanes under the month heads.
import { map, sum } from "../../fn";
import type {
	Lane,
	LaneBar,
	LaneBox,
	LaneChartData,
	LaneGridLine,
	LaneLink,
	LaneMonthHead,
	LaneSlot,
} from "./types";

/** The width of the lane name column, in px. */
export const LANE_NAME_WIDTH = 150;
/** The height of the month head row, in px. */
export const LANE_HEAD_HEIGHT = 20;
/** The space right of the track, in px. */
export const LANE_RIGHT = 8;

/** One lane's top and height in px. */
export interface LaneRow {
	readonly top: number;
	readonly height: number;
}

/** The track scale that fits `boxWidth`. 1 when either width is unknown. */
export const laneScale = (trackWidth: number, boxWidth: number): number => {
	const room = boxWidth - LANE_NAME_WIDTH - LANE_RIGHT;
	return room > 0 && trackWidth > 0 ? room / trackWidth : 1;
};

/** The data with every x and track width times `k`. A bar keeps its px width. */
export const scaleLanes = (c: LaneChartData, k: number): LaneChartData => {
	const bar = (b: LaneBar): LaneBar => ({ ...b, x: b.x * k });
	const span = <T extends { x: number; width: number }>(s: T): T => ({
		...s,
		x: s.x * k,
		width: s.width * k,
	});
	return {
		...c,
		trackWidth: c.trackWidth * k,
		heads: map((h: LaneMonthHead) => span(h), c.heads),
		grid: map((g: LaneGridLine) => ({ ...g, x: g.x * k }), c.grid),
		unmatched: {
			...c.unmatched,
			boxes: map((b: LaneBox) => span(b), c.unmatched.boxes),
			bars: map(bar, c.unmatched.bars),
		},
		lanes: map(
			(l: Lane): Lane => ({
				...l,
				slots: map((s: LaneSlot) => span(s), l.slots),
				bars: map(bar, l.bars),
				links: map((s: LaneLink) => span(s), l.links),
			}),
			c.lanes,
		),
	};
};

/** The rows: the Unmatched lane first, then one per config lane. */
export const laneRows = (c: LaneChartData): LaneRow[] => {
	const heights = [c.unmatched.height, ...map((l: Lane) => l.height, c.lanes)];
	return map(
		(height: number, i: number): LaneRow => ({
			top: LANE_HEAD_HEIGHT + sum(heights.slice(0, i)),
			height,
		}),
		heights,
	);
};

/** The full chart height in px. */
export const laneChartHeight = (rows: readonly LaneRow[]): number => {
	const last = rows[rows.length - 1];
	return last ? last.top + last.height : LANE_HEAD_HEIGHT;
};

/** The y of the top of a mark at `bottom` with height `h` inside `row`. */
export const laneY = (row: LaneRow, bottom: number, h: number): number =>
	row.top + row.height - bottom - h;
