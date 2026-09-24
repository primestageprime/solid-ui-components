// ============================================
// channelGeometry — Depth 0, pure. Everything `ChannelChart` draws, as data.
//
// The HEADLESS observation of the channel chart: `channelModel` turns the
// caller's periods into domains, ticks, margins, markers, bars and end labels,
// and `formatChannelTable` prints the period rows as a text table a reader
// checks the shape against before looking at the GUI (channelGeometry.test.ts
// prints the fixture). No Solid, no DOM, no measurement.
//
// THE PERIOD AXIS is an index `i ∈ [0, n)` with `xDomain = [-0.5, n - 0.5]`,
// shared by BOTH plots, so a bar sits under its point by construction.
//
// ONE MARGIN for both plots, left AND right: the left is sized from the widest
// tick label across the channel's y ticks AND the divergence ticks, the right
// from the widest end label. Two charts sizing their own margins would drift
// apart, and the bars would stop sitting under the points.
//
// `diff` and `outside` are the CALLER'S: the bars show per-period distance
// outside the per-period band, while the markers show the cumulative position
// in the cumulative channel. Neither is derivable from the other, so this
// module never derives `diff` from lo/hi/value.
// ============================================
import { join, map } from "../../fn";
import { linearScale } from "../Chart/scales";

/** One period of the channel. */
export interface ChannelPeriod {
	/** Period id, e.g. "2026-02". Also the pick identity. */
	readonly key: string;
	/** Tick text; defaults to `key`. */
	readonly label?: string;
	/** Band floor at this period (cumulative). */
	readonly lo: number;
	/** Band ceiling at this period (cumulative). */
	readonly hi: number;
	/** The running value (cumulative actual). */
	readonly value: number;
	/**
	 * Marker tone: out of band. Omitted, it is read off `value` against
	 * `lo`/`hi`. `false` forces the inside tone; `true` keeps the side the
	 * value is on (or "over" if the value is geometrically inside).
	 */
	readonly outside?: boolean;
	/**
	 * Per-period signed distance outside the band (0 = inside). Drawn by the
	 * divergence plot only; omitted reads as 0.
	 */
	readonly diff?: number;
}

export type ChannelMarkerTone = "inside" | "over" | "under";
export type ChannelBarTone = "over" | "under" | "zero";

export interface ChannelMarker {
	readonly i: number;
	readonly value: number;
	readonly tone: ChannelMarkerTone;
	/** The last period: drawn larger, the value the end label names. */
	readonly end: boolean;
}

export interface ChannelBar {
	readonly i: number;
	readonly diff: number;
	readonly tone: ChannelBarTone;
	/** "+28.3k", "-18.2k", "0" — formatted through the caller's formatter. */
	readonly label: string;
}

export interface ChannelEndLabel {
	readonly id: "value" | "hi" | "lo";
	readonly i: number;
	readonly value: number;
	readonly text: string;
}

export interface ChannelMargin {
	readonly top: number;
	readonly right: number;
	readonly bottom: number;
	readonly left: number;
}

export interface ChannelRow {
	readonly i: number;
	readonly key: string;
	readonly lo: number;
	readonly hi: number;
	readonly value: number;
	readonly outside: boolean;
	readonly diff: number;
	readonly tone: ChannelMarkerTone;
}

export interface ChannelModel {
	readonly n: number;
	readonly xDomain: [number, number];
	readonly xTicks: readonly { readonly i: number; readonly label: string }[];
	readonly yDomain: [number, number];
	readonly yTicks: readonly number[];
	/** Symmetric around zero: `±max|diff|` (padded). */
	readonly divDomain: [number, number];
	readonly divTicks: readonly number[];
	/** Widest tick label across BOTH plots, in characters. */
	readonly leftMarginChars: number;
	/** The one margin both plots take, in px. */
	readonly margin: ChannelMargin;
	readonly markers: readonly ChannelMarker[];
	/** Empty unless `showDivergence`. */
	readonly bars: readonly ChannelBar[];
	/** Empty unless `labelEnds` and there is at least one period. */
	readonly endLabels: readonly ChannelEndLabel[];
	readonly rows: readonly ChannelRow[];
}

export interface ChannelModelOptions {
	readonly showDivergence: boolean;
	readonly labelEnds: boolean;
	readonly formatValue: (n: number) => string;
}

