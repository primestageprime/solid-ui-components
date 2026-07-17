// JTF Table Catalog — widget/detail tables.
//
// Faithful replicas of the real jtf-ui tables (repo: jtf/jtf-ui), each filled
// with deterministic stub data. `status: "sui"` entries replicate the already-
// migrated FieldTable form; `status: "raw"` entries replicate the hand-rolled
// BaseTable form so the migration blockers are visible on the bench.
import {
  BaseTable,
  DataTableContainer,
  FloatCell,
  withCellStyle,
  floatCol as helperFloatCol,
  type TableColumn,
} from "../../../../src/components/Table";
import * as fields from "../../../../src/components/Table/fields";
import { InlineText } from "../../../../src/components/InlineText";
import { EmphasisBody } from "../../../../src/components/Text";
import { CompliantBadge, ViolationBadge } from "../../../../src/components/Badge";
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

// Data-driven cell colors, exactly as jtf writes them: the active ("during")
// control period is emphasised green, the others amber.
const noxCellColor = (row: NoxPeriodRow) =>
  row.highlight === "during" ? "#00ff88" : "#ff8800";
const noxPeriodColor = (row: NoxPeriodRow) =>
  row.highlight === "during" ? "#00ff88" : undefined;

const NOX_DETAIL_COLUMNS: TableColumn<NoxPeriodRow>[] = [
  {
    id: "period",
    header: "Period",
    accessor: (row) => (
      <InlineText color={noxPeriodColor(row)}>{row.period}</InlineText>
    ),
  },
  { id: "pct", header: "%", accessor: (row) => `${row.pct}%`, align: "right" },
  {
    id: "nox",
    header: "NOx (ppm)",
    accessor: (row) => (
      <InlineText color={noxCellColor(row)}>
        <FloatCell value={row.nox} precision={1} />
      </InlineText>
    ),
    align: "right",
  },
];

