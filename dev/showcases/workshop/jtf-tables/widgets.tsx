// JTF Table Catalog — widget/detail tables.
//
// Faithful replicas of the real jtf-ui tables (repo: jtf/jtf-ui), each filled
// with deterministic stub data. `status: "sui"` entries replicate the already-
// migrated FieldTable form; `status: "raw"` entries replicate the hand-rolled
// BaseTable form so the migration blockers are visible on the bench.
import { DataTableContainer } from "../../../../src/components/Table";
import * as fields from "../../../../src/components/Table/fields";
import type { TableEntry } from "./shared";

// ============================================================================
// 1. VesselCallNoxDetail — "Statistics by Control Period" (raw BaseTable)
//    jtf-ui/src/components/fortnight/vessel-detail/VesselCallNoxDetail.tsx ~629
// ============================================================================

interface NoxPeriodRow {
  period: string;
  pct: number;
  nox: number | null;
  highlight: "before" | "during" | "after";
}

const NOX_PERIOD_DATA: NoxPeriodRow[] = [
  { period: "Before", pct: 18, nox: 42.7, highlight: "before" },
  { period: "During", pct: 64, nox: 6.3, highlight: "during" },
  { period: "After", pct: 18, nox: 38.1, highlight: "after" },
];

// Semantic tones (ruled 2026-07-18): the data layer flags the active control
// period via `highlight`; the cell wears success (during) / warning (the
// before-after amber baseline). No hex at the call site — the period label
// recedes to default off the active period, the ppm value carries the amber.
const NOX_PERIOD_REGISTRY = {
  period: fields.textCol<NoxPeriodRow>("period", {
    tone: (_v, row) => (row.highlight === "during" ? "success" : "default"),
  }),
  pct: fields.intCol<NoxPeriodRow>("pct", { suffix: "%", header: "Share" }),
  nox: fields.floatCol<NoxPeriodRow>("nox", {
    precision: 1,
    header: "NOx (ppm)",
    tone: (_v, row) => (row.highlight === "during" ? "success" : "warning"),
  }),
};

const NoxDetailPeriodTable = () => (
  <fields.FieldTable
    data={NOX_PERIOD_DATA}
    fields={["period", "pct", "nox"]}
    registry={NOX_PERIOD_REGISTRY}
  />
);

// ============================================================================
// 2. VesselCallRogDetail — "Statistics by Control Period" (raw BaseTable)
//    Structural twin of #1 with FID THC instead of NOx.
//    jtf-ui/src/components/fortnight/vessel-detail/VesselCallRogDetail.tsx ~571
// ============================================================================

interface RogPeriodRow {
  period: string;
  pct: number;
  fidThc: number | null;
  highlight: "before" | "during" | "after";
}

const ROG_PERIOD_DATA: RogPeriodRow[] = [
  { period: "Before", pct: 22, fidThc: 128.4, highlight: "before" },
  { period: "During", pct: 57, fidThc: 9.8, highlight: "during" },
  { period: "After", pct: 21, fidThc: 114.6, highlight: "after" },
];

// Structural twin of the NOx detail registry (FID THC instead of NOx): the
// data layer flags the active control period; the cell wears success (during) /
// warning (before-after baseline). No hex at the call site.
const ROG_PERIOD_REGISTRY = {
  period: fields.textCol<RogPeriodRow>("period", {
    tone: (_v, row) => (row.highlight === "during" ? "success" : "default"),
  }),
  pct: fields.intCol<RogPeriodRow>("pct", { suffix: "%", header: "Share" }),
  fidThc: fields.floatCol<RogPeriodRow>("fidThc", {
    precision: 1,
    header: "FID THC",
    tone: (_v, row) => (row.highlight === "during" ? "success" : "warning"),
  }),
};

const RogDetailPeriodTable = () => (
  <fields.FieldTable
    data={ROG_PERIOD_DATA}
    fields={["period", "pct", "fidThc"]}
    registry={ROG_PERIOD_REGISTRY}
  />
);

