import type { JSX, Accessor, Setter } from "solid-js";

/**
 * Constraint for a table row. `object` admits any object shape — including
 * interface-typed rows, which (unlike `Record<string, unknown>`) carry no
 * implicit index signature and so would be rejected by a `Record` constraint.
 * This is the `any`-free replacement for the old `Record<string, any>` bound.
 */
export type TableRow = object;

export interface TableColumn<T> {
  id: string;
  /** Header content — plain text or any JSX (e.g. a select-all checkbox). Rendered directly by every table renderer. */
  header: string | JSX.Element;
  accessor: keyof T | ((row: T) => JSX.Element | string | number);
  width?: string;
  /** Column floor under auto layout (the width-model min; width is the max). */
  minWidth?: string;
  /** Wrap the cell content in a size-contained clip block, so long nowrap
   *  content cannot inflate the column's minimum past `minWidth` — required
   *  for a variable column to shrink between its bounds (ruled 2026-07-21). */
  contained?: boolean;
  align?: "left" | "center" | "right";
  /**
   * Clip overflowing content with an ellipsis even when no fixed `width` is set —
   * for the flexible column in a `fixedLayout` table (e.g. a name column that
   * takes the remaining space and truncates long values).
   */
  ellipsis?: boolean;
  sortable?: boolean;
  /**
   * Raw value used for sorting when `accessor` returns JSX (a rendered cell
   * carries no comparable value). When present, the sort comparator reads this
   * instead of the accessor. Nullish results sort last in either direction.
   */
  sortValue?: (row: T) => string | number | null | undefined;
  /** Group label for column grouping — columns sharing the same group string are merged under a colspan header */
  group?: string;
}

export interface BaseTableProps<T>
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  data: T[];
  columns: TableColumn<T>[];
  maxHeight?: string;
  fill?: boolean;
  stickyHeader?: boolean;
  striped?: boolean;
  hoverable?: boolean;
  compact?: boolean;
  /**
   * Use CSS `table-layout: fixed` — column widths are honored exactly, columns
   * with a `width` stay put, and the one unwidthed column (mark it `ellipsis`)
   * absorbs the remaining space and truncates. Without this, a `nowrap` cell can
   * push the table wider than its container.
   */
  fixedLayout?: boolean;
  /**
   * Shrink-wrap the table to its content width instead of stretching to fill the
   * container (the default `width: 100%`). For tables whose columns are ALL
   * fixed/capped-content (counts, money, dates) — a full-width stretch would
   * leave large dead gaps between columns. `fit` sizes the frame + table to
   * `fit-content` (capped at 100%) and left-aligns it. Mutually exclusive with
   * `fixedLayout` (fixed layout is for one flexing/ellipsized column).
   */
  fit?: boolean;
  getRowClass?: (row: T, index: number) => string;
  onRowClick?: (row: T, index: number) => void;
  /**
   * Row hover callback for cross-highlighting (e.g. a table row ↔ a chart
   * point). Fires with `(row, index)` on row enter and `(null, -1)` when the
   * pointer leaves the table body.
   */
  onRowHover?: (row: T | null, index: number) => void;
  emptyMessage?: string;
  /**
   * Optional per-row trailing action slot. When provided, an extra cell is
   * rendered at the right end of every body row containing `rowActions(row, i)`,
   * plus a matching empty trailing header cell to keep columns aligned.
   *
   * The action cell is hover-revealed (hidden by default, fades in on row hover
   * or keyboard focus-within — see `.hud-table__actions-cell` in Table.css) and
   * stops click propagation so action clicks never trigger `onRowClick`.
   */
  rowActions?: (row: T, rowIndex: number) => JSX.Element;
  /**
   * Optional per-row "tail collapse". For rows where this returns non-null, the
   * columns from `fromColumnId` onward — including the trailing `rowActions`
   * cell, if any — are replaced by a single spanning `<td colspan=…>` holding
   * `content`; columns BEFORE `fromColumnId` render normally. Return `null` (or
   * omit the prop) and the row renders cell-by-cell exactly as before.
   *
   * Use for summary / takeover rows: e.g. a partially-evaluated period that
   * shows a centered "X of Y evaluated" message + a Run button across the stat
   * columns instead of one value per stat cell. If `fromColumnId` doesn't match
   * a column, the row falls back to normal rendering.
   */
  spanRow?: (row: T, rowIndex: number) => TableRowSpan | null;
}

