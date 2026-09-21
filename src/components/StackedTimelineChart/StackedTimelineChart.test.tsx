// StackedTimelineChart — mounting tests. What this component adds over a bare
// `Chart` is the FILL (it measures its own box), the captioned rule, the
// numbered event rules, the hover readout and the date-typed pick; each is
// asserted against the DOM here. The stack's own geometry is
// `StackedAreaSeries`'s, and its tests own it.
import { fireEvent, render } from "@solidjs/testing-library";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
	type FakeSizer,
	installFakeSizer,
	installRects,
	rectOf,
} from "../../test-utils";
import {
	createStackedTimelineChart,
	STACKED_TIMELINE_FALLBACK_SIZE,
	StackedTimelineChart,
} from "./StackedTimelineChart";

let sizer: FakeSizer;
beforeAll(() => {
	sizer = installFakeSizer();
});
afterAll(() => sizer.restore());

const START = new Date("2025-01-01T00:00:00Z");
const END = new Date("2026-01-01T00:00:00Z");
const SERIES = [
	{ id: "steady", points: [{ at: START, value: 15 }] },
	{
		id: "stepped",
		points: [
			{ at: START, value: 20 },
			{ at: new Date("2025-06-02T00:00:00Z"), value: 30 },
		],
	},
];

/** The frame and the svg both measure 800 × 300 at the origin. */
const stubRects = (): (() => void) =>
	installRects((el) =>
		el.tagName.toLowerCase() === "svg" || el.tagName.toLowerCase() === "div"
			? rectOf({ left: 0, top: 0, width: 800, height: 300 })
			: null,
	);

