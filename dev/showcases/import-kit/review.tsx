// Import kit showcases (UNSTABLE, /unstable only) — the Manual group step,
// the Proposals tree, and the Changed and Halted tables.
// Promoted 2026-10-26 on the owner's word, pending Peter's review.
import { type Component, createSignal } from "solid-js";
import { ImportChangedTable } from "../../../src/components/ImportChangedTable";
import { ImportHaltedTables } from "../../../src/components/ImportHaltedTables";
import {
	ImportManualGroupStep,
	type ManualGroupRow,
} from "../../../src/components/ImportManualGroupStep";
import {
	ImportProposalsTree,
	proposalParentIds,
	proposalStartChecked,
} from "../../../src/components/ImportProposalsTree";
import { PROPOSALS } from "../../../src/components/ImportProposalsTree/fixtures";
import { MutedBody } from "../../../src/components/Text";

const flip = (s: ReadonlySet<string>, key: string): ReadonlySet<string> =>
	s.has(key) ? new Set([...s].filter((k) => k !== key)) : new Set([...s, key]);

const WAITING: ManualGroupRow[] = [
	{
		id: "p1",
		pos: "",
		current: false,
		payee: "Evergreen Hall",
		date: "Jan 5",
		amount: "$400",
		badge: "",
		tip: "",
		quick: ["Hall rent"],
		suggestions: ["Venues"],
	},
	{
		id: "p2",
		pos: "",
		current: false,
		payee: "Refund desk",
		date: "Jan 9",
		amount: "+$35",
		badge: "credit",
		tip: "Money in",
		quick: ["Hall rent"],
		suggestions: [],
	},
];

export const ImportManualGroupStepShowcase: Component = () => {
	const [left, setLeft] = createSignal(WAITING);
	const [current, setCurrent] = createSignal("p1");
	const [log, setLog] = createSignal("Press 1, i or type a group name.");
	const rows = () =>
		left().map((r, i) => ({
			...r,
			pos: `Payment ${i + 1} of ${left().length}`,
			current: r.id === current(),
		}));
	const done = (id: string, what: string) => {
		setLog(what);
		setLeft(left().filter((r) => r.id !== id));
		setCurrent(left()[0]?.id ?? "");
	};
	return (
		<div class="component-section">
			<h2>ImportManualGroupStep (unstable)</h2>
			<p class="text-meta">
				The rail, the card of the current payment with its quick picks, and
				the keys. The caller holds the state.
			</p>
			<div class="example-group">
				<MutedBody>{log()}</MutedBody>
				<ImportManualGroupStep
					view={{
						sub: `${left().length} payments wait`,
						rows: rows(),
						groups: [{ name: "Hall rent", count: 3 }],
						ignored: [],
						undoLabel: "",
						canUndo: false,
					}}
					onPick={setCurrent}
					onPlace={(id, g) => done(id, `Put ${id} in ${g}.`)}
					onIgnore={(id) => done(id, `Ignored ${id}.`)}
					onUnignore={() => {}}
					onUndo={() => {}}
				/>
			</div>
		</div>
	);
};

export const ImportProposalsTreeShowcase: Component = () => {
	const [checked, setChecked] = createSignal<ReadonlySet<string>>(
		proposalStartChecked(PROPOSALS.tree),
	);
	const [expanded, setExpanded] = createSignal<ReadonlySet<string>>(
		proposalParentIds(PROPOSALS.tree),
	);
	const [halts, setHalts] = createSignal<ReadonlySet<string>>(new Set());
	return (
		<div class="component-section">
			<h2>ImportProposalsTree (unstable)</h2>
			<p class="text-meta">
				Side → category → group → projection, with tri-state checks and a
				folded section of halted groups.
			</p>
			<div class="example-group">
				<ImportProposalsTree
					data={PROPOSALS}
					checked={checked()}
					onChecked={setChecked}
					expanded={expanded()}
					onExpanded={setExpanded}
					haltChecked={halts()}
					onHaltCheck={(id) => setHalts(flip(halts(), id))}
				/>
			</div>
		</div>
	);
};

export const ImportChangedTableShowcase: Component = () => {
	const [checked, setChecked] = createSignal<ReadonlySet<string>>(new Set(["c1"]));
	return (
		<div class="component-section">
			<h2>ImportChangedTable (unstable)</h2>
			<p class="text-meta">A check applies the change to the projection.</p>
			<div class="example-group">
				<ImportChangedTable
					summary="1 projection changed"
					rows={[
						{
							id: "c1",
							name: "Harbor Rent",
							projection: "Rent",
							from: "$2,000 monthly",
							to: "$2,100 monthly",
							badges: [{ label: "3 in a row", tone: "ok", tip: "Jan, Feb, Mar" }],
							count: "3",
							payments: [],
						},
					]}
					checked={checked()}
					onCheck={(id) => setChecked(flip(checked(), id))}
				/>
			</div>
		</div>
	);
};

export const ImportHaltedTablesShowcase: Component = () => {
	const [checked, setChecked] = createSignal<ReadonlySet<string>>(new Set(["h1"]));
	return (
		<div class="component-section">
			<h2>ImportHaltedTables (unstable)</h2>
			<p class="text-meta">
				The halts (a check ends them) and the missed payments (a check keeps
				them as arrears).
			</p>
			<div class="example-group">
				<ImportHaltedTables
					summary="1 halt, 1 missed"
					halts={[
						{
							id: "h1",
							name: "Old gym",
							projection: "Gym",
							last: "Mar 2",
							gap: "30 days",
							threshold: "45 days",
							silence: "107 days",
							overdue: true,
							result: "ends",
						},
					]}
					missed={[
						{
							id: "m1",
							name: "Lumen Power",
							projection: "Power",
							missed: "Jun",
							count: "1",
							unpaid: "$90",
							note: "paid late before",
							result: "arrears",
						},
					]}
					checked={checked()}
					onCheck={(id) => setChecked(flip(checked(), id))}
				/>
			</div>
		</div>
	);
};
