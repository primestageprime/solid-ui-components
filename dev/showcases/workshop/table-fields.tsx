// Workshop bench — Table fields-as-functions prototype (step ③ spec, ruled 2026-07-17).
// The client contract is an ordered compositional gesture:
//   fields = ["selected", "name", "createdAt", "amount", ["edit", "delete"]]
// String ids pull known column-factory results out of a plain registry object;
// a nested array clusters actions into one column; a weird cell is inserted as
// a function via col() — the same value kind, composed inline in the JSX.
// No width, no align, no style anywhere in the client surface: field type will
// own width/align/drop-priority via CSS classes when this promotes (step ③).
// On this bench the factories translate to the CURRENT TableColumn shape.
import type { Component, JSX } from "solid-js";
import { createSignal } from "solid-js";
import { createStore, produce } from "solid-js/store";
import { SectionTitle, TextSublabel, TextBody } from "../../../src/components/Text";
import {
  DataTable,
  IntCell,
  MoneyCell,
  DateTimeCell,
  StringCell,
  type TableColumn,
} from "../../../src/components/Table";
import { Checkbox } from "../../../src/components/Checkbox";
import { GhostButton, IconOnlyButton } from "../../../src/components/Button";
import { Icon, type IconName } from "../../../src/components/Icon";
import { ClusterRow, IconClusterRow, ContentStack } from "../../../src/components/Layout";
import { Sparkline } from "../../../src/components/Sparkline";
import { SmallStatusLight } from "../../../src/components/StatusLight";

// ── Prototype field layer (promotes to src/components/Table/fields.tsx) ──────

/** A fields entry: a known id, an action cluster, or an explicit column. */
type FieldSpec<T> = string | string[] | TableColumn<T>;

// Field-type geometry contract (ruled 2026-07-17): all widths are ch/em —
// they scale with theme font-size and browser zoom, never px. `min === max`
// is a fixed column; name expands between its bounds; the table caps at the
// sum of column maxes so a table becomes a dashboard tile, not wallpaper.
// (Sums below convert 1em ≈ 2ch.)
interface FieldGeo {
  minCh: number;
  maxCh: number;
  /** CSS width the factory applies internally — clients never see it. */
  css?: string;
}
// Widths are TOTAL column widths under table-layout: fixed — content basis
// plus the cell's own chrome (16px ≈ 2ch padding per side). Bench-measured:
// hinted widths without fixedLayout get squeezed by auto layout (the checkbox
// column collapsed to a 1px content box).
const GEO = {
  selection: { minCh: 6.5, maxCh: 6.5, css: "3.25rem" }, // 18px checkbox + 32px padding
  name:      { minCh: 12,  maxCh: 80 },                  // expands, ellipsis past cap
  dateTime:  { minCh: 23,  maxCh: 23, css: "23ch" },     // "2026-07-15 14:10:00" (19ch) + chrome
  int:       { minCh: 8,   maxCh: 14, css: "14ch" },     // "9,999,999" + chrome
  money:     { minCh: 10,  maxCh: 22, css: "22ch" },     // "$10,000,000,000.00" + chrome
  // 2 × IconOnlyButton (1.4rem) with 1rem around each icon (md-gap cluster).
  actions2:  { minCh: 12,  maxCh: 12, css: "6rem" },
  chart:     { minCh: 24,  maxCh: 24, css: "12em" },     // sparkline strip + chrome (10em tripped cell ellipsis; chart cells should drop text-overflow at promotion)
  status:    { minCh: 14,  maxCh: 14, css: "14ch" },
} satisfies Record<string, FieldGeo>;

/** Header alignment by field type: left for flowing text, center for
 *  fixed-width text/icons (ruled 2026-07-17). Values keep their own align. */
const centered = (label: string): JSX.Element => (
  <span class="tf-th-center">{label}</span>
);

type FieldCol<T> = TableColumn<T> & { geo: FieldGeo };

const humanize = (id: string): string =>
  id
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase())
    .replace(/ At$/, "")
    .replace(/ Cents$/, ""); // storage unit, not a label

/** Known-field factories — each returns a column with geometry baked in.
 *  Clients never see width/align: the factory owns the CSS translation. */
const nameCol = <T,>(key: keyof T = "name" as keyof T): FieldCol<T> => ({
  id: String(key),
  header: humanize(String(key)),
  ellipsis: true,
  sortable: true,
  geo: GEO.name,
  accessor: (row) => <StringCell value={String(row[key] ?? "")} />,
});

const intCol = <T,>(key: keyof T): FieldCol<T> => ({
  id: String(key),
  header: centered(humanize(String(key))),
  align: "right",
  width: GEO.int.css,
  sortable: true,
  geo: GEO.int,
  accessor: (row) => <IntCell value={row[key] as number} />,
});

