// View types for the import benches. import-kit/adapt.ts maps the live
// prototype board (import-kit/live) to these types. Every text value is display
// text that the board computed; every function is a board handler.

/** The tone of one evidence badge, as the prototype scores it. */
export type BadgeTone = "ok" | "weak" | "neg" | "stop" | "plain" | "side";

export interface Badge {
	readonly t: string;
	readonly tone: BadgeTone | string;
	readonly tip: string;
}

export interface Payment {
	readonly d: string;
	readonly payee: string;
	readonly score: string;
	readonly amt: string;
}

export interface TierRow {
	readonly id: string;
	readonly name: string;
	readonly checked: boolean;
	readonly badges: readonly Badge[];
	readonly score: string;
	readonly lead: string;
	readonly count: string;
	readonly total: string;
	readonly goes: string;
	readonly list: readonly Payment[];
}

export interface Tier {
	readonly key: string;
	readonly title: string;
	readonly sub?: string;
	readonly folds: boolean;
	readonly rows: readonly TierRow[];
}

export interface UngroupedRow {
	readonly id: string;
	readonly payee: string;
	readonly date: string;
	readonly amt: string;
	readonly score: string;
	readonly badges: readonly Badge[];
}

export interface TuneBar {
	readonly key: string;
	readonly label: string;
	readonly min: number;
	readonly max: number;
	readonly value: number;
	readonly text: string;
}

export interface IgnoredAgain {
	readonly payee: string;
	readonly amt: string;
	readonly badge: string;
	readonly tip: string;
}

export interface AutoView {
	readonly summary: string;
	readonly scoreHead: string;
	readonly tiers: readonly Tier[];
	readonly ungrouped: readonly UngroupedRow[];
	readonly tune: readonly TuneBar[];
	readonly ignored?: readonly IgnoredAgain[];
}

/** One view in the default mode and one in the advanced mode. */
export interface Modes<T> {
	readonly base: T;
	readonly adv: T;
}

export interface GroupRef {
	readonly name: string;
	readonly count: number;
}

export type ProposalLevel = "side" | "category" | "group" | "projection";

export interface ProposalNode {
	readonly id: string;
	readonly level: ProposalLevel;
	readonly name: string;
	readonly kind: string;
	readonly amount: string;
	readonly cadence: string;
	readonly count: string;
	readonly total: string;
	readonly halted: boolean;
	readonly last: string;
	readonly checkable: boolean;
	readonly checked: boolean;
	readonly list: readonly Payment[];
	readonly children: readonly ProposalNode[];
}

export interface HaltedGroup {
	readonly id: string;
	readonly name: string;
	readonly checked: boolean;
	readonly kind: string;
	readonly amount: string;
	readonly cadence: string;
	readonly count: string;
	readonly total: string;
	readonly last: string;
	readonly list: readonly Payment[];
}

export interface ProposalsData {
	readonly summary: string;
	readonly tree: readonly ProposalNode[];
	readonly halted: readonly HaltedGroup[];
	readonly haltedTitle: string;
}

export interface SummaryStat {
	readonly label: string;
	readonly value: string;
	readonly sub: string;
}

export interface ChangedRow {
	readonly id: string;
	readonly checked: boolean;
	readonly name: string;
	readonly group: string;
	readonly kind: string;
	readonly proj: string;
	readonly from: string;
	readonly to: string;
	readonly badges: readonly Badge[];
	readonly count: string;
	readonly list: readonly Payment[];
	readonly goes: string;
}

export interface ChangedData {
	readonly summary: string;
	readonly rows: readonly ChangedRow[];
}

export interface HaltRow {
	readonly id: string;
	readonly checked: boolean;
	readonly name: string;
	readonly proj: string;
	readonly last: string;
	readonly gap: string;
	readonly threshold: string;
	readonly silence: string;
	readonly goes: string;
}

export interface MissedRow {
	readonly id: string;
	readonly checked: boolean;
	readonly name: string;
	readonly proj: string;
	readonly missed: string;
	readonly count: string;
	readonly unpaid: string;
	readonly last: string;
	readonly note: string;
	readonly goes: string;
}

export interface HaltedData {
	readonly summary: string;
	readonly halts: readonly HaltRow[];
	readonly missed: readonly MissedRow[];
}

// ---------- Manual group (live) ----------
export interface MgRow {
	readonly id: string;
	readonly pos: string;
	readonly current: boolean;
	readonly payee: string;
	readonly date: string;
	readonly amt: string;
	readonly badge: string;
	readonly tip: string;
	/** The groups the user made in this step, for keys 1–9. */
	readonly quick: readonly string[];
	/** The board's suggested groups for this payment (incremental board). */
	readonly sugs: readonly string[];
}

export interface MgIgnored {
	readonly id: string;
	readonly payee: string;
	readonly amt: string;
	readonly badge: string;
	readonly tip: string;
	readonly canUnignore: boolean;
}

