// The view-model shape of a prototype import board, as the benches read it.
// The board script (initial-board.gen.js, incremental-board.gen.js) is plain
// JavaScript. Its renderVals() returns many more keys; this file declares only
// the keys that import-kit/adapt.ts and the benches use. When the board
// changes a key, change it here too.

/** A board handler. Most take no argument; a few read `e.target.value`. */
export type Act = () => void;
export type ValueAct = (e: {
	readonly target: { readonly value: string };
}) => void;

export interface BBadge {
	readonly t: string;
	readonly tone: string;
	readonly tip: string;
}

export interface BPay {
	readonly d: string;
	readonly payee?: string;
	readonly score?: string;
	readonly amt: string;
}

export interface BTierRow {
	readonly cid: string;
	readonly name: string;
	readonly checked: boolean;
	readonly badges?: readonly BBadge[];
	readonly score?: string;
	readonly lead?: string;
	readonly count: string;
	readonly total?: string;
	readonly goes?: string;
	readonly list?: readonly BPay[];
	readonly toggle: Act;
}

export interface BLeft {
	readonly payee: string;
	readonly date: string;
	readonly amt: string;
	readonly score?: string;
	readonly badges?: readonly BBadge[];
}

export interface BTune {
	readonly key: string;
	readonly label: string;
	readonly min: string;
	readonly max: string;
	readonly value: string;
	readonly text: string;
	readonly set: (v: number) => void;
}

export interface BSug {
	readonly name: string;
	readonly add: Act;
}

export interface BQueueRow {
	readonly on: boolean;
	readonly pos: string;
	readonly payee: string;
	readonly date: string;
	readonly amt: string;
	readonly badge: string;
	readonly tip: string;
	readonly tipId: string;
	readonly pick: Act;
	readonly ignore: Act;
	readonly quick: readonly { readonly name: string; readonly add: Act }[];
	readonly sugs?: readonly BSug[];
}

export interface BIgnored {
	readonly payee: string;
	readonly amt: string;
	readonly hasBadge?: boolean;
	readonly badge?: string;
	readonly tip?: string;
	readonly tipId?: string;
	readonly unignore?: Act;
}

export interface BGroupRef {
	readonly name: string;
	readonly count: string;
}

export interface BInputSug {
	readonly label: string;
	readonly pick: Act;
}

export interface BPropRow {
	readonly key?: string;
	readonly cid?: string;
	readonly anc: readonly string[];
	readonly isSide?: boolean;
	readonly isCat?: boolean;
	readonly isGroup?: boolean;
	readonly isHalt?: boolean;
	readonly name: string;
	readonly kind?: string;
	readonly amount?: string;
	readonly cadence?: string;
	readonly count?: string;
	readonly total?: string;
	readonly last?: string;
	readonly checked?: boolean;
	readonly list?: readonly BPay[];
	readonly toggle?: Act;
}

export interface BHaltedProp {
	readonly cid: string;
	readonly name: string;
	readonly checked: boolean;
	readonly kind: string;
	readonly amount: string;
	readonly cadence: string;
	readonly count: string;
	readonly total: string;
	readonly last: string;
	readonly list?: readonly BPay[];
	readonly toggle: Act;
}

export interface BChangeRow {
	readonly cid: string;
	readonly checked: boolean;
	readonly name: string;
	readonly group: string;
	readonly kind: string;
	readonly proj: string;
	readonly from: string;
	readonly to: string;
	readonly badges: readonly BBadge[];
	readonly count: string;
	readonly list: readonly BPay[];
	readonly goes: string;
	readonly toggle: Act;
}

export interface BHaltRow {
	readonly cid: string;
	readonly checked: boolean;
	readonly name: string;
	readonly proj: string;
	readonly last: string;
	readonly gap: string;
	readonly threshold: string;
	readonly silence: string;
	readonly goes: string;
	readonly toggle: Act;
}

export interface BMissRow {
	readonly cid: string;
	readonly checked: boolean;
	readonly name: string;
	readonly proj: string;
	readonly missed: string;
	readonly count: string;
	readonly unpaid: string;
	readonly last: string;
	readonly note: string;
	readonly goes: string;
	readonly toggle: Act;
}

export interface BStat {
	readonly label: string;
	readonly value: string;
	readonly sub: string;
}

// ---------- the Manual step ----------
export interface BSideItem {
	readonly clickable: boolean;
	readonly name: string;
	readonly note: string;
	readonly current: string;
	readonly pick?: Act | null;
}

export interface BSection {
	readonly title: string;
	readonly count: string;
	readonly emptyText: string;
	readonly items: readonly BSideItem[];
}

/** A drawn mark. The board gives its geometry as a CSS text. */
export interface BMark {
	readonly style: string;
	readonly enter?: Act;
	readonly leave?: Act;
}

export interface BSlotPart extends BMark {
	readonly cls: string;
}

export interface BSlot {
	readonly parts: readonly BSlotPart[];
	readonly missing: boolean;
	readonly catchup: boolean;
	readonly title: string;
	readonly style: string;
}