const moneyCol = <T,>(key: keyof T): FieldCol<T> => ({
  id: String(key),
  header: centered(humanize(String(key))),
  align: "right",
  width: GEO.money.css,
  sortable: true,
  geo: GEO.money,
  accessor: (row) => <MoneyCell value={(row[key] as number) / 100} />,
});

const dateTimeCol = <T,>(key: keyof T): FieldCol<T> => ({
  id: String(key),
  header: centered(humanize(String(key))),
  width: GEO.dateTime.css,
  sortable: true,
  geo: GEO.dateTime,
  accessor: (row) => <DateTimeCell value={row[key] as string} />,
});

const selectionCol = <T,>(
  isSelected: (row: T) => boolean,
  toggle: (row: T) => void,
): FieldCol<T> => ({
  id: "selected",
  header: "",
  width: GEO.selection.css,
  geo: GEO.selection,
  accessor: (row) => (
    <Checkbox checked={isSelected(row)} onChange={() => toggle(row)} />
  ),
});

/** The 5% tail: a weird cell is just a function → JSX. Geometry comes from a
 *  named field type — even the weirdest cell cannot reach CSS. */
const col = <T,>(
  id: string,
  header: string,
  cell: (row: T) => JSX.Element,
  geoKey: keyof typeof GEO = "status",
): FieldCol<T> => ({
  id,
  header: geoKey === "name" ? header : centered(header),
  width: GEO[geoKey].css,
  geo: GEO[geoKey],
  accessor: cell,
});

/** ['edit','delete'] → one compact trailing action column, standard icons. */
const clusterCol = <T,>(actions: FieldCol<T>[]): FieldCol<T> => ({
  id: actions.map((a) => a.id).join("+"),
  header: "",
  align: "right",
  width: GEO.actions2.css,
  geo: GEO.actions2,
  accessor: (row) => (
    <IconClusterRow>
      {actions.map((a) => (a.accessor as (r: T) => JSX.Element)(row))}
    </IconClusterRow>
  ),
});

const ACTION_ICONS: Record<string, IconName> = { edit: "edit", delete: "trash" };

const actionCol = <T,>(id: string, run: (row: T) => void): FieldCol<T> => ({
  id,
  header: "",
  geo: GEO.actions2,
  accessor: (row) => (
    <IconOnlyButton aria-label={humanize(id)} title={humanize(id)} onClick={() => run(row)}>
      <Icon name={ACTION_ICONS[id] ?? "settings"} size="sm" />
    </IconOnlyButton>
  ),
});

/** Resolved gesture: the columns plus the table's width budget (Σ min, Σ max). */
function resolveFields<T>(
  specs: FieldSpec<T>[],
  registry: Record<string, FieldCol<T>>,
): { columns: TableColumn<T>[]; minCh: number; maxCh: number } {
  const columns = specs.map((spec) => {
    if (typeof spec === "string") return registry[spec];
    if (Array.isArray(spec)) return clusterCol(spec.map((id) => registry[id]));
    return spec as FieldCol<T>;
  });
  return {
    columns,
    minCh: columns.reduce((s, c) => s + c.geo.minCh, 0),
    maxCh: columns.reduce((s, c) => s + c.geo.maxCh, 0),
  };
}

// ── Demo data ────────────────────────────────────────────────────────────────

interface Worker {
  name: string;
  createdAt: string;
  hours: number;
  amountCents: number;
}

interface Batch {
  name: string;
  createdAt: string;
  throughputHistory: number[];
  done: number;
  failed: number;
  total: number;
}

const WORKERS: Worker[] = [
  { name: "Adlai Arnold", createdAt: "2026-05-02T09:14:00Z", hours: 62, amountCents: 812_500 },
  { name: "Bea Okonkwo-Marchetti", createdAt: "2026-05-11T14:02:00Z", hours: 48, amountCents: 630_000 },
  { name: "Chandra Voss", createdAt: "2026-06-01T08:40:00Z", hours: 71, amountCents: 931_250 },
  { name: "Dmitri Fontaine", createdAt: "2026-06-19T16:55:00Z", hours: 12, amountCents: 157_500 },
];

const INITIAL_BATCHES: Batch[] = [
  { name: "vendors-q3", createdAt: "2026-07-15T21:10:00Z", throughputHistory: [4, 9, 12, 11, 15], done: 41, failed: 0, total: 60 },
  { name: "invoices-backfill", createdAt: "2026-07-16T02:30:00Z", throughputHistory: [22, 18, 25, 24, 30], done: 118, failed: 3, total: 140 },
  { name: "gl-lines-jul", createdAt: "2026-07-16T11:05:00Z", throughputHistory: [7, 7, 6, 8, 7], done: 35, failed: 0, total: 210 },
];

