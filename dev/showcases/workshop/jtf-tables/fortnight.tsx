// JTF Table Catalog — fortnight report tables.
// Faithful replicas of every table rendered by the fortnight report flow
// (jtf-ui src/components/fortnight/* + ComplianceThresholdTable), with
// deterministic stub data. Status tags per the migration worklist:
//   sui — FieldTable/fields registries or ValueMatrix (call sites own no CSS)
//   raw — BaseTable/FilterableTable with call-site geometry/color
import { Show, type Component, type JSX } from "solid-js";
import {
  BaseTable,
  FilterableTable,
  FloatCell,
  IntCell,
  DateTimeCell,
  StringCell,
  type TableColumn,
} from "../../../../src/components/Table";
import * as fields from "../../../../src/components/Table/fields";
import { FieldTable, type FieldCol } from "../../../../src/components/Table/fields";
import { ValueMatrix } from "../../../../src/components/ValueMatrix";
import { InlineText } from "../../../../src/components/InlineText";
import {
  TextSublabel,
  TextValueSuccessSm,
  TextValueDangerSm,
  NowrapBody,
} from "../../../../src/components/Text";
import { TightStack, TightClusterRow } from "../../../../src/components/Layout";
import { SmStatusBadge } from "../../../../src/components/Badge";
import { Tooltip } from "../../../../src/components/Tooltip";
import type { TableEntry } from "./shared";

const FORTNIGHT_ROUTE = "/reports/fortnight/[id]";

// ============================================
// 1–7. Minute-level metric tables (SUI)
// FortnightReportBody.tsx builds one FieldTable per metric category, all off
// the same pattern: fields.dateTimeCol for the timestamp + floatCol (or the
// col() tail via metricCol when the header is a dotted canonical name the
// humanizer can't derive). Replicated here through a small factory.
// ============================================

interface MetricRow {
  [key: string]: number | string | null;
  timestamp: string;
}

/** jtf's metricCol: canonical dotted header, geometry from the float type. */
const metricCol = (key: string, header: string, precision: number): FieldCol<MetricRow> =>
  fields.col<MetricRow>(
    key,
    header,
    (row) => <FloatCell value={row[key] as number | null} precision={precision} />,
    "float",
  );

/** Column spec: `header` present → metricCol (dotted name); absent → floatCol. */
interface MetricColSpec {
  key: string;
  header?: string;
  precision: number;
  /** Deterministic stub basis: row i = base + step·i (+ fixed wobble). */
  base: number;
  step: number;
}

const MINUTE_TIMESTAMPS = [
  "2026-06-02T08:00:00Z",
  "2026-06-02T08:01:00Z",
  "2026-06-02T08:02:00Z",
  "2026-06-02T08:03:00Z",
];

// Fixed per-row wobble so consecutive minutes don't read as a straight ramp.
const WOBBLE = [0, 0.6, -0.4, 1.1];

const roundTo = (v: number, p: number): number => Number(v.toFixed(p));

function makeMinuteTable(cols: MetricColSpec[]): Component {
  const registry: Record<string, FieldCol<MetricRow>> = {
    timestamp: fields.dateTimeCol<MetricRow>("timestamp"),
  };
  for (const c of cols) {
    registry[c.key] =
      c.header !== undefined
        ? metricCol(c.key, c.header, c.precision)
        : fields.floatCol<MetricRow>(c.key, { precision: c.precision });
  }
  const data: MetricRow[] = MINUTE_TIMESTAMPS.map((timestamp, i) => {
    const row: MetricRow = { timestamp };
    for (const c of cols) {
      row[c.key] = roundTo(c.base + c.step * i + c.base * 0.004 * WOBBLE[i], c.precision);
    }
    return row;
  });
  const fieldOrder = ["timestamp", ...cols.map((c) => c.key)];
  return () => <FieldTable data={data} fields={fieldOrder} registry={registry} />;
}

function minuteEntry(name: string, cols: MetricColSpec[]): TableEntry {
  return {
    route: FORTNIGHT_ROUTE,
    name,
    status: "sui",
    note: "fields.dateTimeCol + floatCol registries (migrated 2026-07-17)",
    component: makeMinuteTable(cols),
  };
}

