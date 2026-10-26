// ============================================
// PaymentsPopover — Composite (Depth 2). UNSTABLE: exported from `/unstable` only.
// Tags: shows:count, shows:tooltip, shows:table, does:hover, data:list, role:inline
// Promoted 2026-10-26 on the owner's word, pending Peter's review.
//
// A payment count. A hover shows the payments in a compact table. The Payee
// and Sure columns show only when a payment has a value for them.
//
// No CSS. Composes PopoverTooltip, BaseTable, MonoValue and TextBody.
// ============================================
import type { Component } from "solid-js";
import { some } from "../../fn";
import { BaseTable } from "../Table";
import type { TableColumn } from "../Table/types";
import { MonoValue, TextBody } from "../Text";
import { PopoverTooltip } from "../Tooltip";

/** One payment, as display text. */
export interface PaymentLine {
	readonly date: string;
	/** Empty when every payment has the same payee. */
	readonly payee: string;
	/** How sure the match is. Empty to leave the column out. */
	readonly score: string;
	readonly amount: string;
}

export interface PaymentsPopoverProps {
	/** The count text, e.g. "12". */
	readonly count: string;
	readonly payments: readonly PaymentLine[];
}

const hasPayee = (list: readonly PaymentLine[]): boolean =>
	some((p: PaymentLine) => p.payee !== "", list);
const hasScore = (list: readonly PaymentLine[]): boolean =>
	some((p: PaymentLine) => p.score !== "", list);

const columnsFor = (
	list: readonly PaymentLine[],
): TableColumn<PaymentLine>[] => [
	{ id: "date", header: "Date", accessor: (p) => p.date },
	...(hasPayee(list)
		? [
				{
					id: "payee",
					header: "Payee",
					accessor: (p: PaymentLine) => p.payee,
				},
			]
		: []),
	...(hasScore(list)
		? [
				{
					id: "score",
					header: "Sure",
					accessor: (p: PaymentLine) => p.score,
					align: "right" as const,
				},
			]
		: []),
	{
		id: "amount",
		header: "Amount",
		align: "right",
		accessor: (p) => <MonoValue>{p.amount}</MonoValue>,
	},
];

export const PaymentsPopover: Component<PaymentsPopoverProps> = (props) => (
	<PopoverTooltip
		content={
			<BaseTable
				compact
				data={[...props.payments]}
				columns={columnsFor(props.payments)}
			/>
		}
	>
		<TextBody>{props.count}</TextBody>
	</PopoverTooltip>
);