export interface MgView {
	readonly sub: string;
	/** The payments that wait, in the board's order. */
	readonly rows: readonly MgRow[];
	readonly groups: readonly GroupRef[];
	readonly created: readonly string[];
	readonly ignored: readonly MgIgnored[];
	readonly undoLabel: string;
	readonly canUndo: boolean;
}

export interface MgActions {
	readonly pick: (id: string) => void;
	readonly place: (id: string, group: string) => void;
	readonly ignore: (id: string) => void;
	readonly unignore: (id: string) => void;
	readonly undo: () => void;
}

// ---------- Manual (projection) ----------
type Act = () => void;

export type MpBucket = "review" | "matched" | "other";

export interface MpSideItem {
	readonly key: string;
	readonly bucket: MpBucket;
	readonly name: string;
	readonly note: string;
	readonly current: boolean;
	/** Absent on an OTHER row: those rows only inform. */
	readonly pick?: Act;
}

export type MpKind = "ontime" | "late" | "unmatched";

export interface MpBar {
	readonly x: number;
	readonly w: number;
	readonly bottom: number;
	readonly h: number;
	readonly kind: MpKind;
	readonly hot: boolean;
	readonly enter: Act;
	readonly leave: Act;
}

export interface MpSlot {
	readonly x: number;
	readonly w: number;
	readonly bottom: number;
	readonly h: number;
	readonly title: string;
	readonly missing: boolean;
	readonly catchup: boolean;
	readonly parts: readonly {
		readonly bottom: number;
		readonly h: number;
		readonly kind: "ontime" | "late";
		readonly hot: boolean;
		readonly enter: Act;
		readonly leave: Act;
	}[];
}

export interface MpLane {
	readonly name: string;
	readonly sub: string;
	readonly h: number;
	readonly slots: readonly MpSlot[];
	readonly bars: readonly MpBar[];
	readonly links: readonly { readonly x: number; readonly w: number; readonly bottom: number }[];
}

export interface MpChart {
	readonly trackW: number;
	readonly heads: readonly { readonly x: number; readonly w: number; readonly label: string; readonly fresh: boolean }[];
	readonly grid: readonly { readonly x: number; readonly strong: boolean }[];
	readonly unmatched: {
		readonly h: number;
		readonly total: string;
		readonly boxes: readonly { readonly x: number; readonly w: number; readonly bottom: number; readonly h: number }[];
		readonly bars: readonly MpBar[];
	};
	readonly lanes: readonly MpLane[];
}

export interface MpCfg {
	readonly name: string;
	readonly amount: string;
	readonly sub: string;
	readonly editLabel: string;
	readonly delLabel: string;
	readonly confirming: boolean;
	readonly confirmText: string;
	readonly edit: Act;
	readonly askDelete: Act;
	readonly cancelDelete: Act;
	readonly doDelete: Act;
}

export interface MpPaneRow {
	readonly key: string;
	readonly bucket: string;
	readonly date: string;
	readonly slot: string;
	readonly amount: string;
	readonly of: string;
	readonly tone: MpKind | "credit";
	readonly hot: boolean;
	readonly enter: Act;
	readonly leave: Act;
}

export interface MpEditState {
	/** 1–28, or 30 and up for the last day of the month. */
	readonly day: number;
	readonly amt: number;
	readonly grace: number;
}

export interface MpView {
	readonly sections: readonly { readonly key: MpBucket; readonly title: string; readonly count: string; readonly emptyText: string }[];
	readonly side: readonly MpSideItem[];
	readonly done: { readonly on: boolean; readonly title: string; readonly text: string; readonly next: string; readonly go: Act };
	readonly drop: { readonly on: boolean; readonly note: string };
	readonly title: string;
	readonly why: string;
	readonly whyWarn: boolean;
	readonly sub: string;
	readonly desc: string;
	readonly hasGroup: boolean;
	readonly chart: MpChart;
	readonly sugs: readonly { readonly title: string; readonly amount: string; readonly sub: string; readonly add: Act }[];
	readonly cfgs: readonly MpCfg[];
	readonly pane: readonly { readonly key: string; readonly name: string; readonly desc: string; readonly count: string; readonly total: string; readonly expanded: boolean; readonly toggle: Act }[];
	readonly paneRows: readonly MpPaneRow[];
	readonly edit: {
		readonly open: boolean;
		readonly title: string;
		readonly state: MpEditState | null;
		readonly fixed: boolean;
		readonly variable: boolean;
		readonly range: string;
		readonly pickDay: (day: number) => void;
		readonly pickLast: Act;
		readonly setAmt: (v: number) => void;
		readonly setGrace: (v: number) => void;
		readonly save: Act;
		readonly close: Act;
	};
	readonly fin: {
		readonly open: boolean;
		readonly items: readonly { readonly id: string; readonly payee: string; readonly date: string; readonly amount: string; readonly where: string }[];
		readonly sub: string;
		readonly close: Act;
		readonly go: Act;
	};
}
