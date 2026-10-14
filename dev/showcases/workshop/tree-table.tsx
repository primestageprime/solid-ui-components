// Tree Table bench — a table whose parent rows expand to show the smaller
// items they are made of. Built from BaseTable parts only: the bench flattens
// the tree (tree-table-kit/flatten.ts), and the first cell draws the indent
// and the chevron. All tables share one `expanded` set, so they can be
// compared row for row.
//
//   A  aggregate cells on the parent row
//   B  one spanning summary cell on the parent row
//   C  checkboxes: a parent checks or unchecks every leaf under it
//   D  sortable, tree-aware: siblings sort within their parent
//   E  sortable with BaseTable's own sort: the flat sort breaks the tree
import { type Component, type JSX, createMemo, createSignal } from "solid-js";
import { map } from "../../../src/fn";
import { SmallCheckbox } from "../../../src/components/Checkbox";
import {
  ClusterRow,
  ContentStack,
  NarrowStack,
  SpreadRow,
} from "../../../src/components/Layout";
import {
  BaseTable,
  IntCell,
  MoneyCell,
  type TableColumn,
} from "../../../src/components/Table";
import {
  MutedBody,
  SectionTitle,
  SubsectionTitle,
  TextBody,
} from "../../../src/components/Text";
import {
  ASSEMBLIES,
  type Part,
  leafCount,
  lineCost,
  unitCost,
} from "./tree-table-kit/data";
import { type FlatTreeRow, flattenTree } from "./tree-table-kit/flatten";
import {
  type CheckState,
  checkState,
  leafIds,
  toggleChecked,
} from "./tree-table-kit/selection";
import { type SortState, SortHeader, nextSort } from "./tree-table-kit/sort";
import { TreeCell } from "./tree-table-kit/tree-cell";

export const meta = { label: "Tree Table" };

type Row = FlatTreeRow<Part>;
type ColId = "item" | "qty" | "unit" | "line";

const tree = { childrenOf: (p: Part) => p.parts, getRowId: (p: Part) => p.id };
/** A virtual root over every assembly, for the select-all box in the header. */
const ALL: Part = { id: "__all", name: "All", qty: 1, parts: ASSEMBLIES };

type NumColId = Exclude<ColId, "item">;
const NUM_IDS: readonly NumColId[] = ["qty", "unit", "line"];

/** One record per number column: its header, its value, and its cell. */
const NUM: Record<
  NumColId,
  {
    readonly label: string;
    readonly value: (p: Part) => number;
    readonly cell: (p: Part) => JSX.Element;
  }
> = {
  qty: {
    label: "Qty",
    value: (p) => p.qty,
    cell: (p) => <IntCell value={p.qty} />,
  },
  // On a parent this is the sum of its parts: an aggregate, not a price.
  unit: {
    label: "Unit cost",
    value: unitCost,
    cell: (p) => <MoneyCell value={unitCost(p)} maxValue={10_000} />,
  },
  line: {
    label: "Line cost",
    value: lineCost,
    cell: (p) => <MoneyCell value={lineCost(p)} maxValue={10_000} />,
  },
};

const compareBy = (col: ColId): ((a: Part, b: Part) => number) =>
  col === "item"
    ? (a, b) => a.name.localeCompare(b.name)
    : (a, b) => NUM[col].value(a) - NUM[col].value(b);

const numberColumn = (
  id: NumColId,
  header: string | JSX.Element = NUM[id].label,
): TableColumn<Row> => ({
  id,
  header,
  align: "right",
  accessor: (r) => NUM[id].cell(r.row),
});

const rowName = (r: Row): JSX.Element =>
  r.hasChildren ? (
    <TextBody>{r.row.name}</TextBody>
  ) : (
    <MutedBody>{r.row.name}</MutedBody>
  );

