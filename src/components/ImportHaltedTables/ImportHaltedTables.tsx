// ============================================
// ImportHaltedTables — Composite (Depth 2). UNSTABLE: exported from `/unstable` only.
// Tags: shows:table, shows:empty, does:select, data:table, role:section
// Promoted 2026-10-26 on the owner's word, pending Peter's review.
//
// The Halted step of a later import: two tables. The halts are projections
// whose silence passed the threshold; a check ends them. The missed payments
// are not yet halted; a check keeps them as arrears. An `overdue` silence
// shows in danger ink. An empty table shows an empty state. BaseTable, not
// FieldTable: FieldTable caps its width, so the two tables would not fill
// the pane.
//
// No CSS. Composes BaseTable, SmallCheckbox, InlineText, MutedEmptyState,
// ContentStack and Text variants.
// ============================================
import type { Component } from "solid-js";
import { SmallCheckbox } from "../Checkbox";
import { MutedEmptyState } from "../Feedback";
import { InlineText } from "../InlineText";
import { ContentStack } from "../Layout";
import { BaseTable } from "../Table";
import type { TableColumn } from "../Table/types";
import { MonoValue, MutedBody, SectionTitle } from "../Text";

/** One projection that went silent. */
export interface ImportHaltRow {
	readonly id: string;
	readonly name: string;
	readonly projection: string;
	readonly last: string;
	readonly gap: string;
	readonly threshold: string;
	readonly silence: string;
	/** True when the silence is longer than the threshold. */
	readonly overdue: boolean;
	/** The result text when checked. Unchecked reads "keep expecting". */
	readonly result: string;
}

/** One missed payment, not yet halted. */
export interface ImportMissedRow {
	readonly id: string;
	readonly name: string;
	readonly projection: string;
	readonly missed: string;
	readonly count: string;
	readonly unpaid: string;
	readonly note: string;
	/** The result text when checked. Unchecked reads "drop". */
	readonly result: string;
}

export interface ImportHaltedTablesProps {
	readonly summary: string;
	readonly halts: readonly ImportHaltRow[];
	readonly missed: readonly ImportMissedRow[];
	/** Ids of the checked rows of both tables. */
	readonly checked: ReadonlySet<string>;
	readonly onCheck: (id: string) => void;
}

const checkCol = <T extends { id: string; name: string }>(
	checked: () => ReadonlySet<string>,
	onCheck: (id: string) => void,
): TableColumn<T> => ({
	id: "check",
	header: "",
	accessor: (r) => (
		<SmallCheckbox
			aria-label={`Check ${r.name}`}
			checked={checked().has(r.id)}
			onCheckedChange={() => onCheck(r.id)}
		/>
	),
});

const text = <T,>(id: keyof T & string, header: string): TableColumn<T> => ({
	id,
	header,
	accessor: (r) => String(r[id]),
});

const mono = <T,>(id: keyof T & string, header: string): TableColumn<T> => ({
	id,
	header,
	align: "right",
	accessor: (r) => <MonoValue>{String(r[id])}</MonoValue>,
});

export const ImportHaltedTables: Component<ImportHaltedTablesProps> = (
	props,
) => {
	const checked = () => props.checked;
	const halts = (): TableColumn<ImportHaltRow>[] => [
		checkCol<ImportHaltRow>(checked, props.onCheck),
		text<ImportHaltRow>("name", "Group"),
		text<ImportHaltRow>("projection", "Projection"),
		text<ImportHaltRow>("last", "Last payment"),
		mono<ImportHaltRow>("gap", "Usual gap"),
		mono<ImportHaltRow>("threshold", "Threshold"),
		{
			id: "silence",
			header: "Silence",
			align: "right",
			accessor: (r) => (
				<InlineText tone={r.overdue ? "danger" : "default"}>
					{r.silence}
				</InlineText>
			),
		},
		{
			id: "result",
			header: "Result",
			accessor: (r) => (checked().has(r.id) ? r.result : "keep expecting"),
		},
	];
	const missed = (): TableColumn<ImportMissedRow>[] => [
		checkCol<ImportMissedRow>(checked, props.onCheck),
		text<ImportMissedRow>("name", "Group"),
		text<ImportMissedRow>("projection", "Projection"),
		text<ImportMissedRow>("missed", "Missed"),
		text<ImportMissedRow>("count", "Count"),
		mono<ImportMissedRow>("unpaid", "Unpaid"),
		text<ImportMissedRow>("note", "Note"),
		{
			id: "result",
			header: "Result",
			accessor: (r) => (checked().has(r.id) ? r.result : "drop"),
		},
	];
	return (
		<ContentStack>
			<MutedBody>{props.summary}</MutedBody>
			{props.halts.length > 0 ? (
				<BaseTable compact data={[...props.halts]} columns={halts()} />
			) : (
				<MutedEmptyState message="No projection went silent past its threshold." />
			)}
			<SectionTitle>MISSED · NOT YET HALTED</SectionTitle>
			{props.missed.length > 0 ? (
				<BaseTable compact data={[...props.missed]} columns={missed()} />
			) : (
				<MutedEmptyState message="No payment was missed." />
			)}
		</ContentStack>
	);
};