/** Approximate px per character of an 11px axis label. */
export const CHANNEL_CHAR_PX = 7;
/** Clear space between the widest y tick label and the plot. */
const LEFT_PAD = 14;
/** Clear space past the plot for an end label (and without one). */
const RIGHT_PAD = 10;
const TOP = 12;
const BOTTOM = 24;
/** Headroom added above the channel's highest point, as a share of span. */
const Y_PAD = 0.05;
/** Headroom around the divergence extent, room for a bar's label. */
const DIV_PAD = 0.35;
const TICK_COUNT = 4;

const tickLabelOf = (p: ChannelPeriod): string => p.label ?? p.key;

/** Marker tone — see `ChannelPeriod.outside`. */
export const markerTone = (p: ChannelPeriod): ChannelMarkerTone => {
	const geometric: ChannelMarkerTone =
		p.value > p.hi ? "over" : p.value < p.lo ? "under" : "inside";
	if (p.outside === undefined) return geometric;
	if (!p.outside) return "inside";
	return geometric === "inside" ? "over" : geometric;
};

export const barTone = (diff: number): ChannelBarTone =>
	diff > 0 ? "over" : diff < 0 ? "under" : "zero";

/**
 * The channel's y-domain: `[min(0, lo, value), max(hi, value)]`, with 5%
 * headroom on top (and below, only when the floor is negative, so a
 * non-negative channel keeps its floor on zero). A zero span widens to 1.
 */
export const channelYDomain = (
	periods: readonly ChannelPeriod[],
): [number, number] => {
	let lo = 0;
	let hi = Number.NEGATIVE_INFINITY;
	for (const p of periods) {
		lo = Math.min(lo, p.lo, p.value);
		hi = Math.max(hi, p.hi, p.value);
	}
	if (!Number.isFinite(hi) || hi <= lo) return [lo, lo + 1];
	const pad = (hi - lo) * Y_PAD;
	return [lo < 0 ? lo - pad : lo, hi + pad];
};

/** Symmetric around zero; all-zero (or no) diffs give `[-1, 1]`. */
export const divergenceDomain = (
	periods: readonly ChannelPeriod[],
): [number, number] => {
	let m = 0;
	for (const p of periods) m = Math.max(m, Math.abs(p.diff ?? 0));
	if (!(m > 0)) return [-1, 1];
	const padded = m * (1 + DIV_PAD);
	return [-padded, padded];
};

const ticksOf = (domain: [number, number]): number[] =>
	linearScale(domain, [0, 1]).ticks(TICK_COUNT);

const widest = (texts: readonly string[]): number => {
	let w = 0;
	for (const t of texts) w = Math.max(w, t.length);
	return w;
};

/** One label per printed text: a fixed band (hi = lo) or a value sitting on
 *  an edge would otherwise print the same number two or three times. */
const uniqueByText = (labels: readonly ChannelEndLabel[]): ChannelEndLabel[] => {
	const seen = new Set<string>();
	const out: ChannelEndLabel[] = [];
	for (const l of labels) {
		if (seen.has(l.text)) continue;
		seen.add(l.text);
		out.push(l);
	}
	return out;
};

const barLabelOf = (diff: number, fmt: (n: number) => string): string =>
	diff === 0 ? "0" : diff > 0 ? `+${fmt(diff)}` : fmt(diff);

/** Everything the chart draws, from the periods alone. */
export const channelModel = (
	periods: readonly ChannelPeriod[],
	opts: ChannelModelOptions,
): ChannelModel => {
	const n = periods.length;
	const fmt = opts.formatValue;
	const yDomain = channelYDomain(periods);
	const yTicks = ticksOf(yDomain);
	const divDomain = divergenceDomain(periods);
	const divTicks = opts.showDivergence ? ticksOf(divDomain) : [];

	const leftMarginChars = widest([
		...map(fmt, yTicks),
		...map(fmt, divTicks),
	]);

	const markers = map(
		(p: ChannelPeriod, i: number): ChannelMarker => ({
			i,
			value: p.value,
			tone: markerTone(p),
			end: i === n - 1,
		}),
		periods,
	);

	const bars = opts.showDivergence
		? map((p: ChannelPeriod, i: number): ChannelBar => {
				const diff = p.diff ?? 0;
				return { i, diff, tone: barTone(diff), label: barLabelOf(diff, fmt) };
			}, periods)
		: [];

	const last = periods[n - 1];
	const endLabels: ChannelEndLabel[] =
		opts.labelEnds && last !== undefined
			? uniqueByText([
					{ id: "value", i: n - 1, value: last.value, text: fmt(last.value) },
					{ id: "hi", i: n - 1, value: last.hi, text: fmt(last.hi) },
					{ id: "lo", i: n - 1, value: last.lo, text: fmt(last.lo) },
				])
			: [];

	const rightChars = widest(map((l: ChannelEndLabel) => l.text, endLabels));

	const rows = map(
		(p: ChannelPeriod, i: number): ChannelRow => {
			const tone = markerTone(p);
			return {
				i,
				key: p.key,
				lo: p.lo,
				hi: p.hi,
				value: p.value,
				outside: tone !== "inside",
				diff: p.diff ?? 0,
				tone,
			};
		},
		periods,
	);

	return {
		n,
		xDomain: [-0.5, Math.max(n, 1) - 0.5],
		xTicks: map(
			(p: ChannelPeriod, i: number) => ({ i, label: tickLabelOf(p) }),
			periods,
		),
		yDomain,
		yTicks,
		divDomain,
		divTicks,
		leftMarginChars,
		margin: {
			top: TOP,
			right: rightChars * CHANNEL_CHAR_PX + RIGHT_PAD,
			bottom: BOTTOM,
			left: leftMarginChars * CHANNEL_CHAR_PX + LEFT_PAD,
		},
		markers,
		bars,
		endLabels,
		rows,
	};
};

