// ChangedStep — incremental step 4, Changed. Each row proposes a change to an
// existing projection: the old terms, the new terms, the evidence badges and
// the payments. A check applies the change.
// BaseTable, not FieldTable: FieldTable caps its width at the sum of its column
// maxima, so it cannot fill the pane the way the Auto group table does.
import type { Component } from "solid-js";
import { SmallCheckbox } from "../../../../src/components/Checkbox";
import { BoldArrowDiffPair } from "../../../../src/components/DiffPair";
import { MutedEmptyState } from "../../../../src/components/Feedback";
import { ContentStack, TightStack } from "../../../../src/components/Layout";
import { BaseTable } from "../../../../src/components/Table";
import type { TableColumn } from "../../../../src/components/Table/types";
import {
	MutedBody,
	TextBody,
	TextSublabel,
} from "../../../../src/components/Text";
import { PaymentsPopover } from "../../../../src/components/PaymentsPopover";
import { ScoreBadgeList as BadgeList } from "../../../../src/components/ScoreBadge";
import type { ChangedData, ChangedRow } from "./types";

export interface ChangedStepProps {
	readonly data: ChangedData;
	readonly checked: ReadonlySet<string>;
	readonly onCheck: (id: string) => void;
}

export const ChangedStep: Component<ChangedStepProps> = (props) => {
	const columns = (): TableColumn<ChangedRow>[] => [
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
					<TextSublabel>{r.proj}</TextSublabel>
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
			accessor: (r) => <BadgeList badges={r.badges} />,
		},
		{
			id: "payments",
			header: "Payments",
			accessor: (r) => <PaymentsPopover count={r.count} payments={r.list} />,
		},
		{
			id: "goes",
			header: "Result",
			accessor: (r) => (props.checked.has(r.id) ? "apply" : "keep as is"),
		},
	];
	return (
		<ContentStack>
			<MutedBody>{props.data.summary}</MutedBody>
			{props.data.rows.length > 0 ? (
				<BaseTable compact data={[...props.data.rows]} columns={columns()} />
			) : (
				<MutedEmptyState message="No existing projection needs a change." />
			)}
		</ContentStack>
	);
};
