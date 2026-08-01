// CensusView model — normalized census types + pure bucketing.
// Per-source adapters (adaptNetSuite, adaptAcumatica, etc.) stay in rhinotools;
// SUI ships the normalized types + view only.

export interface CensusColumn { name: string; type: string }

export type NormStatus =
  | "doing" | "todo" | "pending" | "done"
  | "partial" | "missing" | "overfetch" | "short"
  | "empty" | "skipped" | "noaccess" | "error";

export interface CensusTable {
  key: string;                 // stable unique id
  entity: string;              // display name
  subtitle?: string | null;
  version?: string | null;
  fieldCount: number | null;
  fieldCountByType?: Record<string, number> | null;
  sourceRows: number | null;   // source-of-truth count
  localRows: number | null;    // landed locally
  targetRows?: number | null;
  status: NormStatus;
  rawStatus?: string | null;
  truncated?: boolean | null;
  approx?: boolean | null;
  note?: string | null;
  error?: string | null;
  columns?: CensusColumn[] | null;
  keyLabel?: string | null;
  keyTitle?: string | null;
  pkColumns?: string[] | null;
  detail?: import("solid-js").JSX.Element | null;
}

export type CensusBucketId =
  | "single" | "lt100" | "lt100k" | "lt1m" | "gte1m"
  | "deep" | "empty" | "noaccess";

export const CENSUS_BUCKETS: { id: CensusBucketId; label: string; hint: string }[] = [
  { id: "single",   label: "Single row",  hint: "exactly 1 record" },
  { id: "lt100",    label: "< 100 rows",  hint: "small operational / lookup" },
  { id: "lt100k",   label: "< 100k rows", hint: "" },
  { id: "lt1m",     label: "< 1M rows",   hint: "" },
  { id: "gte1m",    label: "≥ 1M rows",   hint: "" },
  { id: "deep",     label: "Uncounted",   hint: "row count unknown / truncated" },
  { id: "empty",    label: "Empty",       hint: "counted at 0 — nothing to export" },
  { id: "noaccess", label: "No access",   hint: "error / uncountable — row count unknown" },
];

/** Pure bucketing: status buckets win over size buckets. */
export function bucketOf(t: CensusTable): CensusBucketId {
  if (t.status === "noaccess" || t.status === "error") return "noaccess";
  if (t.status === "empty" || t.sourceRows === 0) return "empty";
  if (t.sourceRows == null || t.truncated) return "deep";
  if (t.sourceRows === 1) return "single";
  if (t.sourceRows < 100) return "lt100";
  if (t.sourceRows < 100_000) return "lt100k";
  if (t.sourceRows < 1_000_000) return "lt1m";
  return "gte1m";
}

export interface CensusViewProps {
  tables: CensusTable[];
  /** Row-click target for the sticky detail panel; controlled selection optional. */
  onSelect?: (t: CensusTable | null) => void;
  selectedKey?: string | null;
  /** Source-specific actions rendered at the detail panel foot. */
  actions?: (t: CensusTable) => import("solid-js").JSX.Element | null;
  /** Max height for each bucket table; taller buckets scroll under the sticky header. */
  tableMaxHeight?: string;
  /**
   * When set, buckets flow into a responsive grid (CSS `auto-fill` / `minmax`)
   * instead of a single vertical column — e.g. `"360px"` yields 2–3 columns
   * depending on viewport width. Omit for the classic single-column stack.
   */
  bucketMinWidth?: string;
}
