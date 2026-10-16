import { type Component, createSignal } from "solid-js";
import {
  IntCell,
  MoneyCell,
  type TableColumn,
  TreeTable,
  textCol,
} from "../../src";
import { map, sum } from "../../src/fn";

// An item made of smaller items, three levels deep.
interface Part {
  readonly id: string;
  readonly name: string;
  readonly qty: number;
  /** Unit cost of a leaf. A parent's cost is the sum of its parts. */
  readonly unit?: number;
  readonly parts?: readonly Part[];
}

const PARTS: readonly Part[] = [
  {
    id: "pump",
    name: "Pump assembly",
    qty: 1,
    parts: [
      {
        id: "motor",
        name: "Motor",
        qty: 1,
        parts: [
          { id: "stator", name: "Stator", qty: 1, unit: 140 },
          { id: "rotor", name: "Rotor", qty: 1, unit: 95 },
          { id: "bearing", name: "Bearing", qty: 2, unit: 12.5 },
        ],
      },
      { id: "impeller", name: "Impeller", qty: 1, unit: 60 },
      { id: "housing", name: "Housing", qty: 1, unit: 88 },
      { id: "seal", name: "Shaft seal", qty: 2, unit: 7.25 },
    ],
  },
  {
    id: "valve",
    name: "Valve kit",
    qty: 3,
    parts: [
      { id: "body", name: "Valve body", qty: 1, unit: 22 },
      { id: "stem", name: "Stem", qty: 1, unit: 6 },
      { id: "gasket", name: "Gasket", qty: 4, unit: 0.8 },
    ],
  },
  { id: "hose", name: "Hose, 2 m", qty: 2, unit: 14 },
];

const unitCost = (p: Part): number =>
  p.parts ? sum(map((c: Part) => c.qty * unitCost(c), p.parts)) : (p.unit ?? 0);
const lineCost = (p: Part): number => p.qty * unitCost(p);

// A parent row shows its own aggregates in every column.
const COLUMNS: TableColumn<Part>[] = [
  textCol("item", "Item", { field: "name", sortable: true }),
  {
    id: "qty",
    header: "Qty",
    align: "right",
    sortable: true,
    sortValue: (p) => p.qty,
    accessor: (p) => <IntCell value={p.qty} />,
  },
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

const tree = {
  childrenOf: (p: Part) => p.parts,
  getRowId: (p: Part) => p.id,
  getRowLabel: (p: Part) => p.name,
};

/** The caller owns `expanded`; a toggle flips one id. */
const createExpanded = (initial: readonly string[]) => {
  const [expanded, setExpanded] = createSignal<ReadonlySet<string>>(
    new Set(initial),
  );
  const toggle = (id: string): void => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  return { expanded, toggle };
};

export const TreeTableShowcase: Component = () => {
  const plain = createExpanded(["pump"]);
  const checked = createExpanded(["pump", "motor"]);
  const [selected, setSelected] = createSignal<ReadonlySet<string>>(
    new Set(["stator", "impeller"]),
  );

  return (
    <div class="component-section">
      <h2>TreeTable — Composite (Depth 2)</h2>
      <p class="text-meta">
        A table whose parent rows expand to show the rows they are made of. Pass
        the tree and the open ids; TreeTable flattens it into BaseTable rows.
        The first column draws the NestedList indent rail and a disclosure
        chevron. Click a parent row or its chevron to expand or collapse it.
        Click a header to sort: siblings sort within their parent.
      </p>

      <div class="example-group">
        <h3>Expand, collapse and sort</h3>
        <TreeTable
          {...tree}
          data={PARTS}
          columns={COLUMNS}
          expanded={plain.expanded()}
          onToggle={plain.toggle}
          compact
          hoverable
        />
      </div>

      <div class="example-group">
        <h3>Checkboxes — a parent checks every part under it</h3>
        <p class="text-meta">
          The selection holds leaf ids. A parent shows a dash when only some of
          its parts are checked. {selected().size} parts checked.
        </p>
        <TreeTable
          {...tree}
          data={PARTS}
          columns={COLUMNS}
          expanded={checked.expanded()}
          onToggle={checked.toggle}
          selection={{ selected: selected(), onChange: setSelected }}
          compact
          hoverable
        />
      </div>
    </div>
  );
};
