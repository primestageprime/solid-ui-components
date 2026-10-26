// ManualStep — the Manual (projection) step. The left rail lists the groups
// (TO REVIEW, MATCHED, OTHER); the center shows the open group: its lane chart
// of payments against configs, the new config suggestions and the configs;
// the right pane lists the group's payments by config. Every value and every
// handler comes from the live board (adapt.ts mpView).
import { type Component, createMemo, For, Show } from "solid-js";
import { SmStatusBadge } from "../../../../src/components/Badge";
import {
	type Bucket,
	BucketQueue,
} from "../../../../src/components/BucketQueue";
import {
	IconOnlyButton,
	SmallButton,
	SmallOutlinedButton,
} from "../../../../src/components/Button";
import {
	MutedEmptyState,
	SuccessAlert,
	WarningAlert,
} from "../../../../src/components/Feedback";
import { Icon } from "../../../../src/components/Icon";
import {
	ClusterRow,
	ContentStack,
	LooseCardGrid,
	SpreadRow,
	TightStack,
} from "../../../../src/components/Layout";
import { Legend } from "../../../../src/components/Legend";
import { DangerConfirmationModal } from "../../../../src/components/Modal";
import { CompactSurface } from "../../../../src/components/Surface";
import {
	MonoMeta,
	MonoValue,
	MutedBody,
	SectionTitle,
	TextBody,
	TextTitle,
} from "../../../../src/components/Text";
import { ThreePanelLayout } from "../../../../src/components/ThreePanelLayout";
import { BoardLaneChart } from "./lane-chart";
import { EditConfigModal, OneOffConfirm } from "./manual-dialogs";
import type { MpCfg, MpPaneRow, MpSideItem, MpView } from "./types";

const TONE = { review: "warning", matched: "default", other: "muted" } as const;

const LEGEND = [
	{ label: "On time", color: "var(--sui-success)" },
	{ label: "Late", color: "var(--sui-warning)" },
	{ label: "Catch-up", color: "var(--sui-warning)", line: { dash: "3 3" } },
	{ label: "Missing", color: "var(--sui-danger)" },
];

const Sidebar: Component<{ view: MpView }> = (props) => {
	const buckets = (): Bucket[] =>
		props.view.sections.map((s) => ({
			key: s.key,
			label: s.title,
			tone: TONE[s.key],
			emptyLabel: s.emptyText,
		}));
	const current = () => props.view.side.find((i) => i.current)?.key;
	return (
		<BucketQueue<MpSideItem>
			buckets={buckets()}
			items={[...props.view.side]}
			bucketOf={(i) => i.bucket}
			keyOf={(i) => i.key}
			selectedKey={current()}
			onSelect={(key) => props.view.side.find((i) => i.key === key)?.pick?.()}
			renderItem={(i) => (
				<SpreadRow>
					<TextBody>{i.name}</TextBody>
					<MonoMeta>{i.note}</MonoMeta>
				</SpreadRow>
			)}
		/>
	);
};

/** Keep "$6,000 of $7,000" on one line: no-break spaces. */
const oneLine = (t: string): string => t.replace(/ /g, "\u00a0");

const PaymentsPane: Component<{ view: MpView }> = (props) => {
	const buckets = (): Bucket[] =>
		props.view.pane.map((g) => ({
			key: g.key,
			label: `${g.name} · ${g.count} · ${g.total}`,
			tone: g.key === "UNMATCHED" ? "warning" : "default",
			collapsible: true,
			collapsedByDefault: !g.expanded,
			emptyLabel: g.desc,
		}));
	const hot = () => props.view.paneRows.find((r) => r.hot)?.key;
	return (
		<BucketQueue<MpPaneRow>
			buckets={buckets()}
			items={[...props.view.paneRows]}
			bucketOf={(r) => r.bucket}
			keyOf={(r) => r.key}
			selectedKey={hot()}
			onFocusChange={(key) => {
				const row = props.view.paneRows.find((r) => r.key === key);
				if (row) row.enter();
				else props.view.paneRows.find((r) => r.hot)?.leave();
			}}
			renderItem={(r) => (
				<SpreadRow>
					<MonoMeta>{r.date}</MonoMeta>
					<MonoMeta>{r.slot}</MonoMeta>
					<MonoMeta>{oneLine(`${r.amount}${r.of}`)}</MonoMeta>
				</SpreadRow>
			)}
		/>
	);
};

