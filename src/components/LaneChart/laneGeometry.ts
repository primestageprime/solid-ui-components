// LaneChart geometry — pure. Scales the track to the panel and stacks the
// lanes under the month heads.
import { filter, flatMap, map, sum } from "../../fn";
import type {
	Lane,
	LaneBar,
	LaneBox,
	LaneChartData,
	LaneGridLine,
	LaneLink,
	LaneMonthHead,
	LaneSlot,
	LaneUnmatched,
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

/** The characters of a lane name that fit one line of the name column: 13px
 *  text, about 7px a character, 4px padding each side. */
export const LANE_NAME_CHARS = Math.floor((LANE_NAME_WIDTH - 8) / 7);
/** The baseline of a lane's first name line below the row top, in px. */
export const LANE_NAME_TOP = 16;
/** The step between two lines of the lane label, in px. */
export const LANE_LINE_HEIGHT = 16;
/** The room under the subline, in px. */
const LANE_LABEL_PAD = 8;

/** A word cut into pieces of at most `max` characters. */
const wordPieces = (w: string, max: number): string[] =>
	w.length <= max ? [w] : [w.slice(0, max), ...wordPieces(w.slice(max), max)];

/** A lane name broken into lines of at most `max` characters, at spaces. A
 *  word longer than a line is cut into pieces of `max`. */
export const laneNameLines = (
	name: string,
	max: number = LANE_NAME_CHARS,
): string[] => {
	const words = flatMap(
		(w: string) => wordPieces(w, max),
		filter((w: string) => w.length > 0, name.split(/\s+/)),
	);
	const lines: string[] = [];
	for (const w of words) {
		const last = lines[lines.length - 1];
		if (last !== undefined && last.length + 1 + w.length <= max)
			lines[lines.length - 1] = `${last} ${w}`;
		else lines.push(w);
	}
	return lines;
};

/** The height a label of `lines` name lines and one subline needs, in px. */
export const laneLabelHeight = (lines: number): number =>
	LANE_NAME_TOP + Math.max(1, lines) * LANE_LINE_HEIGHT + LANE_LABEL_PAD;

/** Whether the Unmatched lane draws: only while it holds a payment. An empty
 *  one ($0, everything matched) takes no row, so the config lanes move up. */
export const showsUnmatched = (u: LaneUnmatched): boolean =>
	u.bars.length > 0 || u.boxes.length > 0;

/** The rows: the Unmatched lane first (0 high when it does not draw), then one per config
 *  lane, each at least as tall as its wrapped label. */
export const laneRows = (c: LaneChartData): LaneRow[] => {
	const heights = [
		showsUnmatched(c.unmatched) ? c.unmatched.height : 0,
		...map(
			(l: Lane) =>
				Math.max(l.height, laneLabelHeight(laneNameLines(l.name).length)),
			c.lanes,
		),
	];
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
