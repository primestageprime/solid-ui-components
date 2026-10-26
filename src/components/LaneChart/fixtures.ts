// Test and showcase data for LaneChart: two months, one config lane. Invented amounts.
import type { LaneChartData } from "./types";

export const LANE_CHART_DATA: LaneChartData = {
	trackWidth: 400,
	heads: [
		{ x: 0, width: 200, label: "Jan", fresh: false },
		{ x: 200, width: 200, label: "Feb", fresh: true },
	],
	grid: [
		{ x: 0, strong: true },
		{ x: 200, strong: false },
	],
	unmatched: {
		height: 40,
		total: "$120",
		boxes: [{ x: 210, width: 180, bottom: 2, height: 30 }],
		bars: [{ key: "u0", x: 250, width: 3, bottom: 2, height: 20, kind: "unmatched" }],
	},
	lanes: [
		{
			name: "Rent",
			sub: "$2,000 · 1st",
			height: 48,
			slots: [
				{
					x: 10,
					width: 40,
					bottom: 4,
					height: 30,
					title: "Jan 1: paid",
					missing: false,
					parts: [{ key: "r0p0", bottom: 0, height: 30, kind: "ontime" }],
				},
				{
					x: 210,
					width: 40,
					bottom: 4,
					height: 30,
					title: "Feb 1: missing",
					missing: true,
					parts: [],
				},
			],
			bars: [{ key: "r0b0", x: 20, width: 3, bottom: 4, height: 30, kind: "ontime" }],
			links: [],
		},
	],
};
