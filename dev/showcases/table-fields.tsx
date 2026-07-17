// Showcase — Table fields (fields-as-functions, promoted 2026-07-17).
// The client contract is an ordered compositional gesture of field ids
// resolved against a plain registry object:
//   fields = ["selected", "name", "createdAt", "amount", ["edit", "delete"]]
// No width, no align, no style — field types own ALL geometry; data-driven
// color is a configure-time tone function; selection ships select-all +
// shift-click range for free.
import { type Component, For } from "solid-js";
import { createStore, produce } from "solid-js/store";
import {
  type FieldCol,
  type FieldSpec,
  FieldTable,
  behaviorOf,
  col,
  createFieldSelection,
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
} from "../../src/components/Table/fields";
import {
  CenteredWrapRow,
  ClusterRow,
  ContentStack,
  EndWrapRow,
} from "../../src/components/Layout";
import { Sparkline } from "../../src/components/Sparkline";
import { SmallStatusLight } from "../../src/components/StatusLight";
import { TextSublabel } from "../../src/components/Text";
import { GhostButton } from "../../src/components/Button";

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
  { name: "Esme Kowalczyk", createdAt: "2026-06-28T10:20:00Z", hours: 88, amountCents: 1_155_000 },
  { name: "Farid Osei-Bonsu", createdAt: "2026-07-03T07:45:00Z", hours: 35, amountCents: 459_400 },
  { name: "Greta Lindqvist", createdAt: "2026-07-08T12:30:00Z", hours: 54, amountCents: 708_800 },
  { name: "Hiro Tanaka-Beaumont", createdAt: "2026-07-11T15:10:00Z", hours: 21, amountCents: 275_600 },
  { name: "Imogen Delacroix", createdAt: "2026-07-13T09:00:00Z", hours: 67, amountCents: 879_400 },
  { name: "Jasper Nwachukwu", createdAt: "2026-07-15T11:40:00Z", hours: 44, amountCents: 577_500 },
];

const INITIAL_BATCHES: Batch[] = [
  { name: "vendors-q3", createdAt: "2026-07-15T21:10:00Z", throughputHistory: [4, 9, 12, 11, 15], done: 41, failed: 0, total: 60 },
  { name: "invoices-backfill", createdAt: "2026-07-16T02:30:00Z", throughputHistory: [22, 18, 25, 24, 30], done: 118, failed: 3, total: 140 },
  { name: "gl-lines-jul", createdAt: "2026-07-16T11:05:00Z", throughputHistory: [7, 7, 6, 8, 7], done: 35, failed: 0, total: 210 },
];

interface Specimen {
  name: string;
  note: string;
  createdAt: string;
  hours: number;
  ratio: number;
  amountCents: number;
  secs: number;
}

const SPECIMENS: Specimen[] = [
  { name: "Adlai Arnold", note: "Prefers morning dispatch", createdAt: "2026-05-02T09:14:00Z", hours: 62, ratio: 12.5, amountCents: 812_500, secs: 754 },
  { name: "A deliberately very long identifier that runs past the fifty character cap to demonstrate the ellipsis", note: "A secondary note long enough to pass the forty character cap", createdAt: "2026-06-19T16:55:00Z", hours: 9_999_999, ratio: 1_234_567.89, amountCents: 1_000_000_000_000, secs: 31_626_000 },
  { name: "Chandra Voss", note: "Escalations only", createdAt: "2026-07-16T11:05:00Z", hours: 12, ratio: 0.25, amountCents: 157_500, secs: 59 },
];

