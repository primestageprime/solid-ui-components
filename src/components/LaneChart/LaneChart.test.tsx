import { fireEvent, render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { LANE_CHART_DATA } from "./fixtures";
import { LaneChart } from "./LaneChart";

describe("LaneChart", () => {
	it("draws the lanes, the slots and the bars, and edges the hot mark", () => {
		const { container, getByText } = render(() => (
			<LaneChart data={LANE_CHART_DATA} hotKey="r0b0" />
		));
		expect(getByText("Unmatched")).toBeTruthy();
		expect(getByText("Rent")).toBeTruthy();
		expect(container.querySelectorAll(".sui-lane-chart__slot")).toHaveLength(2);
		expect(container.querySelectorAll(".sui-lane-chart__slot--missing")).toHaveLength(1);
		const hot = container.querySelector('[data-key="r0b0"]');
		expect(hot?.classList.contains("sui-lane-chart__hot")).toBe(true);
	});

	it("reports the hovered mark's key, and null on leave", () => {
		const seen: (string | null)[] = [];
		const { container } = render(() => (
			<LaneChart data={LANE_CHART_DATA} onHover={(k) => seen.push(k)} />
		));
		const part = container.querySelector('[data-key="r0p0"]');
		if (!part) throw new Error("no layer");
		fireEvent.mouseEnter(part);
		fireEvent.mouseLeave(part);
		expect(seen).toEqual(["r0p0", null]);
	});
});