const FTIR_INLET_COLS: MetricColSpec[] = [
  { key: "FTIR_I_NO", header: "FTIR.I_NO", precision: 1, base: 412.3, step: 2.1 },
  { key: "FTIR_I_NO2", header: "FTIR.I_NO2", precision: 1, base: 38.6, step: 0.4 },
  { key: "FTIR_I_CO", header: "FTIR.I_CO", precision: 1, base: 55.2, step: -0.8 },
  { key: "FTIR_I_CO2", header: "FTIR.I_CO2", precision: 2, base: 5.84, step: 0.02 },
  { key: "FTIR_I_CH4", header: "FTIR.I_CH4", precision: 1, base: 12.4, step: 0.2 },
  { key: "FTIR_I_H2O", header: "FTIR.I_H2O", precision: 2, base: 6.12, step: 0.03 },
  { key: "FTIR_I_N2O", header: "FTIR.I_N2O", precision: 2, base: 1.24, step: 0.01 },
  { key: "FTIR_I_NH3", header: "FTIR.I_NH3", precision: 2, base: 0.42, step: 0.02 },
  { key: "FTIR_I_SF6", header: "FTIR.I_SF6", precision: 2, base: 0.03, step: 0 },
  { key: "FTIR_I_THC", header: "FTIR.I_THC", precision: 1, base: 48.9, step: -0.5 },
];

const FTIR_OUTLET_COLS: MetricColSpec[] = [
  { key: "FTIR_O_NO", header: "FTIR.O_NO", precision: 1, base: 18.4, step: 0.3 },
  { key: "FTIR_O_NO2", header: "FTIR.O_NO2", precision: 1, base: 6.2, step: 0.1 },
  { key: "FTIR_O_CO", header: "FTIR.O_CO", precision: 1, base: 21.7, step: -0.4 },
  { key: "FTIR_O_CO2", header: "FTIR.O_CO2", precision: 2, base: 5.79, step: 0.02 },
  { key: "FTIR_O_CH4", header: "FTIR.O_CH4", precision: 1, base: 10.8, step: 0.1 },
  { key: "FTIR_O_H2O", header: "FTIR.O_H2O", precision: 2, base: 6.08, step: 0.02 },
  { key: "FTIR_O_N2O", header: "FTIR.O_N2O", precision: 2, base: 1.31, step: 0.01 },
  { key: "FTIR_O_NH3", header: "FTIR.O_NH3", precision: 2, base: 2.15, step: 0.04 },
  { key: "FTIR_O_SF6", header: "FTIR.O_SF6", precision: 2, base: 0.03, step: 0 },
  { key: "FTIR_O_THC", header: "FTIR.O_THC", precision: 1, base: 12.6, step: -0.2 },
];

const SCR_COLS: MetricColSpec[] = [
  { key: "SCR_JM_Ti", header: "SCR.JM_Ti", precision: 1, base: 318.4, step: 1.2 },
];

const FID_COLS: MetricColSpec[] = [
  { key: "FID_THC", precision: 1, base: 46.2, step: -0.6 },
];

const DP_COLS: MetricColSpec[] = [
  { key: "DPF_Pi", precision: 2, base: 12.44, step: 0.06 },
  { key: "DPF_Po", precision: 2, base: 10.91, step: 0.04 },
  // humanize would split "dP" into "d P" — jtf keeps the exact header via metricCol
  { key: "DPF_dP", header: "DPF_dP", precision: 2, base: 1.53, step: 0.02 },
];

const MSI_COLS: MetricColSpec[] = [
  { key: "MSI_F2", precision: 0, base: 2140, step: 12 },
  { key: "MSI_T", precision: 1, base: 41.2, step: 0.3 },
  { key: "MSI_P", precision: 2, base: 1.01, step: 0 },
];

const MSO_COLS: MetricColSpec[] = [
  { key: "MSO_F2", precision: 0, base: 1980, step: -8 },
];

// ============================================
// 8. Power Log OCR Results (RAW)
// FortnightReportBody.tsx ~line 1457: BaseTable whose column list is built at
// runtime from `page.summary.aux_columns_used`, the total header switches on
// train count ("kW/train" vs "Total kW"), and the total cell is wrapped in a
// local CyanValue (createText color #00d4ff). Replicated with a fixed 2-aux
// stub and InlineText carrying the cyan.
// ============================================

