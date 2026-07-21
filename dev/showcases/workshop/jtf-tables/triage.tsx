// JTF Table Catalog — triage & reports group.
// Faithful replicas of jtf-ui's raw BaseTable call sites, stubbed with
// deterministic data. Sources:
//   jtf-ui/src/components/violations/QaqcAssetTriage.tsx
//   jtf-ui/src/routes/reports/qaqc-checks.tsx
//   jtf-ui/src/routes/reports/nox-report.tsx
import { createSignal, Show, type JSX } from "solid-js";
import { MutedBody, TextSublabel } from "../../../../src/components/Text";
import { Tooltip } from "../../../../src/components/Tooltip";
import { InlineText } from "../../../../src/components/InlineText";
import { NarrowStack } from "../../../../src/components/Layout";
import { filter } from "../../../../src/fn";
import {
  FieldTable,
  SortableFieldTable,
  createFieldSelection,
  selectionCol,
  col,
  intCol,
  floatCol,
  statusCol,
  identityLinkCol,
  linkedCountCol,
  textCol,
  text10Col,
  dateTimeCol,
  durationCol,
  actionCol,
  toneWrap,
  withHint,
  withWhen,
  type StatusColMapping,
} from "../../../../src/components/Table/fields";
import { TYPE_GLYPH } from "./routes";
import type { TableEntry } from "./shared";

// Shared palette — the same CSS vars the jtf cells drive their colors with.
const ACCENT = "var(--sui-accent)";
const DANGER = "var(--sui-danger)";

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
  // Numbers in the data layer (migrated 2026-07-20) — the cells own the "%".
  pct_at_band: number | null;
  op_at_band: number | null;
  below_band_pct: number;
  current: boolean;
  has_issues: boolean;
}

const WEEKLY_ROWS: WeeklyRow[] = [
  { week_start: "2026-06-15", week_end: "2026-06-21", total_calls: 41, evaluated_calls: 41, triage_summary: "3 · 1 · 0 · 0 · 35 · 2", actionable: 4, violation_count: 6, violated_minutes: 214, pct_at_band: 2, op_at_band: 61, below_band_pct: 12, current: false, has_issues: false },
  { week_start: "2026-06-22", week_end: "2026-06-28", total_calls: 38, evaluated_calls: 38, triage_summary: "0 · 0 · 0 · 0 · 36 · 2", actionable: 0, violation_count: 1, violated_minutes: 35, pct_at_band: 0, op_at_band: 58, below_band_pct: 9, current: false, has_issues: true },
  { week_start: "2026-06-29", week_end: "2026-07-05", total_calls: 44, evaluated_calls: 44, triage_summary: "5 · 2 · 1 · 0 · 33 · 3", actionable: 8, violation_count: 11, violated_minutes: 402, pct_at_band: 4, op_at_band: 54, below_band_pct: 18, current: false, has_issues: false },
  { week_start: "2026-07-06", week_end: "2026-07-12", total_calls: 39, evaluated_calls: 24, triage_summary: "", actionable: 0, violation_count: 0, violated_minutes: 0, pct_at_band: null, op_at_band: null, below_band_pct: 0, current: false, has_issues: false },
  { week_start: "2026-07-13", week_end: "2026-07-19", total_calls: 17, evaluated_calls: 17, triage_summary: "1 · 0 · 0 · 0 · 15 · 1", actionable: 1, violation_count: 2, violated_minutes: 66, pct_at_band: 1, op_at_band: 63, below_band_pct: 7, current: true, has_issues: false },
];

const isFullyEvaluated = (r: WeeklyRow): boolean => r.evaluated_calls >= r.total_calls;
const weekLabel = (ymd: string): string => `Week of ${ymd}`;

