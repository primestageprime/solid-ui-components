// JTF Table Catalog — fortnight report tables.
// Faithful replicas of every table rendered by the fortnight report flow
// (jtf-ui src/components/fortnight/* + ComplianceThresholdTable), with
// deterministic stub data. Status tags per the migration worklist:
//   sui — FieldTable/fields registries or ValueMatrix (call sites own no CSS)
//   raw — BaseTable/FilterableTable with call-site geometry/color
import { Show, type Component, type JSX } from "solid-js";
import { TableQuickFilter, FloatCell } from "../../../../src/components/Table";
import * as fields from "../../../../src/components/Table/fields";
import {
  FieldTable,
  SortableFieldTable,
  type FieldCol,
} from "../../../../src/components/Table/fields";
import { ValueMatrix } from "../../../../src/components/ValueMatrix";
import { TextSublabel } from "../../../../src/components/Text";
import { TightStack, TightClusterRow } from "../../../../src/components/Layout";
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
// 8. Power Log OCR Results (SUI — migrated 2026-07-18)
// FortnightReportBody.tsx: FieldTable with runtime-built specs — the aux
// column list comes from per-page data, the total header switches on train
// count at spec build, and the derived total wears the accent tone via
// toneWrap. The CyanValue hardcoded-hex local died with the migration.
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

const OCR_FIELDS = [
  fields.col<OcrRow>("time", "Time", (r) => r.time, "dateTime"),
  ...OCR_AUX_COLS.map((c) =>
    fields.col<OcrRow>(c, c, (r) => <FloatCell value={r[c]} precision={0} />, "float"),
  ),
  fields.col<OcrRow>(
    "total",
    OCR_NUM_TRAINS > 1 ? "kW/train" : "Total kW",
    (r) => fields.toneWrap("accent", <FloatCell value={r.total} precision={0} />),
    "float",
  ),
];

