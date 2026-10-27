// ============================================
// ImportChangedTable — Composite (Depth 3). UNSTABLE: exported from `/unstable` only.
// Tags: shows:table, shows:diff, shows:badge, does:select, data:table, role:section
// Promoted 2026-10-26 on the owner's word, pending Peter's review.
//
// The Changed step of a later import. Each row proposes a change to an
// existing projection: the old terms, the new terms, the evidence badges and
// the payments. A check applies the change; the Result column says "apply"
// or "keep as is". BaseTable, not FieldTable: FieldTable caps its width at
// the sum of its column maxima, so it cannot fill the pane.
//
// No CSS. Composes BaseTable, SmallCheckbox, BoldArrowDiffPair,
// ScoreBadgeList, PaymentsPopover, MutedEmptyState, ContentStack, TightStack
// and Text variants.
// ============================================
import type { Component } from "solid-js";
import { SmallCheckbox } from "../Checkbox";
import { BoldArrowDiffPair } from "../DiffPair";
import { MutedEmptyState } from "../Feedback";
import { ContentStack, TightStack } from "../Layout";
import { type PaymentLine, PaymentsPopover } from "../PaymentsPopover";
import { type ScoreBadgeData, ScoreBadgeList } from "../ScoreBadge";
import { BaseTable } from "../Table";
import type { TableColumn } from "../Table/types";
import { MutedBody, TextBody, TextSublabel } from "../Text";

/** One proposed change to an existing projection. */
export interface ImportChangedRow {
	readonly id: string;
	readonly name: string;
	/** The projection the change is for. */
	readonly projection: string;
	/** The old terms. */
	readonly from: string;
	/** The new terms. */
	readonly to: string;
	readonly badges: readonly ScoreBadgeData[];
	readonly count: string;
	readonly payments: readonly PaymentLine[];
}

export interface ImportChangedTableProps {
	readonly summary: string;
	readonly rows: readonly ImportChangedRow[];
	/** Ids of the checked (applied) rows. */
	readonly checked: ReadonlySet<string>;
	readonly onCheck: (id: string) => void;
}

export const ImportChangedTable: Component<ImportChangedTableProps> = (
	props,
) => {
	const columns = (): TableColumn<ImportChangedRow>[] => [
		{
			id: "check",
			header: "",
			accessor: (r) => (
				<SmallCheckbox
					aria-label={`Apply ${r.name}`}
					checked={props.checked.has(r.id)}
					onCheckedChange={() => props.onCheck(r.id)}
				/>
			),
		},
		{
			id: "name",
			header: "Change",
			accessor: (r) => (
				<TightStack>
					<TextBody>{r.name}</TextBody>
					<TextSublabel>{r.projection}</TextSublabel>
				</TightStack>
			),
		},
		{
			id: "diff",
			header: "Old → new",
			accessor: (r) => (
				<BoldArrowDiffPair
					before={<TextBody>{r.from}</TextBody>}
					after={<TextBody>{r.to}</TextBody>}
				/>
			),
		},
		{
			id: "badges",
			header: "Evidence",
			accessor: (r) => <ScoreBadgeList badges={r.badges} />,
		},
		{
			id: "payments",
			header: "Payments",
			accessor: (r) => <PaymentsPopover count={r.count} payments={r.payments} />,
		},
		{
			id: "result",
			header: "Result",
			accessor: (r) => (props.checked.has(r.id) ? "apply" : "keep as is"),
		},
	];
	return (
		<ContentStack>
			<MutedBody>{props.summary}</MutedBody>
			{props.rows.length > 0 ? (
				<BaseTable compact data={[...props.rows]} columns={columns()} />
			) : (
				<MutedEmptyState message="No existing projection needs a change." />
			)}
		</ContentStack>
	);
};
