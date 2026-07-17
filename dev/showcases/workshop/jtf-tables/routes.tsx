// JTF Table Catalog — route-level tables, replicated faithfully from jtf-ui
// sources with deterministic stub data. One component per real table; each
// entry notes what blocks SUI compliance (raw) or what it migrated to (sui).
//
// Sources (jtf-ui @ /Users/peter/Documents/clients/PrimeStage/jtf/jtf-ui):
//   src/routes/index.tsx                     — Cached Vessel Calls
//   src/routes/reports/durability.tsx        — Durability vessel calls
//   src/routes/reports/fortnight/index.tsx   — Fortnight reports list
//   src/routes/reports/thousand-hour/[id].tsx — 1000-hour manifest
//   src/routes/tools/ftir-gap-fill.tsx       — FTIR gaps (FieldTable, migrated)
import { createSignal } from "solid-js";
import {
  BaseTable,
  DateCell,
  DateTimeCell,
  IntCell,
  MetricValueCell,
  StatusCell,
  type TableColumn,
} from "../../../../src/components/Table";
import { FieldTable, col } from "../../../../src/components/Table/fields";
import { InlineText } from "../../../../src/components/InlineText";
import { EmphasisBody, MutedBody } from "../../../../src/components/Text";
import type { TableEntry } from "./shared";

// ---------------------------------------------------------------------------
// Shared stub cells
// ---------------------------------------------------------------------------

/** jtf vessel-type glyphs (VesselTypeIcon stand-in — the real one is an SVG
 *  outline icon with a hover title; the entity cell is a migration blocker). */
const TYPE_GLYPH: Record<string, string> = {
  CONTAINER: "▣",
  TANKER: "◍",
  RORO: "◨",
  BULK: "▤",
};

/** Replica of jtf's VesselName entity cell: (type icon) Name. */
function VesselNameCell(props: { type: string; name: string }) {
  return (
    <span title={props.name}>
      <InlineText color="var(--sui-text-secondary)">
        {TYPE_GLYPH[props.type] ?? "▢"}{" "}
      </InlineText>
      <InlineText>{props.name}</InlineText>
    </span>
  );
}

/** Replica of jtf's CoverageCell: "FULL" in accent, else missing minutes
 *  colored by severity (>=60m danger, else warning). Bold via EmphasisBody. */
function CoverageCell(props: { status: string; missingMins: number }) {
  if (props.status === "FULL" || props.missingMins <= 0) {
    return (
      <EmphasisBody>
        <InlineText color="var(--sui-accent)">FULL</InlineText>
      </EmphasisBody>
    );
  }
  const color =
    props.missingMins >= 60 ? "var(--sui-danger)" : "var(--sui-warning)";
  return (
    <EmphasisBody>
      <InlineText color={color}>{props.missingMins}m</InlineText>
    </EmphasisBody>
  );
}

/** jtf formatConnectionDuration replica — deterministic: "—" when still
 *  connected instead of the original's `new Date()` fallback. */
