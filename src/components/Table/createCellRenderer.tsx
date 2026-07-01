/* Table cell renderers — the column-renderer factory. */
import type { Component, JSX } from "solid-js";
import type { CellRendererProps } from "./cellStyle";

// ============================================
// Helper to create cell renderer for column
// ============================================
export function createCellRenderer<T, V>(
  Component: Component<CellRendererProps<V>>,
  accessor: keyof T | ((row: T) => V),
  extraProps?: Partial<CellRendererProps<V>>
): (row: T) => JSX.Element {
  return (row: T) => {
    const value = typeof accessor === "function"
      ? accessor(row)
      : row[accessor] as V;
    return <Component value={value} row={row} {...extraProps} />;
  };
}
