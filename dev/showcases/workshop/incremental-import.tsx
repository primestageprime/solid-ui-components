// Incremental Import — thorcasting's later import of a company, from the
// prototype board built from canvas-row/parts-incr. Steps: Auto group, Manual
// group, Proposals, Changed, Halted, Manual (a placeholder here), Summary. The
// DATA picker swaps the full month for the quiet month, where every payment
// fits. The data is the board's own computed view
// (import-kit/fixtures/incremental.ts).
import { type Component, createSignal, type JSX, Match, Show, Switch } from "solid-js";
import { ClusterRow } from "../../../src/components/Layout";
import { SegmentedControl } from "../../../src/components/SegmentedControl";
import { MonoMeta, SectionTitle } from "../../../src/components/Text";
import { AutoStep } from "./import-kit/auto-step";
import { ChangedStep } from "./import-kit/changed-step";
import { incremental } from "./import-kit/fixtures/incremental";
import { HaltedStep } from "./import-kit/halted-step";
import { emptyState, type MgState } from "./import-kit/manual-group-model";
import { ManualGroupStep } from "./import-kit/manual-group-step";
import {
	ProposalsStep,
	parentIds,
	startChecked,
} from "./import-kit/proposals-step";
import { checkedRows, flip, toggled } from "./import-kit/sets";
import { StepShell } from "./import-kit/step-shell";
import { ManualPlaceholder, SummaryStep } from "./import-kit/summary-step";
import type { IncrementalData } from "./import-kit/types";

export const meta = { label: "Incremental Import" };

type DataKey = "full" | "quiet";
const DATASETS = [
	{ value: "full", label: "Full" },
	{ value: "quiet", label: "Quiet month (every payment fits)" },
];

const startHalts = (d: IncrementalData): ReadonlySet<string> =>
	new Set(
		[...d.halted.halts, ...d.halted.missed]
			.filter((r) => r.checked)
			.map((r) => r.id),
	);

/** One board over one dataset. A new dataset mounts a new board, so every check starts fresh. */
const Board: Component<{
	data: IncrementalData;
	picker: () => JSX.Element;
}> = (props) => {
	const d = props.data;
	const [step, setStep] = createSignal(0);
	const [adv, setAdv] = createSignal(false);
	const [checked, setChecked] = createSignal(checkedRows(d.auto.base.tiers));
	const [open, setOpen] = createSignal<ReadonlySet<string>>(new Set());
	const [mg, setMg] = createSignal<MgState>(emptyState);
	const [pChecked, setPChecked] = createSignal<ReadonlySet<string>>(
		startChecked(d.proposals.tree),
	);
	const [pOpen, setPOpen] = createSignal<ReadonlySet<string>>(
		parentIds(d.proposals.tree),
	);
	const [changes, setChanges] = createSignal<ReadonlySet<string>>(
		new Set(d.changed.base.rows.filter((r) => r.checked).map((r) => r.id)),
	);
	const [halts, setHalts] = createSignal(startHalts(d));
	return (
		<StepShell
			steps={d.steps}
			step={step()}
			onStep={setStep}
			adv={adv()}
			onAdv={setAdv}
			tools={props.picker()}
		>
			<Switch>
				<Match when={step() === 0}>
					<AutoStep
						view={adv() ? d.auto.adv : d.auto.base}
						adv={adv()}
						open={open()}
						onFold={(key) => setOpen(flip(open(), key))}
						checked={checked()}
						onCheck={(id, on) => setChecked(toggled(checked(), id, on))}
					/>
				</Match>
				<Match when={step() === 1}>
					<ManualGroupStep data={d.manualGroup} state={mg()} onState={setMg} />
				</Match>
				<Match when={step() === 2}>
					<ProposalsStep
						data={d.proposals}
						checked={pChecked()}
						onChecked={setPChecked}
						expanded={pOpen()}
						onExpanded={setPOpen}
						haltChecked={new Set()}
						onHaltCheck={() => undefined}
					/>
				</Match>
				<Match when={step() === 3}>
					<ChangedStep
						data={adv() ? d.changed.adv : d.changed.base}
						checked={changes()}
						onCheck={(id) => setChanges(flip(changes(), id))}
					/>
				</Match>
				<Match when={step() === 4}>
					<HaltedStep
						data={d.halted}
						checked={halts()}
						onCheck={(id) => setHalts(flip(halts(), id))}
					/>
				</Match>
				<Match when={step() === 5}>
					<ManualPlaceholder />
				</Match>
				<Match when={step() === 6}>
					<SummaryStep stats={d.summary} />
				</Match>
			</Switch>
		</StepShell>
	);
};

const IncrementalImportBench: Component = () => {
	const [ds, setDs] = createSignal<DataKey>("full");
	const picker = () => (
		<ClusterRow>
			<MonoMeta>DATA</MonoMeta>
			<SegmentedControl
				size="xs"
				options={DATASETS}
				value={ds()}
				onValueChange={(v) => setDs(v === "quiet" ? "quiet" : "full")}
			/>
		</ClusterRow>
	);
	return (
		<div class="component-section component-section--full">
			<SectionTitle>Incremental Import</SectionTitle>
			<Show when={ds()} keyed>
				{(key) => <Board data={incremental[key]} picker={picker} />}
			</Show>
		</div>
	);
};

export default IncrementalImportBench;