export interface BLane {
	readonly name: string;
	readonly sub: string;
	readonly h: number;
	readonly slots: readonly BSlot[];
	readonly bars: readonly BMark[];
	readonly links: readonly BMark[];
}

export interface BHead {
	readonly label: string;
	readonly style: string;
}

export interface BMSug {
	readonly title: string;
	readonly amount: string;
	readonly sub: string;
	readonly add: Act;
}

export interface BCfg {
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

export interface BPaneRow extends BMark {
	readonly date: string;
	readonly slot: string;
	readonly amount: string;
	readonly of: string;
	readonly color: string;
}

export interface BPaneGroup {
	readonly name: string;
	readonly desc: string;
	readonly count: string;
	readonly total: string;
	readonly shown: readonly BPaneRow[];
	readonly expanded: string;
	readonly toggle: Act;
}

export interface BDay {
	readonly label: string;
	readonly sel: string;
	readonly pick: Act;
}

export interface BFinItem {
	readonly payee: string;
	readonly date: string;
	readonly amount: string;
	readonly where: string;
}

export interface BoardVals {
	readonly steps: readonly {
		readonly label: string;
		readonly done: boolean;
		/** "step" on the current step, else "false". */
		readonly current: string;
	}[];
	readonly back: Act;
	readonly next: Act;
	readonly adv: boolean;
	readonly toggleAdv: Act;
	// Auto group
	readonly aSummary: string;
	readonly scoreHead: string;
	readonly looks: readonly BTierRow[];
	readonly plains?: readonly BTierRow[];
	readonly plainTitle?: string;
	readonly plainSub?: string;
	readonly adds?: readonly BTierRow[];
	readonly news?: readonly BTierRow[];
	readonly aLeft: readonly BLeft[];
	readonly tune: readonly BTune[];
	readonly resetTune: Act;
	// Manual group
	readonly sub: string;
	readonly rows: readonly BQueueRow[];
	readonly pinned: readonly BGroupRef[];
	readonly others: readonly BGroupRef[];
	readonly ignoredList: readonly BIgnored[];
	readonly undo: Act;
	readonly noUndo: boolean;
	readonly undoLabel: string;
	readonly suggestions: readonly BInputSug[];
	// Proposals
	readonly pRows: readonly BPropRow[];
	readonly pHalted?: readonly BHaltedProp[];
	readonly pSummary: string;
	readonly haltedTitle?: string;
	// Changed and Halted (incremental)
	readonly chRows?: readonly BChangeRow[];
	readonly chSummary?: string;
	readonly haRows?: readonly BHaltRow[];
	readonly miRows?: readonly BMissRow[];
	readonly haSummary?: string;
	// Manual
	readonly mSections: readonly BSection[];
	readonly mHasGroup: boolean;
	readonly mDone: boolean;
	readonly mDoneGo: Act;
	readonly mDoneTitle: string;
	readonly mDoneText: string;
	readonly mDoneNext: string;
	readonly mTitle: string;
	readonly mSub: string;
	readonly mDesc: string;
	readonly mWhy: string;
	readonly mWhyStyle: string;
	readonly mDropSome: boolean;
	readonly mDropNote: string;
	readonly trackW: string;
	readonly mHeads: readonly BHead[];
	readonly mGrid: readonly BMark[];
	readonly mLanes: readonly BLane[];
	readonly unBoxes: readonly BMark[];
	readonly unBars: readonly BMark[];
	readonly unLaneH: string;
	readonly unTotal: string;
	readonly mSugs: readonly BMSug[];
	readonly mCfgs: readonly BCfg[];
	readonly mPane: readonly BPaneGroup[];
	readonly edOpen: boolean;
	readonly edTitle: string;
	readonly edClose: Act;
	readonly edSave: Act;
	readonly days: readonly BDay[];
	readonly pickLast: Act;
	readonly edIsFixed: boolean;
	readonly edIsVar: boolean;
	readonly edRange: string;
	readonly edOnAmt: ValueAct;
	readonly edOnGrace: ValueAct;
	readonly finOpen: boolean;
	readonly finItems: readonly BFinItem[];
	readonly finSub: string;
	readonly finClose: Act;
	readonly toSummary: Act;
	readonly sumStats: readonly BStat[];
}

/** The board's state. The benches read and set only a few keys. */
export interface BoardState {
	readonly stage?: string;
	readonly edit?: {
		readonly day: number;
		readonly amt: number;
		readonly grace: number;
	} | null;
	readonly [key: string]: unknown;
}

export interface BoardInstance {
	state: BoardState;
	setState: (patch: Partial<BoardState>) => void;
	renderVals: () => BoardVals;
}

/** The DCLogic base class that the board extends. */
export type DCLogicBase = new (
	props: Record<string, unknown>,
) => {
	state: BoardState;
	setState: (patch: Partial<BoardState>) => void;
};

export type BoardClass = new (props: Record<string, unknown>) => BoardInstance;

export type MakeBoard = (base: DCLogicBase) => BoardClass;