function QaqcChecksWeeklyReplica(): JSX.Element {
  const [running, setRunning] = createSignal(false);

  // Per-row colspan collapses to predicate-gated columns (ruled 2026-07-20):
  // a partial week blanks its stat cells (withWhen) and surfaces the
  // Run-checks row action instead; the spanning cell dies. Evaluation
  // progress moves into the calls column — "24 / 39" until fully evaluated.
  const whenEvaluated = withWhen<WeeklyRow>(isFullyEvaluated);

  const registry = {
    week: withHint(
      "Monday-start week (PST/PDT)",
      col<WeeklyRow>(
        "week",
        "Week",
        (row) => (
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
        "name",
        (row) => row.week_start,
      ),
    ),
    calls: withHint(
      "Vessel calls overlapping this week — evaluated / total while checks are pending",
      col<WeeklyRow>(
        "calls",
        "Vessel Calls",
        (row) =>
          isFullyEvaluated(row)
            ? String(row.total_calls)
            : `${row.evaluated_calls} / ${row.total_calls}`,
        "int",
        (row) => row.total_calls,
      ),
    ),
    triage: withHint(
      "Each visit's culling bin (one per visit, >1 hr continuous, priority order): flow · pressure · THC · NH3 · good to go · can't assess.",
      whenEvaluated(
        col<WeeklyRow>(
          "triage",
          "Triage",
          (row) =>
            toneWrap(row.actionable === 0 ? "muted" : "accent", row.triage_summary),
          "text",
          (row) => row.triage_summary,
        ),
      ),
    ),
    violations: withHint(
      "Violation periods overlapping this week, counted per check",
      whenEvaluated(intCol<WeeklyRow>("violation_count", { header: "Violations" })),
    ),
    vtime: withHint(
      "Distinct time with ≥1 check violating, de-duped within each asset",
      whenEvaluated(
        durationCol<WeeklyRow>((row) => row.violated_minutes, "m", {
          id: "vtime",
          header: "Violation Time",
        }),
      ),
    ),
    pctatband: withHint(
      "Process-check violated minutes ÷ at-band minutes",
      whenEvaluated(
        floatCol<WeeklyRow>("pct_at_band", {
          id: "pctatband",
          header: "% of At-Band Time",
          precision: 0,
          suffix: "%",
        }),
      ),
    ),
    opatband: withHint(
      "Share of evaluated operational time with inlet flow inside the vessel-class band",
      whenEvaluated(
        col<WeeklyRow>(
          "opatband",
          "Op @ Band",
          (row) =>
            row.op_at_band == null ? (
              ""
            ) : (
              <InlineText color={ACCENT}>
                {row.op_at_band}%
                <Show when={row.below_band_pct >= 1}>
                  <TextSublabel> {row.below_band_pct.toFixed(0)}% below band</TextSublabel>
                </Show>
              </InlineText>
            ),
          // text geometry: the "N% below band" sublabel needs the room.
          "text",
          (row) => row.op_at_band,
        ),
      ),
    ),
    run_checks: withWhen<WeeklyRow>(
      (row) => !isFullyEvaluated(row),
      actionCol<WeeklyRow>("run_checks", () => setRunning(true)),
    ),
  };

  return (
    <NarrowStack>
      <FieldTable
        data={WEEKLY_ROWS}
        fields={[
          "week",
          "calls",
          "triage",
          "violations",
          "vtime",
          "pctatband",
          "opatband",
          "run_checks",
        ]}
        registry={registry}
      />
      <Show when={running()}>
        <MutedBody>Checks running… (stub — jtf kicks off the evaluation job)</MutedBody>
      </Show>
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

function NoxPreviewReplica(): JSX.Element {
  // Added calls are REMOVED from the picker (ruled 2026-07-20) — they live in
  // the report bag table below, so the per-row 'added' label state and the
  // bag-membership muting die; the picker shows only pickable calls. With
  // that, createFieldSelection covers everything the bespoke header did.
  const inBagIds = new Set(["vc-101", "vc-104"]);
  const notInBag = (vc: VesselCall): boolean => !inBagIds.has(vc.id);
  const pickable = filter(notInBag, NOX_CALLS);

  const selection = createFieldSelection<VesselCall>({
    rows: () => pickable,
    key: (vc) => vc.id,
  });

  const registry = {
    select: selectionCol<VesselCall>(selection),
    vessel: col<VesselCall>(
      "vessel",
      "Vessel Name",
      (row) => `${row.vessel_name} (${row.vessel_type})`,
      "text",
      (row) => row.vessel_name,
    ),
    asset_id: text10Col<VesselCall>("asset_id"),
    connected_at: dateTimeCol<VesselCall>("connected_at"),
    // Nullable end → BLANK; the old "In Progress" placeholder dies.
    disconnected_at: dateTimeCol<VesselCall>("disconnected_at"),
    duration: durationCol<VesselCall>(bagMinutes, "m", {
      id: "duration",
      header: "Duration",
    }),
  };

  return (
    <NarrowStack>
      <SortableFieldTable
        data={pickable}
        fields={[
          "select",
          "vessel",
          "asset_id",
          "connected_at",
          "disconnected_at",
          "duration",
        ]}
        registry={registry}
      />
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
    asset_id: text10Col<VesselCall>("asset_id"),
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
    status: "sui",
    note: "Migrated to FieldTable: the per-row colspan collapses to predicate-gated columns (ruled 2026-07-20) — partial weeks blank their stat cells (withWhen) and surface a Run-checks actionCol instead; evaluation progress moves into the calls column ('24 / 39'). Week col() custom keeps the (current)/⚠ decorations; violations intCol, violated time durationCol, %-at-band floatCol suffix '%', Op@Band col() custom; every header withHint.",
    component: QaqcChecksWeeklyReplica,
  },
  {
    route: "/reports/nox-report",
    name: "NOx preview (vessel-call picker)",
    status: "sui",
    note: "Migrated to SortableFieldTable: added calls are REMOVED from the picker instead of carrying an 'added' row state (ruled 2026-07-20 — they live in the report bag table), so createFieldSelection + selectionCol cover selection entirely; vessel col() custom '(type)' suffix, dateTimeCol pair (nullable end → blank), derived durationCol; table-level sorting replaces the hand-rolled sortHeader.",
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
