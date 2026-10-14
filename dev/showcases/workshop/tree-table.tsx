// Tree Table bench — a table whose parent rows expand to show the smaller
// items they are made of. Built from BaseTable parts only: the bench flattens
// the tree (tree-table-kit/flatten.ts), and the first cell draws the indent
// and the chevron. Two parent-row forms on the same data, sharing one
// `expanded` set, so they can be compared row for row.
import { type Component, createMemo, createSignal } from "solid-js";
import {
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
import { TreeCell } from "./tree-table-kit/tree-cell";

export const meta = { label: "Tree Table" };

type Row = FlatTreeRow<Part>;

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

  const rows = createMemo(() =>
    flattenTree(ASSEMBLIES, {
      childrenOf: (p) => p.parts,
      getRowId: (p) => p.id,
      expanded: expanded(),
    }),
  );

  const itemColumn: TableColumn<Row> = {
    id: "item",
    header: "Item",
    accessor: (r) => (
      <TreeCell flat={r} name={r.row.name} onToggle={toggle}>
        {r.hasChildren ? (
          <TextBody>{r.row.name}</TextBody>
        ) : (
          <MutedBody>{r.row.name}</MutedBody>
        )}
      </TreeCell>
    ),
  };

  // Form A: the parent row keeps every column and shows an aggregate in each.
  const aggregateColumns: TableColumn<Row>[] = [
    itemColumn,
    {
      id: "qty",
      header: "Qty",
      align: "right",
      accessor: (r) => <IntCell value={r.row.qty} />,
    },
    {
      id: "unit",
      header: "Unit cost",
      align: "right",
      // On a parent this is the sum of its parts: an aggregate, not a price.
      accessor: (r) => <MoneyCell value={unitCost(r.row)} maxValue={10_000} />,
    },
    {
      id: "line",
      header: "Line cost",
      align: "right",
      accessor: (r) => <MoneyCell value={lineCost(r.row)} maxValue={10_000} />,
    },
  ];

  const onRowClick = (r: Row): void => {
    if (r.hasChildren) toggle(r.id);
  };

  return (
    <div class="component-section component-section--full">
      <SectionTitle>Tree Table</SectionTitle>
      <ContentStack>
        <MutedBody>
          Parent rows hold smaller items. Click a parent row or its chevron to
          expand or collapse it. Both tables share one expanded set. Indent and
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
      </ContentStack>
    </div>
  );
};

export default TreeTableBench;