const PowerLogOcrReplica: Component = () => (
  <TightStack>
    <TextSublabel>
      Page 1: Ever Steadfast 06/07/2026 — 928 kW avg from 6 hours
    </TextSublabel>
    <FieldTable data={OCR_ROWS} fields={OCR_FIELDS} registry={{}} maxRows={5} />
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
// 10. Missing Info Preview (SUI — migrated 2026-07-18)
// MissingInfoPreview.tsx: FieldTable — statusCol's valid-value mapping for
// the operator badge, listCol (item formatter, +N more, tooltip) for the
// vessels, textCol for the contact fields. Missing values render blank per
// the no-empty-markers ruling (the MissingOrString EMPTY badges are gone).
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

const MISSING_INFO_ROWS: MissingInfoRowStub[] = [
  {
    operator_kind: "agent",
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
    operator_kind: "operator",
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
    operator_kind: "agent",
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
    operator_kind: "operator",
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

const MISSING_INFO_REGISTRY = {
  operator_kind: fields.statusCol<MissingInfoRowStub>(
    "operator_kind",
    {
      operator: { label: "Operator", tone: "accent" },
      agent: { label: "Agent", tone: "accent" },
    },
    { header: "Operator" },
  ),
  vessel_call_count: fields.col<MissingInfoRowStub>(
    "vessel_call_count",
    "Affects",
    (row) => String(row.vessel_call_count),
    "int",
  ),
  affected_vessels: fields.listCol<MissingInfoRowStub, AffectedVesselStub>(
    "affected_vessels",
    { header: "Vessels", item: (v) => `${v.vessel_name} (${v.asset_id})` },
  ),
  name: fields.textCol<MissingInfoRowStub>("name"),
  street: fields.textCol<MissingInfoRowStub>("street"),
  city: fields.textCol<MissingInfoRowStub>("city"),
  state: fields.textCol<MissingInfoRowStub>("state"),
  postal_code: fields.textCol<MissingInfoRowStub>("postal_code"),
  phone: fields.textCol<MissingInfoRowStub>("phone"),
  email: fields.textCol<MissingInfoRowStub>("email"),
};

const MissingInfoReplica: Component = () => (
  <FieldTable
    data={MISSING_INFO_ROWS}
    fields={[
      "operator_kind",
      "vessel_call_count",
      "affected_vessels",
      "name",
      "street",
      "city",
      "state",
      "postal_code",
      "phone",
      "email",
    ]}
    registry={MISSING_INFO_REGISTRY}
  />
);

// ============================================
// 11. Violations Preview (SUI)
// ViolationsPreview.tsx (migrated 2026-07-18): SortableFieldTable inside the
// composable TableQuickFilter. Vessel name is an identityLinkCol (glyph +
// detail-page link); compliance is decided in the DATA layer — the chosen-
// result cells never see a threshold, they wear success/danger tones off a
// compliant flag; violation badges via statusCol; duration sorts on minutes
// through col()'s sortValue.
// ============================================

interface ViolationRowStub {
  vessel_call_id: string;
  vessel_type: string;
  vessel_name: string;
  asset_id: string;
  connected_at: string;
  duration: string;
  duration_min: number | null;
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

// -- Data layer (mirrors jtf, ruled 2026-07-18): compliance is decided here,
//    never in a cell. The worst-case value is carried only when it tells a
//    story — chosen compliant, worst over the line.
interface EmissionDisplay {
  compliant: boolean;
  worst_g_kwh: number | null;
}

function emissionDisplay(
  chosen: number,
  worst: number,
  threshold: number,
): EmissionDisplay {
  const compliant = chosen <= threshold;
  return {
    compliant,
    worst_g_kwh: compliant && worst > threshold ? worst : null,
  };
}

interface ViolationDisplayStub extends ViolationRowStub {
  nox_compliant: boolean;
  nox_worst_display: number | null;
  rog_compliant: boolean;
  rog_worst_display: number | null;
}

function withCompliance(row: ViolationRowStub): ViolationDisplayStub {
  const nox = emissionDisplay(
    row.chosen_nox_g_kwh,
    row.nox_worst_g_kwh,
    VIOLATION_NOX_THRESHOLD,
  );
  const rog = emissionDisplay(
    row.chosen_rog_g_kwh,
    row.rog_worst_g_kwh,
    VIOLATION_ROG_THRESHOLD,
  );
  return {
    ...row,
    nox_compliant: nox.compliant,
    nox_worst_display: nox.worst_g_kwh,
    rog_compliant: rog.compliant,
    rog_worst_display: rog.worst_g_kwh,
  };
}

/** Pure presentation: value @ CE toned by the data-layer compliance flag,
 *  pre-decided worst case in danger parens. */
const ResultCellReplica: Component<{
  g_kwh: number;
  ce: number;
  compliant: boolean;
  worst_g_kwh: number | null;
}> = (props) => (
  <TightClusterRow>
    {fields.toneWrap(
      props.compliant ? "success" : "danger",
      <>
        {formatGPerKwh(props.g_kwh)} @{Math.round(props.ce * 100)}
      </>,
    )}
    <Show when={props.worst_g_kwh != null}>
      {fields.toneWrap(
        "danger",
        <>({formatGPerKwh(props.worst_g_kwh as number)} @90)</>,
      )}
    </Show>
  </TightClusterRow>
);

/** jtf EngineKwCell: null → the worst-case default 300, rendered muted. */
function renderEngineKw(row: ViolationDisplayStub): JSX.Element {
  if (row.aux_engine_kw == null) return fields.toneWrap("muted", "300");
  return <FloatCell value={row.aux_engine_kw} precision={1} />;
}

/** jtf VesselTypeIcon stands in as a type glyph at configure time. */
const VESSEL_GLYPHS: Record<string, string> = {
  container: "▣",
  tanker: "◍",
  reefer: "❄",
};

function vesselGlyph(row: ViolationDisplayStub): JSX.Element {
  return <span title={row.vessel_type}>{VESSEL_GLYPHS[row.vessel_type] ?? "▢"}</span>;
}

const VIOLATION_ROWS: ViolationRowStub[] = [
  {
    vessel_call_id: "vc-3101",
    vessel_type: "container",
    vessel_name: "Ever Steadfast",
    asset_id: "AMECS-011",
    connected_at: "2026-06-03T14:22:00Z",
    duration: "34h 12m",
    duration_min: 2052,
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
    vessel_call_id: "vc-3107",
    vessel_type: "tanker",
    vessel_name: "Pacific Meridian",
    asset_id: "AMECS-014",
    connected_at: "2026-06-05T02:47:00Z",
    duration: "21h 05m",
    duration_min: 1265,
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
    vessel_call_id: "vc-3112",
    vessel_type: "container",
    vessel_name: "Coral Dawn",
    asset_id: "AMECS-007",
    connected_at: "2026-06-08T19:10:00Z",
    duration: "42h 38m",
    duration_min: 2558,
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
    vessel_call_id: "vc-3118",
    vessel_type: "reefer",
    vessel_name: "Iron Halcyon",
    asset_id: "AMECS-021",
    connected_at: "2026-06-11T07:55:00Z",
    duration: "in progress",
    duration_min: null,
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
    vessel_call_id: "vc-3121",
    vessel_type: "tanker",
    vessel_name: "Golden Tern",
    asset_id: "AMECS-003",
    connected_at: "2026-06-12T11:31:00Z",
    duration: "18h 44m",
    duration_min: 1124,
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

const VIOLATION_BADGES: Record<string, fields.StatusColMapping> = {
  nox: { label: "NOx", tone: "danger" },
  rog: { label: "ROG", tone: "danger" },
  both: { label: "Both", tone: "danger" },
};

const VIOLATION_REGISTRY: Record<string, FieldCol<ViolationDisplayStub>> = {
  vessel_name: fields.identityLinkCol<ViolationDisplayStub>("vessel_name", {
    header: "Vessel",
    href: (r) => `#/detail/${r.vessel_call_id}`,
    glyph: vesselGlyph,
  }),
  asset_id: fields.textCol<ViolationDisplayStub>("asset_id"),
  connected_at: fields.dateTimeCol<ViolationDisplayStub>("connected_at"),
  duration: fields.col<ViolationDisplayStub>(
    "duration",
    "Duration",
    (r) => r.duration,
    "duration",
    (r) => r.duration_min,
  ),
  ce_level: fields.floatCol<ViolationDisplayStub>("ce_level"),
  nox_ppm: fields.floatCol<ViolationDisplayStub>("nox_ppm"),
  mso_f2_avg: fields.floatCol<ViolationDisplayStub>("mso_f2_avg", { precision: 1 }),
  engine_kw: fields.col<ViolationDisplayStub>(
    "engine_kw",
    "Engine kW",
    renderEngineKw,
    "float",
    (r) => r.aux_engine_kw ?? 300,
  ),
  fid_thc: fields.floatCol<ViolationDisplayStub>("fid_thc"),
  chosen_nox: fields.col<ViolationDisplayStub>(
    "chosen_nox",
    "NOx (g/kWh) @ CE",
    (r) => (
      <ResultCellReplica
        g_kwh={r.chosen_nox_g_kwh}
        ce={r.chosen_nox_ce}
        compliant={r.nox_compliant}
        worst_g_kwh={r.nox_worst_display}
      />
    ),
    "text",
    (r) => r.chosen_nox_g_kwh,
  ),
  chosen_rog: fields.col<ViolationDisplayStub>(
    "chosen_rog",
    "ROG (g/kWh) @ CE",
    (r) => (
      <ResultCellReplica
        g_kwh={r.chosen_rog_g_kwh}
        ce={r.chosen_rog_ce}
        compliant={r.rog_compliant}
        worst_g_kwh={r.rog_worst_display}
      />
    ),
    "text",
    (r) => r.chosen_rog_g_kwh,
  ),
  violation_type: fields.statusCol<ViolationDisplayStub>(
    "violation_type",
    VIOLATION_BADGES,
    { header: "Violation" },
  ),
};

const VIOLATION_FIELD_ORDER: string[] = [
  "vessel_name",
  "asset_id",
  "connected_at",
  "duration",
  "ce_level",
  "nox_ppm",
  "mso_f2_avg",
  "engine_kw",
  "fid_thc",
  "chosen_nox",
  "chosen_rog",
  "violation_type",
];

const VIOLATION_DISPLAY_ROWS: ViolationDisplayStub[] =
  VIOLATION_ROWS.map(withCompliance);

// jtf renders with `fill` inside a FillColumnFlush chain; the bench pane has
// no fill chain, so the replica caps rows instead (same scroll behavior).
const ViolationsReplica: Component = () => (
  <TableQuickFilter data={VIOLATION_DISPLAY_ROWS} placeholder="Filter violations…">
    {(filtered) => (
      <SortableFieldTable
        data={filtered()}
        fields={VIOLATION_FIELD_ORDER}
        registry={VIOLATION_REGISTRY}
        maxRows={8}
        emptyMessage="No violations match the filter"
      />
    )}
  </TableQuickFilter>
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
    status: "sui",
    note: "FieldTable with runtime-built specs (migrated 2026-07-18): per-page aux columns, header computed at spec build, accent-toned derived total",
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
    status: "sui",
    note: "statusCol mapping + listCol + textCol registries (migrated 2026-07-18); missing values render blank",
    component: MissingInfoReplica,
  },
  {
    route: FORTNIGHT_ROUTE,
    name: "Violations Preview",
    status: "sui",
    note: "SortableFieldTable + TableQuickFilter (migrated 2026-07-18): identityLinkCol vessel, data-layer compliance tones, statusCol badges, sortValue durations",
    component: ViolationsReplica,
  },
];
