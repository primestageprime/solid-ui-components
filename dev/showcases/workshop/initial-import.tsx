// Initial Import — thorcasting's first import of a company, from the
// prototype board canvas-row/project/InitialImport.dc.html. Steps: Auto group,
// Manual group, Proposals, Manual (a placeholder here), Summary. The data is
// the board's own computed view (import-kit/fixtures/initial.ts).
import { type Component, createSignal, Match, Switch } from "solid-js";
import { SectionTitle } from "../../../src/components/Text";
import { AutoStep } from "./import-kit/auto-step";
import { initial } from "./import-kit/fixtures/initial";
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

export const meta = { label: "Initial Import" };

const InitialImportBench: Component = () => {
	const [step, setStep] = createSignal(0);
	const [adv, setAdv] = createSignal(false);
	const [checked, setChecked] = createSignal(
		checkedRows(initial.auto.base.tiers),
	);
	const [open, setOpen] = createSignal<ReadonlySet<string>>(new Set());
	const [mg, setMg] = createSignal<MgState>(emptyState);
	const [pChecked, setPChecked] = createSignal<ReadonlySet<string>>(
		startChecked(initial.proposals.tree),
	);
	const [pOpen, setPOpen] = createSignal<ReadonlySet<string>>(
		parentIds(initial.proposals.tree),
	);
	const [halts, setHalts] = createSignal<ReadonlySet<string>>(
		new Set(initial.proposals.halted.filter((h) => h.checked).map((h) => h.id)),
	);
	const view = () => (adv() ? initial.auto.adv : initial.auto.base);
	return (
		<div class="component-section component-section--full">
			<SectionTitle>Initial Import</SectionTitle>
			<StepShell
				steps={initial.steps}
				step={step()}
				onStep={setStep}
				adv={adv()}
				onAdv={setAdv}
			>
				<Switch>
					<Match when={step() === 0}>
						<AutoStep
							view={view()}
							adv={adv()}
							open={open()}
							onFold={(key) => setOpen(flip(open(), key))}
							checked={checked()}
							onCheck={(id, on) => setChecked(toggled(checked(), id, on))}
						/>
					</Match>
					<Match when={step() === 1}>
						<ManualGroupStep
							data={initial.manualGroup}
							state={mg()}
							onState={setMg}
						/>
					</Match>
					<Match when={step() === 2}>
						<ProposalsStep
							data={initial.proposals}
							checked={pChecked()}
							onChecked={setPChecked}
							expanded={pOpen()}
							onExpanded={setPOpen}
							haltChecked={halts()}
							onHaltCheck={(id) => setHalts(flip(halts(), id))}
						/>
					</Match>
					<Match when={step() === 3}>
						<ManualPlaceholder />
					</Match>
					<Match when={step() === 4}>
						<SummaryStep stats={initial.summary} />
					</Match>
				</Switch>
			</StepShell>
		</div>
	);
};

export default InitialImportBench;
