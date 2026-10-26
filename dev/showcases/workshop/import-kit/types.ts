// View types for the import benches. import-kit/adapt.ts maps the live
// prototype board (import-kit/live) to these types. Every text value is display
// text that the board computed; every function is a board handler.

import type { PaymentLine } from "../../../../src/components/PaymentsPopover";
import type { ScoreBadgeData } from "../../../../src/components/ScoreBadge";

import type {
	ImportAutoView,
	ImportIgnoredLine,
	ImportTuneBar,
	ImportUngroupedRow,
} from "../../../../src/components/ImportAutoStep";
import type { ImportChangedRow } from "../../../../src/components/ImportChangedTable";
import type {
	ImportHaltRow,
	ImportMissedRow,
} from "../../../../src/components/ImportHaltedTables";
import type {
	ManualGroupRef,
	ManualGroupView,
} from "../../../../src/components/ImportManualGroupStep";
import type {
	ProposalsData as ImportProposalsData,
	ProposalHaltedGroup,
	ProposalNode,
} from "../../../../src/components/ImportProposalsTree";
import type { ImportSummaryStat } from "../../../../src/components/ImportSummaryGrid";
import type {
	ImportTier,
	ImportTierRow,
} from "../../../../src/components/ImportTierTable";

export type Badge = ScoreBadgeData;
/** A tier row with the board's start check. */
export type TierRow = ImportTierRow & { readonly checked: boolean };
export type Tier = Omit<ImportTier, "rows"> & { readonly rows: readonly TierRow[] };
export type UngroupedRow = ImportUngroupedRow;
export type TuneBar = ImportTuneBar;
export type IgnoredAgain = ImportIgnoredLine;
export type AutoView = Omit<ImportAutoView, "tiers"> & {
	readonly tiers: readonly Tier[];
};
export type SummaryStat = ImportSummaryStat;

export type { ProposalNode };
/** A halted group with the board's start check. */
export type HaltedGroup = ProposalHaltedGroup & { readonly checked: boolean };
export type ProposalsData = Omit<ImportProposalsData, "halted"> & {
	readonly halted: readonly HaltedGroup[];
};

export type ChangedRow = ImportChangedRow & {
	readonly checked: boolean;
	readonly group: string;
	readonly kind: string;
};
export interface ChangedData {
	readonly summary: string;
	readonly rows: readonly ChangedRow[];
}

export type HaltRow = ImportHaltRow & { readonly checked: boolean };
export type MissedRow = ImportMissedRow & {
	readonly checked: boolean;
	readonly last: string;
};
export interface HaltedData {
	readonly summary: string;
	readonly halts: readonly HaltRow[];
	readonly missed: readonly MissedRow[];
}

export type GroupRef = ManualGroupRef;
/** The Manual group view, plus the groups the user made in this step. */
export type MgView = ManualGroupView & { readonly created: readonly string[] };
export type Payment = PaymentLine;







/** One view in the default mode and one in the advanced mode. */
export interface Modes<T> {
	readonly base: T;
	readonly adv: T;
}












// ---------- Manual group (live) ----------



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
	/** The money came late (inside a later window day) or as a catch-up. */
	readonly late: boolean;
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
