// ============================================
// gapBracketGeometry — pure geometry for a vertical dimension bracket.
//
// A CORE per docs/adr/0010-a-mark-is-a-core-plus-one-adapter-per-context.md:
// explicit pixels in, the mark to draw out. It reads no context and knows
// no unit. `GapBracket` (GapBracket.tsx) is the `Chart` adapter.
//
// The bracket says "this far": one vertical stem between two y positions,
// a short tick at each end pointing back toward the plot (or centred on the
// stem, for a min–max whisker's caps), and the seat for
// a caption at the stem's midpoint, to its right. A caller that places the
// caption through the label ladder reads `mid` and draws no caption here.
// ============================================

export type GapBracketTickAlign = "inward" | "center";

/** Explicit geometry a bracket needs. No scale, no unit, no context. */
export interface GapBracketGeometry {
	/** X of the stem, in the caller's own pixel space. */
	readonly x: number;
	/** One end of the gap, in the caller's own pixel space. */
	readonly y1: number;
	/** The other end. Order does not matter. */
	readonly y2: number;
	/** Length of each end tick. Default `4`. */
	readonly tick?: number;
	/** Where each end tick sits on the stem: `"inward"` (default) runs it
	 *  from `x - tick` to `x`, back toward the plot, as a dimension bracket
	 *  does; `"center"` centres it on the stem, as a whisker's cap does. */
	readonly tickAlign?: GapBracketTickAlign;
	/** Px the caption seat sits right of the stem. Default `4`. */
	readonly captionGap?: number;
}

export interface GapBracketSegment {
	readonly x1: number;
	readonly x2: number;
	readonly y1: number;
	readonly y2: number;
}

/** A bracket's drawable geometry. */
export interface GapBracketMark {
	/** The vertical stem, top to bottom. */
	readonly stem: GapBracketSegment;
	/** The two end ticks: from `x - tick` to `x`, or centred on `x`. */
	readonly ticks: readonly [GapBracketSegment, GapBracketSegment];
	/** The stem's vertical midpoint: where a caption centres. */
	readonly mid: number;
	/** The caption seat: right of the stem, centred on `mid`. */
	readonly caption: {
		readonly x: number;
		readonly y: number;
		readonly textAnchor: "start";
	};
	/** The gap's height in px. Zero when the two ends coincide. */
	readonly extent: number;
}

/**
 * Builds a bracket's geometry from explicit pixel inputs. Pure.
 *
 * The stem always runs top to bottom whatever order `y1`/`y2` arrive in, so
 * an SVG `<line>` draws it the same either way.
 */
export function buildGapBracket(geometry: GapBracketGeometry): GapBracketMark {
	const tick = geometry.tick ?? 4;
	const gap = geometry.captionGap ?? 4;
	const top = Math.min(geometry.y1, geometry.y2);
	const bottom = Math.max(geometry.y1, geometry.y2);
	const mid = (top + bottom) / 2;
	const centred = geometry.tickAlign === "center";
	const tickAt = (y: number): GapBracketSegment => ({
		x1: centred ? geometry.x - tick / 2 : geometry.x - tick,
		x2: centred ? geometry.x + tick / 2 : geometry.x,
		y1: y,
		y2: y,
	});
	return {
		stem: { x1: geometry.x, x2: geometry.x, y1: top, y2: bottom },
		ticks: [tickAt(top), tickAt(bottom)],
		mid,
		caption: { x: geometry.x + gap, y: mid, textAnchor: "start" },
		extent: bottom - top,
	};
}