// ── Bench ────────────────────────────────────────────────────────────────────

const TableFieldsBench: Component = () => {
  // Table 1 — every field known. Registry is a plain object of references;
  // built once at setup (static config — reactivity lives inside the cells).
  const [selected, setSelected] = createSignal<ReadonlySet<string>>(new Set());
  const toggle = (row: Worker) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(row.name)) {
        next.delete(row.name);
      } else {
        next.add(row.name);
      }
      return next;
    });

  const workerFields: Record<string, FieldCol<Worker>> = {
    selected: selectionCol((row) => selected().has(row.name), toggle),
    name: nameCol(),
    createdAt: dateTimeCol("createdAt"),
    hours: intCol("hours"),
    amount: moneyCol("amountCents"),
    edit: actionCol("edit", (row) => console.log("[bench] edit", row.name)),
    delete: actionCol("delete", (row) => console.log("[bench] delete", row.name)),
  };

  const workers = resolveFields(
    ["selected", "name", "createdAt", "hours", "amount", ["edit", "delete"]],
    workerFields,
  );

  // Table 2 — same known vocabulary, plus two weird fields inserted as
  // functions. Store-backed rows: mutating one row's history re-renders only
  // that Sparkline cell, never the column structure.
  const [batches, setBatches] = createStore<Batch[]>(
    structuredClone(INITIAL_BATCHES),
  );
  const batchTable = resolveFields<Batch>(
    [
      "name",
      "createdAt",
      col("trend", "Trend", (row) => (
        <Sparkline values={row.throughputHistory} />
      ), "chart"),
      col("health", "Health", (row) => (
        <ClusterRow>
          <SmallStatusLight variant={row.failed > 0 ? "error" : "active"} />
          <TextSublabel>{`${row.done}/${row.total}`}</TextSublabel>
        </ClusterRow>
      ), "status"),
    ],
    { name: nameCol(), createdAt: dateTimeCol("createdAt") },
  );

  const tick = () =>
    setBatches(
      produce((rows) => {
        for (const row of rows) {
          const last = row.throughputHistory.at(-1) ?? 5;
          row.throughputHistory.push(
            Math.max(1, last + Math.round((Math.random() - 0.4) * 8)),
          );
          row.done = Math.min(row.total, row.done + Math.ceil(Math.random() * 4));
          if (Math.random() < 0.15) row.failed += 1;
        }
      }),
    );

  return (
    <div class="component-section component-section--full">
      <SectionTitle>Table Fields (function composition)</SectionTitle>
      <ContentStack>
        <TextBody>
          The client contract is an ordered gesture of field ids resolved
          against a plain registry object. No width, no align, no style — field
          type will own geometry via CSS classes at promotion.
        </TextBody>

        <TextSublabel>
          {'fields = ["selected", "name", "createdAt", "hours", "amount", ["edit", "delete"]]'}
        </TextSublabel>
        <div
          class="tf-table-frame"
          style={{
            "--tf-table-min": `${workers.minCh}ch`,
            "--tf-table-max": `${workers.maxCh}ch`,
          }}
        >
          <DataTable data={WORKERS} columns={workers.columns} fixedLayout />
        </div>
        <TextSublabel>
          {`selected: ${selected().size} — width budget Σmin ${workers.minCh}ch → Σmax ${workers.maxCh}ch; only name flexes between them`}
        </TextSublabel>

        <TextSublabel>
          {'fields = ["name", "createdAt", col("trend", …fn, "chart"), col("health", …fn, "status")] — two weird fields inserted inline'}
        </TextSublabel>
        <div
          class="tf-table-frame"
          style={{
            "--tf-table-min": `${batchTable.minCh}ch`,
            "--tf-table-max": `${batchTable.maxCh}ch`,
          }}
        >
          <DataTable data={batches} columns={batchTable.columns} fixedLayout />
        </div>
        <TextSublabel>
          {`width budget Σmin ${batchTable.minCh}ch → Σmax ${batchTable.maxCh}ch — the table caps at Σmax and becomes a dashboard tile, not wallpaper`}
        </TextSublabel>
        <ClusterRow>
          <GhostButton onClick={tick}>Simulate work tick</GhostButton>
          <TextSublabel>
            store mutation re-renders only the trend/health cells — column
            config is static, reactivity is per-cell
          </TextSublabel>
        </ClusterRow>
      </ContentStack>
    </div>
  );
};

export const meta = { label: "Table Fields (function composition)" };

export default TableFieldsBench;