// ============================================================================
// 3a. NoxWidgets — NoxControlPeriodStats period table (MIGRATED: FieldTable)
//     jtf-ui/src/components/NoxWidgets.tsx ~252. In jtf the column defs lived in
//     a createMemo over the colorblind() signal (Okabe-Ito hex remap) with a
//     getRowClass highlight; the migration drops both — semantic tones are
//     theme vars that already adapt to the colorblind theme, so the memo and
//     the row background disappear (precedent: VesselCallNoxDetail above).
// ============================================================================

interface PeriodStatsRow {
  period: string;
  // Data-layer flag for the active control period (ruled 2026-07-20); the
  // value tones read it, replacing the getRowClass row highlight.
  highlight: boolean;
  count: number;
  avgNOx: number | null;
  avgNO: number | null;
  avgNO2: number | null;
}

const PERIOD_STATS_DATA: PeriodStatsRow[] = [
  { period: "Before Control", highlight: false, count: 412, avgNOx: 42.71, avgNO: 38.12, avgNO2: 4.59 },
  { period: "During Control", highlight: true, count: 1486, avgNOx: 6.28, avgNO: 5.41, avgNO2: 0.87 },
  { period: "After Control", highlight: false, count: 397, avgNOx: 38.05, avgNO: 34.2, avgNO2: 3.85 },
];

// Semantic tones fed by the data-layer highlight flag (precedent: the
// VesselCallNoxDetail registry above): the During-Control row wears success,
// the before/after baseline warning. Only avgNOx carried the During/Baseline
// hex in the source — avgNO/avgNO2 stay plain. No hex at the call site.
const PERIOD_STATS_REGISTRY = {
  period: fields.textCol<PeriodStatsRow>("period", {
    tone: (_v, row) => (row.highlight ? "success" : "default"),
  }),
  count: fields.intCol<PeriodStatsRow>("count", { header: "Data Points" }),
  avgNOx: fields.floatCol<PeriodStatsRow>("avgNOx", {
    precision: 2,
    header: "Avg NOx (ppm)",
    tone: (_v, row) => (row.highlight ? "success" : "warning"),
  }),
  avgNO: fields.floatCol<PeriodStatsRow>("avgNO", { precision: 2, header: "Avg NO (ppm)" }),
  avgNO2: fields.floatCol<PeriodStatsRow>("avgNO2", { precision: 2, header: "Avg NO₂ (ppm)" }),
};

const NoxPeriodStatsTable = () => (
  <fields.FieldTable
    data={PERIOD_STATS_DATA}
    fields={["period", "count", "avgNOx", "avgNO", "avgNO2"]}
    registry={PERIOD_STATS_REGISTRY}
  />
);

// ============================================================================
// 3b. NoxWidgets — Capture Efficiency projection table (MIGRATED: FieldTable)
//     jtf-ui/src/components/NoxWidgets.tsx ~281. Baseline 42.7 ppm-equivalent,
//     threshold 2.8 g/kWh. In jtf the row SET is conditional (90% always, 95%/
//     99% only under certain compliance/flow states) — that filtering stays in
//     the data layer; the compliance MEANING is carried by the statusCol badge
//     plus a value tone on the projection (ruled 2026-07-20, tones like #3).
// ============================================================================

interface CeProjectionRow {
  ce: string;
  projected: number;
  // Data-layer compliance flag; the badge + the projected value tone read it.
  compliant: boolean;
}

const CE_PROJECTION_DATA: CeProjectionRow[] = [
  { ce: "90%", projected: 4.27, compliant: false },
  { ce: "95%", projected: 2.14, compliant: true },
  { ce: "99%", projected: 0.43, compliant: true },
];

// The JSX Compliant/Violation badges become the standard status field, keyed on
// the boolean compliance flag (String(true|false) → mapping).
const CE_PROJECTION_STATUS: Record<string, fields.StatusColMapping> = {
  true: { label: "COMPLIANT", tone: "success" },
  false: { label: "VIOLATION", tone: "danger" },
};

const CE_PROJECTION_REGISTRY = {
  // textCol has no header channel and humanize("ce") = "Ce"; the custom label
  // rides a col() at text geometry (sorted by the label).
  ce: fields.col<CeProjectionRow>("ce", "Capture Efficiency", (row) => row.ce, "text", (row) => row.ce),
  projected: fields.floatCol<CeProjectionRow>("projected", {
    precision: 2,
    header: "Projected NOx (ppm)",
    tone: (_v, row) => (row.compliant ? "success" : "danger"),
  }),
  status: fields.statusCol<CeProjectionRow>("compliant", CE_PROJECTION_STATUS, {
    header: "Status",
  }),
};

