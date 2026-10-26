// ============================================
// ImportProposalsTree — Composite (Depth 3). UNSTABLE: exported from `/unstable` only.
// Tags: shows:tree, shows:table, shows:badge, does:select, does:expand, does:collapse, data:tree, role:section
// Promoted 2026-10-26 on the owner's word, pending Peter's review.
//
// The Proposals step of an import: a tree of side → category → group →
// projection with tri-state checks. Over TreeTable it adds a count line
// ("N of M checked"), Expand all / Collapse all, Check all / Uncheck all, a
// Kind badge per row, the payments hover per row, and an optional folded
// section of halted groups with their own checks. The caller owns the
// checked leaves, the expanded rows and the halted checks.
//
// No CSS. Composes TreeTable, BaseTable, CollapsibleSection, SmStatusBadge,
// TagPill, SmallCheckbox, SmallGhostButton, PaymentsPopover, ClusterRow,
// ContentStack and Text variants.
// ============================================
import { type Component, createMemo, createSignal, Show } from "solid-js";
import { every, filter, flatMap, map } from "../../fn";
import { SmStatusBadge, TagPill } from "../Badge";
import { SmallGhostButton } from "../Button";
import { SmallCheckbox } from "../Checkbox";
import { ClusterRow, ContentStack } from "../Layout";
import { type PaymentLine, PaymentsPopover } from "../PaymentsPopover";
import { CollapsibleSection } from "../Section";
import { BaseTable } from "../Table";
import type { TableColumn } from "../Table/types";
import { MonoValue, MutedBody } from "../Text";
import { TreeTable } from "../TreeTable";

export type ProposalLevel = "side" | "category" | "group" | "projection";

/** One row of the proposal tree. */
export interface ProposalNode {
	readonly id: string;
	readonly level: ProposalLevel;
	readonly name: string;
	/** "Fixed" shows an info badge, any other text a pending badge. Empty for none. */
	readonly kind: string;
	readonly amount: string;
	readonly cadence: string;
	readonly count: string;
	readonly total: string;
	/** True shows a "Halted · last <last>" pill in place of the kind. */
	readonly halted: boolean;
	readonly last: string;
	/** True when the leaf has a check box. */
	readonly checkable: boolean;
	/** The start check of a checkable leaf. */
	readonly checked: boolean;
	readonly payments: readonly PaymentLine[];
	readonly children: readonly ProposalNode[];
}

/** One halted group: no current projection. A check ends it. */
export interface ProposalHaltedGroup {
	readonly id: string;
	readonly name: string;
	readonly kind: string;
	readonly amount: string;
	readonly cadence: string;
	readonly count: string;
	readonly total: string;
	readonly last: string;
	readonly payments: readonly PaymentLine[];
}

export interface ProposalsData {
	readonly summary: string;
	readonly tree: readonly ProposalNode[];
	/** Empty leaves the halted section out. */
	readonly halted: readonly ProposalHaltedGroup[];
	readonly haltedTitle: string;
}

export interface ImportProposalsTreeProps {
	readonly data: ProposalsData;
	/** Ids of the checked leaves. */
	readonly checked: ReadonlySet<string>;
	readonly onChecked: (next: ReadonlySet<string>) => void;
	/** Ids of the expanded parent rows. */
	readonly expanded: ReadonlySet<string>;
	readonly onExpanded: (next: ReadonlySet<string>) => void;
	/** Ids of the checked halted groups. */
	readonly haltChecked: ReadonlySet<string>;
	readonly onHaltCheck: (id: string) => void;
}

const walk = (nodes: readonly ProposalNode[]): ProposalNode[] =>
	flatMap((n: ProposalNode) => [n, ...walk(n.children)], nodes);

const isLeaf = (n: ProposalNode): boolean =>
	n.children.length === 0 && n.checkable;

/** The ids of every leaf that has a check box. */
export const proposalLeafIds = (tree: readonly ProposalNode[]): string[] =>
	map((n: ProposalNode) => n.id, filter(isLeaf, walk(tree)));

/** The ids of the leaves that start checked. */
export const proposalStartChecked = (
	tree: readonly ProposalNode[],
): Set<string> =>
	new Set(
		map(
			(n: ProposalNode) => n.id,
			filter((n: ProposalNode) => isLeaf(n) && n.checked, walk(tree)),
		),
	);

/** The ids of every row with children. */
export const proposalParentIds = (tree: readonly ProposalNode[]): Set<string> =>
	new Set(
		map(
			(n: ProposalNode) => n.id,
			filter((n: ProposalNode) => n.children.length > 0, walk(tree)),
		),
	);

