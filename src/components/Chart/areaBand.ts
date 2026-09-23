// ============================================
// areaBand — pure geometry for a fill BETWEEN two lines (a band / channel).
//
// A CORE per docs/adr/0010-a-mark-is-a-core-plus-one-adapter-per-context.md:
// it takes the caller's accessors plus two pixel mappings (`xs`, `ys`) and
// returns an SVG path string. It reads no context and knows no unit.
// `AreaSeries` (Series.tsx) is the adapter: it supplies PLOT-LOCAL scales from
// `useChart()` and calls this only when its `lower` prop is set, so an
// `AreaSeries` without `lower` never reaches this module and keeps its
// original baseline-closing path byte for byte.
//
// THE RULE: each CONTIGUOUS run of present points becomes one closed subpath
// — forward along `y`, back along `lower`, then `Z`. A point is missing when
// `x`, `y` or `lower` is NaN (and `skipMissing` is on, the default); a missing
// point breaks the band, the same rule `buildLine` follows for a line. A run
// of one point closes on itself as a zero-width sliver, which draws nothing
// visible and never NaN. `lower` above `y` is not an error: the band is the
// region between the two edges whichever is on top.
//
// Pure: same inputs → same string, no DOM, no Solid. Tested in
// areaBand.test.ts on fixture arrays with identity-like scales.
// ============================================

interface BandPoint {
	readonly x: number;
	readonly y: number;
	readonly lower: number;
}

const fmt = (n: number): string => n.toFixed(2);

const isMissing = (skipMissing: boolean, p: BandPoint): boolean =>
	skipMissing &&
	(Number.isNaN(p.x) || Number.isNaN(p.y) || Number.isNaN(p.lower));

/** Split the data into contiguous runs of present points. */
const runsOf = (
	points: readonly BandPoint[],
	skipMissing: boolean,
): BandPoint[][] => {
	const runs: BandPoint[][] = [];
	let current: BandPoint[] = [];
	for (const p of points) {
		if (isMissing(skipMissing, p)) {
			if (current.length > 0) runs.push(current);
			current = [];
			continue;
		}
		current.push(p);
	}
	if (current.length > 0) runs.push(current);
	return runs;
};

/** One run → one closed subpath: forward on the upper edge, back on the lower. */
const subpathOf = (
	run: readonly BandPoint[],
	xs: (v: number) => number,
	ys: (v: number) => number,
): string => {
	let path = "";
	for (let i = 0; i < run.length; i++) {
		const p = run[i];
		path += `${i === 0 ? "M" : "L"}${fmt(xs(p.x))},${fmt(ys(p.y))}`;
	}
	for (let i = run.length - 1; i >= 0; i--) {
		const p = run[i];
		path += `L${fmt(xs(p.x))},${fmt(ys(p.lower))}`;
	}
	return `${path}Z`;
};

/**
 * The fill between `y` and `lower`, as an SVG path: one closed subpath per
 * contiguous run of present points. Empty data (or every point missing)
 * returns `""`.
 */
export const buildBandPath = <T>(
	data: readonly T[],
	x: (d: T) => number,
	y: (d: T) => number,
	lower: (d: T) => number,
	xs: (v: number) => number,
	ys: (v: number) => number,
	skipMissing = true,
): string => {
	const points: BandPoint[] = [];
	for (const d of data) points.push({ x: x(d), y: y(d), lower: lower(d) });
	let path = "";
	for (const run of runsOf(points, skipMissing)) path += subpathOf(run, xs, ys);
	return path;
};
