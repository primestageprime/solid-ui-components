import { describe, expect, it } from "vitest";
import { LANE_CHART_DATA } from "./fixtures";
import {
	LANE_HEAD_HEIGHT,
	LANE_NAME_WIDTH,
	LANE_RIGHT,
	laneChartHeight,
	laneLabelHeight,
	laneNameLines,
	laneRows,
	laneScale,
	laneY,
	scaleLanes,
	showsUnmatched,
} from "./laneGeometry";

describe("lane geometry", () => {
	it("fits the track to the box, and keeps 1 when the box is unknown", () => {
		expect(laneScale(400, LANE_NAME_WIDTH + LANE_RIGHT + 800)).toBe(2);
		expect(laneScale(400, 0)).toBe(1);
	});

	it("scales x and widths but keeps a bar's px width", () => {
		const d = scaleLanes(LANE_CHART_DATA, 2);
		expect(d.trackWidth).toBe(800);
		expect(d.lanes[0]?.slots[1]?.x).toBe(420);
		expect(d.lanes[0]?.slots[1]?.width).toBe(80);
		expect(d.lanes[0]?.bars[0]?.x).toBe(40);
		expect(d.lanes[0]?.bars[0]?.width).toBe(3);
	});

	it("stacks the Unmatched lane, then each config lane, under the heads", () => {
		const rows = laneRows(LANE_CHART_DATA);
		expect(rows).toEqual([
			{ top: LANE_HEAD_HEIGHT, height: 40 },
			{ top: LANE_HEAD_HEIGHT + 40, height: 48 },
		]);
		expect(laneChartHeight(rows)).toBe(LANE_HEAD_HEIGHT + 88);
		expect(laneY({ top: 20, height: 40 }, 2, 10)).toBe(48);
	});

	it("leaves out an empty Unmatched lane ($0): the config lanes start under the heads", () => {
		const empty = {
			...LANE_CHART_DATA,
			unmatched: { height: 40, total: "$0", boxes: [], bars: [] },
		};
		expect(showsUnmatched(LANE_CHART_DATA.unmatched)).toBe(true);
		expect(showsUnmatched(empty.unmatched)).toBe(false);
		const rows = laneRows(empty);
		expect(rows).toEqual([
			{ top: LANE_HEAD_HEIGHT, height: 0 },
			{ top: LANE_HEAD_HEIGHT, height: 48 },
		]);
		expect(laneChartHeight(rows)).toBe(LANE_HEAD_HEIGHT + 48);
	});

	it("wraps a lane name at spaces within the name column, and cuts a word too long for a line", () => {
		expect(laneNameLines("Cleaning Supplies - Costco Business")).toEqual([
			"Cleaning Supplies -",
			"Costco Business",
		]);
		expect(laneNameLines("Rent")).toEqual(["Rent"]);
		expect(laneNameLines("abcdefghij", 4)).toEqual(["abcd", "efgh", "ij"]);
		expect(laneLabelHeight(1)).toBe(40);
		expect(laneLabelHeight(2)).toBe(56);
	});

	it("grows a lane's row to fit its wrapped name", () => {
		const long = {
			...LANE_CHART_DATA,
			lanes: [
				{
					...LANE_CHART_DATA.lanes[0]!,
					name: "Cleaning Supplies - Costco Business",
					height: 40,
				},
			],
		};
		expect(laneRows(long)[1]).toEqual({ top: LANE_HEAD_HEIGHT + 40, height: 56 });
	});
});
