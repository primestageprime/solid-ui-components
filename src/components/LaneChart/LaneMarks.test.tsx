import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { Chart } from "../Chart";
import { LANE_CHART_DATA } from "./fixtures";
import { laneChartHeight, laneRows } from "./laneGeometry";
import { LaneDotsPattern, LaneMarks } from "./LaneMarks";

describe("LaneMarks", () => {
	it("fills a late layer and a missing slot from the given pattern ids", () => {
		const rows = laneRows(LANE_CHART_DATA);
		const late = {
			...LANE_CHART_DATA,
			lanes: [
				{
					...LANE_CHART_DATA.lanes[0]!,
					slots: [
						{
							...LANE_CHART_DATA.lanes[0]!.slots[0]!,
							parts: [{ key: "p", bottom: 0, height: 10, kind: "late" as const }],
						},
						LANE_CHART_DATA.lanes[0]!.slots[1]!,
					],
				},
			],
		};
		const { container } = render(() => (
			<Chart width={600} height={200} xDomain={[0, 400]} yDomain={[0, 200]}>
				<defs>
					<LaneDotsPattern id="dots" />
				</defs>
				<LaneMarks
					data={late}
					rows={rows}
					height={laneChartHeight(rows)}
					hatchId="hatch"
					dotsId="dots"
				/>
			</Chart>
		));
		expect(container.querySelector('[data-key="p"]')?.getAttribute("fill")).toBe("url(#dots)");
		expect(
			container.querySelector(".sui-lane-chart__slot--missing")?.getAttribute("fill"),
		).toBe("url(#hatch)");
		expect(container.querySelectorAll(".sui-lane-chart__head")).toHaveLength(2);
	});

	it("outlines a late slot, keeps an unflagged slot open, and lets missing win", () => {
		const rows = laneRows(LANE_CHART_DATA);
		const [open, missing] = LANE_CHART_DATA.lanes[0]!.slots;
		const data = {
			...LANE_CHART_DATA,
			lanes: [
				{
					...LANE_CHART_DATA.lanes[0]!,
					slots: [
						{ ...open!, late: true },
						open!,
						{ ...missing!, late: true },
					],
				},
			],
		};
		const { container } = render(() => (
			<Chart width={600} height={200} xDomain={[0, 400]} yDomain={[0, 200]}>
				<LaneMarks
					data={data}
					rows={rows}
					height={laneChartHeight(rows)}
					hatchId="hatch"
					dotsId="dots"
				/>
			</Chart>
		));
		const states = [...container.querySelectorAll(".sui-lane-chart__slot")].map(
			(el) => el.getAttribute("class"),
		);
		expect(states).toEqual([
			"sui-lane-chart__slot sui-lane-chart__slot--late",
			"sui-lane-chart__slot sui-lane-chart__slot--open",
			"sui-lane-chart__slot sui-lane-chart__slot--missing",
		]);
	});
});
