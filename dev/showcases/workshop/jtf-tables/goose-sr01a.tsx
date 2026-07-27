// Goose Table Catalog — SR-01a "Daily Sales Orders Snapshot" (prior-day).
//
// Source: goose-ui SalesOrdersSnapshot → DayBreakdownGrid → DayBreakdownTile.
// SR-01a breaks the prior day's booking activity down seven ways (Top Customers,
// Top Product Lines, By Region / Rep / Brand / Order Type / Item Type) — but all
// seven tiles are the SAME structural table, the "Day Breakdown Grid". The
// catalog lists UNIQUE table types, so this is ONE entry, rendered with a
// representative (scrollable) dimension; the note records the seven it serves.
//
// The Day Breakdown Grid: a compact, sticky-header grid of
// `# · Member · Count · Order Value`. The member column absorbs the slack
// (fixedLayout + ellipsis) so the count and value sit right-aligned at the right
// edge — space-between, not packed against the name. Capped at ~10 rows
// (maxHeight 324px), scrolling internally beyond that.
//
// Filter/display separation (Peter, 2026-07-25): the TABLE and its RECORD COUNT
// are decoupled from any filter UI. The count is TableSectionHeader with a
// `total` — it reads "24 records" unfiltered and "N of 24 records" when a view is
// filtered, driven purely by the numbers passed in. The filter here is an
// EXTERNAL, dashboard-level control (a plain sibling input); remove it and the
// table + count still render. In a real dashboard the filter lives above the
// grid and this table just receives already-filtered rows + the unfiltered total.
//
// Stub data is realistic Rhino Tool House (a tool + building-products
// distributor on Acumatica), deliberately MORE rows than production's top-N so
// the 10-row scroll cap is exercised.
import { createSignal, createMemo } from "solid-js";
import {
  SectionTable,
  NarrowStack,
  ThemedInput,
  MutedBody,
} from "../../../../src";
import type { TableColumn } from "../../../../src";
import type { TableEntry } from "./shared";

// Formatters mirror the Python seed (seed_reports.money / num).
const money = (v: number): string =>
  "$" + v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = (v: number): string => v.toLocaleString();

interface BreakdownRow {
  rank: number;
  member: string;
  n: number;
  val: number;
}

const columns: TableColumn<BreakdownRow>[] = [
  { id: "rank", header: "#", align: "right", width: "2.5rem", accessor: (r) => String(r.rank) },
  // `contained` + `minWidth:0` let the member column shrink below its content's
  // natural width (ellipsizing) so the fixedLayout table clamps to EXACTLY its
  // container width instead of overflowing — that keeps the table's right edge
  // equal to the header's, so the record count aligns with the table width.
  { id: "member", header: "Customer", align: "left", ellipsis: true, contained: true, minWidth: "0", accessor: (r) => r.member },
  { id: "n", header: "Orders", align: "right", width: "5rem", accessor: (r) => num(r.n) },
  { id: "val", header: "Order Value", align: "right", width: "9rem", accessor: (r) => money(r.val) },
];

// (member, count, value) tuples → ranked rows, descending by value (as the seed).
function rankRows(rows: Array<[string, number, number]>): BreakdownRow[] {
  return [...rows]
    .sort((a, b) => b[2] - a[2])
    .map(([member, n, val], i) => ({ rank: i + 1, member, n, val }));
}

