// ============================================
// ImportStepShell — Composite (Depth 2). UNSTABLE: exported from `/unstable` only.
// Tags: shows:tabs, shows:toolbar, does:navigate, does:hotkey, does:toggle, data:steps, role:shell
// Promoted 2026-10-26 on the owner's word, pending Peter's review.
//
// The frame of a multi-step import: the step bar, an Advanced switch, the
// step body, and Back / Next. Enter and → go to the next step, ← goes back.
// A done step shows "✓" as its tab hint (Tabs has no done state); the caller
// says which steps are done. While `paused` is true (a dialog is open) the
// keys do nothing. On the last step Next becomes "Start again", and
// `lastStepEnd` (a Save button, for example) shows beside it.
//
// No CSS. Composes Tabs, LeftTruthToggle, GhostButton, PrimaryButton,
// ContentStack and SpreadRow.
// ============================================
import { type Component, type JSX, Show } from "solid-js";
import { map } from "../../fn";
import { useHotkeys } from "../../hooks";
import { GhostButton, PrimaryButton } from "../Button";
import { ContentStack, SpreadRow } from "../Layout";
import { Tabs } from "../Tabs";
import { LeftTruthToggle } from "../Toggle";

const KEYS = [
	{ action: "next", keys: "Enter", scope: "global" as const },
	{ action: "next", keys: "ArrowRight", scope: "global" as const },
	{ action: "back", keys: "ArrowLeft", scope: "global" as const },
];

export interface ImportStepShellProps {
	/** The step labels, in order. */
	readonly steps: readonly string[];
	/** The index of the open step. */
	readonly step: number;
	/** Called with the index of the step to open (clamped to the steps). */
	readonly onStep: (index: number) => void;
	/** The done state per step: a done step shows "✓" as its hint. */
	readonly done: readonly boolean[];
	readonly advanced: boolean;
	readonly onAdvancedChange: (on: boolean) => void;
	/** True while a dialog is open: Enter and the arrows belong to the dialog. */
	readonly paused?: boolean;
	/** Extra controls to the left of the Advanced switch. */
	readonly tools?: JSX.Element;
	/** Shown beside "Start again" on the last step only. */
	readonly lastStepEnd?: JSX.Element;
	/** The open step's body. */
	readonly children: JSX.Element;
}

export const ImportStepShell: Component<ImportStepShellProps> = (props) => {
	const last = () => props.steps.length - 1;
	const go = (i: number) => props.onStep(Math.max(0, Math.min(last(), i)));
	useHotkeys({
		table: KEYS,
		handlers: {
			next: () => go(props.step + 1),
			back: () => go(props.step - 1),
		},
		scopes: () => (props.paused ? [] : ["global"]),
	});
	const tabs = () =>
		map(
			(label: string, i: number) => ({
				id: String(i),
				label,
				hint: props.done[i] ? "✓" : String(i + 1),
			}),
			props.steps,
		);
	return (
		<ContentStack>
			<SpreadRow>
				<Tabs
					tabs={tabs()}
					activeTab={String(props.step)}
					onTabChange={(id) => go(Number(id))}
				/>
				<SpreadRow>
					{props.tools}
					<LeftTruthToggle
						label="Advanced"
						checked={props.advanced}
						onCheckedChange={props.onAdvancedChange}
					/>
				</SpreadRow>
			</SpreadRow>
			{props.children}
			<SpreadRow>
				<GhostButton
					disabled={props.step === 0}
					onClick={() => go(props.step - 1)}
				>
					Back
				</GhostButton>
				<Show
					when={props.step < last()}
					fallback={
						<SpreadRow>
							{props.lastStepEnd}
							<PrimaryButton onClick={() => go(0)}>Start again</PrimaryButton>
						</SpreadRow>
					}
				>
					<PrimaryButton
						onClick={() => go(props.step + 1)}
					>{`Next: ${props.steps[props.step + 1]}`}</PrimaryButton>
				</Show>
			</SpreadRow>
		</ContentStack>
	);
};