/**
 * A bar as `BarSeries` segments. A zero bar would draw nothing (`BarSeries`
 * drops zero segments), so it becomes a `+half` / `-half` pair: a flat tick
 * centred on zero, `2 * half` data units tall. The caller converts its tick
 * height from px to data units (`halfTick`).
 */
export const barSegmentsOf = (
	bar: ChannelBar,
	halfTick: number,
): readonly { readonly value: number; readonly tone: ChannelBarTone }[] =>
	bar.tone === "zero"
		? [
				{ value: halfTick, tone: "zero" },
				{ value: -halfTick, tone: "zero" },
			]
		: [{ value: bar.diff, tone: bar.tone }];

/** Clear space, px, between a bar's end and its label. */
const BAR_LABEL_GAP = 3;

/**
 * Where a bar's label anchor goes, in DATA units, so `ChartLabels`' body rung
 * (which seats a label BODY_GAP px to the right of its anchor, vertically
 * centred on it) draws it CENTRED over the bar's end: above a positive bar or
 * a zero tick, below a negative one. The caller supplies its current
 * px→data factors, which is what keeps this pure.
 */
export const barLabelAnchor = (
	bar: ChannelBar,
	labelWidthPx: number,
	labelHeightPx: number,
	bodyGapPx: number,
	xPerPx: number,
	yPerPx: number,
): { readonly x: number; readonly y: number } => {
	const lift = (labelHeightPx / 2 + BAR_LABEL_GAP) * yPerPx;
	return {
		x: bar.i - (bodyGapPx + labelWidthPx / 2) * xPerPx,
		y: bar.diff < 0 ? bar.diff - lift : bar.diff + lift,
	};
};

/** Nearest period index for a raw x from `Chart.onPick`, or -1 when empty. */
export const periodIndexAt = (x: number, n: number): number =>
	n === 0 ? -1 : Math.min(n - 1, Math.max(0, Math.round(x)));

const COLUMNS = [
	"i",
	"key",
	"lo",
	"hi",
	"value",
	"outside",
	"diff",
	"tone",
] as const;

/**
 * The period rows as a fixed-width text table:
 * `i | key | lo | hi | value | outside | diff | tone`. Numbers print raw (the
 * caller's units — cents in thorcasting), so the table matches a CLI dump of
 * the same periods column for column.
 */
export const formatChannelTable = (model: ChannelModel): string => {
	const cells = map(
		(r: ChannelRow) => [
			String(r.i),
			r.key,
			String(r.lo),
			String(r.hi),
			String(r.value),
			r.outside ? "yes" : "no",
			String(r.diff),
			r.tone,
		],
		model.rows,
	);
	const all = [[...COLUMNS] as string[], ...cells];
	const widths = map(
		(_c: string, col: number) => widest(map((row: string[]) => row[col], all)),
		[...COLUMNS] as string[],
	);
	const line = (row: string[]): string =>
		join(
			" | ",
			map((cell: string, col: number) => cell.padEnd(widths[col]), row),
		).trimEnd();
	const rule = join(
		"-|-",
		map((w: number) => "-".repeat(w), widths),
	);
	return join("\n", [line(all[0]), rule, ...map(line, cells)]);
};
