// StackedTimelineChart — mounting tests. What this component adds over a bare
// `Chart` is the FILL (it measures its own box), the captioned rule, the
// numbered event rules, the hover readout and the date-typed pick; each is
// asserted against the DOM here. The stack's own geometry is
// `StackedAreaSeries`'s, and its tests own it.
import { fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
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

	// ── The SELECTED event ─────────────────────────────────────────────────
	const EVENTS = [
		{ at: new Date("2025-03-02T00:00:00Z"), label: "1" },
		{ at: new Date("2025-06-02T00:00:00Z"), label: "2" },
		{ at: new Date("2025-09-02T00:00:00Z"), label: "3" },
	];
	const rulesIn = (container: HTMLElement) =>
		[...container.querySelectorAll("line")]
			.filter((line) => line.hasAttribute("x1") && line.hasAttribute("opacity"))
			.map((line) => ({
				opacity: Number(line.getAttribute("opacity")),
				dash: line.getAttribute("stroke-dasharray"),
				width: line.getAttribute("stroke-width"),
			}));

	it("draws the selected rule SOLID and the rest dashed", () => {
		const { container } = render(() => (
			<StackedTimelineChart
				series={SERIES}
				xDomain={[START, END]}
				yDomain={[0, 80]}
				events={EVENTS}
				selectedEvent={1}
			/>
		));
		const rules = rulesIn(container);
		expect(rules).toHaveLength(3);
		// Solid-versus-dashed carries the state without colour, which is why it
		// is asserted and the accent is only a second cue.
		expect(rules[1].dash).toBe("none");
		expect(rules[1].opacity).toBe(1);
		expect(rules[1].width).toBe("2");
		for (const index of [0, 2]) {
			expect(rules[index].dash).toBe("4 4");
			expect(rules[index].opacity).toBe(0.6);
		}
	});

	it("accents the selected NUMBER through a style, which a CSS class cannot beat", () => {
		const { container } = render(() => (
			<StackedTimelineChart
				series={SERIES}
				xDomain={[START, END]}
				yDomain={[0, 80]}
				events={EVENTS}
				selectedEvent={2}
			/>
		));
		const captions = [...container.querySelectorAll(".sui-chart__ref-label")];
		expect(captions.map((c) => c.textContent)).toEqual(["1", "2", "3"]);
		// A `fill` ATTRIBUTE is the lowest-priority CSS there is, and the class
		// already sets `fill`, so the colour has to arrive as a style.
		expect((captions[2] as SVGElement).style.fill).not.toBe("");
		expect((captions[0] as SVGElement).style.fill).toBe("");
	});

	it("RE-STYLES an already-drawn rule when the selection moves", () => {
		// `Index` keeps a row's nodes, so the selection has to reach one already
		// drawn. Hoisting the comparison into a const above the JSX would break
		// exactly this and nothing else would notice.
		const [picked, setPicked] = createSignal(0);
		const { container } = render(() => (
			<StackedTimelineChart
				series={SERIES}
				xDomain={[START, END]}
				yDomain={[0, 80]}
				events={EVENTS}
				selectedEvent={picked()}
			/>
		));
		expect(rulesIn(container)[0].dash).toBe("none");
		setPicked(2);
		expect(rulesIn(container)[0].dash).toBe("4 4");
		expect(rulesIn(container)[2].dash).toBe("none");
	});

	it("selects nothing when `selectedEvent` is absent or out of range", () => {
		for (const selectedEvent of [undefined, -1, 9]) {
			const { container } = render(() => (
				<StackedTimelineChart
					series={SERIES}
					xDomain={[START, END]}
					yDomain={[0, 80]}
					events={EVENTS}
					selectedEvent={selectedEvent}
				/>
			));
			expect(rulesIn(container).every((r) => r.dash === "4 4")).toBe(true);
		}
	});

	// ── The GHOST pick rule ────────────────────────────────────────────────
	//
	// The promise is that the ghost stands where the click will leave a real
	// rule. It reads the same `hoverX` mapping `onPick` reports from, then
	// snaps onto the caller's bucket grid — so the two cannot drift.
	// `hasAttribute` on both: gridlines and axis ticks carry neither, and
	// `Number(null)` is 0, which would otherwise read as a very faint rule.
	const ghostsIn = (container: HTMLElement): number[] =>
		[...container.querySelectorAll("line")]
			.filter(
				(line) =>
					line.hasAttribute("x1") &&
					line.hasAttribute("opacity") &&
					Number(line.getAttribute("opacity")) < 0.5,
			)
			.map((line) => Number(line.getAttribute("x1")));

	const hoverable = (extra: Record<string, unknown>) => {
		const restore = stubRects();
		const { container } = render(() => (
			<StackedTimelineChart
				series={SERIES}
				xDomain={[START, END]}
				yDomain={[0, 80]}
				{...extra}
			/>
		));
		fireEvent.pointerMove(container.querySelector("svg")!, {
			clientX: 400,
			clientY: 150,
		});
		restore();
		return container;
	};

	const QUARTER_COLUMNS = [
		START,
		new Date("2025-04-01T00:00:00Z"),
		new Date("2025-07-01T00:00:00Z"),
		new Date("2025-10-01T00:00:00Z"),
	];

	it("ghosts the rule a click would leave, on the hovered bucket's START", () => {
		const container = hoverable({
			columns: QUARTER_COLUMNS,
			onPick: () => {},
		});
		const ghosts = ghostsIn(container);
		expect(ghosts).toHaveLength(1);

		// THE PROMISE: the ghost stands exactly where a REAL rule for a bucket
		// start stands. Draw all four as events and the ghost must be one of them
		// — not the raw x under the pointer.
		const restore = stubRects();
		const real = render(() => (
			<StackedTimelineChart
				series={SERIES}
				xDomain={[START, END]}
				yDomain={[0, 80]}
				columns={QUARTER_COLUMNS}
				events={QUARTER_COLUMNS.map((at, index) => ({
					at,
					label: String(index + 1),
				}))}
			/>
		));
		restore();
		const realXs = [...real.container.querySelectorAll("line")]
			.filter(
				(line) =>
					line.hasAttribute("x1") && line.getAttribute("opacity") === "0.6",
			)
			.map((line) => Number(line.getAttribute("x1")));
		expect(realXs).toContain(ghosts[0]);
	});

	it("draws NO ghost without `onPick` — there is no click to promise", () => {
		expect(ghostsIn(hoverable({ columns: QUARTER_COLUMNS }))).toHaveLength(0);
	});

	it("draws NO ghost without `columns` — the pick is unsnapped, so it would lie", () => {
		expect(ghostsIn(hoverable({ onPick: () => {} }))).toHaveLength(0);
	});

	it("clears the ghost when the pointer leaves", () => {
		const restore = stubRects();
		const { container } = render(() => (
			<StackedTimelineChart
				series={SERIES}
				xDomain={[START, END]}
				yDomain={[0, 80]}
				columns={QUARTER_COLUMNS}
				onPick={() => {}}
			/>
		));
		const svg = container.querySelector("svg")!;
		fireEvent.pointerMove(svg, { clientX: 400, clientY: 150 });
		expect(ghostsIn(container)).toHaveLength(1);
		fireEvent.pointerLeave(svg);
		restore();
		expect(ghostsIn(container)).toHaveLength(0);
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