const NoxDetailPeriodTable = () => (
  <BaseTable data={NOX_PERIOD_DATA} columns={NOX_DETAIL_COLUMNS} compact />
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

const thcColor = (row: RogPeriodRow) =>
  row.highlight === "during" ? "#00ff88" : "#ff8800";
const rogPeriodColor = (row: RogPeriodRow) =>
  row.highlight === "during" ? "#00ff88" : undefined;

const ROG_DETAIL_COLUMNS: TableColumn<RogPeriodRow>[] = [
  {
    id: "period",
    header: "Period",
    accessor: (row) => (
      <InlineText color={rogPeriodColor(row)}>{row.period}</InlineText>
    ),
  },
  { id: "pct", header: "%", accessor: (row) => `${row.pct}%`, align: "right" },
  {
    id: "fidThc",
    header: "FID THC",
    accessor: (row) => (
      <InlineText color={thcColor(row)}>
        <FloatCell value={row.fidThc} precision={1} />
      </InlineText>
    ),
    align: "right",
  },
];

const RogDetailPeriodTable = () => (
  <BaseTable data={ROG_PERIOD_DATA} columns={ROG_DETAIL_COLUMNS} compact />
);

// ============================================================================
// 3a. NoxWidgets — NoxControlPeriodStats period table (raw BaseTable)
//     jtf-ui/src/components/NoxWidgets.tsx ~252. In jtf the column defs live in
//     a createMemo over the colorblind() signal (Okabe-Ito remap); the replica
//     bakes the normal palette statically.
// ============================================================================

interface PeriodStatsRow {
  period: string;
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

// withCellStyle takes typed options (no style object at the call site).
const DuringFloat = withCellStyle(FloatCell, { color: "#00ff88", fontWeight: "600" });
const BaselineFloat = withCellStyle(FloatCell, { color: "#ff8800", fontWeight: "600" });

const PERIOD_STATS_COLUMNS: TableColumn<PeriodStatsRow>[] = [
  {
    id: "period",
    header: "Period",
    accessor: (r) => (
      <EmphasisBody>
        <InlineText color={r.highlight ? "#00ff88" : undefined}>{r.period}</InlineText>
      </EmphasisBody>
    ),
  },
  { id: "count", header: "Data Points", accessor: "count", align: "right" },
  {
    id: "avgNOx",
    header: "Avg NOx (ppm)",
    accessor: (r) =>
      r.highlight ? (
        <DuringFloat value={r.avgNOx} precision={2} />
      ) : (
        <BaselineFloat value={r.avgNOx} precision={2} />
      ),
    align: "right",
  },
  { id: "avgNO", header: "Avg NO (ppm)", accessor: (r) => <FloatCell value={r.avgNO} precision={2} />, align: "right" },
  { id: "avgNO2", header: "Avg NO₂ (ppm)", accessor: (r) => <FloatCell value={r.avgNO2} precision={2} />, align: "right" },
];

const NoxPeriodStatsTable = () => (
  <BaseTable
    data={PERIOD_STATS_DATA}
    columns={PERIOD_STATS_COLUMNS}
    compact
    getRowClass={(row) => (row.highlight ? "hud-table__row--highlight" : "")}
  />
);

// ============================================================================
// 3b. NoxWidgets — Capture Efficiency projection table (raw BaseTable)
//     jtf-ui/src/components/NoxWidgets.tsx ~281. Baseline 42.7 ppm-equivalent,
//     threshold 2.8 g/kWh.
// ============================================================================

interface CeProjectionRow {
  ce: string;
  projected: number;
  compliant: boolean;
}

const CE_PROJECTION_DATA: CeProjectionRow[] = [
  { ce: "90%", projected: 4.27, compliant: false },
  { ce: "95%", projected: 2.14, compliant: true },
  { ce: "99%", projected: 0.43, compliant: true },
];

const CE_PROJECTION_COLUMNS: TableColumn<CeProjectionRow>[] = [
  { id: "ce", header: "Capture Efficiency", accessor: "ce" },
  helperFloatCol("projected", "Projected NOx (ppm)", 2),
  {
    id: "status",
    header: "Status",
    accessor: (r) =>
      r.compliant ? (
        <CompliantBadge>COMPLIANT</CompliantBadge>
      ) : (
        <ViolationBadge>VIOLATION</ViolationBadge>
      ),
    align: "center",
  },
];

const CeProjectionTable = () => (
  <BaseTable data={CE_PROJECTION_DATA} columns={CE_PROJECTION_COLUMNS} compact />
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
  metric_id: fields.textCol<MinMaxRow>("metric_id"),
  // The migrated tone fn: the client names a meaning, never a color.
  type: fields.textCol<MinMaxRow>("type", {
    tone: (v) => (v === "MIN" ? "success" : "danger"),
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

const METRIC_STATS_COLUMNS: TableColumn<MetricRow>[] = [
  { id: "metric_id", header: "Metric", accessor: "metric_id", sortable: true },
  {
    id: "count",
    header: "Total",
    accessor: (row) => {
      const value = isCachedMetric(row) ? row.total_cnt : row.count;
      return value.toLocaleString();
    },
    sortable: true,
  },
  {
    id: "nonzero",
    header: "Non-Zero",
    accessor: (row) => {
      if (!isCachedMetric(row)) return "-";
      return row.nonzero_cnt.toLocaleString();
    },
    sortable: true,
  },
  {
    id: "valid",
    header: "Valid",
    accessor: (row) => {
      if (!isCachedMetric(row)) return "-";
      return row.valid_cnt.toLocaleString();
    },
    sortable: true,
  },
  {
    id: "min",
    header: "Min",
    accessor: (row) => {
      const value = isCachedMetric(row) ? row.min_val : row.min;
      return value !== null ? value.toFixed(2) : "N/A";
    },
    sortable: true,
  },
  {
    id: "avg",
    header: "Avg",
    accessor: (row) => {
      const value = isCachedMetric(row) ? row.avg_val : row.avg;
      return value !== null ? value.toFixed(2) : "N/A";
    },
    sortable: true,
  },
  {
    id: "max",
    header: "Max",
    accessor: (row) => {
      const value = isCachedMetric(row) ? row.max_val : row.max;
      return value !== null ? value.toFixed(2) : "N/A";
    },
    sortable: true,
  },
  {
    id: "stddev_range",
    header: "StdDev Range",
    accessor: (row) => {
      if (!isCachedMetric(row)) return "-";
      const min = row.stddev_min !== null ? row.stddev_min.toFixed(2) : "N/A";
      const max = row.stddev_max !== null ? row.stddev_max.toFixed(2) : "N/A";
      return `${min} - ${max}`;
    },
  },
  {
    id: "max_repeats",
    header: "Max Repeats",
    accessor: (row) => {
      if (!isCachedMetric(row)) return "-";
      return row.max_consec_repeats;
    },
    sortable: true,
  },
  {
    id: "coverage",
    header: "Coverage",
    accessor: (row) => {
      if (!isCachedMetric(row)) return "-";
      return `${row.coverage_mins}m (${row.coverage_pct.toFixed(1)}%)`;
    },
    sortable: true,
  },
];

const MetricsStatsReplicaTable = () => (
  <BaseTable
    data={METRIC_STATS_DATA}
    columns={METRIC_STATS_COLUMNS}
    maxHeight="500px"
    stickyHeader
    hoverable
  />
);

// ============================================================================
// Entries
// ============================================================================

export const ENTRIES: TableEntry[] = [
  {
    route: "/reports/fortnight/[id] (NOx detail)",
    name: "VesselCallNoxDetail — Statistics by Control Period",
    status: "raw",
    note: "Conditional cell color (during=green else amber) via InlineText color — not yet a tone fn; literal column accessors block fields migration.",
    component: NoxDetailPeriodTable,
  },
  {
    route: "/reports/fortnight/[id] (ROG detail)",
    name: "VesselCallRogDetail — Statistics by Control Period",
    status: "raw",
    note: "Structural twin of the NOx detail table with FID THC; same conditional-color blocker.",
    component: RogDetailPeriodTable,
  },
  {
    route: "/reports/nox-report (widgets)",
    name: "NoxWidgets — NOx Statistics by Control Period",
    status: "raw",
    note: "getRowClass row highlight + withCellStyle hex-colored floats + colorblind-reactive column memo — all three block FieldTable.",
    component: NoxPeriodStatsTable,
  },
  {
    route: "/reports/nox-report (widgets)",
    name: "NoxWidgets — NOx Result at Capture Efficiency Levels",
    status: "raw",
    note: "JSX StatusBadge status column and conditional row set; needs a badge/status field column.",
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
    note: "Migrated to FieldTable; type column tone fn MIN→success / MAX→danger, dateTimeCol timestamps.",
    component: MinMaxFieldTable,
  },
  {
    route: "(embedded) MetricsStatsTable",
    name: "MetricsStatsTable — metric statistics",
    status: "raw",
    note: "Union-guarded hand-formatted numerics, composite 'min - max' and 'Nm (P%)' string cells; sortable + maxHeight/stickyHeader.",
    component: MetricsStatsReplicaTable,
  },
];
