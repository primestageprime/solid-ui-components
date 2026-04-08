import { JSX, Accessor, Setter } from "solid-js";

export interface TableColumn<T> {
  id: string;
  header: string;
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

/** Shared container style for maxHeight scroll tables */
export function tableContainerStyle(maxHeight?: string): JSX.CSSProperties {
  if (!maxHeight) return {};
  return { "max-height": maxHeight, "overflow-y": "auto" };
}
