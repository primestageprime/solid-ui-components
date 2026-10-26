// The Manual step's dialogs: edit one config, and the one-off confirm when
// the user leaves the step. Each control calls the board's own handler.
import { type Component, Show } from "solid-js";
import { GhostButton, PrimaryButton } from "../../../../src/components/Button";
import { CurrencyInput } from "../../../../src/components/CurrencyInput";
import { DayOfMonthPicker } from "../../../../src/components/DayOfMonthPicker";
import { ContentStack, TightStack } from "../../../../src/components/Layout";
import {
	LargePrimaryConfirmationModal,
	Modal,
} from "../../../../src/components/Modal";
import { BaseTable } from "../../../../src/components/Table";
import type { TableColumn } from "../../../../src/components/Table/types";
import {
	MonoMeta,
	MonoValue,
	MutedBody,
	TextBody,
} from "../../../../src/components/Text";
import { ThemedNumberInput } from "../../../../src/components/ThemedNumberInput";
import type { MpView } from "./types";

/** The board stores "last of month" as a day of 30 or more. */
const LAST = 30;

export const EditConfigModal: Component<{ edit: MpView["edit"] }> = (props) => {
	const st = () => props.edit.state;
	return (
		<Modal
			open={props.edit.open}
			onClose={props.edit.close}
			title={props.edit.title}
			onSubmit={props.edit.save}
			footer={
				<>
					<GhostButton onClick={props.edit.close}>Cancel</GhostButton>
					<PrimaryButton type="submit">Save</PrimaryButton>
				</>
			}
		>
			<Show when={st()}>
				{(s) => (
					<ContentStack>
						<TightStack>
							<MonoMeta>Day of month</MonoMeta>
							<DayOfMonthPicker
								value={s().day >= LAST ? "last" : s().day}
								onChange={props.edit.pickDay}
								lastOfMonth
								onSelectLast={props.edit.pickLast}
							/>
						</TightStack>
						<Show when={props.edit.variable}>
							<TightStack>
								<MonoMeta>Range</MonoMeta>
								<MonoValue>{props.edit.range}</MonoValue>
							</TightStack>
						</Show>
						<Show when={props.edit.fixed}>
							<CurrencyInput
								name="amount"
								label="Amount"
								step={100}
								maxValue={1_000_000}
								value={() => s().amt}
								onChange={(v) => props.edit.setAmt(v ?? 0)}
							/>
						</Show>
						<ThemedNumberInput
							name="grace"
							label="Grace period (days)"
							min={0}
							max={30}
							maxValue={30}
							value={() => s().grace}
							onChange={(v) => props.edit.setGrace(v ?? 0)}
						/>
					</ContentStack>
				)}
			</Show>
		</Modal>
	);
};

type FinItem = MpView["fin"]["items"][number];

const FIN_COLUMNS: TableColumn<FinItem>[] = [
	{
		id: "payee",
		header: "Payee",
		accessor: (f) => <TextBody>{f.payee}</TextBody>,
	},
	{
		id: "where",
		header: "Where",
		accessor: (f) => <MutedBody>{f.where}</MutedBody>,
	},
	{
		id: "date",
		header: "Date",
		accessor: (f) => <MonoValue>{f.date}</MonoValue>,
	},
	{
		id: "amount",
		header: "Amount",
		align: "right",
		accessor: (f) => <MonoValue>{f.amount}</MonoValue>,
	},
];

export const OneOffConfirm: Component<{ fin: MpView["fin"] }> = (props) => (
	<LargePrimaryConfirmationModal
		open={props.fin.open}
		onClose={props.fin.close}
		onConfirm={props.fin.go}
		title="These items will be treated as one-off configs. Is that OK?"
		description={props.fin.sub}
		confirmLabel="Continue"
		cancelLabel="Go back"
	>
		<BaseTable compact data={[...props.fin.items]} columns={FIN_COLUMNS} />
	</LargePrimaryConfirmationModal>
);
