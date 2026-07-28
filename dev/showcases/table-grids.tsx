// Tables and grids — the data-shaped components, over ONE dataset.
//
// A table with three invented rows teaches nothing: you can't see grouping,
// virtualization, or a heat scale until the data is big and uneven enough to
// need them. So everything here reads the same 400-berth booking set, and each
// component shows the shape of it that component exists for.
import { type Component, createSignal, For } from "solid-js";
import { GroupedTable } from "../../src/components/Table/GroupedTable";
import { VirtualTable } from "../../src/components/Table/VirtualTable";
import { TableQuickFilter } from "../../src/components/Table/TableQuickFilter";
import { PivotGrid } from "../../src/components/PivotGrid/PivotGrid";
import { HeatPivotGrid } from "../../src/components/PivotGrid/HeatPivotGrid";
import { LinkPivotGrid } from "../../src/components/PivotGrid/LinkPivotGrid";
import { ScrollList } from "../../src/components/List";
import { SelectableTreemap } from "../../src/components/Treemap";
import { StaticSplitLayout } from "../../src/components/SplitQueueList";
import type { TableColumn } from "../../src/components/Table/types";
import { ContentStack } from "../../src/components/Layout";
import { SubsectionTitle, TextSublabel, TextBody } from "../../src/components/Text";
import { SingleLine } from "../../src/components/SlotCard";
import "./table-grids.css";

// ── One dataset ──────────────────────────────────────────────────────────────
const TERMINALS = ["Long Beach", "Oakland", "Seattle", "Tacoma"] as const;
const CATEGORIES = ["Container", "Tanker", "RoRo", "Bulk"] as const;
type Terminal = (typeof TERMINALS)[number];
type Category = (typeof CATEGORIES)[number];

interface Booking {
  id: string;
  vessel: string;
  terminal: Terminal;
  category: Category;
  berthHours: number;
  teu: number;
}

const NAMES = [
  "MSC Bellissima", "Aframax Horizon", "Pacific Trader", "Nordic Star",
  "Coral Voyager", "Themis Leader", "Grand Aurora", "Pelican State",
  "New Century", "Asian Dynasty", "Gulf Muttrah", "Del Monte Harvester",
];

const BOOKINGS: Booking[] = (() => {
  let s = 7;
  const rand = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const out: Booking[] = [];
  for (let i = 0; i < 400; i++) {
    const terminal = TERMINALS[Math.floor(rand() * TERMINALS.length)];
    const category = CATEGORIES[Math.floor(rand() * CATEGORIES.length)];
    out.push({
      id: `bk-${i + 1}`,
      vessel: `${NAMES[Math.floor(rand() * NAMES.length)]} ${(i % 9) + 1}`,
      terminal,
      category,
      berthHours: Math.round(8 + rand() * 64),
      teu: Math.round(200 + rand() * 5800),
    });
  }
  return out;
})();

const columns: TableColumn<Booking>[] = [
  { id: "vessel", header: "Vessel", align: "left", ellipsis: true, contained: true, minWidth: "0", accessor: (r) => r.vessel },
  { id: "terminal", header: "Terminal", align: "left", width: "9rem", accessor: (r) => r.terminal },
  { id: "category", header: "Category", align: "left", width: "8rem", accessor: (r) => r.category },
  { id: "berthHours", header: "Berth h", align: "right", width: "6rem", accessor: (r) => String(r.berthHours) },
  { id: "teu", header: "TEU", align: "right", width: "7rem", accessor: (r) => r.teu.toLocaleString() },
];

// Grouped rows: the same bookings, grouped by terminal, with the group cell
// spanning its members' rows.
const GROUPED = TERMINALS.flatMap((terminal) =>
  BOOKINGS.filter((b) => b.terminal === terminal)
    .slice(0, 5)
    .map((b) => ({ groupKey: terminal, data: b })),
);

