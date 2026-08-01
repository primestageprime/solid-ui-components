// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// GroupedTable — Atomic (Depth 1)
// Owns CSS (Table.css), no component imports.
// Table with rowspan grouping for merged cells.
// ============================================
import { type JSX, For, Show, createMemo } from "solid-js";
import { clickableCursor } from "../../internal/style/clickable";
import { type TableRow, getCellValue, tableContainerStyle } from "./types";
import "./Table.css";

/**
 * A row of data with group key for rowspan grouping
 */
export interface GroupedRow<T> {
  /** Unique group identifier - rows with same groupKey will be merged */
  groupKey: string;
  /** The row data */
  data: T;
}

export interface RowspanColumn<T> {
  id: string;
  /** Header content — plain text or any JSX. Rendered directly, matching TableColumn.header. */
  header: string | JSX.Element;
  /** Accessor for the cell value */
  accessor: keyof T | ((row: T) => JSX.Element | string | number);
  /** If true, this column will be rowspanned for grouped rows */
  rowspan?: boolean;
  width?: string;
  align?: "left" | "center" | "right";
}

export interface GroupedTableProps<T> {
  /** Pre-sorted rows with groupKey for rowspan grouping */
  rows: GroupedRow<T>[];
  columns: RowspanColumn<T>[];
  maxHeight?: string;
  stickyHeader?: boolean;
  compact?: boolean;
  emptyMessage?: string;
  getRowClass?: (row: T, index: number) => string;
  onRowClick?: (row: T, index: number) => void;
  class?: string;
}

interface ProcessedRow<T> {
  data: T;
  groupKey: string;
  isFirstInGroup: boolean;
  groupSize: number;
}

export function GroupedTable<T extends TableRow>(props: GroupedTableProps<T>) {
  // Process rows to calculate rowspan info
  const processedRows = createMemo((): ProcessedRow<T>[] => {
    const result: ProcessedRow<T>[] = [];
    let currentGroupKey: string | null = null;
    let groupStartIndex = 0;

    // First pass: identify groups
    const groups: { key: string; startIndex: number; size: number }[] = [];

    for (let i = 0; i < props.rows.length; i++) {
      const row = props.rows[i];
      if (row.groupKey !== currentGroupKey) {
        if (currentGroupKey !== null) {
          groups.push({
            key: currentGroupKey,
            startIndex: groupStartIndex,
            size: i - groupStartIndex,
          });
        }
        currentGroupKey = row.groupKey;
        groupStartIndex = i;
      }
    }
    // Push last group
    if (currentGroupKey !== null) {
      groups.push({
        key: currentGroupKey,
        startIndex: groupStartIndex,
        size: props.rows.length - groupStartIndex,
      });
    }

    // Second pass: build processed rows
    let groupIndex = 0;
    for (let i = 0; i < props.rows.length; i++) {
      const row = props.rows[i];
      const group = groups[groupIndex];

      if (i >= group.startIndex + group.size) {
        groupIndex++;
      }

      const currentGroup = groups[groupIndex];
      result.push({
        data: row.data,
        groupKey: row.groupKey,
        isFirstInGroup: i === currentGroup.startIndex,
        groupSize: currentGroup.size,
      });
    }

    return result;
  });

  const classes = () => {
    const classList = ["hud-table", "hud-grouped-table"];
    if (props.stickyHeader) classList.push("hud-table--sticky-header");
    if (props.compact) classList.push("hud-table--compact");
    if (props.class) classList.push(props.class);
    return classList.join(" ");
  };

  return (
    <div class={classes()} style={tableContainerStyle(props.maxHeight)}>
      <Show when={props.rows.length === 0}>
        <div class="hud-table__empty">
          {props.emptyMessage || "No data available"}
        </div>
      </Show>

      <Show when={props.rows.length > 0}>
        <table class="hud-table__table">
          <thead class="hud-table__head">
            <tr class="hud-table__row">
              <For each={props.columns}>
                {(column) => (
                  <th
                    class="hud-table__header-cell"
                    style={{
                      width: column.width,
                      "text-align": column.align || "left",
                    }}
                  >
                    {column.header}
                  </th>
                )}
              </For>
            </tr>
          </thead>
          <tbody class="hud-table__body">
            <For each={processedRows()}>
              {(row, rowIndex) => (
                <tr
                  class={`hud-table__row ${props.getRowClass?.(row.data, rowIndex()) || ""}`}
                  onClick={() => props.onRowClick?.(row.data, rowIndex())}
                  style={clickableCursor(!!props.onRowClick)}
                >
                  <For each={props.columns}>
                    {(column) => {
                      // For rowspan columns, only render on first row of group
                      if (column.rowspan && !row.isFirstInGroup) {
                        return null;
                      }

                      return (
                        <td
                          class={`hud-table__cell ${column.rowspan ? "hud-grouped-table__rowspan-cell" : ""}`}
                          style={{ "text-align": column.align || "left" }}
                          rowSpan={
                            column.rowspan && row.isFirstInGroup
                              ? row.groupSize
                              : undefined
                          }
                        >
                          {getCellValue(row.data, column)}
                        </td>
                      );
                    }}
                  </For>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </Show>
    </div>
  );
}
