// HaltedStep — incremental step 5, Halted. The halts: projections whose
// silence passed the threshold (a check ends them). The missed payments: a
// check keeps them as arrears.
import type { Component } from "solid-js";
import { SmallCheckbox } from "../../../../src/components/Checkbox";
import { MutedEmptyState } from "../../../../src/components/Feedback";
import { ContentStack } from "../../../../src/components/Layout";
import {
	col,
	FieldTable,
	intCol,
	textCol,
} from "../../../../src/components/Table/fields";
import {
	MutedBody,
	SectionTitle,
	TextBody,
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
) =>
	col<T>(
		"check",
		"",
		(r) => (
			<SmallCheckbox
				aria-label={`Check ${r.name}`}
				checked={checked().has(r.id)}
				onCheckedChange={() => onCheck(r.id)}
			/>
		),
		"selection",
	);

export const HaltedStep: Component<HaltedStepProps> = (props) => {
	const checked = () => props.checked;
	const halts = [
		checkCol<HaltRow>(checked, props.onCheck),
		col<HaltRow>(
			"name",
			"Group",
			(r) => <TextBody>{r.name}</TextBody>,
			"name20",
		),
		textCol<HaltRow>("proj"),
		textCol<HaltRow>("last"),
		intCol<HaltRow>((r) => days(r.gap), {
			id: "gap",
			header: "Usual gap",
			suffix: "days",
		}),
		intCol<HaltRow>((r) => days(r.threshold), {
			id: "threshold",
			header: "Threshold",
			suffix: "days",
		}),
		intCol<HaltRow>((r) => days(r.silence), {
			id: "silence",
			header: "Silence",
			suffix: "days",
			tone: (v, r) => (v > days(r.threshold) ? "danger" : "default"),
		}),
		col<HaltRow>(
			"goes",
			"Result",
			(r) => (
				<TextBody>{checked().has(r.id) ? r.goes : "keep expecting"}</TextBody>
			),
			"text15",
		),
	];
	const missed = [
		checkCol<MissedRow>(checked, props.onCheck),
		col<MissedRow>(
			"name",
			"Group",
			(r) => <TextBody>{r.name}</TextBody>,
			"name20",
		),
		textCol<MissedRow>("proj"),
		textCol<MissedRow>("missed"),
		textCol<MissedRow>("count"),
		textCol<MissedRow>("unpaid"),
		textCol<MissedRow>("note"),
		col<MissedRow>(
			"goes",
			"Result",
			(r) => <TextBody>{checked().has(r.id) ? r.goes : "drop"}</TextBody>,
			"text15",
		),
	];
	return (
		<ContentStack>
			<MutedBody>{props.data.summary}</MutedBody>
			{props.data.halts.length > 0 ? (
				<FieldTable
					data={[...props.data.halts]}
					fields={halts}
					registry={{}}
					maxRows={6}
				/>
			) : (
				<MutedEmptyState message="No projection went silent past its threshold." />
			)}
			<SectionTitle>MISSED · NOT YET HALTED</SectionTitle>
			{props.data.missed.length > 0 ? (
				<FieldTable
					data={[...props.data.missed]}
					fields={missed}
					registry={{}}
					maxRows={8}
				/>
			) : (
				<MutedEmptyState message="No payment was missed." />
			)}
		</ContentStack>
	);
};