const CeProjectionTable = () => (
  <fields.FieldTable
    data={CE_PROJECTION_DATA}
    fields={["ce", "projected", "status"]}
    registry={CE_PROJECTION_REGISTRY}
  />
);

// ============================================================================
// 4. StatisticsSummary — emissions statistics (MIGRATED: FieldTable)
//    jtf-ui/src/components/StatisticsSummary.tsx ~57
// ============================================================================

interface EmissionRow {
  metric: string;
  min: number | null;
  avg: number | null;
  max: number | null;
  stddev: number | null;
  unit: string;
}

const EMISSION_ROWS: EmissionRow[] = [
  { metric: "NOx", min: 1.2, avg: 3.8, max: 8.5, stddev: 1.9, unit: "g/kWh" },
  { metric: "ROG", min: 0.3, avg: 1.2, max: 2.8, stddev: 0.6, unit: "g/kWh" },
];

const EMISSION_REGISTRY = {
  metric: fields.textCol<EmissionRow>("metric"),
  min: fields.floatCol<EmissionRow>("min"),
  avg: fields.floatCol<EmissionRow>("avg"),
  max: fields.floatCol<EmissionRow>("max"),
  stddev: fields.floatCol<EmissionRow>("stddev"),
  unit: fields.textCol<EmissionRow>("unit"),
};

const StatisticsSummaryTable = () => (
  <fields.FieldTable
    data={EMISSION_ROWS}
    fields={["metric", "min", "avg", "max", "stddev", "unit"]}
    registry={EMISSION_REGISTRY}
  />
);

// ============================================================================
// 5. MinMaxTable — per-metric extremes (MIGRATED: FieldTable + tone fn)
//    jtf-ui/src/components/MinMaxTable.tsx
// ============================================================================

interface MinMaxRow {
  metric_id: string;
  type: "MIN" | "MAX";
  value: number | null;
  timestamp: string;
}

const MIN_MAX_ROWS: MinMaxRow[] = [
  { metric_id: "SCR.JM_NOXo", type: "MIN", value: 1.84, timestamp: "2026-06-02T04:15:00Z" },
  { metric_id: "SCR.JM_NOXo", type: "MAX", value: 48.62, timestamp: "2026-06-05T18:40:00Z" },
  { metric_id: "FID_THC", type: "MIN", value: 6.1, timestamp: "2026-06-03T09:05:00Z" },
  { metric_id: "FID_THC", type: "MAX", value: 131.7, timestamp: "2026-06-08T22:10:00Z" },
  { metric_id: "MSO_F2", type: "MIN", value: 412.5, timestamp: "2026-06-01T11:30:00Z" },
  { metric_id: "MSO_F2", type: "MAX", value: 1980.2, timestamp: "2026-06-07T15:55:00Z" },
];

const MIN_MAX_REGISTRY = {
  // The identity is the ONLY flexible column — it takes the slack (ruled
  // 2026-07-20: a known-set column must not flex like flowing text).
  metric_id: fields.textCol<MinMaxRow>("metric_id"),
  // MIN/MAX is a known set of strings → statusCol, fixed geometry, the tone
  // names the meaning (ruled 2026-07-20; replaces the flexing textCol+tone).
  type: fields.statusCol<MinMaxRow>("type", {
    MIN: { label: "MIN", tone: "success" },
    MAX: { label: "MAX", tone: "danger" },
  }),
  value: fields.floatCol<MinMaxRow>("value"),
  timestamp: fields.dateTimeCol<MinMaxRow>("timestamp"),
};

const MinMaxFieldTable = () => (
  <DataTableContainer maxHeight="280px">
    <fields.FieldTable
      data={MIN_MAX_ROWS}
      fields={["metric_id", "type", "value", "timestamp"]}
      registry={MIN_MAX_REGISTRY}
    />
  </DataTableContainer>
);

// ============================================================================
// 6. MetricsStatsTable — union-guarded metric statistics (raw BaseTable)
//    jtf-ui/src/components/MetricsStatsTable.tsx
// ============================================================================