export const TableFieldsShowcase: Component = () => {
  // Selection: createFieldSelection gives the select-all header and
  // shift-click range behavior. One per table.
  const selection = createFieldSelection<Worker>({
    rows: () => WORKERS,
    key: (row) => row.name,
  });

  // The registry is a plain object of column-factory results, built once at
  // setup. Data-driven color is a configure-time tone function — the client
  // names a meaning ("danger under 20 hours"), never a color.
  const workerFields: Record<string, FieldCol<Worker>> = {
    selected: selectionCol(selection),
    name: nameCol(),
    createdAt: dateTimeCol("createdAt"),
    hours: intCol("hours", { tone: (v) => (v < 20 ? "danger" : "default") }),
    amount: moneyCol("amountCents"),
    edit: actionCol("edit", (row) => console.log("[showcase] edit", row.name)),
    delete: actionCol("delete", (row) => console.log("[showcase] delete", row.name)),
  };

  // Weird cells are functions inserted inline via col() — geometry still
  // comes from a named field type.
  const [batches, setBatches] = createStore<Batch[]>(
    structuredClone(INITIAL_BATCHES),
  );
  const batchSpecs: FieldSpec<Batch>[] = [
    "name",
    "createdAt",
    col("trend", "Trend", (row) => (
      <CenteredWrapRow>
        <Sparkline values={row.throughputHistory} />
      </CenteredWrapRow>
    ), "chart"),
    col("health", "Health", (row) => (
      <EndWrapRow>
        <SmallStatusLight variant={row.failed > 0 ? "error" : "active"} />
        <TextSublabel>{`${row.done}/${row.total}`}</TextSublabel>
      </EndWrapRow>
    ), "status"),
  ];
  const batchRegistry: Record<string, FieldCol<Batch>> = {
    name: nameCol(),
    createdAt: dateTimeCol("createdAt"),
  };
  const batchBudget = resolveFields(batchSpecs, batchRegistry);

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

  const isoSelection = createFieldSelection<Specimen>({
    rows: () => SPECIMENS,
    key: (r) => r.name,
  });
  const isoTiles: { label: string; c: FieldCol<Specimen> }[] = [
    { label: "selection", c: selectionCol(isoSelection) },
    { label: "name", c: nameCol() },
    { label: "text", c: textCol("note") },
    { label: "date", c: dateCol("createdAt") },
    { label: "dateTime", c: dateTimeCol("createdAt") },
    { label: "int", c: intCol("hours") },
    { label: "float", c: floatCol("ratio") },
    { label: "money", c: moneyCol("amountCents") },
    { label: "duration", c: durationCol("secs") },
  ];

  return (
    <div class="component-section component-section--full">
      <h2>Table fields — function composition (Depth 2)</h2>
      <p class="text-meta">
        A table is an ordered gesture of field ids resolved against a plain
        registry of column factories. Field types own ALL geometry (ch/em,
        zoom-proportionate); data-driven color is a configure-time
        <code> tone </code> function; call sites never see width, align, or
        CSS. Import from the <code>fields</code> namespace +{" "}
        <code>FieldTable</code>.
      </p>

      <div class="example-group">
        <h3>All known fields + selection + actions</h3>
        <p class="text-meta">
          {'fields = ["selected", "name", "createdAt", "hours", "amount", ["edit", "delete"]]'}
          {" — "}the header checkbox selects all/none (indeterminate over a
          partial selection); shift-click range-selects between two clicks.
          Hours under 20 wear the danger tone via{" "}
          <code>{'intCol("hours", { tone: v => v < 20 ? "danger" : "default" })'}</code>
          . maxRows caps the height semantically — scroll to see rows 8–10.
        </p>
        <FieldTable
          data={WORKERS}
          fields={["selected", "name", "createdAt", "hours", "amount", ["edit", "delete"]]}
          registry={workerFields}
          maxRows={7}
        />
        <TextSublabel>
          {`selected: ${selection.selected().size} of ${WORKERS.length}`}
        </TextSublabel>
      </div>

      <div class="example-group">
        <h3>Weird cells inserted inline via col()</h3>
        <p class="text-meta">
          The 5% tail: a custom cell is a function → JSX passed through{" "}
          <code>col(id, header, fn, fieldType)</code> — geometry still comes
          from the named field type. Store mutation re-renders only the
          trend/health cells; column config is static.
        </p>
        <FieldTable data={batches} fields={batchSpecs} registry={batchRegistry} />
        <ClusterRow>
          <GhostButton onClick={tick}>Simulate work tick</GhostButton>
          <TextSublabel>
            {`width budget Σmin ${batchBudget.minCh}ch → Σmax ${batchBudget.maxCh}ch — the table caps at Σmax and reads as a dashboard tile`}
          </TextSublabel>
        </ClusterRow>
      </div>

      <div class="example-group">
        <h3>Field types in isolation</h3>
        <p class="text-meta">
          One single-column table per field type, each at its natural width.
          Row two carries the type's widest realistic value ($10B money basis,
          a name past the 50ch cap, a 7-digit int), so every cap is exercised.
        </p>
        <ContentStack>
          <For each={isoTiles}>
            {(tile) => (
              <ContentStack>
                <TextSublabel>
                  {`${tile.label} · ${tile.c.geo.minCh}–${tile.c.geo.maxCh}ch · ${behaviorOf(tile.c.geo)}`}
                </TextSublabel>
                <FieldTable data={SPECIMENS} fields={[tile.c]} registry={{}} />
              </ContentStack>
            )}
          </For>
        </ContentStack>
      </div>
    </div>
  );
};
