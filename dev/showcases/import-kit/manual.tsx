// Import kit showcases (UNSTABLE, /unstable only) — the LaneChart and the
// Manual (projection) step pieces.
// Promoted 2026-10-26 on the owner's word, pending Peter's review.
import { type Component, createSignal } from "solid-js";
import { LaneChart } from "../../../src/components/LaneChart";
import { LANE_CHART_DATA } from "../../../src/components/LaneChart/fixtures";
import { ContentStack } from "../../../src/components/Layout";
import {
	ManualChartLegend,
	ManualConfigCards,
	ManualEditConfigModal,
	ManualOneOffConfirm,
	ManualPaymentsPane,
	ManualProjectionCardRail,
	ManualProjectionHeader,
	ManualProjectionRail,
	ManualSuggestionCards,
} from "../../../src/components/ManualProjection";
import { ThreePanelLayout } from "../../../src/components/ThreePanelLayout";
import { SmallButton } from "../../../src/components/Button";
import { MutedBody } from "../../../src/components/Text";

export const LaneChartShowcase: Component = () => {
	const [hot, setHot] = createSignal<string | null>(null);
	return (
		<div class="component-section">
			<h2>LaneChart (unstable)</h2>
			<p class="text-meta">
				Payments against configs. The consumer passes the geometry; the chart
				fits the track to its panel. Hover a bar or a slot layer.
			</p>
			<div class="example-group">
				<MutedBody>{`Hovered: ${hot() ?? "none"}`}</MutedBody>
				<ManualChartLegend />
				<LaneChart data={LANE_CHART_DATA} hotKey={hot() ?? undefined} onHover={setHot} />
			</div>
		</div>
	);
};

export const ManualProjectionShowcase: Component = () => {
	const [group, setGroup] = createSignal("a");
	const [hot, setHot] = createSignal<string | null>(null);
	const [editing, setEditing] = createSignal(false);
	const [day, setDay] = createSignal(1);
	const [grace, setGrace] = createSignal(3);
	const [amount, setAmount] = createSignal(2000);
	const [confirming, setConfirming] = createSignal(false);
	const [log, setLog] = createSignal("");
	return (
		<div class="component-section">
			<h2>ManualProjection pieces (unstable)</h2>
			<p class="text-meta">
				The rail, the header, the suggestion and config cards, the payments
				pane, the edit dialog and the one-off confirm. Each calls back with a
				key.
			</p>
			<div class="example-group">
				<ManualProjectionRail
					sections={[
						{ key: "review", title: "TO REVIEW", tone: "warning", emptyText: "None" },
						{ key: "matched", title: "MATCHED", tone: "default", emptyText: "None" },
					]}
					items={[
						{ key: "a", section: "review", name: "Harbor Rent", note: "1 left", pickable: true },
						{ key: "b", section: "matched", name: "Lumen Power", note: "ok", pickable: true },
					]}
					currentKey={group()}
					onPick={setGroup}
				/>
			</div>
			<div class="example-group">
				<ContentStack>
					<ManualProjectionHeader
						title={group() === "a" ? "Harbor Rent" : "Lumen Power"}
						why={group() === "a" ? "1 unmatched" : "all matched"}
						whyWarn={group() === "a"}
						sub="12 payments over 12 months"
						desc=""
						dropNote={group() === "a" ? "One payment does not fit a config." : ""}
					/>
					<ManualSuggestionCards
						items={[{ key: "s0", title: "Monthly on the 1st", amount: "$2,000", sub: "11 of 12 fit" }]}
						onAdd={(k) => setLog(`Add ${k}`)}
					/>
					<ManualConfigCards
						items={[
							{
								key: "c0",
								name: "Rent",
								amount: "$2,000",
								sub: "1st · 3 days grace",
								editLabel: "Edit Rent",
								deleteLabel: "Delete Rent",
							},
						]}
						onEdit={() => setEditing(true)}
						onDelete={(k) => setLog(`Delete ${k}`)}
					/>
					<SmallButton onClick={() => setConfirming(true)}>Leave the step</SmallButton>
					<MutedBody>{log()}</MutedBody>
				</ContentStack>
			</div>
			<div class="example-group">
				<ManualPaymentsPane
					groups={[
						{ key: "rent", name: "Rent", desc: "", count: "2", total: "$4,000", expanded: true, warn: false },
						{ key: "UNMATCHED", name: "Unmatched", desc: "None", count: "1", total: "$120", expanded: true, warn: true },
					]}
					rows={[
						{ key: "r1", group: "rent", date: "2026-01-01", amount: "$2,000", of: "" },
						{ key: "r2", group: "rent", date: "2026-02-03", amount: "$2,000", of: "" },
						{ key: "u1", group: "UNMATCHED", date: "2026-02-09", amount: "$120", of: "" },
					]}
					hotKey={hot() ?? undefined}
					onHover={setHot}
				/>
			</div>
			<ManualEditConfigModal
				open={editing()}
				title="Edit Rent"
				day={day()}
				amount={amount()}
				grace={grace()}
				fixed
				variable={false}
				range=""
				onPickDay={setDay}
				onPickLast={() => setDay(30)}
				onAmount={setAmount}
				onGrace={setGrace}
				onSave={() => setEditing(false)}
				onClose={() => setEditing(false)}
			/>
			<ManualOneOffConfirm
				open={confirming()}
				sub="1 payment fits no config."
				items={[{ id: "1", payee: "Gift shop", where: "Unmatched", date: "Feb 9", amount: "$120" }]}
				onClose={() => setConfirming(false)}
				onConfirm={() => setConfirming(false)}
			/>
		</div>
	);
};

