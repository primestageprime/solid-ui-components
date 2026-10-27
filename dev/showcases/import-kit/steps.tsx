// Import kit showcases (UNSTABLE, /unstable only) — the badge, the payments
// hover, the step shell, the tier table, the Auto step and the summary grid.
// Promoted 2026-10-26 on the owner's word, pending Peter's review.
import { type Component, createSignal } from "solid-js";
import { GhostButton } from "../../../src/components/Button";
import { ImportAutoStep } from "../../../src/components/ImportAutoStep";
import { ImportStepShell } from "../../../src/components/ImportStepShell";
import { ImportSummaryGrid } from "../../../src/components/ImportSummaryGrid";
import { ImportTierTable } from "../../../src/components/ImportTierTable";
import { IMPORT_TIERS } from "../../../src/components/ImportTierTable/fixtures";
import { PaymentsPopover } from "../../../src/components/PaymentsPopover";
import { ScoreBadgeList } from "../../../src/components/ScoreBadge";
import { MutedBody } from "../../../src/components/Text";

const flip = (s: ReadonlySet<string>, key: string): ReadonlySet<string> =>
	s.has(key) ? new Set([...s].filter((k) => k !== key)) : new Set([...s, key]);

export const ScoreBadgeShowcase: Component = () => (
	<div class="component-section">
		<h2>ScoreBadge (unstable)</h2>
		<p class="text-meta">
			One evidence badge per tone, with its reason in a tooltip. A plain tone
			is a muted pill.
		</p>
		<div class="example-group">
			<ScoreBadgeList
				badges={[
					{ label: "same day", tone: "ok", tip: "Paid on the 1st\nevery month" },
					{ label: "gaps vary", tone: "weak", tip: "28 to 35 days" },
					{ label: "amount jumps", tone: "neg", tip: "Up 40%" },
					{ label: "stopped", tone: "stop", tip: "No payment for 90 days" },
					{ label: "credit", tone: "side", tip: "Money in" },
					{ label: "one payee", tone: "plain", tip: "Tells nothing" },
				]}
			/>
		</div>
	</div>
);

export const PaymentsPopoverShowcase: Component = () => (
	<div class="component-section">
		<h2>PaymentsPopover (unstable)</h2>
		<p class="text-meta">A payment count. Hover it to see the payments.</p>
		<div class="example-group">
			<PaymentsPopover
				count="3"
				payments={[
					{ date: "Jan 1", payee: "Harbor Rent", score: "96%", amount: "$2,000" },
					{ date: "Feb 1", payee: "Harbor Rent", score: "94%", amount: "$2,000" },
					{ date: "Mar 2", payee: "Harbor Rent", score: "81%", amount: "$2,000" },
				]}
			/>
		</div>
	</div>
);

const STEPS = ["Auto group", "Manual group", "Summary"];

export const ImportStepShellShowcase: Component = () => {
	const [step, setStep] = createSignal(0);
	const [advanced, setAdvanced] = createSignal(false);
	return (
		<div class="component-section">
			<h2>ImportStepShell (unstable)</h2>
			<p class="text-meta">
				The frame of a multi-step import. Enter and → go on, ← goes back. A
				done step shows a tick. The last step shows a Save beside Start again.
			</p>
			<div class="example-group">
				<ImportStepShell
					steps={STEPS}
					step={step()}
					onStep={setStep}
					done={[true, false, false]}
					advanced={advanced()}
					onAdvancedChange={setAdvanced}
					lastStepEnd={<GhostButton>Save</GhostButton>}
				>
					<MutedBody>{`The body of step ${step() + 1}: ${STEPS[step()]}${advanced() ? " (advanced)" : ""}.`}</MutedBody>
				</ImportStepShell>
			</div>
		</div>
	);
};

export const ImportTierTableShowcase: Component = () => {
	const [open, setOpen] = createSignal<ReadonlySet<string>>(new Set());
	const [checked, setChecked] = createSignal<ReadonlySet<string>>(new Set(["g1"]));
	return (
		<div class="component-section">
			<h2>ImportTierTable (unstable)</h2>
			<p class="text-meta">
				Groups in tiers under one sticky header. The second tier folds.
			</p>
			<div class="example-group">
				<ImportTierTable
					tiers={IMPORT_TIERS}
					open={open()}
					onFold={(key) => setOpen(flip(open(), key))}
					checked={checked()}
					onCheck={(id) => setChecked(flip(checked(), id))}
					scoreHead="Sure"
				/>
			</div>
		</div>
	);
};

export const ImportAutoStepShowcase: Component = () => {
	const [open, setOpen] = createSignal<ReadonlySet<string>>(new Set());
	const [checked, setChecked] = createSignal<ReadonlySet<string>>(new Set(["g1", "g2"]));
	const [value, setValue] = createSignal(60);
	return (
		<div class="component-section">
			<h2>ImportAutoStep (unstable)</h2>
			<p class="text-meta">
				The Auto group step, in the advanced view: tuning, tiers, ungrouped
				and ignored payments.
			</p>
			<div class="example-group">
				<ImportAutoStep
					view={{
						summary: "2 groups found in 3 payments",
						scoreHead: "Sure",
						tiers: IMPORT_TIERS,
						ungrouped: [
							{
								id: "u1",
								payee: "Corner Cafe",
								date: "Jan 4",
								amount: "$12",
								score: "40%",
								badges: [{ label: "once", tone: "plain", tip: "One payment" }],
							},
						],
						tune: [{ key: "thr", label: "Group at", min: 0, max: 100, value: value() }],
						ignored: [{ payee: "Gift shop", amount: "$9", badge: "again", tip: "Came again" }],
					}}
					advanced
					open={open()}
					onFold={(key) => setOpen(flip(open(), key))}
					checked={checked()}
					onCheck={(id) => setChecked(flip(checked(), id))}
					onTune={(_, v) => setValue(v)}
					onTuneReset={() => setValue(60)}
				/>
			</div>
		</div>
	);
};

export const ImportSummaryGridShowcase: Component = () => (
	<div class="component-section">
		<h2>ImportSummaryGrid (unstable)</h2>
		<p class="text-meta">The last step: one card per number.</p>
		<div class="example-group">
			<ImportSummaryGrid
				stats={[
					{ label: "New groups", value: "12", sub: "3 need a look" },
					{ label: "Projections", value: "9", sub: "6 fixed, 3 variable" },
					{ label: "One-off configs", value: "2", sub: "kept as one-offs" },
				]}
			/>
		</div>
	</div>
);