// Representative dimension — Top Customers (contractor / distributor accounts),
// 24 rows so the 10-row cap scrolls. Production caps this tile at Top 10.
const TOP_CUSTOMERS = rankRows([
  ["Ferguson Enterprises", 38, 128_440.12],
  ["White Cap Construction Supply", 31, 96_218.55],
  ["SiteOne Landscape Supply", 27, 84_907.4],
  ["Border States Electric", 22, 71_365.0],
  ["Graybar Electric", 19, 63_812.9],
  ["WESCO Distribution", 24, 58_204.33],
  ["HD Supply Construction", 17, 51_770.18],
  ["Fastenal Company", 29, 47_995.6],
  ["Sunbelt Rentals", 14, 43_118.75],
  ["Grainger Industrial Supply", 21, 39_642.0],
  ["Rexel USA", 12, 35_209.44],
  ["City Electric Supply", 16, 31_880.9],
  ["McCoy's Building Supply", 18, 28_450.25],
  ["Kimball Midwest", 11, 24_760.0],
  ["Crescent Electric Supply", 9, 21_337.8],
  ["Winsupply Group", 13, 18_902.15],
  ["Consolidated Electrical", 8, 16_540.0],
  ["United Rentals", 7, 14_228.6],
  ["Summit Electric Supply", 10, 12_115.44],
  ["Elliott Electric Supply", 6, 9_870.0],
  ["Herc Rentals", 5, 7_642.3],
  ["BlueLine Rental", 4, 5_910.75],
  ["Dakota Supply Group", 3, 4_188.0],
  ["Platt Electric Supply", 2, 2_640.5],
]);

// Two SEPARATE concerns, deliberately not nested in each other:
//   1. the filter — a disconnected, dashboard-level control that only produces
//      filtered rows; it knows nothing about the table.
//   2. the table unit — SectionTable, which binds the header (title + count) and
//      the table in ONE container, so the count aligns with the table's width.
// The table just receives the filtered rows + the unfiltered total.
function DayBreakdownGridDemo() {
  const [query, setQuery] = createSignal("");
  const filtered = createMemo<BreakdownRow[]>(() => {
    const q = query().trim().toLowerCase();
    if (!q) return TOP_CUSTOMERS;
    return TOP_CUSTOMERS.filter((r) => r.member.toLowerCase().includes(q));
  });
  return (
    <NarrowStack>
      {/* FILTER — totally disconnected from the table unit. Full-width here; in a
          real dashboard it would live wherever the filters live. */}
      <ThemedInput
        type="search"
        label="Dashboard filter (external — disconnected from the table)"
        placeholder="e.g. a customer name…"
        value={query()}
        onInput={(e) => setQuery(e.currentTarget.value)}
      />
      {/* TABLE UNIT — header + table bound together (SectionTable). Capped to a
          tile-like width; the record count aligns with the table's right edge
          because they share this one container. Plain div only sizes the unit. */}
      <div style={{ width: "34rem", "max-width": "100%" }}>
        <SectionTable
          title="Top Customers"
          total={TOP_CUSTOMERS.length}
          countNoun="record"
          columns={columns}
          data={filtered()}
          compact
          hoverable
          fixedLayout
          maxHeight="324px"
        />
      </div>
      <MutedBody>
        The count reads "24 records" unfiltered and "N of 24 records" when the
        view is filtered — the header and table are one unit (SectionTable), so
        the count tracks the table; the filter is a separate, disconnected control.
      </MutedBody>
    </NarrowStack>
  );
}

export const ENTRIES: TableEntry[] = [
  {
    route: "goose · SR-01a",
    name: "Day Breakdown Grid",
    status: "sui",
    note:
      "The single breakdown-table type behind SR-01a Daily Sales Orders: # · Member · Count · Order Value. Rendered with SectionTable — a table BOUND to its own header (title + record count) as one container, so the count aligns with the table's width. Member column absorbs slack (fixedLayout + ellipsis) so Count / Order Value are right-aligned (space-between). Sticky header, hover rows, 10-row scroll cap. SR-01a renders it 7× as tiles that vary only the member column (Customer, Product Line, Region, Rep, Brand, Order Type, Item Type) and count label (Orders vs Lines). The count reads '24 records' / 'N of 24 records' from data + total alone; the filter is a SEPARATE, disconnected dashboard control. Shown with Top Customers; production caps each tile at Top 10 / Top 5, stub shows 24 to exercise scroll.",
    component: DayBreakdownGridDemo,
  },
];
