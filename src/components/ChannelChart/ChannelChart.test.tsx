import { fireEvent, render } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import { installRects, rectOf } from "../../test-utils/fakeRects";
import {
	CHANNEL_CHART_FALLBACK_SIZE,
	ChannelChart as ChannelChartBase,
} from "./ChannelChart";
import { channelModel } from "./channelGeometry";
import { formatKiloCents, STAX_PERIODS } from "./fixtures";
import { ChannelChart, ChannelDivergenceChart } from "./variants";

const common = {
	formatValue: formatKiloCents,
	ariaLabel: "STAX cumulative channel",
};

const bars = (c: HTMLElement) =>
	c.querySelectorAll<SVGRectElement>(".sui-chart__bar");

describe("ChannelDivergenceChart", () => {
	it("renders as one img with both plots on one period axis", () => {
		const { container, getByRole } = render(() => (
			<ChannelDivergenceChart periods={STAX_PERIODS} {...common} />
		));
		expect(getByRole("img").getAttribute("aria-label")).toBe(
			"STAX cumulative channel",
		);
		expect(container.querySelectorAll("svg.sui-chart, .sui-chart svg").length)
			.toBeGreaterThanOrEqual(2);
		// The band is an AreaSeries with `lower`: one closed subpath.
		const band = container.querySelector(".sui-chart__area");
		expect(band?.getAttribute("d")?.endsWith("Z")).toBe(true);
		// One marker per period, the last one larger.
		const circles = container.querySelectorAll(".sui-chart__points circle");
		expect(circles.length).toBe(9);
		expect(Number(circles[8].getAttribute("r"))).toBeGreaterThan(
			Number(circles[0].getAttribute("r")),
		);
		// Out-of-band markers take the over tone.
		expect(circles[1].getAttribute("fill")).toBe("var(--sui-danger)");
		expect(circles[0].getAttribute("fill")).toBe("var(--sui-text-primary)");
		// 7 signed bars + 2 zero bars drawn as a +/- tick pair = 11 rects.
		expect(bars(container).length).toBe(11);
		expect(container.innerHTML).not.toContain("NaN");
	});

	it("both plots take the same left margin, so bars sit under points", () => {
		const { container } = render(() => (
			<ChannelDivergenceChart periods={STAX_PERIODS} {...common} />
		));
		const plots = container.querySelectorAll<SVGGElement>(
			"svg > g[transform^='translate']",
		);
		expect(plots.length).toBeGreaterThanOrEqual(2);
		const lefts = new Set(
			Array.from(plots, (g) => g.getAttribute("transform")?.split(",")[0]),
		);
		expect(lefts.size).toBe(1);
	});

	it("reports a pick as the nearest period's key", () => {
		const { margin } = channelModel(STAX_PERIODS, {
			showDivergence: true,
			labelEnds: true,
			formatValue: formatKiloCents,
		});
		const { width, height } = CHANNEL_CHART_FALLBACK_SIZE;
		const restore = installRects((el) =>
			el.tagName.toLowerCase() === "svg"
				? rectOf({ left: 0, top: 0, width, height })
				: null,
		);
		const onPickPeriod = vi.fn();
		const { container } = render(() => (
			<ChannelDivergenceChart
				periods={STAX_PERIODS}
				{...common}
				onPickPeriod={onPickPeriod}
			/>
		));
		// Period 3 sits at data x = 3 on the domain [-0.5, 8.5].
		const inner = width - margin.left - margin.right;
		const clientX = margin.left + ((3 + 0.5) / 9) * inner;
		fireEvent.click(container.querySelector("svg")!, {
			clientX,
			clientY: margin.top + 20,
		});
		restore();
		expect(onPickPeriod).toHaveBeenCalledWith("2026-04");
	});

	it("draws a solid rule at the selected period on both plots", () => {
		const { container } = render(() => (
			<ChannelDivergenceChart
				periods={STAX_PERIODS}
				{...common}
				selectedKey="2026-04"
			/>
		));
		const rules = container.querySelectorAll(".sui-chart__ref line");
		// selected rule ×2 + the zero rule.
		expect(rules.length).toBe(3);
	});
});

describe("ChannelChart edges", () => {
	it("the plain variant draws no bars", () => {
		const { container } = render(() => (
			<ChannelChart periods={STAX_PERIODS} {...common} />
		));
		expect(bars(container).length).toBe(0);
		expect(container.querySelectorAll(".sui-chart__points circle").length).toBe(9);
	});

	it("empty periods render the empty message and never NaN", () => {
		const { container, getByText } = render(() => (
			<ChannelDivergenceChart periods={[]} {...common} emptyMessage="Nothing yet" />
		));
		expect(getByText("Nothing yet")).toBeTruthy();
		expect(container.innerHTML).not.toContain("NaN");
	});

	it("a single period and an all-zero period never produce NaN", () => {
		for (const periods of [
			[STAX_PERIODS[1]],
			[{ key: "z", lo: 0, hi: 0, value: 0, diff: 0 }],
		]) {
			const { container, unmount } = render(() => (
				<ChannelDivergenceChart periods={periods} {...common} />
			));
			expect(container.innerHTML).not.toContain("NaN");
			expect(container.querySelectorAll(".sui-chart__points circle").length).toBe(1);
			unmount();
		}
	});

	it("renders a legend when legend text is supplied", () => {
		const { getByText } = render(() => (
			<ChannelChartBase
				periods={STAX_PERIODS}
				{...common}
				legend={{
					band: "projected",
					line: "received",
					over: "above",
					under: "below",
				}}
			/>
		));
		expect(getByText("received")).toBeTruthy();
	});
});