const TreeTableBench: Component = () => {
  const [expanded, setExpanded] = createSignal<ReadonlySet<string>>(
    new Set(["pump"]),
  );
  const toggle = (id: string): void => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const onRowClick = (r: Row): void => {
    if (r.hasChildren) toggle(r.id);
  };

  const rows = createMemo(() =>
    flattenTree(ASSEMBLIES, { ...tree, expanded: expanded() }),
  );

  // --- columns shared by every table -------------------------------------
  const itemColumn = (lead?: (r: Row) => JSX.Element): TableColumn<Row> => ({
    id: "item",
    header: "Item",
    accessor: (r) => (
      <TreeCell flat={r} name={r.row.name} onToggle={toggle}>
        {lead?.(r)}
        {rowName(r)}
      </TreeCell>
    ),
  });
  const numberColumns = map((id: NumColId) => numberColumn(id), NUM_IDS);
  const aggregateColumns: TableColumn<Row>[] = [itemColumn(), ...numberColumns];

  // --- C: checkboxes -----------------------------------------------------
  const [selected, setSelected] = createSignal<ReadonlySet<string>>(
    new Set(["impeller", "stator"]),
  );
  const box = (part: Part, label: string): JSX.Element => {
    const state = (): CheckState => checkState(part, selected(), tree);
    return (
      <SmallCheckbox
        aria-label={label}
        checked={state() === "checked"}
        indeterminate={state() === "indeterminate"}
        // The row click expands and collapses; a click on the box must not.
        onClick={(e) => e.stopPropagation()}
        onCheckedChange={(on) =>
          setSelected((prev) => toggleChecked(part, on, prev, tree))
        }
      />
    );
  };
  const checkboxColumns: TableColumn<Row>[] = [
    {
      ...itemColumn((r) => box(r.row, `Select ${r.row.name}`)),
      header: (
        <ClusterRow>
          {box(ALL, "Select all")}
          Item
        </ClusterRow>
      ),
    },
    ...numberColumns,
  ];

  // --- D: tree-aware sort ------------------------------------------------
  const [sort, setSort] = createSignal<SortState<ColId> | null>({
    col: "line",
    dir: "desc",
  });
  const sortedRows = createMemo(() => {
    const s = sort();
    const base = s ? compareBy(s.col) : undefined;
    const compare =
      base && s
        ? (a: Part, b: Part) => (s.dir === "asc" ? base(a, b) : base(b, a))
        : undefined;
    return flattenTree(ASSEMBLIES, { ...tree, expanded: expanded(), compare });
  });
  const sortHeader = (col: ColId): JSX.Element => (
    <SortHeader
      label={col === "item" ? "Item" : NUM[col].label}
      dir={sort()?.col === col ? (sort()?.dir ?? null) : null}
      onSort={() => setSort((prev) => nextSort(prev, col))}
    />
  );
  const sortedColumns: TableColumn<Row>[] = [
    { ...itemColumn(), header: sortHeader("item") },
    ...map((id: NumColId) => numberColumn(id, sortHeader(id)), NUM_IDS),
  ];

  // --- E: BaseTable's own sort -------------------------------------------
  const builtInSortColumns: TableColumn<Row>[] = [
    { ...itemColumn(), sortable: true, sortValue: (r: Row) => r.row.name },
    ...map(
      (id: NumColId): TableColumn<Row> => ({
        ...numberColumn(id),
        sortable: true,
        sortValue: (r: Row) => NUM[id].value(r.row),
      }),
      NUM_IDS,
    ),
  ];

  return (
    <div class="component-section component-section--full">
      <SectionTitle>Tree Table</SectionTitle>
      <ContentStack>
        <MutedBody>
          Parent rows hold smaller items. Click a parent row or its chevron to
          expand or collapse it. All tables share one expanded set. Indent and
          guide rail match NestedList: one 12px step per level.
        </MutedBody>
        <NarrowStack>
          <SubsectionTitle>
            A · Aggregate cells on the parent row
          </SubsectionTitle>
          <BaseTable
            data={rows()}
            columns={aggregateColumns}
            compact
            hoverable
            onRowClick={onRowClick}
          />
        </NarrowStack>
        <NarrowStack>
          <SubsectionTitle>
            B · One spanning summary cell on the parent row
          </SubsectionTitle>
          <BaseTable
            data={rows()}
            columns={aggregateColumns}
            compact
            hoverable
            onRowClick={onRowClick}
            // Form B: the parent keeps its Item cell, then one spanning summary cell.
            spanRow={(r) =>
              r.hasChildren
                ? {
                    fromColumnId: "qty",
                    content: (
                      <SpreadRow>
                        <MutedBody>
                          {leafCount(r.row)} parts
                          {r.row.qty > 1 ? ` · ×${r.row.qty}` : ""}
                        </MutedBody>
                        <MoneyCell value={lineCost(r.row)} maxValue={10_000} />
                      </SpreadRow>
                    ),
                  }
                : null
            }
          />
        </NarrowStack>
        <NarrowStack>
          <SubsectionTitle>
            C · Checkboxes: a parent checks or unchecks every part under it
          </SubsectionTitle>
          <MutedBody>
            A parent shows a dash when only some of its parts are checked.{" "}
            {leafIds(ALL, tree).length} parts in all; {selected().size} checked.
          </MutedBody>
          <BaseTable
            data={rows()}
            columns={checkboxColumns}
            compact
            hoverable
            onRowClick={onRowClick}
          />
        </NarrowStack>
        <NarrowStack>
          <SubsectionTitle>
            D · Sortable: siblings sort within their parent
          </SubsectionTitle>
          <MutedBody>
            Parents sort by their totals. Each parent's parts sort among
            themselves and stay under it. Click a header to cycle ascending,
            descending, off.
          </MutedBody>
          <BaseTable
            data={sortedRows()}
            columns={sortedColumns}
            compact
            hoverable
            onRowClick={onRowClick}
          />
        </NarrowStack>
        <NarrowStack>
          <SubsectionTitle>
            E · Sortable with BaseTable's own sort (for comparison)
          </SubsectionTitle>
          <MutedBody>
            BaseTable sorts the flat row list, so a sort pulls parts away from
            their parents. A promoted Tree Table needs the sort to happen before
            the flatten step.
          </MutedBody>
          <BaseTable
            data={rows()}
            columns={builtInSortColumns}
            compact
            hoverable
            onRowClick={onRowClick}
          />
        </NarrowStack>
      </ContentStack>
    </div>
  );
};

export default TreeTableBench;
