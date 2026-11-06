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
// The edit modal is laid out like a Configure kind form (thorcasting #4372,
// Peter's screenshot 2026-11-06: the full day grid filled the dialog and
// squeezed Amount and Grace to a sliver). One wrapping row of compact
// controls, each under its sublabel: the day is a `DayOfMonthField` (reads
// "5th", opens the grid in a popover), the amount a `CurrencyInputByScale`
// (arrows at the scale of the money, #4376), the grace days a fitted
// `ThemedNumberInput`. Same props as before.
//
// No CSS. Composes Modal, LargePrimaryConfirmationModal, DayOfMonthField,
// CurrencyInputByScale, ThemedNumberInput, BaseTable, GhostButton,
// PrimaryButton, LooseWrapRow, TightStack and Text variants.
// ============================================
import type { Component, JSX } from "solid-js";
import { Show } from "solid-js";
import { GhostButton, PrimaryButton } from "../Button";
import { CurrencyInputByScale } from "../CurrencyInput";
import { DayOfMonthField } from "../PopoverField";
import { LooseWrapRow, TightStack } from "../Layout";
import { LargePrimaryConfirmationModal, Modal } from "../Modal";
import { BaseTable } from "../Table";
import type { TableColumn } from "../Table/types";
import { MonoMeta, MonoValue, MutedBody, TextBody, TextSublabel } from "../Text";
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

/** One labelled field of the edit modal: its sublabel over the control. */
const EditField: Component<{
	readonly label: string;
	readonly children: JSX.Element;
}> = (props) => (
	<TightStack>
		<TextSublabel>{props.label}</TextSublabel>
		{props.children}
	</TightStack>
);

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
		<LooseWrapRow>
			<EditField label="Day of month">
				<DayOfMonthField
					label="Day of month"
					value={props.day >= MANUAL_LAST_DAY ? "last" : props.day}
					onChange={(d) =>
						d === "last" ? props.onPickLast() : props.onPickDay(d)
					}
				/>
			</EditField>
			<Show when={props.fixed}>
				<EditField label="Amount">
					<CurrencyInputByScale
						name="amount"
						maxValue={1_000_000}
						value={() => props.amount}
						onChange={(v) => props.onAmount(v ?? 0)}
					/>
				</EditField>
			</Show>
			<Show when={props.variable}>
				<EditField label="Range">
					<MonoValue>{props.range}</MonoValue>
				</EditField>
			</Show>
			<EditField label="Grace period (days)">
				<ThemedNumberInput
					name="grace"
					min={0}
					max={30}
					maxValue={30}
					value={() => props.grace}
					onChange={(v) => props.onGrace(v ?? 0)}
				/>
			</EditField>
		</LooseWrapRow>
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
		accessor: (f) => <MonoMeta>{f.date}</MonoMeta>,
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
