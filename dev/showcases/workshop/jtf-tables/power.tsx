// JTF Table Catalog — power-log group.
// Replicas of the power-log tables in jtf-ui: PowerLogCacheView, the migrated
// /tools/power-log-ocr FieldTable, and the two hour-grain data tables (grouped
// headers + runtime pivot). PowerLogPanel was retired at jtf HEAD and removed
// from this catalog (Wave 2, 2026-07-20) — dead debt, nothing to migrate.
//
// Judgment call: HourLevelDataTable's status-colored text is approximated with
// InlineText color inside a col() custom cell (no style objects).
import type { Component } from "solid-js";
import {
  DataTableContainer,
  IntCell,
  MinuteDateTimeCell,
} from "../../../../src/components/Table";
import { FieldTable, SortableFieldTable, group, textCol, text5Col, col, intCol, floatCol, avgCol, aggregateCol } from "../../../../src/components/Table/fields";
import { InlineText } from "../../../../src/components/InlineText";
import { pipe, filter, sum } from "../../../../src/fn";
import type { TableEntry } from "./shared";

// ============================================
// 2. PowerLogCacheView — cached aux hourly table
// ============================================

interface AuxHourlyRow {
  hour_utc: string;
  aux_1: number | null;
  aux_2: number | null;
  aux_3: number | null;
  aux_4: number | null;
}

const CACHE_ROWS: AuxHourlyRow[] = [
  { hour_utc: "2026-07-08 14:00:00", aux_1: 412, aux_2: 398, aux_3: null, aux_4: null },
  { hour_utc: "2026-07-08 15:00:00", aux_1: 455, aux_2: 431, aux_3: null, aux_4: null },
  { hour_utc: "2026-07-08 16:00:00", aux_1: 487, aux_2: 442, aux_3: 210, aux_4: null },
  { hour_utc: "2026-07-08 17:00:00", aux_1: 390, aux_2: null, aux_3: 374, aux_4: null },
  { hour_utc: "2026-07-08 18:00:00", aux_1: 351, aux_2: 341, aux_3: null, aux_4: null },
  { hour_utc: "2026-07-08 19:00:00", aux_1: null, aux_2: null, aux_3: null, aux_4: null },
];

const AUX_KEYS: (keyof AuxHourlyRow)[] = ["aux_1", "aux_2", "aux_3", "aux_4"];

const isPositive = (v: number): boolean => v > 0;

// Per-train kW (ruled 2026-07-20): the SUM of the positive aux readings divided
// by the number of trains — a per-train TOTAL, not a mean across the aux columns
// (the "Avg (kW)" production header is a mislabel we deliberately keep). Named +
// pure so aggregateCol feeds the accessor and sortValue from one reader; values
// arrive pre-filtered to finite members. This replica bakes the source's
// 1-train branch (no allAssets here); 2-train would halve the sum.
const perTrainKw = (values: number[]): number | null => {
  const positive = pipe(values, filter(isPositive));
  return positive.length ? sum(positive) : null;
};

// aggregateCol DECLARES its math via the combine fn (accent by default). Aux
// cells are plain floatCol (weight nuance dies, null → BLANK, no '—' literals).
const CACHE_REGISTRY = {
  hour: col<AuxHourlyRow>("hour", "Date / Hour", (row) => row.hour_utc.slice(0, 16), "dateTime", (row) => row.hour_utc),
  aux1: floatCol<AuxHourlyRow>("aux_1", { precision: 0, header: "Aux. 1" }),
  aux2: floatCol<AuxHourlyRow>("aux_2", { precision: 0, header: "Aux. 2" }),
  aux3: floatCol<AuxHourlyRow>("aux_3", { precision: 0, header: "Aux. 3" }),
  aux4: floatCol<AuxHourlyRow>("aux_4", { precision: 0, header: "Aux. 4" }),
  avg: aggregateCol<AuxHourlyRow>(AUX_KEYS, perTrainKw, { id: "avg_kw", header: "Avg (kW)", precision: 0 }),
};

