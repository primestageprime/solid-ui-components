// ============================================
// ImportTierTable — Composite (Depth 3). UNSTABLE: exported from `/unstable` only.
// Tags: shows:table, shows:badge, does:select, does:expand, does:collapse, data:grouped, role:panel
// Promoted 2026-10-26 on the owner's word, pending Peter's review.
//
// A table of groups in tiers, under one sticky header. Each tier opens with
// a heading row (a span row): a fold caret when the tier folds, the title
// (warning ink when `warn`), the row count and an optional muted line. Each
// group row has a check box, the group name, its evidence badges, an
// optional score column, the payments (count with a hover table), the total
// and the result text. The caller owns which tiers are open and which rows
// are checked.
//
// No CSS. Composes BaseTable, DisclosureButton, Icon, SmallCheckbox,
// InlineText, ScoreBadgeList, PaymentsPopover, ClusterRow, TightStack and
// Text variants.
// ============================================
import { type Component, Show } from "solid-js";
import { filter, flatMap, map } from "../../fn";
import { DisclosureButton } from "../Button";
import { SmallCheckbox } from "../Checkbox";
import { Icon } from "../Icon";
import { InlineText } from "../InlineText";
import { ClusterRow, TightStack } from "../Layout";
import { type PaymentLine, PaymentsPopover } from "../PaymentsPopover";
import { type ScoreBadgeData, ScoreBadgeList } from "../ScoreBadge";
import { BaseTable } from "../Table";
import type { TableColumn } from "../Table/types";
import {
	MonoMeta,
	MonoValue,
	MutedBody,
	TextBody,
	TextSublabel,
} from "../Text";

/** One group row of a tier. */
export interface ImportTierRow {
	readonly id: string;
	readonly name: string;
	readonly badges: readonly ScoreBadgeData[];
	/** The score text. Shown only when the table has a score column. */
	readonly score: string;
	/** A short line under the score. Empty for none. */
	readonly lead: string;
	/** The payment count text. */
	readonly count: string;
	readonly payments: readonly PaymentLine[];
	readonly total: string;
	/** What happens to the group, e.g. "new group". */
	readonly result: string;
}

/** One tier: a heading row and its group rows. A tier with no rows is left out. */
export interface ImportTier {
	readonly key: string;
	readonly title: string;
	/** A muted line after the count. */
	readonly sub?: string;
	/** True when the tier can fold. A tier that does not fold is always open. */
	readonly folds: boolean;
	/** True to show the title in warning ink. */
	readonly warn?: boolean;
	readonly rows: readonly ImportTierRow[];
}

export interface ImportTierTableProps {
	readonly tiers: readonly ImportTier[];
	/** Keys of the folding tiers that are open. */
	readonly open: ReadonlySet<string>;
	readonly onFold: (key: string) => void;
	/** Ids of the checked rows. */
	readonly checked: ReadonlySet<string>;
	readonly onCheck: (id: string, on: boolean) => void;
	/** The score column header. Empty leaves the column out. */
	readonly scoreHead: string;
}

type Item =
	| { readonly kind: "head"; readonly tier: ImportTier; readonly open: boolean }
	| { readonly kind: "row"; readonly row: ImportTierRow };

const isOpen = (tier: ImportTier, open: ReadonlySet<string>): boolean =>
	!tier.folds || open.has(tier.key);

const itemsOf = (
	tiers: readonly ImportTier[],
	open: ReadonlySet<string>,
): Item[] =>
	flatMap(
		(tier: ImportTier): Item[] => [
			{ kind: "head", tier, open: isOpen(tier, open) },
			...(isOpen(tier, open)
				? map((row: ImportTierRow): Item => ({ kind: "row", row }), tier.rows)
				: []),
		],
		filter((t: ImportTier) => t.rows.length > 0, tiers),
	);

const TierHead: Component<{
	tier: ImportTier;
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
			when={props.tier.warn}
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

const rowOf = (item: Item): ImportTierRow | null =>
	item.kind === "row" ? item.row : null;

export const ImportTierTable: Component<ImportTierTableProps> = (props) => {
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
				return row ? <ScoreBadgeList badges={row.badges} /> : "";
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
				return row ? (
					<PaymentsPopover count={row.count} payments={row.payments} />
				) : (
					""
				);
			},
		},
		{
			id: "total",
			header: "Total",
			align: "right",
			accessor: (item) => <MonoValue>{rowOf(item)?.total ?? ""}</MonoValue>,
		},
		{
			id: "result",
			header: "Result",
			accessor: (item) => rowOf(item)?.result ?? "",
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
