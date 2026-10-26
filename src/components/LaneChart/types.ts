// LaneChart display types. Every x and width is in TRACK units (0 to
// `trackWidth`): the chart scales them to fit its panel. Every `bottom` and
// `height` is in px inside its lane, from the lane's floor up. The consumer
// computes all of it elsewhere (thorcasting: in the wasm engine) and only
// passes it in.

/** How a payment mark is coloured. */
export type LaneMarkKind = "ontime" | "late" | "unmatched";

/** A payment bar at its arrival day. Its width stays in px when the track scales. */
export interface LaneBar {
	/** Unique in the chart: `hotKey` and `onHover` name a mark by it. */
	readonly key: string;
	readonly x: number;
	/** In px. Not scaled. */
	readonly width: number;
	readonly bottom: number;
	readonly height: number;
	readonly kind: LaneMarkKind;
}

/** One payment's layer inside a slot. On time fills green; late fills with dots. */
export interface LaneSlotPart {
	readonly key: string;
	readonly bottom: number;
	readonly height: number;
	readonly kind: "ontime" | "late";
}

/** An expected slot: a lozenge as wide as its window, as tall as its amount. */
export interface LaneSlot {
	readonly x: number;
	readonly width: number;
	readonly bottom: number;
	readonly height: number;
	/** The hover title. */
	readonly title: string;
	/** True draws red hatch: nothing came. */
	readonly missing: boolean;
	readonly parts: readonly LaneSlotPart[];
}

/** A dashed line from a catch-up payment to its slot. */
export interface LaneLink {
	readonly x: number;
	readonly width: number;
	readonly bottom: number;
}

/** One config lane. */
export interface Lane {
	readonly name: string;
	/** A mono line under the name. */
	readonly sub: string;
	/** The lane height in px. */
	readonly height: number;
	readonly slots: readonly LaneSlot[];
	readonly bars: readonly LaneBar[];
	readonly links: readonly LaneLink[];
}

/** A dashed box around one month of unmatched payments. */
export interface LaneBox {
	readonly x: number;
	readonly width: number;
	readonly bottom: number;
	readonly height: number;
}

/** The Unmatched lane on top. */
export interface LaneUnmatched {
	readonly height: number;
	/** The total text under the lane name. */
	readonly total: string;
	readonly boxes: readonly LaneBox[];
	readonly bars: readonly LaneBar[];
}

/** A month label over the track. `fresh` shows it in accent ink. */
export interface LaneMonthHead {
	readonly x: number;
	readonly width: number;
	readonly label: string;
	readonly fresh: boolean;
}

/** A vertical grid line. `strong` is brighter. */
export interface LaneGridLine {
	readonly x: number;
	readonly strong: boolean;
}

export interface LaneChartData {
	/** The track width the x positions are in. */
	readonly trackWidth: number;
	readonly heads: readonly LaneMonthHead[];
	readonly grid: readonly LaneGridLine[];
	readonly unmatched: LaneUnmatched;
	readonly lanes: readonly Lane[];
}