const PowerLogCacheTable: Component = () => (
  <FieldTable
    data={CACHE_ROWS}
    fields={["hour", "aux1", "aux2", "aux3", "aux4", "avg"]}
    registry={CACHE_REGISTRY}
  />
);

// ============================================
// 3. /tools/power-log-ocr — migrated FieldTable
// ============================================

interface PowerLogEntry {
  hour: string;
  aux_1: number | null;
  aux_2: number | null;
  aux_3: number | null;
  aux_4: number | null;
}

const OCR_ENTRIES: PowerLogEntry[] = [
  { hour: "01:00", aux_1: 402, aux_2: 388, aux_3: null, aux_4: null },
  { hour: "02:00", aux_1: 410, aux_2: 395, aux_3: null, aux_4: null },
  { hour: "03:00", aux_1: 421, aux_2: null, aux_3: null, aux_4: null },
  { hour: "04:00", aux_1: 433, aux_2: 407, aux_3: 215, aux_4: null },
  { hour: "05:00", aux_1: 460, aux_2: 428, aux_3: 240, aux_4: null },
  { hour: "06:00", aux_1: 512, aux_2: 489, aux_3: null, aux_4: null },
  { hour: "07:00", aux_1: 545, aux_2: 520, aux_3: null, aux_4: 205 },
  { hour: "08:00", aux_1: 530, aux_2: null, aux_3: null, aux_4: null },
];

const ocrRegistry = {
  // "01:00" = 5ch, a known short format → the 5 class (ruled 2026-07-21),
  // not the 8–40ch flex that made HOUR the widest column in the table.
  hour: text5Col<PowerLogEntry>("hour"),
};

// Aux cells keep the null → blank rule; custom cols with "int" geometry.
const ocrFields = [
  "hour",
  col<PowerLogEntry>("aux_1", "Aux. 1", (row) => (row.aux_1 !== null ? row.aux_1.toFixed(0) : ""), "int"),
  col<PowerLogEntry>("aux_2", "Aux. 2", (row) => (row.aux_2 !== null ? row.aux_2.toFixed(0) : ""), "int"),
  col<PowerLogEntry>("aux_3", "Aux. 3", (row) => (row.aux_3 !== null ? row.aux_3.toFixed(0) : ""), "int"),
  col<PowerLogEntry>("aux_4", "Aux. 4", (row) => (row.aux_4 !== null ? row.aux_4.toFixed(0) : ""), "int"),
  // The aggregate field (ruled 2026-07-18): configured with the avg targets,
  // accent tone by default — mirrors jtf's migrated form.
  avgCol<PowerLogEntry>(["aux_1", "aux_2", "aux_3", "aux_4"], {
    header: "Avg (kW)",
    precision: 0,
  }),
];

const PowerLogOcrTable: Component = () => (
  <FieldTable data={OCR_ENTRIES} fields={ocrFields} registry={ocrRegistry} maxRows={12} />
);

// ============================================
// 4. HourLevelDataTable — grouped/spanned headers
// ============================================

type HourStatus = "full" | "partial" | "missing";

interface HourLevelRow {
  hour_timestamp: string;
  ftir_i_status: HourStatus;
  ftir_i_samples: number;
  scr_status: HourStatus;
  scr_samples: number;
  fid_status: HourStatus;
  fid_samples: number;
  aux_status: HourStatus;
  aux_samples: number;
  aux_total_kw: number | null;
}

