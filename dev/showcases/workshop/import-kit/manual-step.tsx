// ManualStep — the bench's Manual (projection) step. It lays out the src
// ManualProjection pieces and the LaneChart in three panels, and maps the
// live board view (adapt-manual.ts mpView, whose items carry their own
// handlers) to their plain props and key callbacks.
import { type Component, createMemo, Show } from "solid-js";
import { ContentStack } from "../../../../src/components/Layout";
import {
	ManualChartLegend,
	ManualConfigCards,
	ManualEditConfigModal,
	ManualOneOffConfirm,
	ManualPaymentsPane,
	ManualProjectionHeader,
	ManualProjectionRail,
	ManualSuggestionCards,
} from "../../../../src/components/ManualProjection";
import { DangerConfirmationModal } from "../../../../src/components/Modal";
import { ThreePanelLayout } from "../../../../src/components/ThreePanelLayout";
import { BoardLaneChart } from "./lane-chart";
import type { MpView } from "./types";

const TONE = { review: "warning", matched: "default", other: "muted" } as const;

// A pane amount's ink by meaning, as the prototype colours it: green on time,
// yellow late, orange unmatched. SUI has no orange token, so unmatched shares
// the chart's warning ink (its unmatched bars use it too). The prototype pane
// never shows a credit row; it keeps the default ink.
const AMOUNT_TONE = {
	ontime: "success",
	late: "warning",
	unmatched: "warning",
	credit: "default",
} as const;

const Rail: Component<{ view: MpView }> = (props) => (
	<ManualProjectionRail
		sections={props.view.sections.map((s) => ({
			key: s.key,
			title: s.title,
			// Every group reviewed: the board titles the section "TO REVIEW ✓",
			// and the tick reads in success ink, as the prototype draws it.
			tone: s.key === "review" && props.view.done.on ? "success" : TONE[s.key],
			emptyText: s.emptyText,
		}))}
		items={props.view.side.map((i) => ({
			key: i.key,
			section: i.bucket,
			name: i.name,
			note: i.note,
			pickable: !!i.pick,
		}))}
		currentKey={props.view.side.find((i) => i.current)?.key}
		onPick={(key) => props.view.side.find((i) => i.key === key)?.pick?.()}
	/>
);

const Pane: Component<{ view: MpView }> = (props) => (
	<ManualPaymentsPane
		groups={props.view.pane.map((g) => ({
			key: g.key,
			name: g.name,
			desc: g.desc,
			count: g.count,
			total: g.total,
			expanded: g.expanded,
			warn: g.key === "UNMATCHED",
		}))}
		rows={props.view.paneRows.map((r) => ({
			key: r.key,
			group: r.bucket,
			date: r.date,
			slot: r.slot,
			amount: r.amount,
			of: r.of,
			tone: AMOUNT_TONE[r.tone],
		}))}
		hotKey={props.view.paneRows.find((r) => r.hot)?.key}
		onHover={(key) => {
			const row = props.view.paneRows.find((r) => r.key === key);
			if (row) row.enter();
			else props.view.paneRows.find((r) => r.hot)?.leave();
		}}
	/>
);

const Center: Component<{ view: MpView }> = (props) => {
	const deleting = createMemo(() => props.view.cfgs.find((c) => c.confirming));
	const cfg = (key: string) => props.view.cfgs[Number(key)];
	return (
		<ContentStack>
			<ManualProjectionHeader
				title={props.view.title}
				why={props.view.why}
				whyWarn={props.view.whyWarn}
				sub={props.view.sub}
				desc={props.view.desc}
				done={props.view.done.on ? props.view.done : undefined}
				onDone={props.view.done.go}
				dropNote={props.view.drop.on ? props.view.drop.note : ""}
			/>
			<Show when={props.view.hasGroup}>
				<ManualChartLegend />
				<BoardLaneChart chart={props.view.chart} />
				<ManualSuggestionCards
					items={props.view.sugs.map((s, i) => ({
						key: String(i),
						title: s.title,
						amount: s.amount,
						sub: s.sub,
					}))}
					onAdd={(key) => props.view.sugs[Number(key)]?.add()}
				/>
				<ManualConfigCards
					items={props.view.cfgs.map((c, i) => ({
						key: String(i),
						name: c.name,
						amount: c.amount,
						sub: c.sub,
						editLabel: c.editLabel,
						deleteLabel: c.delLabel,
					}))}
					onEdit={(key) => cfg(key)?.edit()}
					onDelete={(key) => cfg(key)?.askDelete()}
				/>
			</Show>
			<DangerConfirmationModal
				open={!!deleting()}
				onClose={() => deleting()?.cancelDelete()}
				onConfirm={() => deleting()?.doDelete()}
				title={deleting()?.delLabel ?? ""}
				description={deleting()?.confirmText}
				confirmLabel="Delete"
			/>
		</ContentStack>
	);
};

export const ManualStep: Component<{ view: MpView }> = (props) => {
	const edit = () => props.view.edit;
	const fin = () => props.view.fin;
	return (
		<>
			<ThreePanelLayout
				leftPanel={<Rail view={props.view} />}
				centerPanel={<Center view={props.view} />}
				rightPanel={<Pane view={props.view} />}
				leftPanelWidth="240px"
				rightPanelWidth="300px"
			/>
			<ManualEditConfigModal
				open={edit().open}
				title={edit().title}
				day={edit().state?.day ?? 1}
				amount={edit().state?.amt ?? 0}
				grace={edit().state?.grace ?? 0}
				fixed={edit().fixed}
				variable={edit().variable}
				range={edit().range}
				onPickDay={edit().pickDay}
				onPickLast={edit().pickLast}
				onAmount={edit().setAmt}
				onGrace={edit().setGrace}
				onSave={edit().save}
				onClose={edit().close}
			/>
			<ManualOneOffConfirm
				open={fin().open}
				sub={fin().sub}
				items={fin().items}
				onClose={fin().close}
				onConfirm={fin().go}
			/>
		</>
	);
};
