// ============================================
// stackedArea — pure geometry for a stack of step-valued bands.
//
// A CORE per docs/adr/0010-a-mark-is-a-core-plus-one-adapter-per-context.md:
// it takes explicit pixel geometry (via `xToPx` / `yToPx`) and returns the
// paths to draw. It reads no context, touches no DOM, and knows no unit.
// `Chart`'s `StackedAreaSeries` (StackedAreaSeries.tsx) is its one adapter
// today; a second chart context would add an adapter, not a branch in here.
//
// ── WHAT A STACK IS, EXACTLY ────────────────────────────────────────────────
//
// Each input series is a list of STEP points: a value takes hold at its own
// `at` and is held until the next one (step-AFTER). Before its first point a
// series contributes nothing. The stack is read off ONE array of cumulative
// levels per segment: level 0 is the baseline, level k is the cumulative top
// of bands 0..k−1, and band k is closed between level k and level k+1. Every
// property the tests assert — that the stack sums exactly, that two bands
// never overlap, that adjacent bands share their common edge point for point —
// is therefore true BY CONSTRUCTION rather than by arithmetic done twice.
// A series at zero collapses its band onto a shared edge: zero area, and the
// bands above it are undisturbed.
//
// ── WHY THE TRANSITION IS A CURVE ───────────────────────────────────────────
//
// A step drawn as a step puts a vertical wall in the middle of a band. The
// Sankey answer is to spend a little x on the change: the band runs flat up to
// half a transition before the change x, crosses on a cubic with horizontal
// tangents (`hCurve`, shared with LevelsTimeline), and is flat again half a
// transition after. The width is one number for the whole plot — a fraction of
// the plot, floored and ceilinged — and it is SHORTENED wherever two changes
// sit closer together than a full transition apart, exactly as
// LevelsTimeline's `taperHalves` does, so a busy stretch folds gracefully
// instead of folding over itself.
//
// `curve: "linear"` spends no x at all: the change lands square on its own x.
// ============================================

import { join, map, sortBy } from "../../fn";
import { hCurve } from "../../internal/geometry/hCurve";
import { clamp } from "../../internal/math/clamp";

/** One step point: `value` takes hold at `at` and is held until the next. */
export interface StepPoint {
	/** Position on the x scale, in the chart's x-domain unit (epoch ms for a
	 *  time domain). */
	readonly at: number;
	readonly value: number;
}

/** One series in the stack. Order IS the stacking order, bottom first. */
export interface StackedSeries {
	readonly id: string;
	readonly label?: string;
	readonly points: readonly StepPoint[];
}

/** How a change is crossed. */
export type StackedAreaCurve = "smoothStep" | "linear";

/** The stack across one stretch of x where every series holds one value. */
export interface StackSegment {
	/** Segment bounds in the x-domain unit; `from` inclusive, `to` exclusive. */
	readonly from: number;
	readonly to: number;
	/** One value per series, in input order. */
	readonly values: readonly number[];
	/** N+1 cumulative levels: `levels[0]` is 0, `levels[k+1] = levels[k] +
	 *  values[k]`, and `levels[N]` is the stack total. */
	readonly levels: readonly number[];
}

/** One band's drawn geometry. */
export interface StackedBand {
	readonly id: string;
	readonly label?: string;
	/** Stacking position, bottom-first. The adapter's palette slot. */
	readonly index: number;
	/** Closed band path: along its top edge, down, back along its lower edge. */
	readonly path: string;
	/** The top edge alone, for a hairline stroke. */
	readonly edge: string;
	/**
	 * The lower edge alone. Identical, point for point, to the band BELOW's
	 * `edge` — they are ONE array, built once. No adapter draws it: it is here
	 * so the sharing invariant is assertable as an IDENTITY
	 * (`bands[k + 1].floor === bands[k].edge`) rather than by re-deriving the
	 * stack in a test and comparing two calculations that could drift together.
	 */
	readonly floor: string;
}

export interface StackedAreaGeometry {
	readonly bands: readonly StackedBand[];
	/** The top of the whole stack, as one open path. */
	readonly totalEdge: string;
	/** The stack in data units — the table a reader checks the shape against. */
	readonly segments: readonly StackSegment[];
	/** Full transition width in px, after the fraction and the clamps. */
	readonly transition: number;
}

/** Fraction of the plot one transition spends. */
export const TRANSITION_FRACTION = 0.05;
/** Narrow enough to stay a join rather than a journey… */
export const MIN_TRANSITION = 10;
/** …and wide enough that the S reads as an S. */
export const MAX_TRANSITION = 28;