interface OcrRow {
  time: string;
  aux_1: number | null;
  aux_2: number | null;
  total: number | null;
}

const OCR_AUX_COLS = ["aux_1", "aux_2"] as const;
const OCR_NUM_TRAINS = 2; // 2 trains → header reads "kW/train", total ÷ 2

const OCR_READINGS: Array<[string, number, number]> = [
  ["2026-06-07 08:00", 912, 946],
  ["2026-06-07 09:00", 905, 951],
  ["2026-06-07 10:00", 934, 918],
  ["2026-06-07 11:00", 921, 962],
  ["2026-06-07 12:00", 898, 940],
  ["2026-06-07 13:00", 917, 955],
];

const OCR_ROWS: OcrRow[] = OCR_READINGS.map(([time, aux1, aux2]) => ({
  time,
  aux_1: aux1,
  aux_2: aux2,
  total: (aux1 + aux2) / OCR_NUM_TRAINS,
}));

const OCR_COLUMNS: TableColumn<OcrRow>[] = [
  { id: "time", header: "Time", accessor: (r) => <NowrapBody>{r.time}</NowrapBody> },
  ...OCR_AUX_COLS.map(
    (col): TableColumn<OcrRow> => ({
      id: col,
      header: col,
      align: "right",
      accessor: (r) => <FloatCell value={r[col]} precision={0} />,
    }),
  ),
  {
    id: "total",
    header: OCR_NUM_TRAINS > 1 ? "kW/train" : "Total kW",
    align: "right",
    accessor: (r) => (
      <InlineText color="#00d4ff">
        <FloatCell value={r.total} precision={0} />
      </InlineText>
    ),
  },
];

const PowerLogOcrReplica: Component = () => (
  <TightStack>
    <TextSublabel>
      Page 1: Ever Steadfast 06/07/2026 — 928 kW avg from 6 hours
    </TextSublabel>
    <BaseTable data={OCR_ROWS} columns={OCR_COLUMNS} compact maxHeight="200px" />
  </TightStack>
);

// ============================================
// 9. Compliance Threshold Matrix (SUI)
// ComplianceThresholdTable.tsx is a thin domain wrapper over ValueMatrix:
// CE levels × power sources, g/kWh tone by threshold, chosen scenario
// emphasized. Replicated against ValueMatrix directly.
// ============================================

interface PowerSourceStub {
  key: string;
  label: string;
}

const CE_LEVELS = [80, 85, 90, 95];
const POWER_SOURCES: PowerSourceStub[] = [
  { key: "shore", label: "Shore" },
  { key: "barge2", label: "Barge ×2" },
  { key: "barge3", label: "Barge ×3" },
];
const NOX_THRESHOLD = 2.8;
// g/kWh by source, indexed to CE_LEVELS — falls under the 2.8 line as CE rises.
const G_PER_KWH: Record<string, number[]> = {
  shore: [3.42, 3.05, 2.61, 2.24],
  barge2: [3.18, 2.84, 2.43, 2.08],
  barge3: [2.95, 2.63, 2.25, 1.93],
};

/** jtf's formatGPerKwh (lib/emissions): 4 significant figures. */
const formatGPerKwh = (v: number): string => v.toPrecision(4);

const ComplianceThresholdReplica: Component = () => (
  <ValueMatrix
    rows={CE_LEVELS}
    cols={POWER_SOURCES}
    rowAxisLabel="CE"
    rowLabel={(ce) => `${ce}%`}
    colLabel={(ps) => ps.label}
    value={(ce, ps) => G_PER_KWH[ps.key][CE_LEVELS.indexOf(ce)]}
    format={formatGPerKwh}
    tone={(v) => (v !== null && v < NOX_THRESHOLD ? "success" : "danger")}
    selected={(ce, ps) => ps.key === "barge2" && ce === 90}
  />
);

