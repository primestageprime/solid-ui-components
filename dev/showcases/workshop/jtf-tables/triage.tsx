// JTF Table Catalog — triage & reports group.
// Faithful replicas of jtf-ui's raw BaseTable call sites, stubbed with
// deterministic data. Sources:
//   jtf-ui/src/components/violations/QaqcAssetTriage.tsx
//   jtf-ui/src/routes/reports/qaqc-checks.tsx
//   jtf-ui/src/routes/reports/nox-report.tsx
import { createMemo, createSignal, Show, type JSX } from "solid-js";
import {
  BaseTable,
  DateTimeCell,
  type TableColumn,
  type TableRowSpan,
} from "../../../../src/components/Table";
import { MutedBody, TextSublabel, TextTitle } from "../../../../src/components/Text";
import { Tooltip } from "../../../../src/components/Tooltip";
import { InlineText } from "../../../../src/components/InlineText";
import { Checkbox } from "../../../../src/components/Checkbox";
import { SmallOutlinedButton } from "../../../../src/components/Button";
import { ClusterRow, NarrowStack } from "../../../../src/components/Layout";
import {
  FieldTable,
  SortableFieldTable,
  intCol,
  floatCol,
  statusCol,
  identityLinkCol,
  linkedCountCol,
  textCol,
  dateTimeCol,
  durationCol,
  actionCol,
  withHint,
  type StatusColMapping,
} from "../../../../src/components/Table/fields";
import { TYPE_GLYPH } from "./routes";
import type { TableEntry } from "./shared";

// Shared palette — the same CSS vars the jtf cells drive their colors with.
const ACCENT = "var(--sui-accent)";
const DANGER = "var(--sui-danger)";
const MUTED = "var(--sui-text-muted)";
const SECONDARY = "var(--sui-text-secondary)";

// ============================================================
// 1. /violations — QaqcAssetTriage (11-column per-asset triage)
// ============================================================

interface TriageAsset {
  asset_id: string;
  total_calls: number;
  unevaluated: number;
  flow: number;
  pressure: number;
  thc: number;
  nh3: number;
  escalated: number;
  explained: number;
  good_to_go: number;
  resolved: number;
  status: "unresolved" | "ready_to_export" | "exported";
}

const TRIAGE_ASSETS: TriageAsset[] = [
  { asset_id: "BARGE-014", total_calls: 120, unevaluated: 8, flow: 22, pressure: 9, thc: 4, nh3: 2, escalated: 3, explained: 41, good_to_go: 34, resolved: 75, status: "unresolved" },
  { asset_id: "BARGE-007", total_calls: 96, unevaluated: 0, flow: 5, pressure: 12, thc: 0, nh3: 1, escalated: 0, explained: 30, good_to_go: 48, resolved: 78, status: "unresolved" },
  { asset_id: "BARGE-021", total_calls: 64, unevaluated: 4, flow: 0, pressure: 0, thc: 6, nh3: 0, escalated: 1, explained: 22, good_to_go: 31, resolved: 53, status: "unresolved" },
  { asset_id: "BARGE-002", total_calls: 88, unevaluated: 0, flow: 0, pressure: 0, thc: 0, nh3: 0, escalated: 0, explained: 35, good_to_go: 53, resolved: 88, status: "ready_to_export" },
  { asset_id: "BARGE-033", total_calls: 45, unevaluated: 0, flow: 0, pressure: 0, thc: 0, nh3: 0, escalated: 0, explained: 12, good_to_go: 33, resolved: 45, status: "exported" },
  { asset_id: "BARGE-019", total_calls: 102, unevaluated: 11, flow: 14, pressure: 3, thc: 8, nh3: 5, escalated: 2, explained: 28, good_to_go: 31, resolved: 59, status: "unresolved" },
];

const classified = (a: TriageAsset): number => a.total_calls - a.unevaluated;
const needsAnalysis = (a: TriageAsset): number => a.flow + a.pressure + a.thc + a.nh3;

// Detail-worklist link for an asset's bucket (jtf's AccentRouteLink target).
const detailHref = (a: TriageAsset, bucket: string): string =>
  `/tools/asset-triage/detail?asset=${encodeURIComponent(a.asset_id)}&bucket=${bucket}`;