/** How wide every blend is, for this plot. One number, shared by everything. */
export const transitionWidth = (plotWidth: number): number =>
	clamp(plotWidth * TRANSITION_FRACTION, MIN_TRANSITION, MAX_TRANSITION);

const round3 = (n: number): number => Math.round(n * 1000) / 1000;

/**
 * One point on a band's edge. `curved` means it is reached from the previous
 * point by a cubic with horizontal tangents rather than by a straight line.
 */
interface EdgePoint {
	readonly x: number;
	readonly y: number;
	readonly curved: boolean;
}

/** An edge walked forwards, without its opening `M`. */
const forwardEdge = (points: readonly EdgePoint[]): string => {
	const parts: string[] = [];
	for (const [index, point] of points.entries()) {
		if (index === 0) continue;
		const previous = points[index - 1];
		parts.push(
			point.curved
				? hCurve(previous.x, previous.y, point.x, point.y)
				: `L ${round3(point.x)} ${round3(point.y)}`,
		);
	}
	return join(" ", parts);
};

/** The same edge walked backwards. A segment keeps the curvedness of its END. */
const reverseEdge = (points: readonly EdgePoint[]): string => {
	const parts: string[] = [];
	for (let index = points.length - 1; index > 0; index -= 1) {
		const from = points[index];
		const to = points[index - 1];
		parts.push(
			from.curved
				? hCurve(from.x, from.y, to.x, to.y)
				: `L ${round3(to.x)} ${round3(to.y)}`,
		);
	}
	return join(" ", parts);
};

/** An edge as an open path, ready for a hairline stroke. */
const edgePath = (points: readonly EdgePoint[]): string =>
	points.length === 0
		? ""
		: join(" ", [
				`M ${round3(points[0].x)} ${round3(points[0].y)}`,
				forwardEdge(points),
			]);

/**
 * Close a band from its two edges: along the top, down the far cap, back
 * along the lower edge, and shut. Both caps are BLUNT — the plot's own edges
 * cut the band off, they are not a change in it.
 */
const bandPath = (
	top: readonly EdgePoint[],
	bottom: readonly EdgePoint[],
): string => {
	if (top.length === 0 || bottom.length === 0) return "";
	const last = bottom[bottom.length - 1];
	return join(" ", [
		`M ${round3(top[0].x)} ${round3(top[0].y)}`,
		forwardEdge(top),
		`L ${round3(last.x)} ${round3(last.y)}`,
		reverseEdge(bottom),
		"Z",
	]);
};

/** The value a series holds at `x`, held forward from its last point. */
const valueAt = (series: StackedSeries, x: number): number => {
	let held = 0;
	for (const point of series.points) {
		if (point.at > x) break;
		held = point.value;
	}
	return Number.isFinite(held) ? held : 0;
};

/** Running sums, bottom-first: `[0, v0, v0+v1, …]`. */
const levelsOf = (values: readonly number[]): readonly number[] => {
	const out = [0];
	let cursor = 0;
	for (const value of values) {
		cursor += value;
		out.push(cursor);
	}
	return out;
};

/**
 * The stack in DATA units: one segment per stretch of x over which every
 * series holds one value. The pure half of the mark — a table, printable and
 * assertable without a plot (see stackedArea.test.ts).
 *
 * Changes at or before `domain[0]` fold into the opening segment; changes at
 * or after `domain[1]` fall outside the plot and are dropped.
 */
export const stackSegments = (
	series: readonly StackedSeries[],
	domain: readonly [number, number],
): readonly StackSegment[] => {
	const [start, end] = domain;
	if (series.length === 0 || !(end > start)) return [];
	const inside = new Set<number>();
	for (const one of series) {
		for (const point of one.points) {
			if (point.at > start && point.at < end) inside.add(point.at);
		}
	}
	const bounds = [start, ...sortBy((at: number) => at, [...inside]), end];
	const out: StackSegment[] = [];
	for (let index = 0; index < bounds.length - 1; index += 1) {
		const from = bounds[index];
		const values = map((one: StackedSeries) => valueAt(one, from), series);
		out.push({ from, to: bounds[index + 1], values, levels: levelsOf(values) });
	}
	return out;
};

/**
 * The stack BUCKETED on the caller's own grid: one segment per
 * `[edges[i], edges[i + 1])`, holding what each series carries at the
 * bucket's start. The column mark's pure half, beside `stackSegments`, and it
 * reads the same `valueAt`, so a column and a band can never disagree about
 * what a series holds.
 *
 * WHY THE CALLER SUPPLIES THE EDGES: a bucket is a fact of the caller's
 * calendar — a month, an ISO week, an hour — and this core knows no calendar,
 * the same reason `Chart.onPick` reports a raw date and lets the caller snap
 * it. Deriving buckets from the series' own points would give UNEVEN columns,
 * because a point marks a CHANGE and not a period.
 *
 * The edges are sorted, so a caller cannot produce a backwards bucket.
 */
