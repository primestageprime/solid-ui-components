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
import { ImportChangedTable } from "../../../../src/components/ImportChangedTable";
import { ImportHaltedTables } from "../../../../src/components/ImportHaltedTables";
import { ImportManualGroupStep } from "../../../../src/components/ImportManualGroupStep";
import {
	ImportProposalsTree,
	proposalParentIds as parentIds,
	proposalStartChecked as startChecked,
} from "../../../../src/components/ImportProposalsTree";
import { ImportAutoStep } from "../../../../src/components/ImportAutoStep";
import { ImportStepShell } from "../../../../src/components/ImportStepShell";
import { ImportSummaryGrid } from "../../../../src/components/ImportSummaryGrid";
import type { BoardBench } from "./board-bench";
import { ManualStep } from "./manual-step";
import { checkedRows, flip } from "./sets";

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
		<ImportStepShell
			steps={b.labels()}
			step={b.step()}
			onStep={b.goStep}
			done={b.done()}
			paused={b.dialogOpen()}
			advanced={b.adv()}
			onAdvancedChange={(on) => on !== b.adv() && b.toggleAdv()}
			tools={props.tools}
		>
			<Switch>
				<Match when={stage() === "auto"}>
					<ImportAutoStep
						view={b.auto()}
						advanced={b.adv()}
						open={open()}
						onFold={(key) => setOpen(flip(open(), key))}
						checked={checkedRows(b.auto().tiers)}
						onCheck={b.setChecked}
						onTune={b.setTune}
						onTuneReset={b.resetTune}
					/>
				</Match>
				<Match when={stage() === "manual"}>
					<ImportManualGroupStep
						view={b.mg()}
						onPick={b.mgAct.pick}
						onPlace={b.mgAct.place}
						onIgnore={b.mgAct.ignore}
						onUnignore={b.mgAct.unignore}
						onUndo={b.mgAct.undo}
					/>
				</Match>
				<Match when={stage() === "prop"}>
					<ImportProposalsTree
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
					<ImportChangedTable
						summary={b.changed().summary}
						rows={b.changed().rows}
						checked={ids(b.changed().rows)}
						onCheck={b.flip}
					/>
				</Match>
				<Match when={stage() === "halted"}>
					<ImportHaltedTables
						summary={b.halted().summary}
						halts={b.halted().halts}
						missed={b.halted().missed}
						checked={ids([...b.halted().halts, ...b.halted().missed])}
						onCheck={b.flip}
					/>
				</Match>
				<Match when={stage() === "main"}>
					<ManualStep view={b.manual()} />
				</Match>
				<Match when={stage() === "summary"}>
					<ImportSummaryGrid stats={b.summary()} />
				</Match>
			</Switch>
		</ImportStepShell>
	);
};