// The grouped view's columns: the terminal cell is rowspanned across its
// members, the rest render per row.
const groupedColumns = [
  { id: "terminal", header: "Terminal", accessor: (r: Booking) => r.terminal, rowspan: true, width: "9rem" },
  { id: "vessel", header: "Vessel", accessor: (r: Booking) => r.vessel },
  { id: "category", header: "Category", accessor: (r: Booking) => r.category, width: "8rem" },
  { id: "berthHours", header: "Berth h", accessor: (r: Booking) => String(r.berthHours), width: "6rem" },
  { id: "teu", header: "TEU", accessor: (r: Booking) => r.teu.toLocaleString(), width: "7rem" },
];

// Pivot: terminal × category, cells carrying the totals behind them.
interface PivotCell {
  calls: number;
  teu: number;
}
const PIVOT = new Map<string, PivotCell>();
for (const b of BOOKINGS) {
  const key = `${b.terminal}|${b.category}`;
  const cur = PIVOT.get(key) ?? { calls: 0, teu: 0 };
  PIVOT.set(key, { calls: cur.calls + 1, teu: cur.teu + b.teu });
}
const cellOf = (row: Terminal, col: Category): PivotCell | null =>
  PIVOT.get(`${row}|${col}`) ?? null;
const MAX_TEU = Math.max(...[...PIVOT.values()].map((c) => c.teu));

// Treemap: a column per terminal, weighted by its TEU, holding one inner cell
// per category — the nested shape the component exists for.
const teuOf = (t: Terminal, c?: Category): number =>
  BOOKINGS.filter((b) => b.terminal === t && (!c || b.category === c)).reduce(
    (a, b) => a + b.teu,
    0,
  );

interface TreemapInner {
  key: string;
  weight: number;
  category: Category;
}

const TREEMAP: Array<{ key: Terminal; weight: number; children: TreemapInner[] }> = TERMINALS.map((t) => ({
  key: t,
  weight: teuOf(t),
  children: CATEGORIES.map((c) => ({
    key: `${t}|${c}`,
    weight: teuOf(t, c),
    category: c,
  })),
}));