describe("StackedTimelineChart", () => {
	it("draws at the fallback size when its box measures zero", () => {
		const { container } = render(() => (
			<StackedTimelineChart
				series={SERIES}
				xDomain={[START, END]}
				yDomain={[0, 80]}
			/>
		));
		const svg = container.querySelector("svg")!;
		expect(svg.getAttribute("width")).toBe(
			String(STACKED_TIMELINE_FALLBACK_SIZE.width),
		);
	});

	it("FILLS its box once the box has a size", () => {
		const restore = stubRects();
		const { container } = render(() => (
			<StackedTimelineChart
				series={SERIES}
				xDomain={[START, END]}
				yDomain={[0, 80]}
			/>
		));
		restore();
		const svg = container.querySelector("svg")!;
		expect(svg.getAttribute("width")).toBe("800");
		expect(svg.getAttribute("height")).toBe("300");
	});

	it("captions the rule and numbers every event", () => {
		const { container } = render(() => (
			<StackedTimelineChart
				series={SERIES}
				xDomain={[START, END]}
				yDomain={[0, 80]}
				rule={{ value: 40, label: "full-time" }}
				events={[
					{ at: new Date("2025-06-02T00:00:00Z"), label: "1" },
					{ at: new Date("2025-09-01T00:00:00Z"), label: "2" },
				]}
			/>
		));
		// The captions of the reference rules alone — not the axis tick text,
		// which is full of digits of its own.
		const captions = [
			...container.querySelectorAll(".sui-chart__ref-label"),
		].map((label) => label.textContent);
		expect(captions).toEqual(["full-time", "1", "2"]);
	});

	it("reports a pick as a DATE, unsnapped", () => {
		const restore = stubRects();
		const onPick = vi.fn();
		const { container } = render(() => (
			<StackedTimelineChart
				series={SERIES}
				xDomain={[START, END]}
				yDomain={[0, 80]}
				onPick={onPick}
			/>
		));
		fireEvent.click(container.querySelector("svg")!, {
			clientX: 400,
			clientY: 150,
		});
		restore();
		expect(onPick).toHaveBeenCalledOnce();
		const picked = onPick.mock.calls[0]![0] as Date;
		expect(picked).toBeInstanceOf(Date);
		expect(picked.getTime()).toBeGreaterThan(START.getTime());
		expect(picked.getTime()).toBeLessThan(END.getTime());
	});

	it("shows the hover readout for the moment under the pointer", () => {
		const restore = stubRects();
		const hoverLabel = vi.fn(
			(at: number) => `at ${new Date(at).getUTCFullYear()}`,
		);
		const { container } = render(() => (
			<StackedTimelineChart
				series={SERIES}
				xDomain={[START, END]}
				yDomain={[0, 80]}
				hoverLabel={hoverLabel}
			/>
		));
		fireEvent.pointerMove(container.querySelector("svg")!, {
			clientX: 400,
			clientY: 150,
		});
		restore();
		expect(hoverLabel).toHaveBeenCalled();
		expect(document.body.textContent).toContain("at 2025");
	});

	// The composite pinned every consumer to the smoothed crossing by not
	// forwarding `curve` at all. A stack whose x-axis carries buckets needs the
	// square one, so the forwarding is asserted here rather than left to the
	// series' own tests, which mount `StackedAreaSeries` directly.
	it("crosses a change on a curve by default and square under curve='linear'", () => {
		const { container } = render(() => (
			<StackedTimelineChart
				series={SERIES}
				xDomain={[START, END]}
				yDomain={[0, 80]}
			/>
		));
		// Band 1, not band 0: `steady` holds one value and crosses nothing.
		expect(
			container
				.querySelectorAll(".sui-chart__stacked-area-band")[1]
				?.getAttribute("d"),
		).toContain("C ");

		const square = render(() => (
			<StackedTimelineChart
				series={SERIES}
				xDomain={[START, END]}
				yDomain={[0, 80]}
				curve="linear"
			/>
		));
		expect(
			square.container
				.querySelectorAll(".sui-chart__stacked-area-band")[1]
				?.getAttribute("d"),
		).not.toContain("C ");
	});

	// ── The COLUMN mark ────────────────────────────────────────────────────
	//
	// `columns` selects it. The regression these guard is the time-scale slot:
	// `BarSeries` sizes a slot as `xs(center + step) - xs(center)`, and with the
	// default step of 1 on a DATE domain that is one millisecond — near zero,
	// but not zero, so the fallback never fires and every bar renders invisible.
	const QUARTERS = [
		START,
		new Date("2025-04-01T00:00:00Z"),
		new Date("2025-07-01T00:00:00Z"),
		new Date("2025-10-01T00:00:00Z"),
	];

	it("draws a column per bucket per band when `columns` is supplied", () => {
		const { container } = render(() => (
			<StackedTimelineChart
				series={SERIES}
				xDomain={[START, END]}
				yDomain={[0, 80]}
				columns={QUARTERS}
			/>
		));
		// Four buckets, two bands, both non-zero throughout.
		expect(container.querySelectorAll(".sui-chart__bar")).toHaveLength(8);
		// And no band path at all — the two marks never draw together.
		expect(container.querySelectorAll(".sui-chart__stacked-area-band")).toHaveLength(0);
	});

	it("gives every column a real width on a DATE domain", () => {
		const { container } = render(() => (
			<StackedTimelineChart
				series={SERIES}
				xDomain={[START, END]}
				yDomain={[0, 80]}
				columns={QUARTERS}
			/>
		));
		const widths = [...container.querySelectorAll(".sui-chart__bar")].map(
			(bar) => Number(bar.getAttribute("width")),
		);
		expect(widths.length).toBeGreaterThan(0);
		// A whole plot over four buckets leaves each one a substantial slot. One
		// millisecond would land near zero here.
		for (const width of widths) expect(width).toBeGreaterThan(20);
	});

	it("leaves a GUTTER, so the buckets read as separate", () => {
		const { container } = render(() => (
			<StackedTimelineChart
				series={SERIES}
				xDomain={[START, END]}
				yDomain={[0, 80]}
				columns={QUARTERS}
				columnWidth={0.5}
			/>
		));
		const bars = [...container.querySelectorAll(".sui-chart__bar")];
		const width = Number(bars[0].getAttribute("width"));
		const lefts = [...new Set(bars.map((b) => Number(b.getAttribute("x"))))].sort(
			(a, b) => a - b,
		);
		// Half the slot is the column, so the next column starts a full column
		// width past this one's right edge.
		expect(lefts[1] - lefts[0]).toBeGreaterThan(width);
	});

	it("leaves EVEN gaps across months of different lengths", () => {
		// Jan, Feb and Mar 2025: 31, 28 and 31 days. One mean slot put all of
		const D = 86400000;
		const jan = Date.UTC(2025, 0, 1);
		const months = [jan, jan + 31 * D, jan + 59 * D];
		const { container } = render(() => (
			<StackedTimelineChart
				series={SERIES}
				xDomain={[new Date(jan), new Date(jan + 90 * D)]}
				yDomain={[0, 80]}
				columns={months.map((at) => new Date(at))}
			/>
		));
		const lefts = [
			...new Set(
				[...container.querySelectorAll(".sui-chart__bar")].map((bar) =>
					Number(bar.getAttribute("x")),
				),
			),
		].sort((a, b) => a - b);
		const widthOf = (left: number): number =>
			Number(
				[...container.querySelectorAll(".sui-chart__bar")]
					.find((bar) => Number(bar.getAttribute("x")) === left)
					?.getAttribute("width"),
			);
		expect(lefts).toHaveLength(3);
		const gaps = [
			lefts[1] - (lefts[0] + widthOf(lefts[0])),
			lefts[2] - (lefts[1] + widthOf(lefts[1])),
		];
		// February's column is narrower; the GAP beside it is not.
		expect(widthOf(lefts[1])).toBeLessThan(widthOf(lefts[0]));
		expect(gaps[0]).toBeCloseTo(gaps[1], 1);
	});

	it("draws BANDS when `columns` is absent", () => {
		const { container } = render(() => (
			<StackedTimelineChart series={SERIES} xDomain={[START, END]} yDomain={[0, 80]} />
		));
		expect(container.querySelectorAll(".sui-chart__bar")).toHaveLength(0);
		expect(
			container.querySelectorAll(".sui-chart__stacked-area-band").length,
		).toBeGreaterThan(0);
	});
});

describe("createStackedTimelineChart", () => {
	it("bakes the tick text in", () => {
		const HoursTimeline = createStackedTimelineChart({
			yTickFormat: (value) => `${value}h`,
		});
		const { container } = render(() => (
			<HoursTimeline series={SERIES} xDomain={[START, END]} yDomain={[0, 80]} />
		));
		expect(container.textContent).toContain("40h");
	});

	it("bakes the crossing in", () => {
		const BucketTimeline = createStackedTimelineChart({ curve: "linear" });
		const { container } = render(() => (
			<BucketTimeline
				series={SERIES}
				xDomain={[START, END]}
				yDomain={[0, 80]}
			/>
		));
		// Band 1 again: band 0 crosses nothing, so it would pass either way.
		expect(
			container
				.querySelectorAll(".sui-chart__stacked-area-band")[1]
				?.getAttribute("d"),
		).not.toContain("C ");
	});
});