// The asset name links to its first non-zero bucket, dropping the analyst into
// the most relevant worklist (jtf's firstNonZeroBucket).
const firstNonZeroBucket = (a: TriageAsset): string => {
  if (a.flow > 0) return "flow";
  if (a.pressure > 0) return "pressure";
  if (a.thc > 0) return "thc";
  if (a.nh3 > 0) return "nh3";
  if (a.escalated > 0) return "escalated";
  if (a.explained > 0) return "explained";
  if (a.good_to_go > 0) return "good_to_go";
  return "flow";
};

const TRIAGE_STATUS: Record<string, StatusColMapping> = {
  unresolved: { label: "Unresolved", tone: "muted" },
  ready_to_export: { label: "Ready to export", tone: "accent" },
  exported: { label: "Exported", tone: "default" },
};

// A bucket column: the linked COUNT under a tooltip header —
// withHint(linkedCountCol). The zero-has-no-destination gate lives in the
// factory now (spec 2026-07-20); the old "P% (N)" composite collapses to the
// count (ruled 2026-07-20). Escalated wears a danger tone.
const bucketCol = (
  key: "flow" | "pressure" | "thc" | "nh3" | "escalated" | "explained" | "good_to_go",
  header: string,
  hint: string,
  danger = false,
) =>
  withHint(
    hint,
    linkedCountCol<TriageAsset>(key, {
      href: (a) => detailHref(a, key),
      header,
      tone: danger ? (v) => (v > 0 ? "danger" : "default") : undefined,
    }),
  );

// Default view: needs-analysis share, worst first. SortableFieldTable starts in
// data order, so the bespoke default ordering is baked into the data here; a
// header click then re-sorts on that column's sortValue.
const TRIAGE_DISPLAY: TriageAsset[] = [...TRIAGE_ASSETS].sort(
  (a, b) =>
    needsAnalysis(b) / Math.max(1, classified(b)) -
    needsAnalysis(a) / Math.max(1, classified(a)),
);

const TRIAGE_REGISTRY = {
  asset: withHint(
    "Asset identifier",
    identityLinkCol<TriageAsset>("asset_id", {
      href: (a) => detailHref(a, firstNonZeroBucket(a)),
      header: "Asset",
    }),
  ),
  classified: withHint(
    "Calls with a triage bin (excludes calls not yet evaluated)",
    intCol<TriageAsset>((a) => classified(a), { id: "classified", header: "Classified Calls" }),
  ),
  flow: bucketCol("flow", "Flow Threshold", "Inlet flow out of band for over an hour — highest-priority bin"),
  pressure: bucketCol("pressure", "Inlet Pressure Threshold", "Inlet pressure over its ceiling for over an hour (no flow bin)"),
  thc: bucketCol("thc", "Outlet THC Threshold", "Outlet THC out of band for over an hour (no flow/pressure bin)"),
  nh3: bucketCol("nh3", "Outlet NH3 Threshold", "Outlet NH3 slip over an hour (no flow/pressure/THC bin)"),
  escalated: bucketCol("escalated", "Escalated", "Calls flagged for escalation to the compliance officer", true),
  explained: bucketCol("explained", "Explained", "Faults justified by an analyst explanation"),
  good_to_go: bucketCol("good_to_go", "Good to Go", "No diagnostic over an hour — report as-is, no analyst"),
  // Resolution PROGRESS is a percentage (floatCol suffix %); blank when there
  // are no classified calls. The raw resolved count drops with the composite.
  resolved: withHint(
    "Explained + Good to Go — calls cleared for reporting",
    floatCol<TriageAsset>(
      (a) => (classified(a) > 0 ? (a.resolved / classified(a)) * 100 : null),
      { id: "resolved", header: "Resolved", suffix: "%", precision: 0 },
    ),
  ),
  status: withHint(
    "Ready to export once every call is explained or good-to-go",
    statusCol<TriageAsset>("status", TRIAGE_STATUS, { header: "Status" }),
  ),
};

function QaqcAssetTriageReplica(): JSX.Element {
  return (
    <NarrowStack>
      <SortableFieldTable
        data={TRIAGE_DISPLAY}
        fields={[
          "asset",
          "classified",
          "flow",
          "pressure",
          "thc",
          "nh3",
          "escalated",
          "explained",
          "good_to_go",
          "resolved",
          "status",
        ]}
        registry={TRIAGE_REGISTRY}
      />
    </NarrowStack>
  );
}