export const stackBuckets = (
	series: readonly StackedSeries[],
	edges: readonly number[],
): readonly StackSegment[] => {
	if (series.length === 0 || edges.length < 2) return [];
	const bounds = sortBy((at: number) => at, [...edges]);
	const out: StackSegment[] = [];
	for (let index = 0; index < bounds.length - 1; index += 1) {
		const from = bounds[index];
		const values = map((one: StackedSeries) => valueAt(one, from), series);
		out.push({ from, to: bounds[index + 1], values, levels: levelsOf(values) });
	}
	return out;
};

/**
 * Half-widths for the stack's INTERNAL changes, shortened wherever two sit
 * closer together than a full transition apart — the same shape
 * LevelsTimeline's `taperHalves` computes for a rail.
 */
const halfWidths = (
	boundariesPx: readonly number[],
	startPx: number,
	endPx: number,
	base: number,
): readonly number[] => {
	const edges = [startPx, ...boundariesPx, endPx];
	return map((x: number, index: number) => {
		const previous = edges[index];
		const next = edges[index + 2];
		return Math.max(0, Math.min(base, (x - previous) / 2, (next - x) / 2));
	}, boundariesPx);
};

/** One cumulative level's edge, in plot pixels, across the whole plot. */
const levelEdge = (
	segments: readonly StackSegment[],
	level: number,
	xToPx: (v: number) => number,
	yToPx: (v: number) => number,
	halves: readonly number[],
	curved: boolean,
): readonly EdgePoint[] => {
	const first = segments[0];
	const last = segments[segments.length - 1];
	const points: EdgePoint[] = [
		{ x: xToPx(first.from), y: yToPx(first.levels[level]), curved: false },
	];
	for (let index = 1; index < segments.length; index += 1) {
		const before = segments[index - 1].levels[level];
		const after = segments[index].levels[level];
		if (before === after) continue;
		const at = xToPx(segments[index].from);
		const half = halves[index - 1];
		points.push({ x: at - half, y: yToPx(before), curved: false });
		points.push({ x: at + half, y: yToPx(after), curved });
	}
	points.push({
		x: xToPx(last.to),
		y: yToPx(last.levels[level]),
		curved: false,
	});
	return points;
};

/**
 * Build the stack's bands and its total top edge.
 *
 * @param series  Stacking order, bottom first. Max eight — ADR 0003 caps the
 *                series palette at eight slots — but the core draws what it is
 *                given; the cap is the adapter's to state.
 * @param xToPx   x-domain value → pixel x.
 * @param yToPx   y-domain value → pixel y.
 * @param domain  The x extent the stack is drawn across, in x-domain units.
 * @param curve   `"smoothStep"` spends a transition on each change;
 *                `"linear"` lands it square on its own x.
 */
export const buildStackedArea = (
	series: readonly StackedSeries[],
	xToPx: (v: number) => number,
	yToPx: (v: number) => number,
	domain: readonly [number, number],
	curve: StackedAreaCurve = "smoothStep",
): StackedAreaGeometry => {
	const segments = stackSegments(series, domain);
	const startPx = xToPx(domain[0]);
	const endPx = xToPx(domain[1]);
	const transition = transitionWidth(Math.abs(endPx - startPx));
	if (segments.length === 0) {
		return { bands: [], totalEdge: "", segments, transition };
	}
	const boundariesPx = map(
		(segment: StackSegment) => xToPx(segment.from),
		segments.slice(1),
	);
	const halves =
		curve === "linear"
			? map(() => 0, boundariesPx)
			: halfWidths(boundariesPx, startPx, endPx, transition / 2);
	// One edge per cumulative level, built ONCE and shared: band k's upper edge
	// IS band k+1's lower edge, the same points in the same order, so two
	// neighbours cannot disagree about where they meet.
	const edges: (readonly EdgePoint[])[] = [];
	for (let level = 0; level <= series.length; level += 1) {
		edges.push(
			levelEdge(segments, level, xToPx, yToPx, halves, curve === "smoothStep"),
		);
	}
	const bands = map(
		(one: StackedSeries, index: number) => ({
			id: one.id,
			label: one.label,
			index,
			path: bandPath(edges[index + 1], edges[index]),
			edge: edgePath(edges[index + 1]),
			floor: edgePath(edges[index]),
		}),
		series,
	);
	return {
		bands,
		totalEdge: edgePath(edges[edges.length - 1]),
		segments,
		transition,
	};
};