const CfgCard: Component<{ cfg: MpCfg }> = (props) => (
	<CompactSurface>
		<TightStack>
			<SpreadRow>
				<TextTitle>{props.cfg.name}</TextTitle>
				<ClusterRow>
					<IconOnlyButton
						aria-label={props.cfg.editLabel}
						title={props.cfg.editLabel}
						onClick={props.cfg.edit}
					>
						<Icon name="edit" size="sm" />
					</IconOnlyButton>
					<IconOnlyButton
						aria-label={props.cfg.delLabel}
						title={props.cfg.delLabel}
						onClick={props.cfg.askDelete}
					>
						<Icon name="trash" size="sm" />
					</IconOnlyButton>
				</ClusterRow>
			</SpreadRow>
			<MonoValue>{props.cfg.amount}</MonoValue>
			<MutedBody>{props.cfg.sub}</MutedBody>
		</TightStack>
	</CompactSurface>
);

const Center: Component<{ view: MpView }> = (props) => {
	const deleting = createMemo(() => props.view.cfgs.find((c) => c.confirming));
	return (
		<ContentStack>
			<Show when={props.view.done.on}>
				<SuccessAlert
					title={props.view.done.title}
					description={props.view.done.text}
					action={
						<SmallButton onClick={props.view.done.go}>
							{props.view.done.next}
						</SmallButton>
					}
				/>
			</Show>
			<Show when={props.view.drop.on}>
				<WarningAlert description={props.view.drop.note} />
			</Show>
			<TightStack>
				<ClusterRow>
					<TextTitle>{props.view.title}</TextTitle>
					<SmStatusBadge
						variant={props.view.whyWarn ? "warning" : "compliant"}
						label={props.view.why}
					/>
				</ClusterRow>
				<MutedBody>{props.view.sub}</MutedBody>
				<Show when={props.view.desc}>
					<MutedBody>{props.view.desc}</MutedBody>
				</Show>
			</TightStack>
			<Show when={props.view.hasGroup}>
				<Legend items={LEGEND} />
				<BoardLaneChart chart={props.view.chart} />
				<SectionTitle>NEW CONFIG SUGGESTIONS</SectionTitle>
				<Show
					when={props.view.sugs.length > 0}
					fallback={
						<MutedEmptyState message="Every payment in this group is matched. Nothing to suggest." />
					}
				>
					<LooseCardGrid>
						<For each={props.view.sugs}>
							{(s) => (
								<CompactSurface>
									<TightStack>
										<TextTitle>{s.title}</TextTitle>
										<MonoValue>{s.amount}</MonoValue>
										<MutedBody>{s.sub}</MutedBody>
										<SmallOutlinedButton onClick={s.add}>
											Add
										</SmallOutlinedButton>
									</TightStack>
								</CompactSurface>
							)}
						</For>
					</LooseCardGrid>
				</Show>
				<SectionTitle>CONFIGS</SectionTitle>
				<Show
					when={props.view.cfgs.length > 0}
					fallback={
						<MutedEmptyState message="No configs yet. Add one from the suggestions." />
					}
				>
					<LooseCardGrid>
						<For each={props.view.cfgs}>{(c) => <CfgCard cfg={c} />}</For>
					</LooseCardGrid>
				</Show>
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

export const ManualStep: Component<{ view: MpView }> = (props) => (
	<>
		<ThreePanelLayout
			leftPanel={<Sidebar view={props.view} />}
			centerPanel={<Center view={props.view} />}
			rightPanel={<PaymentsPane view={props.view} />}
			leftPanelWidth="240px"
			rightPanelWidth="300px"
		/>
		<EditConfigModal edit={props.view.edit} />
		<OneOffConfirm fin={props.view.fin} />
	</>
);