// The rail's group card (approved by Peter 2026-10-28). Tom's
// Cleaning rows from the thorcasting stubs (set1: names, counts, yearly
// totals); Costco as the one TO REVIEW group with an unmatched amount, and the
// paycheck selected. The rail sits in the app's 240px left panel, today's rail
// beside it.
const CARD_SECTIONS = [
	{ key: "review", title: "TO REVIEW", tone: "warning", emptyText: "None" },
	{ key: "matched", title: "MATCHED", tone: "default", emptyText: "None" },
	{ key: "other", title: "OTHER", tone: "muted", emptyText: "None" },
] as const;

const CARD_ITEMS = [
	{ key: "costco", section: "review", name: "Cleaning Supplies - Costco Business", note: "$1,150 unmatched", pickable: true, count: "12 payments", total: "-$13,800", unmatched: "$1,150 unmatched" },
	{ key: "paycheck", section: "matched", name: "Tom's Paycheck - BiWeekly", note: "26 payments", pickable: true, count: "26 payments", total: "-$146,900" },
	{ key: "hartley", section: "matched", name: "Hartley Dental - Office Cleaning", note: "52 payments", pickable: true, count: "52 payments", total: "$45,760" },
	{ key: "maple", section: "matched", name: "Maple Court Apartments - Common Areas", note: "52 payments", pickable: true, count: "52 payments", total: "$49,920" },
	{ key: "riverside", section: "matched", name: "Riverside Law Office - Janitorial", note: "52 payments", pickable: true, count: "52 payments", total: "$37,440" },
	{ key: "greenway", section: "matched", name: "Greenway Coworking - Studio Reset", note: "52 payments", pickable: true, count: "52 payments", total: "$33,280" },
	{ key: "insurance", section: "matched", name: "Business Insurance - Next Insurance", note: "12 payments", pickable: true, count: "12 payments", total: "-$5,400" },
] as const;

export const ManualRailCardShowcase: Component = () => {
	const [group, setGroup] = createSignal("paycheck");
	return (
		<div class="component-section">
			<h2>ManualProjectionCardRail (unstable)</h2>
			<p class="text-meta">
				Each group as a card: the name on top, one line, with "…" and the
				full name in a tooltip when it is cut; the payment count bottom
				left; the total bottom right. A TO REVIEW group adds its
				unmatched amount in warning ink. Left: the card rail. Centre: the
				rail as it is today. Click a pickable card to select it.
			</p>
			<div class="example-group">
				<ThreePanelLayout
					height="640px"
					leftPanelWidth="240px"
					rightPanelWidth="240px"
					leftPanel={
						<ManualProjectionCardRail
							sections={[...CARD_SECTIONS]}
							items={[...CARD_ITEMS]}
							currentKey={group()}
							onPick={setGroup}
						/>
					}
					centerPanel={<MutedBody>{`Selected: ${group()}`}</MutedBody>}
					rightPanel={
						<ManualProjectionRail
							sections={[...CARD_SECTIONS]}
							items={[...CARD_ITEMS]}
							currentKey={group()}
							onPick={setGroup}
						/>
					}
				/>
			</div>
		</div>
	);
};
