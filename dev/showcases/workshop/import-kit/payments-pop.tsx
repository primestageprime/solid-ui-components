// PaymentsPop — a payment count. A hover shows the payments in a compact table.
import type { Component } from "solid-js";
import { BaseTable } from "../../../../src/components/Table";
import type { TableColumn } from "../../../../src/components/Table/types";
import { MonoValue, TextBody } from "../../../../src/components/Text";
import { PopoverTooltip } from "../../../../src/components/Tooltip";
import type { Payment } from "./types";

const hasPayee = (list: readonly Payment[]): boolean =>
	list.some((p) => p.payee !== "");
const hasScore = (list: readonly Payment[]): boolean =>
	list.some((p) => p.score !== "");

const columnsFor = (list: readonly Payment[]): TableColumn<Payment>[] => [
	{ id: "d", header: "Date", accessor: (p) => p.d },
	...(hasPayee(list)
		? [{ id: "payee", header: "Payee", accessor: (p: Payment) => p.payee }]
		: []),
	...(hasScore(list)
		? [
				{
					id: "score",
					header: "Sure",
					accessor: (p: Payment) => p.score,
					align: "right" as const,
				},
			]
		: []),
	{
		id: "amt",
		header: "Amount",
		align: "right",
		accessor: (p) => <MonoValue>{p.amt}</MonoValue>,
	},
];

export const PaymentsPop: Component<{
	count: string;
	list: readonly Payment[];
}> = (props) => (
	<PopoverTooltip
		content={
			<BaseTable
				compact
				data={[...props.list]}
				columns={columnsFor(props.list)}
			/>
		}
	>
		<TextBody>{props.count}</TextBody>
	</PopoverTooltip>
);