const HOUR_LEVEL_ROWS: HourLevelRow[] = [
  { hour_timestamp: "2026-07-08T14:00:00Z", ftir_i_status: "full", ftir_i_samples: 60, scr_status: "full", scr_samples: 60, fid_status: "partial", fid_samples: 41, aux_status: "full", aux_samples: 60, aux_total_kw: 811 },
  { hour_timestamp: "2026-07-08T15:00:00Z", ftir_i_status: "full", ftir_i_samples: 60, scr_status: "partial", scr_samples: 33, fid_status: "full", fid_samples: 60, aux_status: "full", aux_samples: 60, aux_total_kw: 887 },
  { hour_timestamp: "2026-07-08T16:00:00Z", ftir_i_status: "missing", ftir_i_samples: 0, scr_status: "full", scr_samples: 60, fid_status: "full", fid_samples: 60, aux_status: "partial", aux_samples: 27, aux_total_kw: 344 },
  { hour_timestamp: "2026-07-08T17:00:00Z", ftir_i_status: "full", ftir_i_samples: 60, scr_status: "full", scr_samples: 60, fid_status: "missing", fid_samples: 0, aux_status: "full", aux_samples: 60, aux_total_kw: 764 },
];

const STATUS_COLOR: Record<HourStatus, string> = {
  full: "var(--sui-success)",
  partial: "var(--sui-warning)",
  missing: "var(--sui-danger)",
};

const StatusText: Component<{ status: HourStatus }> = (props) => (
  <InlineText color={STATUS_COLOR[props.status]}>{props.status}</InlineText>
);

// 3 of the source's 8 category groups (FTIR I / SCR / FID / AUX subset keeps
// the spanned-header shape readable); each group = Status + Samples columns.
// Migrated to FieldTable via the group() spec wrapper (ruled 2026-07-20): the
// ordered gesture stays the source of truth, group() names the category run,
// and the resolver stamps each member's `group` so BaseTable derives the
// two-row spanned header it already renders. Status text is a col() custom on
// `status` geometry (the colored InlineText is the 5% tail); the leading Hour
// column stays ungrouped and spans both header rows. The aux "Samples" cell
// keeps its in-cell "(NNN kW)" muted annotation as a col() custom.
const statusCell = (status: HourStatus) => <StatusText status={status} />;

const auxSamplesCell = (row: HourLevelRow) => (
  <>
    <IntCell value={row.aux_samples} />
    {row.aux_total_kw != null ? (
      <InlineText color="var(--sui-text-muted)"> ({row.aux_total_kw.toFixed(0)} kW)</InlineText>
    ) : null}
  </>
);

const hourLevelRegistry = {
  hour: col<HourLevelRow>("hour", "Hour", (r) => <MinuteDateTimeCell value={r.hour_timestamp} />, "dateTime", (r) => r.hour_timestamp),
  ftir_i_status: col<HourLevelRow>("ftir_i_status", "Status", (r) => statusCell(r.ftir_i_status), "status"),
  ftir_i_samples: intCol<HourLevelRow>("ftir_i_samples", { header: "Samples" }),
  scr_status: col<HourLevelRow>("scr_status", "Status", (r) => statusCell(r.scr_status), "status"),
  scr_samples: intCol<HourLevelRow>("scr_samples", { header: "Samples" }),
  fid_status: col<HourLevelRow>("fid_status", "Status", (r) => statusCell(r.fid_status), "status"),
  fid_samples: intCol<HourLevelRow>("fid_samples", { header: "Samples" }),
  aux_status: col<HourLevelRow>("aux_status", "Status", (r) => statusCell(r.aux_status), "status"),
  aux_samples: col<HourLevelRow>("aux_samples", "Samples", auxSamplesCell, "int"),
};

const HourLevelTable: Component = () => (
  <FieldTable
    data={HOUR_LEVEL_ROWS}
    fields={[
      "hour",
      group<HourLevelRow>("FTIR I", ["ftir_i_status", "ftir_i_samples"]),
      group<HourLevelRow>("SCR", ["scr_status", "scr_samples"]),
      group<HourLevelRow>("FID", ["fid_status", "fid_samples"]),
      group<HourLevelRow>("AUX", ["aux_status", "aux_samples"]),
    ]}
    registry={hourLevelRegistry}
    emptyMessage="No hour-level data available."
  />
);

// ============================================
// 5. HourlyDataTable — runtime-pivoted metric columns
// ============================================