// ============================================================
// 2. /reports/qaqc-checks — weekly QA/QC table with spanRow
// ============================================================

interface WeeklyRow {
  week_start: string;
  week_end: string;
  total_calls: number;
  evaluated_calls: number;
  triage_summary: string;
  actionable: number;
  violation_count: number;
  violated_minutes: number;
  pct_at_band: string;
  op_at_band: string;
  below_band_pct: number;
  current: boolean;
  has_issues: boolean;
}

const WEEKLY_ROWS: WeeklyRow[] = [
  { week_start: "2026-06-15", week_end: "2026-06-21", total_calls: 41, evaluated_calls: 41, triage_summary: "3 · 1 · 0 · 0 · 35 · 2", actionable: 4, violation_count: 6, violated_minutes: 214, pct_at_band: "2%", op_at_band: "61%", below_band_pct: 12, current: false, has_issues: false },
  { week_start: "2026-06-22", week_end: "2026-06-28", total_calls: 38, evaluated_calls: 38, triage_summary: "0 · 0 · 0 · 0 · 36 · 2", actionable: 0, violation_count: 1, violated_minutes: 35, pct_at_band: "0%", op_at_band: "58%", below_band_pct: 9, current: false, has_issues: true },
  { week_start: "2026-06-29", week_end: "2026-07-05", total_calls: 44, evaluated_calls: 44, triage_summary: "5 · 2 · 1 · 0 · 33 · 3", actionable: 8, violation_count: 11, violated_minutes: 402, pct_at_band: "4%", op_at_band: "54%", below_band_pct: 18, current: false, has_issues: false },
  { week_start: "2026-07-06", week_end: "2026-07-12", total_calls: 39, evaluated_calls: 24, triage_summary: "", actionable: 0, violation_count: 0, violated_minutes: 0, pct_at_band: "—", op_at_band: "—", below_band_pct: 0, current: false, has_issues: false },
  { week_start: "2026-07-13", week_end: "2026-07-19", total_calls: 17, evaluated_calls: 17, triage_summary: "1 · 0 · 0 · 0 · 15 · 1", actionable: 1, violation_count: 2, violated_minutes: 66, pct_at_band: "1%", op_at_band: "63%", below_band_pct: 7, current: true, has_issues: false },
];

const isFullyEvaluated = (r: WeeklyRow): boolean => r.evaluated_calls >= r.total_calls;
const formatMinutes = (m: number): string =>
  m === 0 ? "—" : m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
const weekLabel = (ymd: string): string => `Week of ${ymd}`;

