// HaltedStep — incremental step 5, Halted. The halts: projections whose
// silence passed the threshold (a check ends them). The missed payments: a
// check keeps them as arrears.
// BaseTable, not FieldTable: FieldTable caps its width at the sum of its column
// maxima, so the two tables would not both fill the pane.
import type { Component } from "solid-js";
import { SmallCheckbox } from "../../../../src/components/Checkbox";
import { MutedEmptyState } from "../../../../src/components/Feedback";
import { InlineText } from "../../../../src/components/InlineText";
import { ContentStack } from "../../../../src/components/Layout";
import { BaseTable } from "../../../../src/components/Table";
import type { TableColumn } from "../../../../src/components/Table/types";
import {
	MonoValue,
	MutedBody,
	SectionTitle,
} from "../../../../src/components/Text";
import type { HaltedData, HaltRow, MissedRow } from "./types";

/** "107 days" → 107. */
export const days = (text: string): number => Number.parseInt(text, 10) || 0;

export interface HaltedStepProps {
	readonly data: HaltedData;
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

export const HaltedStep: Component<HaltedStepProps> = (props) => {
	const checked = () => props.checked;
	const halts = (): TableColumn<HaltRow>[] => [
		checkCol<HaltRow>(checked, props.onCheck),
		text<HaltRow>("name", "Group"),
		text<HaltRow>("proj", "Projection"),
		text<HaltRow>("last", "Last payment"),
		{
			id: "gap",
			header: "Usual gap",
			align: "right",
			accessor: (r) => <MonoValue>{r.gap}</MonoValue>,
		},
		{
			id: "threshold",
			header: "Threshold",
			align: "right",
			accessor: (r) => <MonoValue>{r.threshold}</MonoValue>,
		},
		{
			id: "silence",
			header: "Silence",
			align: "right",
			accessor: (r) => (
				<InlineText
					tone={days(r.silence) > days(r.threshold) ? "danger" : "default"}
				>
					{r.silence}
				</InlineText>
			),
		},
		{
			id: "goes",
			header: "Result",
			accessor: (r) => (checked().has(r.id) ? r.goes : "keep expecting"),
		},
	];
	const missed = (): TableColumn<MissedRow>[] => [
		checkCol<MissedRow>(checked, props.onCheck),
		text<MissedRow>("name", "Group"),
		text<MissedRow>("proj", "Projection"),
		text<MissedRow>("missed", "Missed"),
		text<MissedRow>("count", "Count"),
		{
			id: "unpaid",
			header: "Unpaid",
			align: "right",
			accessor: (r) => <MonoValue>{r.unpaid}</MonoValue>,
		},
		text<MissedRow>("note", "Note"),
		{
			id: "goes",
			header: "Result",
			accessor: (r) => (checked().has(r.id) ? r.goes : "drop"),
		},
	];
	return (
		<ContentStack>
			<MutedBody>{props.data.summary}</MutedBody>
			{props.data.halts.length > 0 ? (
				<BaseTable compact data={[...props.data.halts]} columns={halts()} />
			) : (
				<MutedEmptyState message="No projection went silent past its threshold." />
			)}
			<SectionTitle>MISSED · NOT YET HALTED</SectionTitle>
			{props.data.missed.length > 0 ? (
				<BaseTable compact data={[...props.data.missed]} columns={missed()} />
			) : (
				<MutedEmptyState message="No payment was missed." />
			)}
		</ContentStack>
	);
};
