import { JSX, Accessor, Setter } from "solid-js";

export interface TableColumn<T> {
  id: string;
  /** Header content — plain text or any JSX (e.g. a select-all checkbox). Rendered directly by every table renderer. */
  header: string | JSX.Element;
  accessor: keyof T | ((row: T) => JSX.Element | string | number);
  width?: string;
  align?: "left" | "center" | "right";
  sortable?: boolean;
  /** Group label for column grouping — columns sharing the same group string are merged under a colspan header */
  group?: string;
}

export interface BaseTableProps<T> extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  data: T[];
  columns: TableColumn<T>[];
  maxHeight?: string;
  fill?: boolean;
  stickyHeader?: boolean;
  striped?: boolean;
  hoverable?: boolean;
  compact?: boolean;
  getRowClass?: (row: T, index: number) => string;
  onRowClick?: (row: T, index: number) => void;
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

export interface SelectableTableProps<T> extends BaseTableProps<T> {
  /** Function to extract unique ID from a row */
  getRowId: (row: T) => string;
  /** Selection store - pass in your own signal for persistence control */
  selectionStore: SelectionStore<string>;
  /** Actions to show when items are selected */
  selectionActions?: SelectionAction<T>[];
  /** Optional result count to display above the table (e.g. "showing 622 of 2131") */
  resultCount?: { shown: number; total: number };
}

/** Shared accessor helper used by BaseTable, GroupedTable, SelectableTable */
export function getCellValue<T, C extends { accessor: keyof T | ((row: T) => any) }>(
  row: T,
  column: C,
) {
  if (typeof column.accessor === "function") {
    return column.accessor(row);
  }
  return row[column.accessor];
}

/**
 * Inline style for the inner scroll region wrapping the <table>.
 *
 * `maxHeight` is the explicit escape hatch — "cap at 400px and scroll". When
 * it's unset, scrolling is driven by the `fill` prop via the `.hud-table--fill`
 * CSS class (which makes the outer wrapper a clipping flex column and the inner
 * scroll region flex-grow + overflow-y:auto), so no inline style is needed here.
 */
export function tableContainerStyle(maxHeight?: string): JSX.CSSProperties {
  if (!maxHeight) return {};
  return { "max-height": maxHeight, "overflow-y": "auto" };
}
