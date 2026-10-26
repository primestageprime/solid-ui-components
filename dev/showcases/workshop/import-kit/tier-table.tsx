// TierTable — the Auto group table. One sticky header over all tiers. Each
// tier opens with a heading row (spanRow): a fold caret when the tier folds,
// the title, and a count. The caller decides which tiers are open.
import { type Component, Show } from "solid-js";
import { DisclosureButton } from "../../../../src/components/Button";
import { SmallCheckbox } from "../../../../src/components/Checkbox";
import { Icon } from "../../../../src/components/Icon";
import { InlineText } from "../../../../src/components/InlineText";
import { ClusterRow, TightStack } from "../../../../src/components/Layout";
import { BaseTable } from "../../../../src/components/Table";
import type { TableColumn } from "../../../../src/components/Table/types";
import {
	MonoMeta,
	MonoValue,
	MutedBody,
	TextBody,
	TextSublabel,
} from "../../../../src/components/Text";
import { PaymentsPopover } from "../../../../src/components/PaymentsPopover";
import { ScoreBadgeList as BadgeList } from "../../../../src/components/ScoreBadge";
import type { Tier, TierRow } from "./types";

type Item =
	| { readonly kind: "head"; readonly tier: Tier; readonly open: boolean }
	| { readonly kind: "row"; readonly row: TierRow };

export interface TierTableProps {
	readonly tiers: readonly Tier[];
	/** Keys of the folding tiers that are open. A tier that does not fold is always open. */
	readonly open: ReadonlySet<string>;
	readonly onFold: (key: string) => void;
	readonly checked: ReadonlySet<string>;
	readonly onCheck: (id: string, on: boolean) => void;
	/** Header of the score column. Empty in the default view: the column is left out. */
	readonly scoreHead: string;
}

const isOpen = (tier: Tier, open: ReadonlySet<string>): boolean =>
	!tier.folds || open.has(tier.key);

const itemsOf = (tiers: readonly Tier[], open: ReadonlySet<string>): Item[] =>
	tiers
		.filter((t) => t.rows.length > 0)
		.flatMap((tier) => [
			{ kind: "head", tier, open: isOpen(tier, open) } as Item,
			...(isOpen(tier, open)
				? tier.rows.map((row) => ({ kind: "row", row }) as Item)
				: []),
		]);

const TierHead: Component<{
	tier: Tier;
	open: boolean;
	onFold: (key: string) => void;
}> = (props) => (
	<ClusterRow>
		<Show when={props.tier.folds}>
			<DisclosureButton
				aria-expanded={props.open}
				aria-label={`${props.open ? "Collapse" : "Expand"} ${props.tier.title}`}
				onClick={() => props.onFold(props.tier.key)}
			>
				<Icon name={props.open ? "chevron-down" : "chevron-right"} size="xs" />
			</DisclosureButton>
		</Show>
		<Show
			when={props.tier.key === "look"}
			fallback={<TextBody>{props.tier.title}</TextBody>}
		>
			<InlineText tone="warning">{props.tier.title}</InlineText>
		</Show>
		<MonoMeta>{String(props.tier.rows.length)}</MonoMeta>
		<Show when={props.tier.sub}>
			<MutedBody>{props.tier.sub}</MutedBody>
		</Show>
	</ClusterRow>
);

const rowOf = (item: Item): TierRow | null =>
	item.kind === "row" ? item.row : null;

export const TierTable: Component<TierTableProps> = (props) => {
	const columns = (): TableColumn<Item>[] => [
		{
			id: "check",
			header: "",
			accessor: (item) => {
				const row = rowOf(item);
				return row ? (
					<SmallCheckbox
						aria-label={`Check ${row.name}`}
						checked={props.checked.has(row.id)}
						onCheckedChange={(on) => props.onCheck(row.id, on)}
					/>
				) : (
					""
				);
			},
		},
		{
			id: "group",
			header: "Group",
			accessor: (item) => rowOf(item)?.name ?? "",
		},
		{
			id: "badges",
			header: "Grouped by",
			accessor: (item) => {
				const row = rowOf(item);
				return row ? <BadgeList badges={row.badges} /> : "";
			},
		},
		...(props.scoreHead
			? [
					{
						id: "score",
						header: props.scoreHead,
						align: "right" as const,
						accessor: (item: Item) => {
							const row = rowOf(item);
							return row ? (
								<TightStack>
									<MonoValue>{row.score}</MonoValue>
									<Show when={row.lead}>
										<TextSublabel>{row.lead}</TextSublabel>
									</Show>
								</TightStack>
							) : (
								""
							);
						},
					},
				]
			: []),
		{
			id: "payments",
			header: "Payments",
			accessor: (item) => {
				const row = rowOf(item);
				return row ? <PaymentsPopover count={row.count} payments={row.list} /> : "";
			},
		},
		{
			id: "total",
			header: "Total",
			align: "right",
			accessor: (item) => <MonoValue>{rowOf(item)?.total ?? ""}</MonoValue>,
		},
		{
			id: "goes",
			header: "Result",
			accessor: (item) => rowOf(item)?.goes ?? "",
		},
	];
	return (
		<BaseTable
			stickyHeader
			compact
			data={itemsOf(props.tiers, props.open)}
			columns={columns()}
			spanRow={(item) =>
				item.kind === "head"
					? {
							fromColumnId: "check",
							content: (
								<TierHead
									tier={item.tier}
									open={item.open}
									onFold={props.onFold}
								/>
							),
						}
					: null
			}
		/>
	);
};