interface PivotRow {
  timestamp: string;
  values: Map<string, number | null>;
}

// Fixed 3-metric pivot standing in for the source's runtime Set-derived list.
const PIVOT_METRICS = ["aux_1_value", "aux_2_value", "aux_3_value"];

const PIVOT_ROWS: PivotRow[] = [
  { timestamp: "2026-07-08T14:00:00Z", values: new Map([["aux_1_value", 412.5], ["aux_2_value", 398.2], ["aux_3_value", null]]) },
  { timestamp: "2026-07-08T15:00:00Z", values: new Map([["aux_1_value", 455.0], ["aux_2_value", 431.7], ["aux_3_value", 210.4]]) },
  { timestamp: "2026-07-08T16:00:00Z", values: new Map([["aux_1_value", 487.3], ["aux_2_value", 442.9], ["aux_3_value", 238.6]]) },
  { timestamp: "2026-07-08T17:00:00Z", values: new Map([["aux_1_value", 390.1], ["aux_2_value", null], ["aux_3_value", 374.8]]) },
  { timestamp: "2026-07-08T18:00:00Z", values: new Map([["aux_1_value", 351.6], ["aux_2_value", 341.2], ["aux_3_value", null]]) },
];

// Runtime-built specs (precedent: FortnightReportBody's OCR migration): one
// fields.floatCol per metric discovered in the data, each a DERIVED source
// reading the row's Map. The timestamp keeps its minute-grain cell as a col()
// custom on dateTime geometry (sorted by the raw ISO). registry stays {} — the
// specs ARE the columns.
const HourlyPivotTable: Component = () => {
  const pivotFields = [
    col<PivotRow>(
      "timestamp",
      "Timestamp",
      (row) => <MinuteDateTimeCell value={row.timestamp} />,
      "dateTime",
      (row) => row.timestamp,
    ),
    ...PIVOT_METRICS.map((m) =>
      floatCol<PivotRow>((row) => row.values.get(m) ?? null, { id: m, header: m, precision: 2 }),
    ),
  ];
  return (
    <DataTableContainer maxHeight="320px">
      <SortableFieldTable data={PIVOT_ROWS} fields={pivotFields} registry={{}} />
    </DataTableContainer>
  );
};

// ============================================
// Catalog entries
// ============================================

export const ENTRIES: TableEntry[] = [
  {
    route: "(embedded) PowerLogCacheView",
    name: "Cached aux hourly table",
    status: "sui",
    note: "Migrated to FieldTable: aux cells → plain floatCol (weight nuance dies, null→blank); the per-train average → aggregateCol whose combine declares the math (sum of positive readings ÷ trains — 1-train here), accent by default. Retires the last styled-number consumer.",
    component: PowerLogCacheTable,
  },
  {
    route: "/tools/power-log-ocr",
    name: "OCR extracted entries",
    status: "sui",
    note: "Migrated to FieldTable: text5Col hour, col() aux cells with null→blank on int geometry, computed avg col, maxRows 12.",
    component: PowerLogOcrTable,
  },
  {
    route: "(embedded) HourLevelDataTable",
    name: "Hour-level QA table (grouped headers)",
    status: "sui",
    note: "Migrated to FieldTable via the group() spec wrapper: the ordered gesture names each category run (FTIR I / SCR / FID / AUX), the resolver stamps each member's `group`, and BaseTable derives the two-row spanned header it already renders. Status text is a col() custom on status geometry; the ungrouped Hour column spans both header rows. Retires the last stays-raw-by-design demand.",
    component: HourLevelTable,
  },
  {
    route: "(embedded) HourlyDataTable",
    name: "Hourly minute-avg pivot",
    status: "sui",
    note: "Migrated to SortableFieldTable: runtime-built specs — one fields.floatCol per metric with a DERIVED Map-reading source; timestamp col() custom keeps the minute cell; registry {}. DataTableContainer keeps the scroll frame.",
    component: HourlyPivotTable,
  },
];