function QaqcChecksWeeklyReplica(): JSX.Element {
  const [running, setRunning] = createSignal(false);

  /** Tooltip-bearing plain header (jtf's headerHint). */
  const headerHint = (label: string, tip: string): JSX.Element => (
    <Tooltip content={tip}>
      <TextTitle>{label}</TextTitle>
    </Tooltip>
  );

  /** Stat cell: full-cell accent link to the week's detail grid, tooltipped. */
  const statCell = (value: string | number, tip: string): JSX.Element => (
    <Tooltip content={tip}>
      <InlineText color={ACCENT}>{value}</InlineText>
    </Tooltip>
  );

  const columns: TableColumn<WeeklyRow>[] = [
    {
      id: "week",
      header: headerHint("Week", "Monday-start week (PST/PDT)"),
      width: "15rem",
      accessor: (row) => (
        <Tooltip content={`${row.week_start} → ${row.week_end}`}>
          <InlineText color={ACCENT}>
            {weekLabel(row.week_start)}
            <Show when={row.current}>
              <TextSublabel> (current)</TextSublabel>
            </Show>
            <Show when={row.has_issues}>
              <InlineText color={DANGER}> ⚠</InlineText>
            </Show>
          </InlineText>
        </Tooltip>
      ),
    },
    {
      id: "calls",
      header: headerHint("Vessel Calls", "Vessel calls overlapping this week"),
      align: "center",
      accessor: (row) => statCell(row.total_calls, "Vessel calls overlapping this week"),
    },
    {
      id: "triage",
      header: headerHint(
        "Triage",
        "Each visit's culling bin (one per visit, >1 hr continuous, priority order): flow · pressure · THC · NH3 · good to go · can't assess.",
      ),
      align: "center",
      // Partial-eval rows are handled by `spanRow` below, so this only
      // renders the fully-evaluated case.
      accessor: (row) => (
        <Tooltip content="flow · pressure · THC · NH3 · good to go · can't assess">
          <InlineText color={row.actionable === 0 ? SECONDARY : ACCENT}>
            {row.triage_summary}
          </InlineText>
        </Tooltip>
      ),
    },
    {
      id: "violations",
      header: headerHint(
        "Violations",
        "Violation periods overlapping this week, counted per check",
      ),
      align: "center",
      accessor: (row) =>
        statCell(row.violation_count, "Violation periods overlapping this week, counted per check"),
    },
    {
      id: "vtime",
      header: headerHint(
        "Violation Time",
        "Distinct time with ≥1 check violating, de-duped within each asset",
      ),
      align: "center",
      accessor: (row) =>
        statCell(formatMinutes(row.violated_minutes), "Distinct violating time, de-duped per asset"),
    },
    {
      id: "pctatband",
      header: headerHint(
        "% of At-Band Time",
        "Process-check violated minutes ÷ at-band minutes",
      ),
      align: "center",
      accessor: (row) =>
        statCell(row.pct_at_band, "Process-check violated minutes ÷ at-band minutes"),
    },
    {
      id: "opatband",
      header: headerHint(
        "Op @ Band",
        "Share of evaluated operational time with inlet flow inside the vessel-class band",
      ),
      align: "center",
      accessor: (row) => (
        <Tooltip content="Evaluated minutes of this week's calls: at band · below band · idle · above band">
          <InlineText color={ACCENT}>
            {row.op_at_band}
            <Show when={row.below_band_pct >= 1}>
              <TextSublabel> {row.below_band_pct.toFixed(0)}% below band</TextSublabel>
            </Show>
          </InlineText>
        </Tooltip>
      ),
    },
  ];

  /** Partial-eval weeks collapse the stat columns (from "triage" on) into one
   * spanning cell holding the evaluation status + a Run-checks action. */
  const spanRow = (row: WeeklyRow): TableRowSpan | null =>
    isFullyEvaluated(row)
      ? null
      : {
          fromColumnId: "triage",
          content: (
            <ClusterRow>
              <MutedBody>
                {row.evaluated_calls} of {row.total_calls} calls evaluated
              </MutedBody>
              <SmallOutlinedButton
                disabled={running()}
                onClick={() => setRunning(true)}
              >
                {running() ? "Running…" : "Run checks"}
              </SmallOutlinedButton>
            </ClusterRow>
          ),
        };

  return (
    <NarrowStack>
      <BaseTable data={WEEKLY_ROWS} columns={columns} spanRow={spanRow} compact />
    </NarrowStack>
  );
}

// ============================================================
// 3. /reports/nox-report — preview + report tables
// ============================================================

interface VesselCall {
  id: string;
  vessel_name: string;
  vessel_type: string;
  asset_id: string;
  connected_at: string;
  disconnected_at: string | null;
}

const NOX_CALLS: VesselCall[] = [
  { id: "vc-101", vessel_name: "Ever Liberal", vessel_type: "container", asset_id: "AMECS-1", connected_at: "2026-07-01T04:15:00Z", disconnected_at: "2026-07-02T18:45:00Z" },
  { id: "vc-102", vessel_name: "MSC Brianna", vessel_type: "container", asset_id: "AMECS-2", connected_at: "2026-07-02T09:30:00Z", disconnected_at: "2026-07-03T11:00:00Z" },
  { id: "vc-103", vessel_name: "Grand Pioneer", vessel_type: "auto", asset_id: "AMECS-1", connected_at: "2026-07-04T22:05:00Z", disconnected_at: "2026-07-05T14:20:00Z" },
  { id: "vc-104", vessel_name: "Aristomenis", vessel_type: "tanker", asset_id: "METS-1", connected_at: "2026-07-06T07:50:00Z", disconnected_at: "2026-07-07T02:10:00Z" },
  { id: "vc-105", vessel_name: "NYK Daedalus", vessel_type: "container", asset_id: "AMECS-2", connected_at: "2026-07-08T16:40:00Z", disconnected_at: null },
  { id: "vc-106", vessel_name: "Cosco Harmony", vessel_type: "container", asset_id: "METS-1", connected_at: "2026-07-09T03:25:00Z", disconnected_at: "2026-07-10T09:55:00Z" },
];

