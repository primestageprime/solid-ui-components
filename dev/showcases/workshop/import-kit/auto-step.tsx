// AutoStep — step 1, Auto group. The tier table, the ungrouped payments, and
// (advanced view only) the tuning bars. A bar sets the board's `thr`, so the
// board groups the payments again.
import { type Component, For, Show } from "solid-js";
import { SmallGhostButton } from "../../../../src/components/Button";
import {
	ClusterRow,
	ContentStack,
	TightStack,
} from "../../../../src/components/Layout";
import { Slider } from "../../../../src/components/Slider";
import { BaseTable } from "../../../../src/components/Table";
import type { TableColumn } from "../../../../src/components/Table/types";
import {
	MonoValue,
	MutedBody,
	SectionTitle,
	TextBody,
} from "../../../../src/components/Text";
import { BadgeList, ScoreBadge } from "./score-badge";
import { TierTable } from "./tier-table";
import type { AutoView, IgnoredAgain, TuneBar, UngroupedRow } from "./types";

const TuneBars: Component<{
	bars: readonly TuneBar[];
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

const ungroupedColumns = (scoreHead: string): TableColumn<UngroupedRow>[] => [
	{ id: "payee", header: "Payee", accessor: (r) => r.payee },
	{ id: "date", header: "Date", accessor: (r) => r.date },
	{
		id: "badges",
		header: "Why",
		accessor: (r) => <BadgeList badges={r.badges} />,
	},
	...(scoreHead
		? [
				{
					id: "score",
					header: scoreHead,
					align: "right" as const,
					accessor: (r: UngroupedRow) => r.score,
				},
			]
		: []),
	{
		id: "amt",
		header: "Amount",
		align: "right",
		accessor: (r) => <MonoValue>{r.amt}</MonoValue>,
	},
];

const IgnoredAgainList: Component<{ items: readonly IgnoredAgain[] }> = (
	props,
) => (
	<TightStack>
		<SectionTitle>IGNORED</SectionTitle>
		<For each={props.items}>
			{(i) => (
				<ClusterRow>
					<TextBody>{i.payee}</TextBody>
					<MonoValue>{i.amt}</MonoValue>
					<Show when={i.badge}>
						<ScoreBadge badge={{ t: i.badge, tone: "plain", tip: i.tip }} />
					</Show>
				</ClusterRow>
			)}
		</For>
	</TightStack>
);

export interface AutoStepProps {
	readonly view: AutoView;
	readonly adv: boolean;
	readonly open: ReadonlySet<string>;
	readonly onFold: (key: string) => void;
	readonly checked: ReadonlySet<string>;
	readonly onCheck: (id: string, on: boolean) => void;
	readonly onTune: (key: string, v: number) => void;
	readonly onTuneReset: () => void;
}

export const AutoStep: Component<AutoStepProps> = (props) => (
	<ContentStack>
		<MutedBody>{props.view.summary}</MutedBody>
		<Show when={props.adv && props.view.tune.length > 0}>
			<TuneBars
				bars={props.view.tune}
				onTune={props.onTune}
				onReset={props.onTuneReset}
			/>
		</Show>
		<TierTable
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
			<IgnoredAgainList items={props.view.ignored ?? []} />
		</Show>
	</ContentStack>
);