interface CachedMetricStatsStub {
  metric_id: string;
  total_cnt: number;
  nonzero_cnt: number;
  valid_cnt: number;
  min_val: number | null;
  avg_val: number | null;
  max_val: number | null;
  stddev_min: number | null;
  stddev_max: number | null;
  max_consec_repeats: number;
  coverage_mins: number;
  coverage_pct: number;
}

interface MetricStatsStub {
  metric_id: string;
  count: number;
  min: number | null;
  avg: number | null;
  max: number | null;
}

type MetricRow = CachedMetricStatsStub | MetricStatsStub;

function isCachedMetric(metric: MetricRow): metric is CachedMetricStatsStub {
  return "total_cnt" in metric && "coverage_pct" in metric;
}

const METRIC_STATS_DATA: MetricRow[] = [
  { metric_id: "SCR.JM_NOXo", total_cnt: 40320, nonzero_cnt: 39871, valid_cnt: 39640, min_val: 1.84, avg_val: 18.42, max_val: 48.62, stddev_min: 0.12, stddev_max: 6.87, max_consec_repeats: 14, coverage_mins: 19820, coverage_pct: 98.3 },
  { metric_id: "FID_THC", total_cnt: 40320, nonzero_cnt: 38112, valid_cnt: 37905, min_val: 6.1, avg_val: 74.28, max_val: 131.7, stddev_min: 0.44, stddev_max: 21.03, max_consec_repeats: 22, coverage_mins: 18952, coverage_pct: 94.0 },
  { metric_id: "MSO_F2", total_cnt: 40320, nonzero_cnt: 40318, valid_cnt: 40120, min_val: 412.5, avg_val: 1240.66, max_val: 1980.2, stddev_min: 3.15, stddev_max: 88.4, max_consec_repeats: 6, coverage_mins: 20060, coverage_pct: 99.5 },
  { metric_id: "SCR.NO2", total_cnt: 40320, nonzero_cnt: 35204, valid_cnt: 34988, min_val: 0.11, avg_val: 3.06, max_val: 9.74, stddev_min: 0.02, stddev_max: 1.91, max_consec_repeats: 41, coverage_mins: 17494, coverage_pct: 86.8 },
  { metric_id: "ENGINE_KW", count: 2688, min: 118.0, avg: 296.42, max: 402.5 },
  { metric_id: "AMPS_L1", count: 2688, min: 42.3, avg: 188.71, max: 260.9 },
];

// Union-guarded numerics become DERIVED sources: one reader per column reads
// through the isCachedMetric arm (accessor + sortValue share it). The
// MetricStats arm has no non-zero/valid/stddev/repeats/coverage — those read
// null and render BLANK (ruled 2026-07-18: no '-' placeholder). IntCell/
// FloatCell own the grouping/precision the hand-formatters did.
const METRIC_STATS_REGISTRY = {
  metric_id: fields.textCol<MetricRow>("metric_id"),
  count: fields.intCol<MetricRow>((row) => (isCachedMetric(row) ? row.total_cnt : row.count), { id: "count", header: "Total" }),
  nonzero: fields.intCol<MetricRow>((row) => (isCachedMetric(row) ? row.nonzero_cnt : null), { id: "nonzero", header: "Non-Zero" }),
  valid: fields.intCol<MetricRow>((row) => (isCachedMetric(row) ? row.valid_cnt : null), { id: "valid", header: "Valid" }),
  min: fields.floatCol<MetricRow>((row) => (isCachedMetric(row) ? row.min_val : row.min), { id: "min", header: "Min" }),
  avg: fields.floatCol<MetricRow>((row) => (isCachedMetric(row) ? row.avg_val : row.avg), { id: "avg", header: "Avg" }),
  max: fields.floatCol<MetricRow>((row) => (isCachedMetric(row) ? row.max_val : row.max), { id: "max", header: "Max" }),
  max_repeats: fields.intCol<MetricRow>((row) => (isCachedMetric(row) ? row.max_consec_repeats : null), { id: "max_repeats", header: "Max Repeats" }),
};

