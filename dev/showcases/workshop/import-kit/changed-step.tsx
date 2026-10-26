// ChangedStep — incremental step 4, Changed. Each row proposes a change to an
// existing projection: the old terms, the new terms, the evidence badges and
// the payments. A check applies the change.
import type { Component } from "solid-js";
import { SmallCheckbox } from "../../../../src/components/Checkbox";
import { BoldArrowDiffPair } from "../../../../src/components/DiffPair";
import { MutedEmptyState } from "../../../../src/components/Feedback";
import { ContentStack, TightStack } from "../../../../src/components/Layout";
import { col, FieldTable } from "../../../../src/components/Table/fields";
import {
	MutedBody,
	TextBody,
	TextSublabel,
} from "../../../../src/components/Text";
import { PaymentsPop } from "./payments-pop";
import { BadgeList } from "./score-badge";
import type { ChangedData, ChangedRow } from "./types";

export interface ChangedStepProps {
	readonly data: ChangedData;
	readonly checked: ReadonlySet<string>;
	readonly onCheck: (id: string) => void;
}

export const ChangedStep: Component<ChangedStepProps> = (props) => {
	const fields = [
		col<ChangedRow>(
			"check",
			"",
			(r) => (
				<SmallCheckbox
					aria-label={`Apply ${r.name}`}
					checked={props.checked.has(r.id)}
					onCheckedChange={() => props.onCheck(r.id)}
				/>
			),
			"selection",
		),
		col<ChangedRow>(
			"name",
			"Change",
			(r) => (
				<TightStack>
					<TextBody>{r.name}</TextBody>
					<TextSublabel>{r.proj}</TextSublabel>
				</TightStack>
			),
			"name30",
		),
		col<ChangedRow>(
			"diff",
			"Old → new",
			(r) => (
				<BoldArrowDiffPair
					before={<TextBody>{r.from}</TextBody>}
					after={<TextBody>{r.to}</TextBody>}
				/>
			),
			"text20",
		),
		col<ChangedRow>(
			"badges",
			"Evidence",
			(r) => <BadgeList badges={r.badges} />,
			"text20",
		),
		col<ChangedRow>(
			"payments",
			"Payments",
			(r) => <PaymentsPop count={r.count} list={r.list} />,
			"text10",
		),
		col<ChangedRow>(
			"goes",
			"Result",
			(r) => (
				<TextBody>{props.checked.has(r.id) ? "apply" : "keep as is"}</TextBody>
			),
			"text10",
		),
	];
	return (
		<ContentStack>
			<MutedBody>{props.data.summary}</MutedBody>
			{props.data.rows.length > 0 ? (
				<FieldTable
					data={[...props.data.rows]}
					fields={fields}
					registry={{}}
					maxRows={8}
				/>
			) : (
				<MutedEmptyState message="No existing projection needs a change." />
			)}
		</ContentStack>
	);
};
