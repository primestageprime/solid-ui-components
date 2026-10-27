import { describe, expect, it } from "vitest";
import { LANE_CHART_DATA } from "./fixtures";
import {
	LANE_HEAD_HEIGHT,
	LANE_NAME_WIDTH,
	LANE_RIGHT,
	laneChartHeight,
	laneRows,
	laneScale,
	laneY,
	scaleLanes,
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
});