// Composite cells stay col() customs (the 5% tail): a "lo - hi" range and an
// "Nm (P%)" coverage cell, each with a derived numeric sortValue so they stay
// sortable under SortableFieldTable. BLANK off the cached arm.
const stddevRangeCol = fields.col<MetricRow>(
  "stddev_range",
  "StdDev Range",
  (row) => {
    if (!isCachedMetric(row)) return "";
    const lo = row.stddev_min;
    const hi = row.stddev_max;
    if (lo == null || hi == null) return "";
    return `${lo.toFixed(2)} - ${hi.toFixed(2)}`;
  },
  "text",
  (row) => (isCachedMetric(row) ? row.stddev_min : null),
);
const coverageCol = fields.col<MetricRow>(
  "coverage",
  "Coverage",
  (row) => (isCachedMetric(row) ? `${row.coverage_mins}m (${row.coverage_pct.toFixed(1)}%)` : ""),
  "text",
  (row) => (isCachedMetric(row) ? row.coverage_pct : null),
);

const METRIC_STATS_FIELDS = [
  "metric_id",
  "count",
  "nonzero",
  "valid",
  "min",
  "avg",
  "max",
  stddevRangeCol,
  "max_repeats",
  coverageCol,
];

const MetricsStatsReplicaTable = () => (
  <fields.SortableFieldTable
    data={METRIC_STATS_DATA}
    fields={METRIC_STATS_FIELDS}
    registry={METRIC_STATS_REGISTRY}
    maxRows={12}
  />
);

// ============================================================================
// Entries
// ============================================================================

export const ENTRIES: TableEntry[] = [
  {
    route: "/reports/fortnight/[id] (NOx detail)",
    name: "VesselCallNoxDetail — Statistics by Control Period",
    status: "sui",
    note: "Migrated to FieldTable: textCol/intCol/floatCol registry; during→success else warning tone fn fed by the row's highlight flag; pct → suffix '%'.",
    component: NoxDetailPeriodTable,
  },
  {
    route: "/reports/fortnight/[id] (ROG detail)",
    name: "VesselCallRogDetail — Statistics by Control Period",
    status: "sui",
    note: "Migrated to FieldTable (twin of NOx detail): textCol/intCol/floatCol registry; during→success else warning tone fn on the highlight flag; pct → suffix '%'.",
    component: RogDetailPeriodTable,
  },
  {
    route: "/reports/nox-report (widgets)",
    name: "NoxWidgets — NOx Statistics by Control Period",
    status: "sui",
    note: "Migrated to FieldTable (precedent VesselCallNoxDetail): textCol/intCol/floatCol registry; During→success else warning tone fns fed by the data-layer highlight flag on period + avgNOx. getRowClass row highlight DROPPED and the colorblind hex memo dies — tones are theme vars.",
    component: NoxPeriodStatsTable,
  },
  {
    route: "/reports/nox-report (widgets)",
    name: "NoxWidgets — NOx Result at Capture Efficiency Levels",
    status: "sui",
    note: "Migrated to FieldTable: JSX StatusBadge column → statusCol keyed on the boolean compliance flag; projected NOx floatCol carries a compliant→success/danger value tone; the conditional row set stays a data-layer filter.",
    component: CeProjectionTable,
  },
  {
    route: "(embedded) StatisticsSummary",
    name: "StatisticsSummary — Emissions Statistics",
    status: "sui",
    note: "Migrated to FieldTable: textCol + 4× floatCol + textCol registry.",
    component: StatisticsSummaryTable,
  },
  {
    route: "(embedded) MinMaxTable",
    name: "MinMaxTable — per-metric extremes",
    status: "sui",
    note: "Migrated to FieldTable; type is a known set → statusCol (MIN success / MAX danger, fixed geometry — ruled 2026-07-20), so metric_id is the only flexible column and takes the space; floatCol value at its default cap, dateTimeCol timestamps.",
    component: MinMaxFieldTable,
  },
  {
    route: "(embedded) MetricsStatsTable",
    name: "MetricsStatsTable — metric statistics",
    status: "sui",
    note: "Migrated to SortableFieldTable: union-guarded intCol/floatCol derived sources (MetricStats arm → blank), composite 'lo - hi' and 'Nm (P%)' col() customs with derived sortValue, maxRows scroll cap.",
    component: MetricsStatsReplicaTable,
  },
];
