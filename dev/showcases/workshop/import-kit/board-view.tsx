// BoardView — one live import board in the step shell. The board's stage
// names pick the step views; each step reads the board and calls its
// handlers through the BoardBench.
import {
	type Component,
	createSignal,
	type JSX,
	Match,
	Switch,
} from "solid-js";
import { AutoStep } from "./auto-step";
import type { BoardBench } from "./board-bench";
import { ChangedStep } from "./changed-step";
import { HaltedStep } from "./halted-step";
import { ManualGroupStep } from "./manual-group-step";
import { ManualStep } from "./manual-step";
import { ProposalsStep, parentIds, startChecked } from "./proposals-step";
import { checkedRows, flip } from "./sets";
import { StepShell } from "./step-shell";
import { SummaryStep } from "./summary-step";

const ids = (rows: readonly { id: string; checked: boolean }[]) =>
	new Set(rows.filter((r) => r.checked).map((r) => r.id));

export const BoardView: Component<{
	bench: BoardBench;
	stages: readonly string[];
	tools?: JSX.Element;
}> = (props) => {
	const b = props.bench;
	const [open, setOpen] = createSignal<ReadonlySet<string>>(new Set());
	const [pOpen, setPOpen] = createSignal<ReadonlySet<string>>(
		parentIds(b.proposals().tree),
	);
	const stage = () => props.stages[b.step()];
	return (
		<StepShell
			steps={b.labels()}
			step={b.step()}
			onStep={b.goStep}
			done={b.done()}
			paused={b.dialogOpen()}
			adv={b.adv()}
			onAdv={(on) => on !== b.adv() && b.toggleAdv()}
			tools={props.tools}
		>
			<Switch>
				<Match when={stage() === "auto"}>
					<AutoStep
						view={b.auto()}
						adv={b.adv()}
						open={open()}
						onFold={(key) => setOpen(flip(open(), key))}
						checked={checkedRows(b.auto().tiers)}
						onCheck={b.setChecked}
						onTune={b.setTune}
						onTuneReset={b.resetTune}
					/>
				</Match>
				<Match when={stage() === "manual"}>
					<ManualGroupStep view={b.mg()} act={b.mgAct} />
				</Match>
				<Match when={stage() === "prop"}>
					<ProposalsStep
						data={b.proposals()}
						checked={startChecked(b.proposals().tree)}
						onChecked={b.setProposals}
						expanded={pOpen()}
						onExpanded={setPOpen}
						haltChecked={ids(b.proposals().halted)}
						onHaltCheck={b.flip}
					/>
				</Match>
				<Match when={stage() === "changed"}>
					<ChangedStep
						data={b.changed()}
						checked={ids(b.changed().rows)}
						onCheck={b.flip}
					/>
				</Match>
				<Match when={stage() === "halted"}>
					<HaltedStep
						data={b.halted()}
						checked={ids([...b.halted().halts, ...b.halted().missed])}
						onCheck={b.flip}
					/>
				</Match>
				<Match when={stage() === "main"}>
					<ManualStep view={b.manual()} />
				</Match>
				<Match when={stage() === "summary"}>
					<SummaryStep stats={b.summary()} />
				</Match>
			</Switch>
		</StepShell>
	);
};
