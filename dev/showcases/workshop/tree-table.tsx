// Tree Table bench — the reference composition for TreeTable, built from the
// package barrel as a client would. Settled 2026-10-14 (Peter): parent rows
// show aggregate cells, any depth, checkboxes inside the indented first cell,
// siblings sort within their parent. The extracted parts are TreeTable,
// IndentRail, DisclosureButton and BaseTable's controlled sort.
import { type Component, createSignal } from "solid-js";
import {
  ContentStack,
  IntCell,
  MoneyCell,
  MutedBody,
  NarrowStack,
  SectionTitle,
  SubsectionTitle,
  type TableColumn,
  TreeTable,
} from "../../../src";
import {
  ASSEMBLIES,
  type Part,
  lineCost,
  unitCost,
} from "./tree-table-kit/data";

export const meta = { label: "Tree Table" };

const COLUMNS: TableColumn<Part>[] = [
  { id: "item", header: "Item", accessor: "name", sortable: true },
  {
    id: "qty",
    header: "Qty",
    align: "right",
    sortable: true,
    sortValue: (p) => p.qty,
    accessor: (p) => <IntCell value={p.qty} />,
  },
  // On a parent this is the sum of its parts: an aggregate, not a price.
  {
    id: "unit",
    header: "Unit cost",
    align: "right",
    sortable: true,
    sortValue: unitCost,
    accessor: (p) => <MoneyCell value={unitCost(p)} maxValue={10_000} />,
  },
  {
    id: "line",
    header: "Line cost",
    align: "right",
    sortable: true,
    sortValue: lineCost,
    accessor: (p) => <MoneyCell value={lineCost(p)} maxValue={10_000} />,
  },
];

const TreeTableBench: Component = () => {
  // One expanded set for both tables, so they compare row for row.
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
  const [selected, setSelected] = createSignal<ReadonlySet<string>>(
    new Set(["impeller", "stator"]),
  );

  const shared = {
    data: ASSEMBLIES,
    columns: COLUMNS,
    childrenOf: (p: Part) => p.parts,
    getRowId: (p: Part) => p.id,
    getRowLabel: (p: Part) => p.name,
    onToggle: toggle,
    compact: true,
    hoverable: true,
  };

  return (
    <div class="component-section component-section--full">
      <SectionTitle>Tree Table</SectionTitle>
      <ContentStack>
        <MutedBody>
          Parent rows hold smaller items. Click a parent row or its chevron to
          expand or collapse it. Click a header to sort: siblings sort within
          their parent. Both tables share one expanded set.
        </MutedBody>
        <NarrowStack>
          <SubsectionTitle>Expand, collapse and sort</SubsectionTitle>
          <TreeTable {...shared} expanded={expanded()} />
        </NarrowStack>
        <NarrowStack>
          <SubsectionTitle>
            Checkboxes: a parent checks or unchecks every part under it
          </SubsectionTitle>
          <MutedBody>
            A parent shows a dash when only some of its parts are checked.{" "}
            {selected().size} parts checked.
          </MutedBody>
          <TreeTable
            {...shared}
            expanded={expanded()}
            selection={{ selected: selected(), onChange: setSelected }}
          />
        </NarrowStack>
      </ContentStack>
    </div>
  );
};

export default TreeTableBench;
