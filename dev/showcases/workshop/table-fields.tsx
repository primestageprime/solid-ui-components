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
import { GhostButton } from "../../../src/components/Button";
import { ClusterRow, ContentStack } from "../../../src/components/Layout";
import { Sparkline } from "../../../src/components/Sparkline";
import { SmallStatusLight } from "../../../src/components/StatusLight";

// ── Prototype field layer (promotes to src/components/Table/fields.tsx) ──────

/** A fields entry: a known id, an action cluster, or an explicit column. */
type FieldSpec<T> = string | string[] | TableColumn<T>;

const humanize = (id: string): string =>
  id
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase())
    .replace(/ At$/, "")
    .replace(/ Cents$/, ""); // storage unit, not a label

/** Known-field factories — each returns a TableColumn; align/renderer baked in. */
const nameCol = <T,>(key: keyof T = "name" as keyof T): TableColumn<T> => ({
  id: String(key),
  header: humanize(String(key)),
  ellipsis: true,
  sortable: true,
  accessor: (row) => <StringCell value={String(row[key] ?? "")} />,
});

const intCol = <T,>(key: keyof T): TableColumn<T> => ({
  id: String(key),
  header: humanize(String(key)),
  align: "right",
  sortable: true,
  accessor: (row) => <IntCell value={row[key] as number} />,
});

const moneyCol = <T,>(key: keyof T): TableColumn<T> => ({
  id: String(key),
  header: humanize(String(key)),
  align: "right",
  sortable: true,
  accessor: (row) => <MoneyCell value={(row[key] as number) / 100} />,
});

const dateTimeCol = <T,>(key: keyof T): TableColumn<T> => ({
  id: String(key),
  header: humanize(String(key)),
  sortable: true,
  accessor: (row) => <DateTimeCell value={row[key] as string} />,
});

const selectionCol = <T,>(
  isSelected: (row: T) => boolean,
  toggle: (row: T) => void,
): TableColumn<T> => ({
  id: "selected",
  header: "",
  accessor: (row) => (
    <Checkbox checked={isSelected(row)} onChange={() => toggle(row)} />
  ),
});

/** The 5% tail: a weird cell is just a function → JSX. No CSS reachable. */
const col = <T,>(
  id: string,
  header: string,
  cell: (row: T) => JSX.Element,
): TableColumn<T> => ({ id, header, accessor: cell });

/** ['edit','delete'] → one compact trailing action column. */
const clusterCol = <T,>(actions: TableColumn<T>[]): TableColumn<T> => ({
  id: actions.map((a) => a.id).join("+"),
  header: "",
  align: "right",
  accessor: (row) => (
    <ClusterRow>
      {actions.map((a) => (a.accessor as (r: T) => JSX.Element)(row))}
    </ClusterRow>
  ),
});

const actionCol = <T,>(id: string, run: (row: T) => void): TableColumn<T> => ({
  id,
  header: "",
  accessor: (row) => (
    <GhostButton onClick={() => run(row)}>{humanize(id)}</GhostButton>
  ),
});

/** Resolve the gesture against a plain registry object of column references. */
function resolveFields<T>(
  specs: FieldSpec<T>[],
  registry: Record<string, TableColumn<T>>,
): TableColumn<T>[] {
  return specs.map((spec) => {
    if (typeof spec === "string") return registry[spec];
    if (Array.isArray(spec)) return clusterCol(spec.map((id) => registry[id]));
    return spec;
  });
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

  const workerFields: Record<string, TableColumn<Worker>> = {
    selected: selectionCol((row) => selected().has(row.name), toggle),
    name: nameCol(),
    createdAt: dateTimeCol("createdAt"),
    hours: intCol("hours"),
    amount: moneyCol("amountCents"),
    edit: actionCol("edit", (row) => console.log("[bench] edit", row.name)),
    delete: actionCol("delete", (row) => console.log("[bench] delete", row.name)),
  };

  // Table 2 — same known vocabulary, plus two weird fields inserted as
  // functions. Store-backed rows: mutating one row's history re-renders only
  // that Sparkline cell, never the column structure.
  const [batches, setBatches] = createStore<Batch[]>(
    structuredClone(INITIAL_BATCHES),
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
        <DataTable
          data={WORKERS}
          columns={resolveFields(
            ["selected", "name", "createdAt", "hours", "amount", ["edit", "delete"]],
            workerFields,
          )}
        />
        <TextSublabel>
          {`selected: ${selected().size} — selection flows through the registry's closures; the column list never rebuilds`}
        </TextSublabel>

        <TextSublabel>
          {'fields = ["name", "createdAt", col("trend", …fn), col("health", …fn)] — two weird fields inserted inline'}
        </TextSublabel>
        <DataTable
          data={batches}
          columns={resolveFields<Batch>(
            [
              "name",
              "createdAt",
              col("trend", "Trend", (row) => (
                <Sparkline values={row.throughputHistory} />
              )),
              col("health", "Health", (row) => (
                <ClusterRow>
                  <SmallStatusLight
                    variant={row.failed > 0 ? "error" : "active"}
                  />
                  <TextSublabel>{`${row.done}/${row.total}`}</TextSublabel>
                </ClusterRow>
              )),
            ],
            {
              name: nameCol(),
              createdAt: dateTimeCol("createdAt"),
            },
          )}
        />
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