// ============================================
// 10. Missing Info Preview (RAW)
// MissingInfoPreview.tsx: BaseTable with 10 columns — StatusBadge operator
// kind, AffectedVessels tooltip cell, MissingOrString fallbacks rendering a
// pending "empty" badge for blank operator fields.
// ============================================

interface AffectedVesselStub {
  vessel_name: string;
  asset_id: string;
}

interface MissingInfoRowStub {
  operator_kind: string;
  vessel_call_count: number;
  affected_vessels: AffectedVesselStub[];
  name: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  phone: string | null;
  email: string | null;
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/** jtf MissingOrStringCell: value when present, pending "empty" badge when blank. */
const MissingOrStringReplica: Component<{ value: string | null }> = (props) => (
  <Show
    when={props.value !== null && props.value !== ""}
    fallback={<SmStatusBadge variant="pending" label="empty" />}
  >
    <StringCell value={props.value ?? ""} />
  </Show>
);

/** jtf AffectedVesselsCell: up to 3 shown, "+N more" muted, full list on hover. */
const AffectedVesselsReplica: Component<{ vessels: AffectedVesselStub[] }> = (props) => {
  const format = (v: AffectedVesselStub) => `${v.vessel_name} (${v.asset_id})`;
  const shown = () => props.vessels.slice(0, 3).map(format).join(", ");
  const extra = () => Math.max(0, props.vessels.length - 3);
  const full = () => props.vessels.map(format).join(", ");
  return (
    <Tooltip content={full()} openDelay={1000} class="sui-tooltip__trigger--cell">
      <InlineText>
        {shown()}
        <Show when={extra() > 0}>
          <InlineText color="var(--sui-text-muted)">{` +${extra()} more`}</InlineText>
        </Show>
      </InlineText>
    </Tooltip>
  );
};

const MISSING_INFO_ROWS: MissingInfoRowStub[] = [
  {
    operator_kind: "AGENT",
    vessel_call_count: 4,
    affected_vessels: [
      { vessel_name: "Ever Steadfast", asset_id: "AMECS-011" },
      { vessel_name: "Pacific Meridian", asset_id: "AMECS-014" },
      { vessel_name: "Coral Dawn", asset_id: "AMECS-007" },
      { vessel_name: "Iron Halcyon", asset_id: "AMECS-021" },
    ],
    name: "Harbor Point Shipping LLC",
    street: null,
    city: "Long Beach",
    state: "CA",
    postal_code: null,
    phone: null,
    email: "ops@harborpoint.example.com",
  },
  {
    operator_kind: "OPERATOR",
    vessel_call_count: 2,
    affected_vessels: [
      { vessel_name: "Golden Tern", asset_id: "AMECS-003" },
      { vessel_name: "Ever Steadfast", asset_id: "AMECS-011" },
    ],
    name: "Meridian Marine Services",
    street: "1200 Pier D Ave",
    city: null,
    state: null,
    postal_code: "90802",
    phone: "562-555-0114",
    email: null,
  },
  {
    operator_kind: "AGENT",
    vessel_call_count: 1,
    affected_vessels: [{ vessel_name: "Coral Dawn", asset_id: "AMECS-007" }],
    name: null,
    street: null,
    city: null,
    state: null,
    postal_code: null,
    phone: null,
    email: null,
  },
  {
    operator_kind: "OPERATOR",
    vessel_call_count: 3,
    affected_vessels: [
      { vessel_name: "Iron Halcyon", asset_id: "AMECS-021" },
      { vessel_name: "Pacific Meridian", asset_id: "AMECS-014" },
      { vessel_name: "Golden Tern", asset_id: "AMECS-003" },
    ],
    name: "Bayside Agency Group",
    street: "410 Water St Ste 300",
    city: "Oakland",
    state: "CA",
    postal_code: "94607",
    phone: null,
    email: "compliance@bayside.example.com",
  },
];

const MISSING_INFO_COLUMNS: TableColumn<MissingInfoRowStub>[] = [
  {
    id: "operator_kind",
    header: "Operator",
    accessor: (row) => <SmStatusBadge variant="info" label={capitalize(row.operator_kind)} />,
  },
  {
    id: "vessel_call_count",
    header: "Affects",
    accessor: (row) => <IntCell value={row.vessel_call_count} />,
  },
  {
    id: "affected_vessels",
    header: "Vessels",
    accessor: (row) => <AffectedVesselsReplica vessels={row.affected_vessels} />,
  },
  { id: "name", header: "Name", accessor: (row) => <MissingOrStringReplica value={row.name} /> },
  { id: "street", header: "Street", accessor: (row) => <MissingOrStringReplica value={row.street} /> },
  { id: "city", header: "City", accessor: (row) => <MissingOrStringReplica value={row.city} /> },
  { id: "state", header: "State", accessor: (row) => <MissingOrStringReplica value={row.state} /> },
  {
    id: "postal_code",
    header: "Postal",
    accessor: (row) => <MissingOrStringReplica value={row.postal_code} />,
  },
  { id: "phone", header: "Phone", accessor: (row) => <MissingOrStringReplica value={row.phone} /> },
  { id: "email", header: "Email", accessor: (row) => <MissingOrStringReplica value={row.email} /> },
];

const MissingInfoReplica: Component = () => (
  <BaseTable data={MISSING_INFO_ROWS} columns={MISSING_INFO_COLUMNS} />
);

// ============================================
// 11. Violations Preview (RAW)
// ViolationsPreview.tsx: FilterableTable, 12 sortable columns, VesselName
// link cell, AccentRouteLink-wrapped connected date, threshold-colored
// ChosenResult cells, preformatted duration strings, violation badge.
// ============================================

interface ViolationRowStub {
  vessel_name: string;
  asset_id: string;
  connected_at: string;
  duration: string;
  ce_level: number;
  nox_ppm: number;
  mso_f2_avg: number;
  aux_engine_kw: number | null;
  fid_thc: number;
  chosen_nox_g_kwh: number;
  chosen_nox_ce: number;
  nox_worst_g_kwh: number;
  chosen_rog_g_kwh: number;
  chosen_rog_ce: number;
  rog_worst_g_kwh: number;
  violation_type: string;
}

const VIOLATION_NOX_THRESHOLD = 2.8;
const VIOLATION_ROG_THRESHOLD = 0.14;

function violationLabel(violationType: string): string {
  switch (violationType) {
    case "nox":
      return "NOx";
    case "rog":
      return "ROG";
    case "both":
      return "Both";
    default:
      return violationType;
  }
}

/** jtf ChosenResultCell: chosen g/kWh colored by compliance, worst-case in
 *  red parens only when the chosen value is compliant but the worst is not. */
const ChosenResultReplica: Component<{
  chosenGKwh: number;
  chosenCe: number;
  worstGKwh: number;
  threshold: number;
}> = (props) => {
  const isCompliant = () => props.chosenGKwh <= props.threshold;
  const showWorst = () => isCompliant() && props.worstGKwh > props.threshold;
  const cePct = () => Math.round(props.chosenCe * 100);
  return (
    <TightClusterRow>
      <Show
        when={isCompliant()}
        fallback={
          <TextValueDangerSm>
            {formatGPerKwh(props.chosenGKwh)} @{cePct()}
          </TextValueDangerSm>
        }
      >
        <TextValueSuccessSm>
          {formatGPerKwh(props.chosenGKwh)} @{cePct()}
        </TextValueSuccessSm>
      </Show>
      <Show when={showWorst()}>
        <TextValueDangerSm>({formatGPerKwh(props.worstGKwh)} @90)</TextValueDangerSm>
      </Show>
    </TightClusterRow>
  );
};

/** jtf EngineKwCell: null → the worst-case default 300 rendered dimmed. */
const EngineKwReplica: Component<{ value: number | null }> = (props) => (
  <Show when={props.value !== null} fallback={<TextSublabel>300</TextSublabel>}>
    <FloatCell value={props.value as number} precision={1} />
  </Show>
);

const VIOLATION_ROWS: ViolationRowStub[] = [
  {
    vessel_name: "Ever Steadfast",
    asset_id: "AMECS-011",
    connected_at: "2026-06-03T14:22:00Z",
    duration: "34h 12m",
    ce_level: 0.9,
    nox_ppm: 41.83,
    mso_f2_avg: 1962.4,
    aux_engine_kw: 927.5,
    fid_thc: 46.21,
    chosen_nox_g_kwh: 3.12,
    chosen_nox_ce: 0.9,
    nox_worst_g_kwh: 3.12,
    chosen_rog_g_kwh: 0.09,
    chosen_rog_ce: 0.95,
    rog_worst_g_kwh: 0.17,
    violation_type: "nox",
  },
  {
    vessel_name: "Pacific Meridian",
    asset_id: "AMECS-014",
    connected_at: "2026-06-05T02:47:00Z",
    duration: "21h 05m",
    ce_level: 0.85,
    nox_ppm: 38.09,
    mso_f2_avg: 2051.8,
    aux_engine_kw: null,
    fid_thc: 51.44,
    chosen_nox_g_kwh: 2.43,
    chosen_nox_ce: 0.92,
    nox_worst_g_kwh: 3.04,
    chosen_rog_g_kwh: 0.19,
    chosen_rog_ce: 0.9,
    rog_worst_g_kwh: 0.19,
    violation_type: "rog",
  },
  {
    vessel_name: "Coral Dawn",
    asset_id: "AMECS-007",
    connected_at: "2026-06-08T19:10:00Z",
    duration: "42h 38m",
    ce_level: 0.9,
    nox_ppm: 44.57,
    mso_f2_avg: 1899.2,
    aux_engine_kw: 814.0,
    fid_thc: 58.02,
    chosen_nox_g_kwh: 3.35,
    chosen_nox_ce: 0.9,
    nox_worst_g_kwh: 3.35,
    chosen_rog_g_kwh: 0.21,
    chosen_rog_ce: 0.9,
    rog_worst_g_kwh: 0.21,
    violation_type: "both",
  },
  {
    vessel_name: "Iron Halcyon",
    asset_id: "AMECS-021",
    connected_at: "2026-06-11T07:55:00Z",
    duration: "in progress",
    ce_level: 0.8,
    nox_ppm: 39.66,
    mso_f2_avg: 2010.7,
    aux_engine_kw: null,
    fid_thc: 44.87,
    chosen_nox_g_kwh: 2.96,
    chosen_nox_ce: 0.9,
    nox_worst_g_kwh: 2.96,
    chosen_rog_g_kwh: 0.11,
    chosen_rog_ce: 0.93,
    rog_worst_g_kwh: 0.16,
    violation_type: "nox",
  },
  {
    vessel_name: "Golden Tern",
    asset_id: "AMECS-003",
    connected_at: "2026-06-12T11:31:00Z",
    duration: "18h 44m",
    ce_level: 0.95,
    nox_ppm: 36.12,
    mso_f2_avg: 2087.3,
    aux_engine_kw: 1054.2,
    fid_thc: 49.75,
    chosen_nox_g_kwh: 2.51,
    chosen_nox_ce: 0.95,
    nox_worst_g_kwh: 3.18,
    chosen_rog_g_kwh: 0.18,
    chosen_rog_ce: 0.9,
    rog_worst_g_kwh: 0.18,
    violation_type: "rog",
  },
];

const VIOLATION_COLUMNS: TableColumn<ViolationRowStub>[] = [
  {
    id: "vessel_name",
    header: "Vessel",
    sortable: true,
    // jtf: VesselName entity-link cell — replicated as an accent-colored name.
    accessor: (r) => <InlineText color="var(--sui-accent)">{r.vessel_name}</InlineText>,
  },
  {
    id: "asset_id",
    header: "Asset",
    sortable: true,
    accessor: (r) => <StringCell value={r.asset_id} />,
  },
  {
    id: "connected_at",
    header: "Connected",
    sortable: true,
    // jtf: AccentRouteLink to the vessel-call detail page.
    accessor: (r) => (
      <InlineText color="var(--sui-accent)">
        <DateTimeCell value={r.connected_at} />
      </InlineText>
    ),
  },
  {
    id: "duration",
    header: "Duration",
    sortable: true,
    align: "right",
    accessor: (r) => <StringCell value={r.duration} />,
  },
  {
    id: "ce_level",
    header: "CE",
    sortable: true,
    align: "right",
    accessor: (r) => <FloatCell value={r.ce_level} precision={2} />,
  },
  {
    id: "nox_ppm",
    header: "NOx ppm",
    sortable: true,
    align: "right",
    accessor: (r) => <FloatCell value={r.nox_ppm} precision={2} />,
  },
  {
    id: "mso_f2_avg",
    header: "MSO_F2",
    sortable: true,
    align: "right",
    accessor: (r) => <FloatCell value={r.mso_f2_avg} precision={1} />,
  },
  {
    id: "engine_kw",
    header: "Engine kW",
    sortable: true,
    align: "right",
    accessor: (r) => <EngineKwReplica value={r.aux_engine_kw} />,
  },
  {
    id: "fid_thc",
    header: "FID_THC",
    sortable: true,
    align: "right",
    accessor: (r) => <FloatCell value={r.fid_thc} precision={2} />,
  },
  {
    id: "chosen_nox",
    header: "NOx (g/kWh) @ CE",
    sortable: true,
    align: "right",
    accessor: (r) => (
      <ChosenResultReplica
        chosenGKwh={r.chosen_nox_g_kwh}
        chosenCe={r.chosen_nox_ce}
        worstGKwh={r.nox_worst_g_kwh}
        threshold={VIOLATION_NOX_THRESHOLD}
      />
    ),
  },
  {
    id: "chosen_rog",
    header: "ROG (g/kWh) @ CE",
    sortable: true,
    align: "right",
    accessor: (r) => (
      <ChosenResultReplica
        chosenGKwh={r.chosen_rog_g_kwh}
        chosenCe={r.chosen_rog_ce}
        worstGKwh={r.rog_worst_g_kwh}
        threshold={VIOLATION_ROG_THRESHOLD}
      />
    ),
  },
  {
    id: "violation_type",
    header: "Violation",
    sortable: true,
    accessor: (r) => (
      <SmStatusBadge variant="violation" label={violationLabel(r.violation_type)} />
    ),
  },
];

// jtf renders with `fill` inside a FillColumnFlush chain; the bench pane has
// no fill chain, so the replica caps height instead (same scroll behavior).
const ViolationsReplica: Component = () => (
  <FilterableTable
    data={VIOLATION_ROWS}
    columns={VIOLATION_COLUMNS}
    stickyHeader
    compact
    hoverable
    maxHeight="320px"
    filterPlaceholder="Filter violations…"
    emptyMessage="No violations match the filter"
  />
);

// ============================================
// ENTRIES
// ============================================

export const ENTRIES: TableEntry[] = [
  minuteEntry("Minute detail — FTIR.I (FTIR Inlet)", FTIR_INLET_COLS),
  minuteEntry("Minute detail — FTIR.O (FTIR Outlet)", FTIR_OUTLET_COLS),
  minuteEntry("Minute detail — SCR", SCR_COLS),
  minuteEntry("Minute detail — FID", FID_COLS),
  minuteEntry("Minute detail — DP", DP_COLS),
  minuteEntry("Minute detail — MSI", MSI_COLS),
  minuteEntry("Minute detail — MSO", MSO_COLS),
  {
    route: FORTNIGHT_ROUTE,
    name: "Power Log OCR Results",
    status: "raw",
    note: "raw: dynamic aux column count + runtime-computed total header (kW/train vs Total kW) — both workable via runtime-built specs; the colored total is avgCol now (ruled 2026-07-18)",
    component: PowerLogOcrReplica,
  },
  {
    route: FORTNIGHT_ROUTE,
    name: "Compliance Threshold Matrix",
    status: "sui",
    note: "ValueMatrix wrapper (migrated 2026-07-17)",
    component: ComplianceThresholdReplica,
  },
  {
    route: FORTNIGHT_ROUTE,
    name: "Missing Info Preview",
    status: "raw",
    note: "raw: StatusBadge + AffectedVessels custom cells, MissingOrString empty-badge fallbacks",
    component: MissingInfoReplica,
  },
  {
    route: FORTNIGHT_ROUTE,
    name: "Violations Preview",
    status: "raw",
    note: "raw: FilterableTable with 12 sortable cols, VesselName link cell, threshold-colored ChosenResult cells, string durations",
    component: ViolationsReplica,
  },
];
