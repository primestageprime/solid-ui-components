// ProposalsStep — step 3, Proposals. A tree of side → category → group →
// projection with tri-state checks. The initial board also folds the halted
// groups (no current projection) under the tree.
import { type Component, createMemo, createSignal, Show } from "solid-js";
import { SmStatusBadge, TagPill } from "../../../../src/components/Badge";
import { SmallGhostButton } from "../../../../src/components/Button";
import { SmallCheckbox } from "../../../../src/components/Checkbox";
import { ClusterRow, ContentStack } from "../../../../src/components/Layout";
import { CollapsibleSection } from "../../../../src/components/Section";
import { BaseTable } from "../../../../src/components/Table";
import type { TableColumn } from "../../../../src/components/Table/types";
import { MonoValue, MutedBody } from "../../../../src/components/Text";
import { TreeTable } from "../../../../src/components/TreeTable";
import { PaymentsPop } from "./payments-pop";
import type { HaltedGroup, ProposalNode, ProposalsData } from "./types";

const walk = (nodes: readonly ProposalNode[]): ProposalNode[] =>
	nodes.flatMap((n) => [n, ...walk(n.children)]);

/** The ids of every leaf that carries a check box. */
export const leafIds = (tree: readonly ProposalNode[]): string[] =>
	walk(tree)
		.filter((n) => n.children.length === 0 && n.checkable)
		.map((n) => n.id);

export const startChecked = (tree: readonly ProposalNode[]): Set<string> =>
	new Set(
		walk(tree)
			.filter((n) => n.children.length === 0 && n.checkable && n.checked)
			.map((n) => n.id),
	);

export const parentIds = (tree: readonly ProposalNode[]): Set<string> =>
	new Set(
		walk(tree)
			.filter((n) => n.children.length > 0)
			.map((n) => n.id),
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
			n.list.length > 0 ? (
				<PaymentsPop count={n.count} list={n.list} />
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
): TableColumn<HaltedGroup>[] => [
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
		accessor: (h) => <PaymentsPop count={h.count} list={h.list} />,
	},
	{
		id: "total",
		header: "Total",
		align: "right",
		accessor: (h) => <MonoValue>{h.total}</MonoValue>,
	},
	{
		id: "goes",
		header: "Result",
		accessor: (h) => (checked.has(h.id) ? "ends" : "kept"),
	},
];

export interface ProposalsStepProps {
	readonly data: ProposalsData;
	readonly checked: ReadonlySet<string>;
	readonly onChecked: (next: ReadonlySet<string>) => void;
	readonly expanded: ReadonlySet<string>;
	readonly onExpanded: (next: ReadonlySet<string>) => void;
	/** Checks of the halted groups (initial board only). */
	readonly haltChecked: ReadonlySet<string>;
	readonly onHaltCheck: (id: string) => void;
}

export const ProposalsStep: Component<ProposalsStepProps> = (props) => {
	const leaves = createMemo(() => leafIds(props.data.tree));
	const parents = createMemo(() => parentIds(props.data.tree));
	const [haltFolded, setHaltFolded] = createSignal(true);
	const allOpen = () => props.expanded.size >= parents().size;
	const allChecked = () => leaves().every((id) => props.checked.has(id));
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
