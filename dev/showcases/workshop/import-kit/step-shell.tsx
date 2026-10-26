// StepShell — the frame of an import board: the step bar, the Advanced
// switch, the step body, and Back / Next. Enter and → go to the next step,
// ← goes back. A step before the current one shows "✓" as its hint (Tabs
// has no done state).
import { type Component, type JSX, Show } from "solid-js";
import { GhostButton, PrimaryButton } from "../../../../src/components/Button";
import { ContentStack, SpreadRow } from "../../../../src/components/Layout";
import { Tabs } from "../../../../src/components/Tabs";
import { LeftTruthToggle } from "../../../../src/components/Toggle";
import { useHotkeys } from "../../../../src/hooks";

const KEYS = [
	{ action: "next", keys: "Enter", scope: "global" as const },
	{ action: "next", keys: "ArrowRight", scope: "global" as const },
	{ action: "back", keys: "ArrowLeft", scope: "global" as const },
];

export interface StepShellProps {
	readonly steps: readonly string[];
	readonly step: number;
	readonly onStep: (i: number) => void;
	readonly adv: boolean;
	readonly onAdv: (on: boolean) => void;
	/** Extra controls on the right of the step bar (the DATA picker). */
	readonly tools?: JSX.Element;
	readonly children: JSX.Element;
}

export const StepShell: Component<StepShellProps> = (props) => {
	const last = () => props.steps.length - 1;
	const go = (i: number) => props.onStep(Math.max(0, Math.min(last(), i)));
	useHotkeys({
		table: KEYS,
		handlers: {
			next: () => go(props.step + 1),
			back: () => go(props.step - 1),
		},
		scopes: () => ["global"],
	});
	const tabs = () =>
		props.steps.map((label, i) => ({
			id: String(i),
			label,
			hint: i < props.step ? "✓" : String(i + 1),
		}));
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
						checked={props.adv}
						onCheckedChange={props.onAdv}
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
						<PrimaryButton onClick={() => go(0)}>Start again</PrimaryButton>
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