/**
 * A per-row tail-collapse directive returned by `BaseTableProps.spanRow`. The
 * row renders its columns up to (but not including) `fromColumnId` normally,
 * then a single spanning cell carrying `content` for the remaining columns.
 */
export interface TableRowSpan {
  /** Column id from which the remaining cells collapse into one spanning `<td>`. */
  fromColumnId: string;
  /** Content rendered inside the spanning cell (centered by default). */
  content: JSX.Element;
}

/**
 * Selection store interface - can be backed by createSignal (ephemeral)
 * or createStoredSignal/similar (persistent/sticky)
 */
export interface SelectionStore<Id = string> {
  selected: Accessor<Set<Id>>;
  setSelected: Setter<Set<Id>>;
}

export interface SelectionAction<T> {
  label: string;
  icon?: JSX.Element;
  variant?: "default" | "primary" | "danger" | "ghost";
  onClick: (selectedIds: Set<string>, selectedRows: T[]) => void;
}

/**
 * Props `SelectableTable` declares but does not render. Each needs real work in
 * its renderer, not a class toggle, so the interface drops them rather than
 * half-implementing them:
 *
 * - `fixedLayout` / `fit` — the classes are one-liners, but `fixedLayout` is
 *   only meaningful when cells also clip, and SelectableTable's cell style sets
 *   no `overflow`/`text-overflow`/`white-space` from `column.width`/`ellipsis`
 *   (contrast `BaseTable`'s `cellStyle`). Wiring the class alone would truncate
 *   nothing while looking implemented.
 * - `fill` — needs the frame AND the outer column to become flex-fill contexts
 *   (`ClipFillColumnFlush` + `ScrollFillColumn`), and SelectableTable's outer
 *   `Column` also carries the action bar. Structural, and unverifiable under
 *   jsdom, which has no layout.
 * - `spanRow` / `rowActions` — extra cells that must stay aligned with the
 *   checkbox column's colspan.
 * - `onRowHover` — no hover wiring on the body at all.
 *
 * They were silently accepted until 2026-08-04: `SelectableTableProps` extended
 * `BaseTableProps` wholesale while `splitProps` listed only what the renderer
 * read, so the rest landed in `others` and were spread onto the frame `div` —
 * a clean typecheck and no behaviour. Add one back by IMPLEMENTING it and
 * deleting it from this list, never by widening the type alone.
 */
type SelectableTableOmitted =
  | "fill"
  | "fixedLayout"
  | "fit"
  | "spanRow"
  | "rowActions"
  | "onRowHover";

export interface SelectableTableProps<T>
  extends Omit<BaseTableProps<T>, SelectableTableOmitted> {
  /** Function to extract unique ID from a row */
  getRowId: (row: T) => string;
  /** Selection store - pass in your own signal for persistence control */
  selectionStore: SelectionStore<string>;
  /** Actions to show when items are selected */
  selectionActions?: SelectionAction<T>[];
  /** Optional result count to display above the table (e.g. "showing 622 of 2131") */
  resultCount?: { shown: number; total: number };
}

/**
 * Shared accessor helper used by BaseTable and SelectableTable.
 * The result is always rendered directly as a table cell's content, so the
 * raw keyed value is surfaced as a `JSX.Element` (Solid renders strings,
 * numbers, and nullish values as-is at runtime).
 */
export function getCellValue<
  T,
  C extends { accessor: keyof T | ((row: T) => JSX.Element | string | number) },
>(row: T, column: C): JSX.Element {
  if (typeof column.accessor === "function") {
    return column.accessor(row);
  }
  return row[column.accessor] as JSX.Element;
}

/**
 * Inline style for the inner scroll region wrapping the <table>.
 *
 * `maxHeight` is the explicit escape hatch — "cap at 400px and scroll". Only the
 * `max-height` SIZE is set here; the `overflow-y:auto` scroll is composed —
 * BaseTable renders the scroll region as a `ScrollYBox` when `maxHeight` is set,
 * or a `ScrollFillColumn` under `fill`. When both are unset the region is a plain
 * box and needs no inline style.
 */
export function tableContainerStyle(maxHeight?: string): JSX.CSSProperties {
  if (!maxHeight) return {};
  return { "max-height": maxHeight };
}
