// Workshop bench — Table fields-as-functions (step ③, ruled 2026-07-17).
// The client contract is an ordered compositional gesture:
//   fields = ["selected", "name", "createdAt", "amount", ["edit", "delete"]]
// String ids pull known column-factory results out of a plain registry object;
// a nested array clusters actions into one column; a weird cell is inserted as
// a function via col() — the same value kind, composed inline in the JSX.
// This bench is now a pure CONSUMER of the promoted library modules at
// src/components/Table/fields — the prototype layer graduated 2026-07-17.
import type { Component } from "solid-js";
import { createSignal } from "solid-js";
import { createStore, produce } from "solid-js/store";
import { SectionTitle, TextSublabel, TextBody } from "../../../src/components/Text";
import { DataTable } from "../../../src/components/Table";
import {
  type FieldCol,
  behaviorOf,
  col,
  resolveFields,
  selectionCol,
  nameCol,
  textCol,
  dateCol,
  dateTimeCol,
  intCol,
  floatCol,
  moneyCol,
  durationCol,
  actionCol,
  clusterCol,
} from "../../../src/components/Table/fields";
import { GhostButton } from "../../../src/components/Button";
import { ClusterRow, ContentStack, CenteredWrapRow } from "../../../src/components/Layout";
import { Sparkline } from "../../../src/components/Sparkline";
import { SmallStatusLight } from "../../../src/components/StatusLight";

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

// Isolation specimens — row 2 carries each type's widest REALISTIC value so
// every tile demonstrates its cap honestly (the $10B money basis, a name past
// the 80ch cap, a 7-digit int).
interface Specimen {
  name: string;
  note: string;
  createdAt: string;
  hours: number;
  ratio: number;
  amountCents: number;
  secs: number;
  history: number[];
  done: number;
  failed: number;
  total: number;
}

const SPECIMENS: Specimen[] = [
  { name: "Adlai Arnold", note: "Prefers morning dispatch", createdAt: "2026-05-02T09:14:00Z", hours: 62, ratio: 12.5, amountCents: 812_500, secs: 754, history: [4, 9, 12, 11, 15], done: 41, failed: 0, total: 60 },
  { name: "A deliberately very long identifier that runs past the eighty character cap to demonstrate the ellipsis", note: "A secondary note long enough to pass the forty character cap", createdAt: "2026-06-19T16:55:00Z", hours: 9_999_999, ratio: 1_234_567.89, amountCents: 1_000_000_000_000, secs: 31_626_000, history: [22, 18, 25, 24, 30], done: 118, failed: 3, total: 140 },
  { name: "Chandra Voss", note: "Escalations only", createdAt: "2026-07-16T11:05:00Z", hours: 12, ratio: 0.25, amountCents: 157_500, secs: 59, history: [7, 7, 6, 8, 7], done: 35, failed: 0, total: 210 },
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
        <CenteredWrapRow>
          <Sparkline values={row.throughputHistory} />
        </CenteredWrapRow>
      ), "chart"),
      col("health", "Health", (row) => (
        <CenteredWrapRow>
          <SmallStatusLight variant={row.failed > 0 ? "error" : "active"} />
          <TextSublabel>{`${row.done}/${row.total}`}</TextSublabel>
        </CenteredWrapRow>
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

  // One single-column table per field type — each at its own natural width.
  const [isoSel, setIsoSel] = createSignal<ReadonlySet<string>>(new Set());
  const isoTiles: { label: string; c: FieldCol<Specimen> }[] = [
    {
      label: "selection",
      c: selectionCol(
        (r) => isoSel().has(r.name),
        (r) =>
          setIsoSel((prev) => {
            const next = new Set(prev);
            if (next.has(r.name)) {
              next.delete(r.name);
            } else {
              next.add(r.name);
            }
            return next;
          }),
      ),
    },
    { label: "name", c: nameCol() },
    { label: "text", c: textCol("note") },
    { label: "date", c: dateCol("createdAt") },
    { label: "dateTime", c: dateTimeCol("createdAt") },
    { label: "int", c: intCol("hours") },
    { label: "float", c: floatCol("ratio") },
    { label: "money", c: moneyCol("amountCents") },
    { label: "duration", c: durationCol("secs") },
    {
      label: "status",
      c: col("health", "Health", (r) => (
        <CenteredWrapRow>
          <SmallStatusLight variant={r.failed > 0 ? "error" : "active"} />
          <TextSublabel>{`${r.done}/${r.total}`}</TextSublabel>
        </CenteredWrapRow>
      ), "status"),
    },
    {
      label: "chart",
      c: col("trend", "Trend", (r) => (
        <CenteredWrapRow>
          <Sparkline values={r.history} />
        </CenteredWrapRow>
      ), "chart"),
    },
    {
      label: "actions",
      c: clusterCol([
        actionCol("edit", (r) => console.log("[bench] edit", r.name)),
        actionCol("delete", (r) => console.log("[bench] delete", r.name)),
      ]),
    },
  ];

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
          class="sui-field-frame"
          style={{
            "--sui-field-table-min": workers.minW,
            "--sui-field-table-max": workers.maxW,
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
          class="sui-field-frame"
          style={{
            "--sui-field-table-min": batchTable.minW,
            "--sui-field-table-max": batchTable.maxW,
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

        <SectionTitle>Field types in isolation</SectionTitle>
        <TextBody>
          One single-column table per field type, each at its natural width.
          Row two carries the type's widest realistic value, so every cap is
          exercised: the $10B money basis, a name past 80ch, a 7-digit int.
        </TextBody>
        <ContentStack>
          {isoTiles.map((tile) => {
            const t = resolveFields<Specimen>([tile.c], {});
            return (
              <ContentStack>
                <TextSublabel>
                  {`${tile.label} · ${t.minCh}–${t.maxCh}ch · ${behaviorOf(tile.c.geo)}`}
                </TextSublabel>
                <div
                  class="sui-field-frame"
                  style={{
                    "--sui-field-table-min": t.minW,
                    "--sui-field-table-max": t.maxW,
                  }}
                >
                  <DataTable data={SPECIMENS} columns={t.columns} fixedLayout />
                </div>
              </ContentStack>
            );
          })}
        </ContentStack>
      </ContentStack>
    </div>
  );
};

export const meta = { label: "Table Fields (function composition)" };

export default TableFieldsBench;