const KindCell: Component<{ node: ProposalNode }> = (props) => (
	<Show when={props.node.kind}>
		<Show
			when={props.node.halted}
			fallback={
				<SmStatusBadge
					variant={props.node.kind === "Fixed" ? "info" : "pending"}
					label={props.node.kind}
				/>
			}
		>
			<TagPill tag={{ label: `Halted · last ${props.node.last}` }} />
		</Show>
	</Show>
);

const columns: TableColumn<ProposalNode>[] = [
	{ id: "name", header: "Group", accessor: (n) => n.name },
	{ id: "kind", header: "Kind", accessor: (n) => <KindCell node={n} /> },
	{
		id: "amount",
		header: "Amount",
		align: "right",
		accessor: (n) => <MonoValue>{n.amount}</MonoValue>,
	},
	{ id: "cadence", header: "Cadence", accessor: (n) => n.cadence },
	{
		id: "count",
		header: "Payments",
		accessor: (n) =>
			n.payments.length > 0 ? (
				<PaymentsPopover count={n.count} payments={n.payments} />
			) : (
				n.count
			),
	},
	{
		id: "total",
		header: "Total",
		align: "right",
		accessor: (n) => <MonoValue>{n.total}</MonoValue>,
	},
];

const haltedColumns = (
	checked: ReadonlySet<string>,
	onCheck: (id: string) => void,
): TableColumn<ProposalHaltedGroup>[] => [
	{
		id: "check",
		header: "",
		accessor: (h) => (
			<SmallCheckbox
				aria-label={`End ${h.name}`}
				checked={checked.has(h.id)}
				onCheckedChange={() => onCheck(h.id)}
			/>
		),
	},
	{ id: "name", header: "Group", accessor: (h) => h.name },
	{
		id: "kind",
		header: "Kind",
		accessor: (h) => <TagPill tag={{ label: `Halted · last ${h.last}` }} />,
	},
	{
		id: "amount",
		header: "Amount",
		align: "right",
		accessor: (h) => <MonoValue>{h.amount}</MonoValue>,
	},
	{ id: "cadence", header: "Cadence", accessor: (h) => h.cadence },
	{
		id: "count",
		header: "Payments",
		accessor: (h) => <PaymentsPopover count={h.count} payments={h.payments} />,
	},
	{
		id: "total",
		header: "Total",
		align: "right",
		accessor: (h) => <MonoValue>{h.total}</MonoValue>,
	},
	{
		id: "result",
		header: "Result",
		accessor: (h) => (checked.has(h.id) ? "ends" : "kept"),
	},
];

export const ImportProposalsTree: Component<ImportProposalsTreeProps> = (
	props,
) => {
	const leaves = createMemo(() => proposalLeafIds(props.data.tree));
	const parents = createMemo(() => proposalParentIds(props.data.tree));
	const [haltFolded, setHaltFolded] = createSignal(true);
	const allOpen = () => props.expanded.size >= parents().size;
	const allChecked = () =>
		every((id: string) => props.checked.has(id), leaves());
	const toggle = (id: string) => {
		const next = new Set(props.expanded);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		props.onExpanded(next);
	};
	return (
		<ContentStack>
			<ClusterRow>
				<MutedBody>{`${props.checked.size} of ${leaves().length} checked · ${props.data.summary}`}</MutedBody>
				<SmallGhostButton
					onClick={() => props.onExpanded(allOpen() ? new Set() : parents())}
				>
					{allOpen() ? "Collapse all" : "Expand all"}
				</SmallGhostButton>
				<SmallGhostButton
					onClick={() =>
						props.onChecked(allChecked() ? new Set() : new Set(leaves()))
					}
				>
					{allChecked() ? "Uncheck all" : "Check all"}
				</SmallGhostButton>
			</ClusterRow>
			<TreeTable
				compact
				stickyHeader
				data={props.data.tree}
				columns={columns}
				childrenOf={(n) => n.children}
				getRowId={(n) => n.id}
				getRowLabel={(n) => n.name}
				expanded={props.expanded}
				onToggle={toggle}
				selection={{ selected: props.checked, onChange: props.onChecked }}
				emptyMessage="No new groups to propose."
			/>
			<Show when={props.data.halted.length > 0}>
				<CollapsibleSection
					title={props.data.haltedTitle}
					collapsed={haltFolded()}
					onToggleCollapse={() => setHaltFolded(!haltFolded())}
				>
					<BaseTable
						compact
						data={[...props.data.halted]}
						columns={haltedColumns(props.haltChecked, props.onHaltCheck)}
					/>
				</CollapsibleSection>
			</Show>
		</ContentStack>
	);
};