/** Deterministic duration from the ISO pair (jtf's formatConnectionDuration). */
const formatConnectionDuration = (from: string, to: string | null): string => {
  if (!to) return "—";
  const mins = Math.round((Date.parse(to) - Date.parse(from)) / 60000);
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

type NoxSortKey = "vessel" | "connected" | "duration";

function NoxPreviewReplica(): JSX.Element {
  // Bag membership is fixed stub state: two calls are already in the report.
  const inBagIds = new Set(["vc-101", "vc-104"]);
  const [selectedIds, setSelectedIds] = createSignal<Set<string>>(new Set(["vc-103"]));
  const [sortKey, setSortKey] = createSignal<NoxSortKey>("connected");
  const [sortDir, setSortDir] = createSignal<"asc" | "desc">("desc");

  const handleSort = (key: NoxSortKey) => {
    if (sortKey() === key) setSortDir(sortDir() === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const visibleItems = createMemo(() => {
    const rows = NOX_CALLS.map((vc) => ({ ...vc, inBag: inBagIds.has(vc.id) }));
    const dir = sortDir() === "asc" ? 1 : -1;
    const dur = (vc: VesselCall) =>
      vc.disconnected_at ? Date.parse(vc.disconnected_at) - Date.parse(vc.connected_at) : 0;
    rows.sort((a, b) => {
      switch (sortKey()) {
        case "vessel":
          return dir * a.vessel_name.localeCompare(b.vessel_name);
        case "duration":
          return dir * (dur(a) - dur(b));
        case "connected":
        default:
          return dir * (Date.parse(a.connected_at) - Date.parse(b.connected_at));
      }
    });
    return rows;
  });

  const visibleSelectable = createMemo(() => visibleItems().filter((vc) => !vc.inBag));
  const allSelected = createMemo(() => {
    const vs = visibleSelectable();
    return vs.length > 0 && vs.every((vc) => selectedIds().has(vc.id));
  });

  const toggleSelectAll = () => {
    const vs = visibleSelectable();
    const next = new Set(selectedIds());
    if (allSelected()) vs.forEach((vc) => next.delete(vc.id));
    else vs.forEach((vc) => next.add(vc.id));
    setSelectedIds(next);
  };
  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  /** Clickable, indicator-bearing header for a sortable column. */
  const sortHeader = (key: NoxSortKey, label: string): JSX.Element => (
    <InlineText onClick={() => handleSort(key)}>
      {label}
      {sortKey() === key ? (sortDir() === "asc" ? " ▲" : " ▼") : ""}
    </InlineText>
  );

  const columns: TableColumn<VesselCall & { inBag: boolean }>[] = [
    {
      id: "select",
      // Select-all checkbox lives in the column header (jtf pattern).
      header: <Checkbox size="sm" checked={allSelected()} onChange={toggleSelectAll} />,
      accessor: (row) =>
        row.inBag ? (
          <TextSublabel>added</TextSublabel>
        ) : (
          <Checkbox
            size="sm"
            checked={selectedIds().has(row.id)}
            onChange={() => toggleSelection(row.id)}
          />
        ),
      width: "50px",
    },
    {
      id: "vessel_name",
      header: sortHeader("vessel", "Vessel Name"),
      // Color is data-driven: muted once the call is already in the report bag.
      accessor: (row) => (
        <InlineText color={row.inBag ? MUTED : ACCENT}>
          {row.vessel_name} ({row.vessel_type})
        </InlineText>
      ),
      width: "200px",
    },
    { id: "asset_id", header: "Asset", accessor: (row) => row.asset_id, width: "90px" },
    {
      id: "connected_at",
      header: sortHeader("connected", "Connected"),
      accessor: (row) => <DateTimeCell value={row.connected_at} />,
      width: "180px",
    },
    {
      id: "disconnected_at",
      header: "Disconnected",
      accessor: (row) =>
        row.disconnected_at ? <DateTimeCell value={row.disconnected_at} /> : "In Progress",
      width: "180px",
    },
    {
      id: "duration",
      header: sortHeader("duration", "Duration"),
      accessor: (row) => formatConnectionDuration(row.connected_at, row.disconnected_at),
      width: "100px",
    },
  ];

  return (
    <NarrowStack>
      <BaseTable data={visibleItems()} columns={columns} compact stickyHeader />
    </NarrowStack>
  );
}

// Duration DERIVED from the two timestamps (minutes); an in-progress call has
// no defined end, so it reads null → blank (same reader shape as Durability).
const bagMinutes = (row: VesselCall): number | null =>
  row.disconnected_at
    ? Math.floor((Date.parse(row.disconnected_at) - Date.parse(row.connected_at)) / 60_000)
    : null;

function NoxReportBagReplica(): JSX.Element {
  // The report bag is mutable — "remove" works, seeded deterministically.
  const [bag, setBag] = createSignal<VesselCall[]>(NOX_CALLS.slice(0, 4));
  const removeFromReport = (id: string) =>
    setBag((prev) => prev.filter((vc) => vc.id !== id));

  // Vessel calls have a detail page, so the name IS the link (ruled
  // 2026-07-18, same as Durability); the type glyph leads it. Nullable end →
  // BLANK — the old "In Progress" placeholder dies (no empty markers ruling).
  const registry = {
    vessel_name: identityLinkCol<VesselCall>("vessel_name", {
      href: (row) => `/detail/${row.id}`,
      glyph: (row) => <>{TYPE_GLYPH[row.vessel_type.toUpperCase()] ?? "▢"}&nbsp;</>,
    }),
    asset_id: textCol<VesselCall>("asset_id"),
    connected_at: dateTimeCol<VesselCall>("connected_at"),
    disconnected_at: dateTimeCol<VesselCall>("disconnected_at"),
    duration: durationCol<VesselCall>(bagMinutes, "m", {
      id: "duration",
      header: "Duration",
    }),
    remove: actionCol<VesselCall>("remove", (row) => removeFromReport(row.id)),
  };

  return (
    <NarrowStack>
      <FieldTable
        data={bag()}
        fields={[
          "vessel_name",
          "asset_id",
          "connected_at",
          "disconnected_at",
          "duration",
          "remove",
        ]}
        registry={registry}
      />
    </NarrowStack>
  );
}

// ============================================================
// Entries
// ============================================================

export const ENTRIES: TableEntry[] = [
  {
    route: "/violations (QaqcAssetTriage)",
    name: "QA/QC asset triage",
    status: "sui",
    note: "Migrated to SortableFieldTable: 11 columns — asset identityLinkCol, classified/bucket intCols (buckets = withHref(intCol) linked counts), resolved floatCol suffix '%', status statusCol, every header withHint. The 'P% (N)' bucket composite collapses to the linked count and the percentage context drops (ruled 2026-07-20).",
    component: QaqcAssetTriageReplica,
  },
  {
    route: "/reports/qaqc-checks",
    name: "Weekly QA/QC checks",
    status: "raw",
    customs: ["span-row"],
    note: "Blocked only by per-row colspan — partial weeks collapse stat columns into one spanning cell (BaseTable spanRow) with a Run-checks action. The tooltip headers and tooltipped link cells are now shipped (withHint/withHref) and no longer blockers.",
    component: QaqcChecksWeeklyReplica,
  },
  {
    route: "/reports/nox-report",
    name: "NOx preview (vessel-call picker)",
    status: "raw",
    customs: ["select-state"],
    note: "Blocked: client sorting + bag-membership colored cells; select-all/range now exists in fields (createFieldSelection) but the custom select-all header + 'added' label state remain bespoke.",
    component: NoxPreviewReplica,
  },
  {
    route: "/reports/nox-report",
    name: "NOx report bag",
    status: "sui",
    note: "Migrated to FieldTable: vessel identityLinkCol (name-is-the-link + type glyph), textCol asset, dateTimeCol pair (nullable end → blank; the 'In Progress' placeholder dies per the no-empty-markers ruling), derived durationCol, trailing actionCol('remove') — the labeled SmallDangerButton becomes the standard trash icon-button (ruled 2026-07-20).",
    component: NoxReportBagReplica,
  },
];
