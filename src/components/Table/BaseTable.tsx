// ============================================
// BaseTable — Atomic (Depth 1)
// Owns CSS (Table.css), no component imports.
// Sortable table with sticky header, striped rows.
// Supports optional column groups (colspan headers).
// ============================================
import { splitProps, For, Show, createSignal, createMemo, mergeProps } from "solid-js";
import type { TableColumn } from "./types";
import { BaseTableProps, getCellValue, tableContainerStyle } from "./types";
import "./Table.css";

export type SortDirection = "asc" | "desc" | null;

/** Span entry for the group header row */
interface GroupSpan {
  label: string | null;   // null = ungrouped column
  colspan: number;
  columnIndex: number;     // index of first column in this span
}

/** Walk columns and return spans array, or null when no groups exist */
function computeColumnGroups<T>(columns: TableColumn<T>[]): GroupSpan[] | null {
  if (!columns.some(c => c.group)) return null;

  const spans: GroupSpan[] = [];
  let i = 0;
  while (i < columns.length) {
    const col = columns[i];
    if (col.group) {
      let count = 1;
      while (i + count < columns.length && columns[i + count].group === col.group) {
        count++;
      }
      spans.push({ label: col.group, colspan: count, columnIndex: i });
      i += count;
    } else {
      spans.push({ label: null, colspan: 1, columnIndex: i });
      i++;
    }
  }
  return spans;
}

/** Sort indicator arrows shared between single-row and grouped headers */
function sortIndicator(columnId: string, sortCol: string | null, sortDir: SortDirection) {
  return (
    <span class="hud-table__sort-indicator">
      <Show when={sortCol === columnId && sortDir === "asc"}>▲</Show>
      <Show when={sortCol === columnId && sortDir === "desc"}>▼</Show>
      <Show when={sortCol !== columnId}>
        <span class="hud-table__sort-placeholder">⇅</span>
      </Show>
    </span>
  );
}

export function BaseTable<T extends Record<string, any>>(props: BaseTableProps<T>) {
  const [local, others] = splitProps(props, [
    "data",
    "columns",
    "maxHeight",
    "fill",
    "stickyHeader",
    "striped",
    "hoverable",
    "compact",
    "getRowClass",
    "onRowClick",
    "emptyMessage",
    "class",
  ]);

  const [sortColumn, setSortColumn] = createSignal<string | null>(null);
  const [sortDirection, setSortDirection] = createSignal<SortDirection>(null);

  const handleSort = (columnId: string) => {
    const column = local.columns.find(c => c.id === columnId);
    if (!column?.sortable) return;

    if (sortColumn() === columnId) {
      if (sortDirection() === "asc") {
        setSortDirection("desc");
      } else if (sortDirection() === "desc") {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(columnId);
      setSortDirection("asc");
    }
  };

  const sortedData = () => {
    const col = sortColumn();
    const dir = sortDirection();
    if (!col || !dir) return local.data;

    const column = local.columns.find((c) => c.id === col);
    if (!column) return local.data;

    return [...local.data].sort((a, b) => {
      const accessor = column.accessor;
      let aVal: any;
      let bVal: any;

      if (typeof accessor === "function") {
        aVal = accessor(a);
        bVal = accessor(b);
      } else {
        aVal = a[accessor];
        bVal = b[accessor];
      }

      if (aVal == null) return dir === "asc" ? 1 : -1;
      if (bVal == null) return dir === "asc" ? -1 : 1;

      if (typeof aVal === "string" && typeof bVal === "string") {
        return dir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      if (aVal < bVal) return dir === "asc" ? -1 : 1;
      if (aVal > bVal) return dir === "asc" ? 1 : -1;
      return 0;
    });
  };

  const columnGroups = createMemo(() => computeColumnGroups(local.columns));

  const classes = () => {
    const classList = ["hud-table"];
    if (local.fill) classList.push("hud-table--fill");
    if (local.stickyHeader) classList.push("hud-table--sticky-header");
    if (local.striped) classList.push("hud-table--striped");
    if (local.hoverable) classList.push("hud-table--hoverable");
    if (local.compact) classList.push("hud-table--compact");
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  /** Render a sortable <th> for a single column */
  const renderColumnTh = (column: TableColumn<T>, extraClass?: string, rowspan?: number) => (
    <th
      class={`hud-table__header-cell ${extraClass || ""} ${column.sortable ? "hud-table__header-cell--sortable" : ""} ${sortColumn() === column.id ? "hud-table__header-cell--sorted" : ""}`}
      style={{
        width: column.width,
        "text-align": column.align || "left",
      }}
      rowspan={rowspan}
      onClick={() => handleSort(column.id)}
    >
      <span class="hud-table__header-content">
        {column.header}
        <Show when={column.sortable}>
          {sortIndicator(column.id, sortColumn(), sortDirection())}
        </Show>
      </span>
    </th>
  );

  return (
    <div class={classes()} style={tableContainerStyle(local.maxHeight)} {...others}>
      <Show when={local.data.length === 0}>
        <div class="hud-table__empty">
          {local.emptyMessage || "No data available"}
        </div>
      </Show>

      <Show when={local.data.length > 0}>
        <table class="hud-table__table">
          <Show when={columnGroups()} fallback={
            /* Single-row header — no groups */
            <thead class="hud-table__head">
              <tr class="hud-table__row">
                <For each={local.columns}>
                  {(column) => renderColumnTh(column)}
                </For>
              </tr>
            </thead>
          }>
            {(groups) => (
              /* Two-row grouped header */
              <thead class="hud-table__head">
                {/* Row 1: group spans + ungrouped with rowspan=2 */}
                <tr class="hud-table__row">
                  <For each={groups()}>
                    {(span) => (
                      <Show when={span.label !== null} fallback={
                        /* Ungrouped column — rowspan=2, full sort behavior */
                        renderColumnTh(local.columns[span.columnIndex], "hud-table__header-cell--rowspan", 2)
                      }>
                        {/* Group label — colspan, not sortable */}
                        <th
                          class="hud-table__header-cell hud-table__header-cell--group"
                          colspan={span.colspan}
                          style={{ "text-align": "center" }}
                        >
                          {span.label}
                        </th>
                      </Show>
                    )}
                  </For>
                </tr>
                {/* Row 2: sub-column headers for grouped columns only */}
                <tr class="hud-table__row">
                  <For each={local.columns}>
                    {(column) => (
                      <Show when={column.group}>
                        {renderColumnTh(column, "hud-table__header-cell--sub")}
                      </Show>
                    )}
                  </For>
                </tr>
              </thead>
            )}
          </Show>
          <tbody class="hud-table__body">
            <For each={sortedData()}>
              {(row, rowIndex) => (
                <tr
                  class={`hud-table__row ${local.getRowClass?.(row, rowIndex()) || ""}`}
                  onClick={() => local.onRowClick?.(row, rowIndex())}
                  style={local.onRowClick ? { cursor: "pointer" } : undefined}
                >
                  <For each={local.columns}>
                    {(column) => (
                      <td
                        class="hud-table__cell"
                        style={{ "text-align": column.align || "left" }}
                      >
                        {getCellValue(row, column)}
                      </td>
                    )}
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

export function createBaseTable(
  defaults: Partial<Omit<BaseTableProps<any>, "data" | "columns" | "children">>
) {
  return function <T extends Record<string, any>>(props: BaseTableProps<T>) {
    return <BaseTable {...mergeProps(defaults, props)} />;
  };
}
