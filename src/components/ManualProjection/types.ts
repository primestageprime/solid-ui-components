// ManualProjection display types. Every value is display text the consumer
// computed; the pieces only call back with a key.
import type { Tone } from "../../types";

/** One section of the group rail. */
export interface ManualRailSection {
	readonly key: string;
	readonly title: string;
	readonly tone: Tone;
	readonly emptyText: string;
}

/** One group in the rail. */
export interface ManualRailItem {
	readonly key: string;
	/** The key of its section. */
	readonly section: string;
	readonly name: string;
	readonly note: string;
	/** False for a row that only informs: a click does nothing. */
	readonly pickable: boolean;
}

/** One config group in the payments pane. */
export interface ManualPaneGroup {
	readonly key: string;
	readonly name: string;
	/** Shown when the group has no payments. */
	readonly desc: string;
	readonly count: string;
	readonly total: string;
	/** True starts the group open. */
	readonly expanded: boolean;
	/** True tints the count in warning ink (the unmatched group). */
	readonly warn: boolean;
}

/** One payment in the payments pane. */
export interface ManualPaneRow {
	readonly key: string;
	/** The key of its pane group. */
	readonly group: string;
	readonly date: string;
	readonly slot: string;
	readonly amount: string;
	/** Text after the amount, e.g. " of $7,000". */
	readonly of: string;
	/**
	 * The amount's ink by meaning, e.g. success for on time, warning for late
	 * or unmatched. Default "default".
	 */
	readonly tone?: Tone;
}

/** A new config the consumer suggests. */
export interface ManualSuggestion {
	readonly key: string;
	readonly title: string;
	readonly amount: string;
	readonly sub: string;
}

/** A config of the open group. */
export interface ManualConfig {
	readonly key: string;
	readonly name: string;
	readonly amount: string;
	readonly sub: string;
	/** The edit button's label, e.g. "Edit Retainer". */
	readonly editLabel: string;
	/** The delete button's label, e.g. "Delete Retainer". */
	readonly deleteLabel: string;
}

/** The "review is done" alert. */
export interface ManualDoneNotice {
	readonly title: string;
	readonly text: string;
	/** The button label, e.g. "Next: Summary". */
	readonly next: string;
}

/** One payment the one-off confirm lists. */
export interface ManualOneOffItem {
	readonly id: string;
	readonly payee: string;
	readonly where: string;
	readonly date: string;
	readonly amount: string;
}
