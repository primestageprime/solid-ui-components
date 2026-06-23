// lastReviewedAt: 2026-06-17
// lastReviewedBy: peter.stradinger
// ============================================
// ExtractionBoard — public types.
//
// PURE TYPES (one type-only import of the progress engine's BatchState — also
// pure logic, no Solid/DOM). These describe the CONFIG the
// client bakes in once and the per-table data store the client feeds in
// reactively. There is NO simulation here — the board derives its swimlane
// view (Summary / Done / Doing / Todo / +N) purely from `tables`.
// ============================================
import type { IconName } from "../Icon/Icon";
import type { BatchState } from "../../internal/progress/engine";

/** A table's lifecycle status, supplied by the caller's data store. */
export type TableStatus = "todo" | "doing" | "done" | "skipped";

/** Derived swimlane status, computed by the board from its tables' statuses.
 *  Monotonic by completed-table count: none done → pending, some → active,
 *  all → complete. Drives both the Summary badge and the lane sort. */
export type CategoryStatus = "complete" | "active" | "pending";

/** A category (swimlane) the board renders. Order = default swimlane order. */
export interface CategoryConfig {
  id: string;
  label: string;
  /** Optional hover description (tooltip on the summary card title). */
  description?: string;
}

/** A column data-type the board tallies + iconifies on every card. */
export interface DataTypeConfig {
  id: string;
  label: string;
  icon: IconName;
}

/** Per-column header labels (defaults: Summary / Done / Doing / Todo). */
export interface ColumnLabels {
  summary?: string;
  done?: string;
  doing?: string;
  todo?: string;
}

/** Motion timings (ms). All optional — sensible defaults are baked in. */
export interface BoardTiming {
  /** Slurp: a folded Done card flying into the Summary anchor. Default 600. */
  slurpMs?: number;
  /** Slide: a card moving columns. Default 400. */
  moveMs?: number;
  /** Enter: a new card growing out of the lozenge. Default 600. */
  enterMs?: number;
  /** Debounce before swimlanes re-sort by status. Default 5000. */
  resortMs?: number;
}

/** The static, baked-once configuration for a board. */
export interface ExtractionBoardConfig {
  /** Categories (swimlanes). The order here is the default swimlane order
   *  and the tiebreaker once lanes sort by status. */
  categories: CategoryConfig[];
  /** Column data-types — the per-card "icon over count" stats + the summary
   *  aggregate. Card `colsByType` keys must be a subset of these ids. */
  dataTypes: DataTypeConfig[];
  /** Column header labels. */
  columns?: ColumnLabels;
  /** Tables with `totalRows` above this render a multi-batch BatchBar (from
   *  `batches`) instead of a single fill bar. Default 10_000. */
  multiBatchAbove?: number;
  /** Motion timings. */
  timing?: BoardTiming;
}

/** The discrete lifecycle state of one batch. NO fractions — the board
 *  observes the lifecycle and eases the fill itself. (Alias of the engine's
 *  `BatchState`, surfaced here for the board's public table type.) */
export type BatchProgressState = BatchState;

/** One batch of a large (multi-batch) table. DECLARATIVE — the caller emits
 *  only `rows` + a discrete `state`; the board measures durations, learns an
 *  estimate, and animates the in-flight fill internally. This is the same shape
 *  as BatchBar's `BatchSpec`. */
export interface TableBatch {
  rows: number;
  state: BatchProgressState;
}

/** One source table — the reactive unit the caller feeds the board. The
 *  board reads these every render and derives the entire swimlane view. */
export interface BoardTable {
  name: string;
  /** Must match a `CategoryConfig.id`. Tables in unknown categories are
   *  ignored. */
  category: string;
  status: TableStatus;
  totalRows: number;
  /** Rows already COMMITTED (jumps on batch/table completion) — NOT an
   *  interpolated value. The board animates the in-flight portion itself. */
  transferredRows: number;
  /** Column counts keyed by `DataTypeConfig.id`. Missing keys read as 0. */
  colsByType: Record<string, number>;
  /** Discrete per-batch states for tables above `multiBatchAbove`. Optional —
   *  a small (single-fill) table omits this and the board treats the whole
   *  table as one batch driven by `status` doing → done. NO fractions. */
  batches?: TableBatch[];
}

// ---------------------------------------------------------------------------
// Derived view shapes (internal-ish, but exported for typing the cards).
// ---------------------------------------------------------------------------

/** The Summary aggregate the board computes per category. */
export interface CategorySummary {
  category: string;
  label: string;
  description?: string;
  /** Aggregate column counts across every table in the category. */
  colsByType: Record<string, number>;
  completedTables: number;
  totalTables: number;
  completedRows: number;
  totalRows: number;
  status: CategoryStatus;
}

/** The latest resolved (done or skipped) table in a category. */
export interface DoneItem {
  name: string;
  category: string;
  colsByType: Record<string, number>;
  totalRows: number;
  /** True for an empty/skipped source — shown SKIPPED, not Done. */
  skipped: boolean;
}

/** One table currently being extracted. */
export interface DoingItem {
  name: string;
  category: string;
  colsByType: Record<string, number>;
  totalRows: number;
  transferredRows: number;
  /** Present iff the table is above `multiBatchAbove` and supplied `batches`. */
  batches?: TableBatch[];
}

/** The next queued table in a category. */
export interface TodoItem {
  name: string;
  category: string;
  colsByType: Record<string, number>;
  totalRows: number;
}