function connectionDuration(
  connectedAt: string,
  disconnectedAt: string | null,
): string {
  if (!disconnectedAt) return "—";
  const diffMs =
    new Date(disconnectedAt).getTime() - new Date(connectedAt).getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

// ---------------------------------------------------------------------------
// 1. Cached Vessel Calls — src/routes/index.tsx (~line 639)
// ---------------------------------------------------------------------------

interface CachedVesselCall {
  id: string;
  vessel_name: string;
  vessel_type: string;
  asset_id: string;
  connected_at: string;
  disconnected_at: string | null;
  nox_value: number;
  nox_compliant: boolean;
  rog_value: number;
  rog_compliant: boolean;
  coverage: Record<string, { status: string; missingMins: number }>;
}

const cov = (status: string, missingMins = 0) => ({ status, missingMins });

const CACHED_CALLS: CachedVesselCall[] = [
  {
    id: "vc-2026-0611-a",
    vessel_name: "Ever Steadfast",
    vessel_type: "CONTAINER",
    asset_id: "BE-104",
    connected_at: "2026-06-11T04:15:00Z",
    disconnected_at: "2026-06-12T18:42:00Z",
    nox_value: 12.47,
    nox_compliant: true,
    rog_value: 0.8213,
    rog_compliant: true,
    coverage: {
      ftir_i: cov("FULL"),
      ftir_o: cov("FULL"),
      scr: cov("FULL"),
      fid: cov("PARTIAL", 14),
      msi: cov("FULL"),
      mso: cov("FULL"),
    },
  },
  {
    id: "vc-2026-0613-b",
    vessel_name: "Pacific Dawn",
    vessel_type: "TANKER",
    asset_id: "BE-207",
    connected_at: "2026-06-13T09:30:00Z",
    disconnected_at: "2026-06-15T02:05:00Z",
    nox_value: 18.92,
    nox_compliant: false,
    rog_value: 1.334,
    rog_compliant: false,
    coverage: {
      ftir_i: cov("PARTIAL", 42),
      ftir_o: cov("SPARSE", 118),
      scr: cov("FULL"),
      fid: cov("FULL"),
      msi: cov("MISSING", 236),
      mso: cov("FULL"),
    },
  },
  {
    id: "vc-2026-0618-c",
    vessel_name: "Coral Meridian",
    vessel_type: "RORO",
    asset_id: "BE-112",
    connected_at: "2026-06-18T14:00:00Z",
    disconnected_at: "2026-06-19T07:55:00Z",
    nox_value: 9.081,
    nox_compliant: true,
    rog_value: 0.4472,
    rog_compliant: true,
    coverage: {
      ftir_i: cov("FULL"),
      ftir_o: cov("FULL"),
      scr: cov("PARTIAL", 8),
      fid: cov("FULL"),
      msi: cov("FULL"),
      mso: cov("PARTIAL", 27),
    },
  },
  {
    id: "vc-2026-0621-d",
    vessel_name: "Harbor Vigilant",
    vessel_type: "CONTAINER",
    asset_id: "BE-104",
    connected_at: "2026-06-21T22:10:00Z",
    disconnected_at: "2026-06-24T11:20:00Z",
    nox_value: 15.03,
    nox_compliant: true,
    rog_value: 1.102,
    rog_compliant: false,
    coverage: {
      ftir_i: cov("FULL"),
      ftir_o: cov("PARTIAL", 55),
      scr: cov("MISSING", 402),
      fid: cov("FULL"),
      msi: cov("FULL"),
      mso: cov("FULL"),
    },
  },
  {
    id: "vc-2026-0627-e",
    vessel_name: "Golden Horizon",
    vessel_type: "BULK",
    asset_id: "BE-309",
    connected_at: "2026-06-27T06:45:00Z",
    disconnected_at: "2026-06-28T19:15:00Z",
    nox_value: 21.66,
    nox_compliant: false,
    rog_value: 0.6019,
    rog_compliant: true,
    coverage: {
      ftir_i: cov("SPARSE", 97),
      ftir_o: cov("FULL"),
      scr: cov("FULL"),
      fid: cov("PARTIAL", 31),
      msi: cov("FULL"),
      mso: cov("MISSING", 180),
    },
  },
  {
    id: "vc-2026-0702-f",
    vessel_name: "Ever Resolute",
    vessel_type: "CONTAINER",
    asset_id: "BE-215",
    connected_at: "2026-07-02T12:20:00Z",
    disconnected_at: "2026-07-03T23:59:00Z",
    nox_value: 11.28,
    nox_compliant: true,
    rog_value: 0.7754,
    rog_compliant: true,
    coverage: {
      ftir_i: cov("FULL"),
      ftir_o: cov("FULL"),
      scr: cov("FULL"),
      fid: cov("FULL"),
      msi: cov("FULL"),
      mso: cov("FULL"),
    },
  },
];

const coverageCol = (
  id: string,
  header: string,
): TableColumn<CachedVesselCall> => ({
  id,
  header,
  align: "center",
  accessor: (c) => (
    <CoverageCell
      status={c.coverage[id]?.status ?? "MISSING"}
      missingMins={c.coverage[id]?.missingMins ?? 0}
    />
  ),
});

function CachedVesselCallsTable() {
  const [lastNav, setLastNav] = createSignal<string | null>(null);
  const columns: TableColumn<CachedVesselCall>[] = [
    {
      id: "vessel_name",
      header: "Vessel Name",
      accessor: (c) => (
        <VesselNameCell type={c.vessel_type} name={c.vessel_name} />
      ),
    },
    { id: "asset_id", header: "Asset ID", accessor: (c) => c.asset_id },
    {
      id: "connected_at",
      header: "Connected At",
      accessor: (c) => <DateCell value={c.connected_at} format="iso" />,
    },
    {
      id: "duration",
      header: "Duration",
      accessor: (c) => connectionDuration(c.connected_at, c.disconnected_at),
    },
    {
      id: "nox",
      header: "NOx",
      align: "right",
      accessor: (c) => (
        <MetricValueCell value={c.nox_value} compliant={c.nox_compliant} />
      ),
    },
    {
      id: "rog",
      header: "ROG",
      align: "right",
      accessor: (c) => (
        <MetricValueCell value={c.rog_value} compliant={c.rog_compliant} />
      ),
    },
    coverageCol("ftir_i", "FTIR.I"),
    coverageCol("ftir_o", "FTIR.O"),
    coverageCol("scr", "SCR"),
    coverageCol("fid", "FID"),
    coverageCol("msi", "MSI"),
    coverageCol("mso", "MSO"),
  ];
  return (
    <>
      <BaseTable
        data={CACHED_CALLS}
        columns={columns}
        fill
        stickyHeader
        compact
        hoverable
        onRowClick={(call) => setLastNav(`/detail/${call.id}`)}
      />
      <MutedBody>
        {lastNav()
          ? `Row click would navigate to ${lastNav()}`
          : "Click a row — jtf navigates to /detail/:id"}
      </MutedBody>
    </>
  );
}

// ---------------------------------------------------------------------------
// 2. Durability vessel calls — src/routes/reports/durability.tsx (~line 322)
// ---------------------------------------------------------------------------

interface DurabilityRow {
  vessel_name: string;
  vessel_type: string;
  asset_id: string;
  connected_at: string;
  disconnected_at: string | null;
  missing_categories: string[] | null;
}

const DURABILITY_ROWS: DurabilityRow[] = [
  {
    vessel_name: "Ever Steadfast",
    vessel_type: "CONTAINER",
    asset_id: "BE-104",
    connected_at: "2026-05-04T08:12:00Z",
    disconnected_at: "2026-05-09T17:48:00Z",
    missing_categories: [],
  },
  {
    vessel_name: "Pacific Dawn",
    vessel_type: "TANKER",
    asset_id: "BE-207",
    connected_at: "2026-05-12T02:30:00Z",
    disconnected_at: "2026-05-18T14:05:00Z",
    missing_categories: ["FTIR.O", "MSI"],
  },
  {
    vessel_name: "Coral Meridian",
    vessel_type: "RORO",
    asset_id: "BE-112",
    connected_at: "2026-05-21T19:45:00Z",
    disconnected_at: "2026-05-27T06:10:00Z",
    missing_categories: [],
  },
  {
    vessel_name: "Golden Horizon",
    vessel_type: "BULK",
    asset_id: "BE-309",
    connected_at: "2026-06-02T11:00:00Z",
    disconnected_at: "2026-06-06T09:33:00Z",
    missing_categories: ["SCR"],
  },
  {
    vessel_name: "Ever Resolute",
    vessel_type: "CONTAINER",
    asset_id: "BE-215",
    connected_at: "2026-06-29T15:20:00Z",
    disconnected_at: null,
    missing_categories: null,
  },
];

function DurabilityTable() {
  const columns: TableColumn<DurabilityRow>[] = [
    {
      id: "vessel_name",
      header: "Vessel Name",
      accessor: (row) => (
        <VesselNameCell type={row.vessel_type} name={row.vessel_name} />
      ),
      width: "200px",
    },
    {
      id: "asset_id",
      header: "Asset ID",
      accessor: (row) => row.asset_id,
      width: "100px",
    },
    {
      id: "connected_at",
      header: "Connected",
      accessor: (row) => <DateTimeCell value={row.connected_at} />,
      width: "180px",
    },
    {
      id: "disconnected_at",
      header: "Disconnected",
      accessor: (row) =>
        row.disconnected_at ? (
          <DateTimeCell value={row.disconnected_at} />
        ) : (
          "In Progress"
        ),
      width: "180px",
    },
    {
      id: "duration",
      header: "Duration",
      accessor: (row) =>
        connectionDuration(row.connected_at, row.disconnected_at),
      width: "100px",
    },
    {
      id: "data_status",
      header: "Data Status",
      accessor: (row) => {
        if (row.missing_categories === null) return "—";
        if (row.missing_categories.length === 0) {
          return (
            <EmphasisBody>
              <InlineText color="var(--sui-success)">FULL</InlineText>
            </EmphasisBody>
          );
        }
        return (
          <EmphasisBody>
            <InlineText color="var(--sui-danger)">
              {row.missing_categories.join(", ")}
            </InlineText>
          </EmphasisBody>
        );
      },
      width: "200px",
    },
  ];
  return (
    <BaseTable data={DURABILITY_ROWS} columns={columns} compact stickyHeader />
  );
}

// ---------------------------------------------------------------------------
// 3. Fortnight reports list — src/routes/reports/fortnight/index.tsx (~line 379)
// ---------------------------------------------------------------------------

interface FortnightReport {
  id: string;
  start_date: string;
  end_date: string;
  vessel_calls: number;
  missing_data: number;
  power_log_nc: number;
  high_flow_95: number;
  high_flow_99: number;
  non_compliant: number;
  status: string;
  spreadsheet_url: string | null;
}

const FORTNIGHT_REPORTS: FortnightReport[] = [
  {
    id: "fr-2026-11",
    start_date: "2026-05-18",
    end_date: "2026-05-31",
    vessel_calls: 42,
    missing_data: 0,
    power_log_nc: 0,
    high_flow_95: 2,
    high_flow_99: 0,
    non_compliant: 1,
    status: "completed",
    spreadsheet_url: "#",
  },
  {
    id: "fr-2026-12",
    start_date: "2026-06-01",
    end_date: "2026-06-14",
    vessel_calls: 38,
    missing_data: 3,
    power_log_nc: 1,
    high_flow_95: 0,
    high_flow_99: 1,
    non_compliant: 2,
    status: "completed",
    spreadsheet_url: "#",
  },
  {
    id: "fr-2026-13",
    start_date: "2026-06-15",
    end_date: "2026-06-28",
    vessel_calls: 45,
    missing_data: 1,
    power_log_nc: 0,
    high_flow_95: 1,
    high_flow_99: 0,
    non_compliant: 0,
    status: "submitted",
    spreadsheet_url: null,
  },
  {
    id: "fr-2026-14",
    start_date: "2026-06-29",
    end_date: "2026-07-12",
    vessel_calls: 29,
    missing_data: 6,
    power_log_nc: 2,
    high_flow_95: 3,
    high_flow_99: 2,
    non_compliant: 4,
    status: "pending",
    spreadsheet_url: null,
  },
];

/** Replica of jtf's CountCell: category emphasis color + bold when non-zero,
 *  muted regular weight otherwise. */
function CountCell(props: { count: number; activeColor: string }) {
  if (props.count > 0) {
    return (
      <EmphasisBody>
        <InlineText color={props.activeColor}>{props.count}</InlineText>
      </EmphasisBody>
    );
  }
  return (
    <InlineText color="var(--sui-text-secondary)">{props.count}</InlineText>
  );
}

function FortnightReportsTable() {
  const countCol = (
    id: string,
    header: string,
    count: (r: FortnightReport) => number,
    activeColor: string,
  ): TableColumn<FortnightReport> => ({
    id,
    header,
    align: "center",
    accessor: (r) => <CountCell count={count(r)} activeColor={activeColor} />,
  });
  const columns: TableColumn<FortnightReport>[] = [
    {
      id: "period",
      header: "Period",
      // AccentRouteLink in jtf — plain accent text here, no real navigation.
      accessor: (r) => (
        <InlineText color="var(--sui-accent)">
          {r.start_date} – {r.end_date}
        </InlineText>
      ),
    },
    {
      id: "vessel_calls",
      header: "Vessel Calls",
      align: "center",
      accessor: (r) => <IntCell value={r.vessel_calls} />,
    },
    countCol(
      "missing_data",
      "Missing Data",
      (r) => r.missing_data,
      "var(--sui-series-2)",
    ),
    countCol(
      "power_log_nc",
      "Power Log (NC)",
      (r) => r.power_log_nc,
      "var(--sui-series-3)",
    ),
    countCol(
      "high_flow_95",
      "95% CE (NC)",
      (r) => r.high_flow_95,
      "var(--sui-series-1)",
    ),
    countCol(
      "high_flow_99",
      "99% CE (NC)",
      (r) => r.high_flow_99,
      "var(--sui-series-4)",
    ),
    countCol(
      "non_compliant",
      "Non-Compliant",
      (r) => r.non_compliant,
      "var(--sui-danger)",
    ),
    {
      id: "status",
      header: "Status",
      align: "center",
      accessor: (r) => (
        <StatusCell value={r.status} href={r.spreadsheet_url ?? undefined} />
      ),
    },
  ];
  return (
    <BaseTable
      data={FORTNIGHT_REPORTS}
      columns={columns}
      compact
      stickyHeader
      fill
    />
  );
}

// ---------------------------------------------------------------------------
// 4. 1000-hour manifest — src/routes/reports/thousand-hour/[id].tsx (~line 272)
// ---------------------------------------------------------------------------

interface ThousandHourVesselCall {
  vessel_name: string;
  vessel_type: string;
  connected_pacific: string;
  duration_humanized: string;
  completeness_pct: number | null;
}

// Pacific timestamps and humanized durations are precomputed in the stub —
// the real page derives them from ISO instants via toLocaleString("sv-SE",
// { timeZone: "America/Los_Angeles" }) and a fmt_duration_humanized replica.
const THOUSAND_HOUR_CALLS: ThousandHourVesselCall[] = [
  {
    vessel_name: "Ever Steadfast",
    vessel_type: "CONTAINER",
    connected_pacific: "2026-04-02 21:15:00",
    duration_humanized: "3d 7h 23m",
    completeness_pct: 99.2,
  },
  {
    vessel_name: "Pacific Dawn",
    vessel_type: "TANKER",
    connected_pacific: "2026-04-11 02:30:00",
    duration_humanized: "6d 11h 35m",
    completeness_pct: 87.4,
  },
  {
    vessel_name: "Coral Meridian",
    vessel_type: "RORO",
    connected_pacific: "2026-04-19 07:45:00",
    duration_humanized: "17h 55m",
    completeness_pct: 96.8,
  },
  {
    vessel_name: "Golden Horizon",
    vessel_type: "BULK",
    connected_pacific: "2026-04-27 23:00:00",
    duration_humanized: "3d 22h 33m",
    completeness_pct: 64.1,
  },
  {
    vessel_name: "Ever Resolute",
    vessel_type: "CONTAINER",
    connected_pacific: "2026-05-06 05:20:00",
    duration_humanized: "—",
    completeness_pct: null,
  },
];

/** Traffic-light color for a completeness percentage (jtf replica). */
function completenessColor(pct: number): string {
  if (pct >= 95) return "var(--sui-success)";
  if (pct >= 80) return "var(--sui-warning)";
  return "var(--sui-danger)";
}

function ThousandHourManifestTable() {
  const columns: TableColumn<ThousandHourVesselCall>[] = [
    {
      id: "vessel_name",
      header: "Vessel Name",
      accessor: (vc) => (
        <VesselNameCell type={vc.vessel_type} name={vc.vessel_name} />
      ),
    },
    {
      id: "connected_at",
      header: "Connected At (Pacific)",
      accessor: (vc) => vc.connected_pacific,
    },
    {
      id: "duration",
      header: "Duration",
      accessor: (vc) => vc.duration_humanized,
    },
    {
      id: "completeness",
      header: "Data Completeness",
      align: "center",
      accessor: (vc) =>
        vc.completeness_pct == null ? (
          "—"
        ) : (
          <EmphasisBody>
            <InlineText color={completenessColor(vc.completeness_pct)}>
              {vc.completeness_pct.toFixed(1)}%
            </InlineText>
          </EmphasisBody>
        ),
    },
  ];
  return (
    <BaseTable
      data={THOUSAND_HOUR_CALLS}
      columns={columns}
      compact
      stickyHeader
      fill
    />
  );
}

// ---------------------------------------------------------------------------
// 5. FTIR gap-fill gaps — src/routes/tools/ftir-gap-fill.tsx (migrated to
//    FieldTable; fields.col customs with typed geometry, maxRows 7)
// ---------------------------------------------------------------------------

interface FtirGapRange {
  index: number;
  start_utc: string;
  end_utc: string;
  duration_hours: number;
  csv_rows_in_gap: number;
}

const FTIR_GAPS: FtirGapRange[] = [
  { index: 0, start_utc: "2026-05-11T04:00:00Z", end_utc: "2026-05-11T06:30:00Z", duration_hours: 2.5, csv_rows_in_gap: 150 },
  { index: 1, start_utc: "2026-05-12T13:15:00Z", end_utc: "2026-05-12T13:45:00Z", duration_hours: 0.5, csv_rows_in_gap: 30 },
  { index: 2, start_utc: "2026-05-14T00:00:00Z", end_utc: "2026-05-15T08:00:00Z", duration_hours: 32, csv_rows_in_gap: 1920 },
  { index: 3, start_utc: "2026-05-17T19:20:00Z", end_utc: "2026-05-17T22:50:00Z", duration_hours: 3.5, csv_rows_in_gap: 210 },
  { index: 4, start_utc: "2026-05-19T09:00:00Z", end_utc: "2026-05-19T09:12:00Z", duration_hours: 0.2, csv_rows_in_gap: 12 },
  { index: 5, start_utc: "2026-05-22T16:40:00Z", end_utc: "2026-05-23T02:10:00Z", duration_hours: 9.5, csv_rows_in_gap: 570 },
  { index: 6, start_utc: "2026-05-25T11:05:00Z", end_utc: "2026-05-25T15:35:00Z", duration_hours: 4.5, csv_rows_in_gap: 270 },
  { index: 7, start_utc: "2026-05-28T21:50:00Z", end_utc: "2026-05-29T05:20:00Z", duration_hours: 7.5, csv_rows_in_gap: 450 },
];

/** jtf's ftir-gap-fill formatters, replicated. */
function formatGapTimestamp(utc: string): string {
  return utc.replace("T", " ").replace("Z", "").slice(0, 16);
}

function formatGapDuration(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  const days = Math.floor(hours / 24);
  const remainH = Math.floor(hours % 24);
  const remainM = Math.round((hours % 1) * 60);
  if (remainM > 0) return `${days}d ${remainH}h ${remainM}m`;
  return `${days}d ${remainH}h`;
}

function FtirGapsTable() {
  const gapFields = [
    col<FtirGapRange>("index", "#", (row) => row.index + 1, "int"),
    col<FtirGapRange>(
      "start",
      "Gap Start (UTC)",
      (row) => formatGapTimestamp(row.start_utc),
      "dateTime",
    ),
    col<FtirGapRange>(
      "end",
      "Gap End (UTC)",
      (row) => formatGapTimestamp(row.end_utc),
      "dateTime",
    ),
    col<FtirGapRange>(
      "duration",
      "Duration",
      (row) => formatGapDuration(row.duration_hours),
      "duration",
    ),
    col<FtirGapRange>(
      "csv_rows",
      "File Rows",
      (row) => row.csv_rows_in_gap.toLocaleString("en-US"),
      "int",
    ),
  ];
  return (
    <FieldTable data={FTIR_GAPS} fields={gapFields} registry={{}} maxRows={7} />
  );
}

// ---------------------------------------------------------------------------
// Catalog entries
// ---------------------------------------------------------------------------

export const ENTRIES: TableEntry[] = [
  {
    route: "/",
    name: "Cached Vessel Calls",
    status: "raw",
    note: "Blocked by onRowClick navigation + custom VesselName entity cell and CoverageCell (FULL/Nm severity coloring); NOx/ROG use MetricValueCell.",
    component: CachedVesselCallsTable,
  },
  {
    route: "/reports/durability",
    name: "Durability Vessel Calls",
    status: "raw",
    note: "All widths explicit on TableColumn; VesselName entity cell, nullable disconnected_at ('In Progress'), conditional data_status coloring.",
    component: DurabilityTable,
  },
  {
    route: "/reports/fortnight",
    name: "Fortnight Reports List",
    status: "raw",
    note: "Period AccentRouteLink cell, five CountCell conditional-emphasis count columns (series palette), StatusCell badge with spreadsheet href.",
    component: FortnightReportsTable,
  },
  {
    route: "/reports/thousand-hour/[id]",
    name: "1000-Hour Report Manifest",
    status: "raw",
    note: "VesselName entity cell, Pacific-time string column, humanized duration ('3d 7h 23m'), traffic-light completeness percentage.",
    component: ThousandHourManifestTable,
  },
  {
    route: "/tools/ftir-gap-fill",
    name: "FTIR Gap-Fill Gaps",
    status: "sui",
    note: "Migrated to FieldTable — fields.col customs (int/dateTime/duration geometries) with registry {} and maxRows 7.",
    component: FtirGapsTable,
  },
];
