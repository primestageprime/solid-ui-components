// ============================================
// ManualProjectionDialogs — Composite (Depth 2). UNSTABLE: exported from `/unstable` only.
// Tags: shows:dialog, shows:field, shows:table, does:edit, does:submit, does:dismiss, data:schedule, role:overlay
// Promoted 2026-10-26 on the owner's word, pending Peter's review.
//
// The dialogs of the Manual (projection) step. `ManualEditConfigModal`
// edits one config: the day of the month (or the last day), the amount (a
// fixed config), the range (a variable config, read only) and the grace
// days. Enter saves. `ManualOneOffConfirm` asks before the step ends: the
// listed payments become one-off configs.
//
// No CSS. Composes Modal, LargePrimaryConfirmationModal, DayOfMonthPicker,
// CurrencyInput, ThemedNumberInput, BaseTable, GhostButton, PrimaryButton,
// ContentStack, TightStack and Text variants.
// ============================================
import type { Component } from "solid-js";
import { Show } from "solid-js";
import { GhostButton, PrimaryButton } from "../Button";
import { CurrencyInput } from "../CurrencyInput";
import { DayOfMonthPicker } from "../DayOfMonthPicker";
import { ContentStack, TightStack } from "../Layout";
import { LargePrimaryConfirmationModal, Modal } from "../Modal";
import { BaseTable } from "../Table";
import type { TableColumn } from "../Table/types";
import { MonoMeta, MonoValue, MutedBody, TextBody } from "../Text";
import { ThemedNumberInput } from "../ThemedNumberInput";
import type { ManualOneOffItem } from "./types";

/** A day of 30 or more means the last day of the month. */
export const MANUAL_LAST_DAY = 30;

export interface ManualEditConfigModalProps {
	readonly open: boolean;
	readonly title: string;
	/** 1–28, or 30 and up for the last day of the month. */
	readonly day: number;
	readonly amount: number;
	readonly grace: number;
	/** True shows the amount field. */
	readonly fixed: boolean;
	/** True shows the range line. */
	readonly variable: boolean;
	readonly range: string;
	readonly onPickDay: (day: number) => void;
	readonly onPickLast: () => void;
	readonly onAmount: (value: number) => void;
	readonly onGrace: (value: number) => void;
	readonly onSave: () => void;
	readonly onClose: () => void;
}

export const ManualEditConfigModal: Component<ManualEditConfigModalProps> = (
	props,
) => (
	<Modal
		open={props.open}
		onClose={props.onClose}
		title={props.title}
		onSubmit={props.onSave}
		footer={
			<>
				<GhostButton onClick={props.onClose}>Cancel</GhostButton>
				<PrimaryButton type="submit">Save</PrimaryButton>
			</>
		}
	>
		<ContentStack>
			<TightStack>
				<MonoMeta>Day of month</MonoMeta>
				<DayOfMonthPicker
					value={props.day >= MANUAL_LAST_DAY ? "last" : props.day}
					onChange={props.onPickDay}
					lastOfMonth
					onSelectLast={props.onPickLast}
				/>
			</TightStack>
			<Show when={props.variable}>
				<TightStack>
					<MonoMeta>Range</MonoMeta>
					<MonoValue>{props.range}</MonoValue>
				</TightStack>
			</Show>
			<Show when={props.fixed}>
				<CurrencyInput
					name="amount"
					label="Amount"
					step={100}
					maxValue={1_000_000}
					value={() => props.amount}
					onChange={(v) => props.onAmount(v ?? 0)}
				/>
			</Show>
			<ThemedNumberInput
				name="grace"
				label="Grace period (days)"
				min={0}
				max={30}
				maxValue={30}
				value={() => props.grace}
				onChange={(v) => props.onGrace(v ?? 0)}
			/>
		</ContentStack>
	</Modal>
);

const ONE_OFF_COLUMNS: TableColumn<ManualOneOffItem>[] = [
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

export interface ManualOneOffConfirmProps {
	readonly open: boolean;
	/** The line under the title. */
	readonly sub: string;
	readonly items: readonly ManualOneOffItem[];
	readonly onClose: () => void;
	readonly onConfirm: () => void;
}

export const ManualOneOffConfirm: Component<ManualOneOffConfirmProps> = (
	props,
) => (
	<LargePrimaryConfirmationModal
		open={props.open}
		onClose={props.onClose}
		onConfirm={props.onConfirm}
		title="These items will be treated as one-off configs. Is that OK?"
		description={props.sub}
		confirmLabel="Continue"
		cancelLabel="Go back"
	>
		<BaseTable compact data={[...props.items]} columns={ONE_OFF_COLUMNS} />
	</LargePrimaryConfirmationModal>
);