export const TableGridsShowcase: Component = () => {
  const [selected, setSelected] = createSignal<string | null>(null);

  return (
    <div class="component-section component-section--full">
      <h2>Tables and grids — over one dataset</h2>
      <p class="text-meta">
        {BOOKINGS.length} berth bookings across {TERMINALS.length} terminals and{" "}
        {CATEGORIES.length} categories. Each component below shows the shape of
        that same data it exists for — grouping, virtualizing, pivoting,
        filtering — rather than three invented rows that would look identical in
        every one of them.
      </p>

      <ContentStack>
        <SubsectionTitle>GroupedTable</SubsectionTitle>
        <TextSublabel>
          Bookings grouped by terminal: the group cell spans its members' rows,
          so the eye reads the group once rather than once per row.
        </TextSublabel>
        <div class="table-grid-frame">
          <GroupedTable rows={GROUPED} columns={groupedColumns} compact stickyHeader maxHeight="320px" />
        </div>
      </ContentStack>

      <ContentStack>
        <SubsectionTitle>VirtualTable</SubsectionTitle>
        <TextSublabel>
          All {BOOKINGS.length} rows, but only the visible window is in the DOM —
          scroll it; the row count never changes and the scrollbar is honest.
        </TextSublabel>
        <div class="table-grid-frame">
          <VirtualTable data={BOOKINGS} columns={columns} compact stickyHeader maxHeight="320px" />
        </div>
      </ContentStack>

      <ContentStack>
        <SubsectionTitle>TableQuickFilter</SubsectionTitle>
        <TextSublabel>
          The filter owns the input and hands the filtered rows to its child, so
          the table underneath stays a plain table that knows nothing about
          filtering.
        </TextSublabel>
        <div class="table-grid-frame">
          <TableQuickFilter data={BOOKINGS} placeholder="Filter by vessel, terminal, category…">
            {(filtered) => (
              <VirtualTable data={filtered()} columns={columns} compact stickyHeader maxHeight="260px" />
            )}
          </TableQuickFilter>
        </div>
      </ContentStack>

      <ContentStack>
        <SubsectionTitle>PivotGrid</SubsectionTitle>
        <TextSublabel>
          Terminal × category. The grid owns the sticky headers and the cell
          frame; the caller owns what a cell MEANS and how it reads.
        </TextSublabel>
        <div class="table-grid-frame">
          <PivotGrid
            rows={TERMINALS}
            columns={CATEGORIES}
            rowLabel={(r) => r}
            colLabel={(c) => c}
            cell={cellOf}
            renderCell={(c) => <>{c.calls}</>}
          />
        </div>
      </ContentStack>

      <ContentStack>
        <SubsectionTitle>HeatPivotGrid</SubsectionTitle>
        <TextSublabel>
          The same pivot, with each cell shaded by TEU against the busiest cell —
          the caller supplies the heat, the grid supplies the scale.
        </TextSublabel>
        <div class="table-grid-frame">
          <HeatPivotGrid
            rows={TERMINALS}
            columns={CATEGORIES}
            rowLabel={(r) => r}
            colLabel={(c) => c}
            cell={cellOf}
            renderCell={(c) => <>{Math.round(c.teu / 1000)}k</>}
            getCellHeat={(c) => c.teu / MAX_TEU}
          />
        </div>
      </ContentStack>

      <ContentStack>
        <SubsectionTitle>LinkPivotGrid</SubsectionTitle>
        <TextSublabel>
          The same pivot again, where every populated cell is a link into the
          detail behind it.
        </TextSublabel>
        <div class="table-grid-frame">
          <LinkPivotGrid
            rows={TERMINALS}
            columns={CATEGORIES}
            rowLabel={(r) => r}
            colLabel={(c) => c}
            cell={cellOf}
            renderCell={(c) => <>{c.calls}</>}
            cellHref={(row, col, c) =>
              c ? `#/table-grids?terminal=${encodeURIComponent(row)}&category=${col}` : undefined
            }
          />
        </div>
      </ContentStack>

      <ContentStack>
        <SubsectionTitle>ScrollList</SubsectionTitle>
        <TextSublabel>
          A list that scrolls inside its own box rather than growing the page —
          the busiest 40 bookings.
        </TextSublabel>
        <div class="table-grid-frame table-grid-frame--narrow">
          <ScrollList>
            <For each={[...BOOKINGS].sort((a, b) => b.teu - a.teu).slice(0, 40)}>
              {(b) => (
                <SingleLine
                  values={{ text: `${b.vessel} · ${b.terminal} · ${b.teu.toLocaleString()} TEU` }}
                  active={selected() === b.id}
                  onSelect={() => setSelected(b.id)}
                  maxWidth={420}
                />
              )}
            </For>
          </ScrollList>
        </div>
      </ContentStack>

      <ContentStack>
        <SubsectionTitle>SelectableTreemap</SubsectionTitle>
        <TextSublabel>
          TEU by terminal as area. Click a tile to select it —{" "}
          {selected() ? `selected ${selected()}` : "nothing selected yet"}.
        </TextSublabel>
        <div class="table-grid-frame">
          <SelectableTreemap<TreemapInner, (typeof TREEMAP)[number]>
            cells={TREEMAP}
            renderOuterHeader={(cell) => <TextBody>{cell.key}</TextBody>}
            renderInnerContent={(_cell, inner) => (
              <TextSublabel>{`${inner.category} · ${Math.round(inner.weight / 1000)}k`}</TextSublabel>
            )}
            isInnerSelected={(_cell, inner) => selected() === inner.key}
            onInnerClick={(_cell, inner) => setSelected(inner.key)}
          />
        </div>
      </ContentStack>

      <ContentStack>
        <SubsectionTitle>StaticSplitLayout</SubsectionTitle>
        <TextSublabel>
          A capped top list over pinned bottom content — no queue, no animation.
          The non-deprecated half of the old SplitQueueList.
        </TextSublabel>
        <div class="table-grid-frame table-grid-frame--narrow">
          <StaticSplitLayout
            items={BOOKINGS.slice(0, 8)}
            renderItem={(b: Booking) => <TextBody>{`${b.vessel} · ${b.berthHours}h`}</TextBody>}
            label="Awaiting berth"
            emptyLabel="All clear"
            capRows={4}
            bottomContent={<TextSublabel>4 of 8 shown — the rest scroll</TextSublabel>}
          />
        </div>
      </ContentStack>
    </div>
  );
};
