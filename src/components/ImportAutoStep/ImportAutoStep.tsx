// ============================================
// ImportAutoStep — Composite (Depth 4). UNSTABLE: exported from `/unstable` only.
// Tags: shows:table, shows:panel, does:select, does:expand, does:edit, data:grouped, role:section
// Promoted 2026-10-26 on the owner's word, pending Peter's review.
//
// The Auto group step of an import: a summary line, the tuning sliders
// (advanced view only), the tier table of automatic groups, the ungrouped
// payments, and the ignored payments that came again. The caller owns every
// state: the open tiers, the checked rows and the slider values.
//
// No CSS. Composes ImportTierTable, BaseTable, Slider, ScoreBadge,
// ScoreBadgeList, SmallGhostButton, ContentStack, ClusterRow, TightStack and
// Text variants.
// ============================================
import { type Component, For, Show } from "solid-js";
import { SmallGhostButton } from "../Button";
import { type ImportTier, ImportTierTable } from "../ImportTierTable";
import { ClusterRow, ContentStack, TightStack } from "../Layout";
import { ScoreBadge, type ScoreBadgeData, ScoreBadgeList } from "../ScoreBadge";
import { Slider } from "../Slider";
import { BaseTable } from "../Table";
import type { TableColumn } from "../Table/types";
import { MonoValue, MutedBody, SectionTitle, TextBody } from "../Text";

/** One payment that no group took. */
export interface ImportUngroupedRow {
	readonly id: string;
	readonly payee: string;
	readonly date: string;
	readonly amount: string;
	/** The score text. Shown only when there is a score column. */
	readonly score: string;
	readonly badges: readonly ScoreBadgeData[];
}

/** One tuning slider, in percent. */
export interface ImportTuneBar {
	readonly key: string;
	readonly label: string;
	readonly min: number;
	readonly max: number;
	readonly value: number;
}

/** One payment the user ignored before, which came again. */
export interface ImportIgnoredLine {
	readonly payee: string;
	readonly amount: string;
	/** A plain badge text. Empty for none. */
	readonly badge: string;
	readonly tip: string;
}

/** The display data of the Auto group step. */
export interface ImportAutoView {
	readonly summary: string;
	/** The score column header. Empty leaves the column out. */
	readonly scoreHead: string;
	readonly tiers: readonly ImportTier[];
	readonly ungrouped: readonly ImportUngroupedRow[];
	readonly tune: readonly ImportTuneBar[];
	readonly ignored?: readonly ImportIgnoredLine[];
}

export interface ImportAutoStepProps {
	readonly view: ImportAutoView;
	/** True shows the tuning sliders. */
	readonly advanced: boolean;
	readonly open: ReadonlySet<string>;
	readonly onFold: (key: string) => void;
	readonly checked: ReadonlySet<string>;
	readonly onCheck: (id: string, on: boolean) => void;
	readonly onTune: (key: string, value: number) => void;
	readonly onTuneReset: () => void;
}

const TuneBars: Component<{
	bars: readonly ImportTuneBar[];
	onTune: (key: string, v: number) => void;
	onReset: () => void;
}> = (props) => (
	<ContentStack>
		<ClusterRow>
			<SectionTitle>Tuning</SectionTitle>
			<SmallGhostButton onClick={props.onReset}>Reset</SmallGhostButton>
		</ClusterRow>
		<For each={props.bars}>
			{(bar) => (
				<Slider
					label={bar.label}
					min={bar.min}
					max={bar.max}
					value={bar.value}
					onChange={(v) => props.onTune(bar.key, v)}
					format={(v) => `${v}%`}
				/>
			)}
		</For>
	</ContentStack>
);

const ungroupedColumns = (
	scoreHead: string,
): TableColumn<ImportUngroupedRow>[] => [
	{ id: "payee", header: "Payee", accessor: (r) => r.payee },
	{ id: "date", header: "Date", accessor: (r) => r.date },
	{
		id: "badges",
		header: "Why",
		accessor: (r) => <ScoreBadgeList badges={r.badges} />,
	},
	...(scoreHead
		? [
				{
					id: "score",
					header: scoreHead,
					align: "right" as const,
					accessor: (r: ImportUngroupedRow) => r.score,
				},
			]
		: []),
	{
		id: "amount",
		header: "Amount",
		align: "right",
		accessor: (r) => <MonoValue>{r.amount}</MonoValue>,
	},
];

const IgnoredList: Component<{ items: readonly ImportIgnoredLine[] }> = (
	props,
) => (
	<TightStack>
		<SectionTitle>IGNORED</SectionTitle>
		<For each={props.items}>
			{(i) => (
				<ClusterRow>
					<TextBody>{i.payee}</TextBody>
					<MonoValue>{i.amount}</MonoValue>
					<Show when={i.badge}>
						<ScoreBadge
							badge={{ label: i.badge, tone: "plain", tip: i.tip }}
						/>
					</Show>
				</ClusterRow>
			)}
		</For>
	</TightStack>
);

export const ImportAutoStep: Component<ImportAutoStepProps> = (props) => (
	<ContentStack>
		<MutedBody>{props.view.summary}</MutedBody>
		<Show when={props.advanced && props.view.tune.length > 0}>
			<TuneBars
				bars={props.view.tune}
				onTune={props.onTune}
				onReset={props.onTuneReset}
			/>
		</Show>
		<ImportTierTable
			tiers={props.view.tiers}
			open={props.open}
			onFold={props.onFold}
			checked={props.checked}
			onCheck={props.onCheck}
			scoreHead={props.view.scoreHead}
		/>
		<SectionTitle>UNGROUPED · GROUP MANUALLY</SectionTitle>
		<BaseTable
			compact
			data={[...props.view.ungrouped]}
			columns={ungroupedColumns(props.view.scoreHead)}
			emptyMessage="Every payment is in a group."
		/>
		<Show when={(props.view.ignored ?? []).length > 0}>
			<IgnoredList items={props.view.ignored ?? []} />
		</Show>
	</ContentStack>
);
