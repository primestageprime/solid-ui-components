// Fixture types for the import benches. The fixtures come from the
// thorcasting prototype boards (prototypes/import-canvas/sui-fixtures/dump.js).
// Every value is display text that the prototype computed.

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

export interface QueuePayment {
	readonly id: string;
	readonly payee: string;
	readonly date: string;
	readonly amt: string;
	readonly badge: string;
	readonly tip: string;
	readonly sugs: readonly string[];
}

export interface GroupRef {
	readonly name: string;
	readonly count: number;
}

export interface IgnoredPayment {
	readonly id: string;
	readonly payee: string;
	readonly amt: string;
	readonly badge: string;
	readonly tip: string;
}

export interface ManualGroupData {
	readonly sub: string;
	readonly queue: readonly QueuePayment[];
	readonly groups: readonly GroupRef[];
	readonly ignored: readonly IgnoredPayment[];
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

export interface InitialBoard {
	readonly steps: readonly string[];
	readonly auto: Modes<AutoView>;
	readonly manualGroup: ManualGroupData;
	readonly proposals: ProposalsData;
	readonly summary: readonly SummaryStat[];
}

export interface IncrementalData extends InitialBoard {
	readonly changed: Modes<ChangedData>;
	readonly halted: HaltedData;
}

export interface IncrementalBoard {
	readonly full: IncrementalData;
	readonly quiet: IncrementalData;
}
