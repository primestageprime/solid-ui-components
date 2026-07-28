// SectionTable — a table bound to its own section header as one unit, plus the
// header on its own and the sortable field-table variant.
// (Promoted out of the retired jtf-tables workshop bench, 2026-07-27.)
import { type Component, createSignal } from "solid-js";
import { SectionTable } from "../../src/components/Table/SectionTable";
import { TableSectionHeader } from "../../src/components/Table/TableSectionHeader";
import { SortableFieldTable } from "../../src/components/Table/fields/FieldTable";
import { EllipsisText } from "../../src/components/DataDisplay/EllipsisText";
import {
  col,
  nameCol,
  intCol,
  moneyCol,
  dateCol,
} from "../../src/components/Table/fields";
import type { TableColumn } from "../../src/components/Table/types";
import { ContentStack, PageStack } from "../../src/components/Layout";
import { SubsectionTitle, TextSublabel } from "../../src/components/Text";
import { ThemedInput } from "../../src/components/Inputs";
import "./section-table.css";

interface Customer {
  id: string;
  name: string;
  orders: number;
  revenueCents: number;
  since: string;
  note: string;
}

const CUSTOMERS: Customer[] = [
  { id: "c-1", name: "Meridian Freight", orders: 214, revenueCents: 8_412_00, since: "2023-04-12", note: "Consolidated billing since the Q3 merger; PO required on every line." },
  { id: "c-2", name: "Harbour & Kline", orders: 168, revenueCents: 6_120_50, since: "2022-11-02", note: "Net-45 terms." },
  { id: "c-3", name: "Cascade Logistics", orders: 133, revenueCents: 5_980_25, since: "2024-01-30", note: "Prefers weekly digest invoices rather than per-shipment." },
  { id: "c-4", name: "Northwind Marine", orders: 97, revenueCents: 3_440_00, since: "2023-08-19", note: "Tax-exempt." },
  { id: "c-5", name: "Bellweather Group", orders: 61, revenueCents: 2_015_75, since: "2025-02-06", note: "New account — still on the trial rate card." },
];

// Plain table columns for the BOUND unit: `contained` + `minWidth:0` let the
// name column ellipsize so the fixed-layout table clamps to exactly its
// container width — which is what keeps the header's record count aligned with
// the table's right edge.
const money = (v: number): string =>
  "$" + (v / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const columns: TableColumn<Customer>[] = [
  { id: "name", header: "Customer", align: "left", ellipsis: true, contained: true, minWidth: "0", accessor: (r) => r.name },
  { id: "orders", header: "Orders", align: "right", width: "5rem", accessor: (r) => String(r.orders) },
  { id: "revenue", header: "Revenue", align: "right", width: "9rem", accessor: (r) => money(r.revenueCents) },
  { id: "since", header: "Since", align: "right", width: "7rem", accessor: (r) => r.since },
];

// The field registry for the sortable variant — field types own all geometry,
// and a long free-text field hands its value to EllipsisText so the row can't
// grow to fit it.
const registry = {
  name: nameCol<Customer>("name"),
  orders: intCol<Customer>("orders"),
  revenue: moneyCol<Customer>("revenueCents"),
  since: dateCol<Customer>("since"),
  note: col<Customer>(
    "note",
    "Note",
    (row) => <EllipsisText tooltip={row.note} />,
    "text",
    (row) => row.note,
  ),
};
const fields = ["name", "orders", "revenue", "since", "note"];

export const SectionTableShowcase: Component = () => {
  const [query, setQuery] = createSignal("");
  const filtered = () =>
    CUSTOMERS.filter((c) =>
      c.name.toLowerCase().includes(query().trim().toLowerCase()),
    );

  return (
    <div class="component-section component-section--full">
      <h2>SectionTable — Composite (Depth 2, zero CSS)</h2>
      <p class="text-meta">
        A table BOUND to its own header as one unit: they share a single stretch
        container, so the record count lands on the table's right edge. The
        count derives from the rows shown against the unfiltered `total` — and
        the unit owns NO filter UI, because the filter is a separate concern
        that may live anywhere and simply hands this component its already
        filtered rows.
      </p>

      <PageStack>
        <ContentStack>
          <SubsectionTitle>Bound header + table</SubsectionTitle>
          <TextSublabel>
            The filter below is deliberately external and disconnected — type to
            watch the count read "N of 5 records".
          </TextSublabel>
          <ThemedInput
            label="Dashboard filter (external — disconnected from the table)"
            placeholder="e.g. a customer name…"
            value={query()}
            onInput={(e) => setQuery(e.currentTarget.value)}
          />
          {/* Capped to a tile-like width so the bound count visibly aligns with
              the table's right edge rather than the viewport's. */}
          <div class="section-table-unit">
            <SectionTable
              title="Top Customers"
              total={CUSTOMERS.length}
              countNoun="record"
              columns={columns}
              data={filtered()}
              compact
            />
          </div>
        </ContentStack>

        <ContentStack>
          <SubsectionTitle>TableSectionHeader — on its own</SubsectionTitle>
          <TextSublabel>
            The same header, composable above anything (a chart, a list) — title
            on the left, count pushed to the right on the SAME line.
          </TextSublabel>
          <div class="section-table-unit">
            <TableSectionHeader title="Open Shipments" count={12} total={40} countNoun="shipment" />
          </div>
        </ContentStack>

        <ContentStack>
          <SubsectionTitle>SortableFieldTable — the curried sortable variant</SubsectionTitle>
          <TextSublabel>
            The table is sortable or it isn't: pick the variant, never configure
            columns. Click a header to sort.
          </TextSublabel>
          {/* Uncapped: the field types own their widths, and the free-text
              note column takes the slack. */}
          <SortableFieldTable data={CUSTOMERS} fields={fields} registry={registry} />
        </ContentStack>
      </PageStack>
    </div>
  );
};
