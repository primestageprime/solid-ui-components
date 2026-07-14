// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// BaseTable — Atomic (Depth 1)
// Owns CSS (Table.css), no component imports.
// Sortable table with sticky header, striped rows.
// Supports optional column groups (colspan headers).
// ============================================
import {
  splitProps,
  For,
  Show,
  createSignal,
  createMemo,
  mergeProps,
} from "solid-js";
import type { JSX } from "solid-js";
import { Dynamic } from "solid-js/web";
import { clickableCursor } from "../../internal/style/clickable";
import {
  ClipBox,
  ClipFillColumnFlush,
  ScrollFillColumn,
  ScrollYBox,
} from "../Layout/variants";
import type { TableColumn, TableRow } from "./types";
import {
  type BaseTableProps,
  getCellValue,
  tableContainerStyle,
} from "./types";
import "./Table.css";

export type SortDirection = "asc" | "desc" | null;

/** Span entry for the group header row */
interface GroupSpan {
  label: string | null; // null = ungrouped column
  colspan: number;
  columnIndex: number; // index of first column in this span
}

/** Walk columns and return spans array, or null when no groups exist */
function computeColumnGroups<T>(columns: TableColumn<T>[]): GroupSpan[] | null {
  if (!columns.some((c) => c.group)) return null;

  const spans: GroupSpan[] = [];
  let i = 0;
  while (i < columns.length) {
    const col = columns[i];
    if (col.group) {
      let count = 1;
      while (
        i + count < columns.length &&
        columns[i + count].group === col.group
      ) {
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
function sortIndicator(
  columnId: string,
  sortCol: string | null,
  sortDir: SortDirection,
) {
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

/**
 * Reduce an arbitrary cell value to a number usable for relational sorting.
 * Strings are handled separately (via `localeCompare`); everything else — Dates,
 * booleans, numeric strings — collapses to a number here so the comparator never
 * relies on `any` or bare `<`/`>` on `unknown`.
 */
function sortKey(value: unknown): number {
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "boolean") return value ? 1 : 0;
  return Number(value);
}

export function BaseTable<T extends TableRow>(props: BaseTableProps<T>) {
  const [local, others] = splitProps(props, [
    "data",
    "columns",
    "maxHeight",
    "fill",
    "stickyHeader",
    "striped",
    "hoverable",
    "compact",
    "fixedLayout",
    "fit",
    "getRowClass",
    "onRowClick",
    "emptyMessage",
    "rowActions",
    "spanRow",
    "class",
  ]);

  const [sortColumn, setSortColumn] = createSignal<string | null>(null);
  const [sortDirection, setSortDirection] = createSignal<SortDirection>(null);

  const handleSort = (columnId: string) => {
    const column = local.columns.find((c) => c.id === columnId);
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
      const aVal: unknown =
        typeof accessor === "function" ? accessor(a) : a[accessor];
      const bVal: unknown =
        typeof accessor === "function" ? accessor(b) : b[accessor];

      if (aVal == null) return dir === "asc" ? 1 : -1;
      if (bVal == null) return dir === "asc" ? -1 : 1;

      if (typeof aVal === "string" && typeof bVal === "string") {
        return dir === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      const diff = sortKey(aVal) - sortKey(bVal);
      return dir === "asc" ? diff : -diff;
    });
  };

  const columnGroups = createMemo(() => computeColumnGroups(local.columns));

  const classes = () => {
    const classList = ["hud-table"];
    if (local.fill) classList.push("hud-table--fill");
    // Sticky header is the default — table headers must never scroll off-screen.
    // Pass `stickyHeader={false}` explicitly to opt out (e.g., when the table
    // is short and the header doubles as a section title).
    if (local.stickyHeader !== false)
      classList.push("hud-table--sticky-header");
    if (local.striped) classList.push("hud-table--striped");
    if (local.hoverable) classList.push("hud-table--hoverable");
    if (local.compact) classList.push("hud-table--compact");
    if (local.fixedLayout) classList.push("hud-table--fixed");
    if (local.fit) classList.push("hud-table--fit");
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  /** Shared body-cell style — width clamp + alignment. */
  const cellStyle = (column: TableColumn<T>): JSX.CSSProperties => {
    const clip = !!column.width || !!column.ellipsis;
    return {
      "text-align": column.align || "left",
      "max-width": column.width,
      overflow: clip ? "hidden" : undefined,
      "text-overflow": clip ? "ellipsis" : undefined,
      "white-space": clip ? "nowrap" : undefined,
    };
  };

  /** Render a sortable <th> for a single column */
  const renderColumnTh = (
    column: TableColumn<T>,
    extraClass?: string,
    rowspan?: number,
  ) => (
    <th
      class={`hud-table__header-cell ${extraClass || ""} ${column.sortable ? "hud-table__header-cell--sortable" : ""} ${sortColumn() === column.id ? "hud-table__header-cell--sorted" : ""}`}
      style={{
        width: column.width,
        "max-width": column.width,
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

  // The table FRAME's fill/clip geometry is composed from Layout variants
  // (layout-purity): `fill` makes the frame a clipping flex column whose scroll
  // region grows to fill it; otherwise the frame is a plain box that clips its
  // rounded corners ONLY when the sticky header is off (a sticky <thead> must
  // not be trapped by an ancestor `overflow`, so sticky mode leaves overflow
  // visible = a plain div). `.hud-table--fill { height:100% }` (a size, kept in
  // CSS) still lets the frame fill a definite-height block parent.
  const rootComponent = () =>
    local.fill
      ? ClipFillColumnFlush
      : local.stickyHeader === false
        ? ClipBox
        : "div";
  // Inner scroll region: `fill` → flex-fill + scroll (ScrollFillColumn); an
  // explicit `maxHeight` → a height-capped scroll (ScrollYBox + inline
  // max-height); otherwise a plain box that doesn't scroll.
  const scrollComponent = () =>
    local.fill ? ScrollFillColumn : local.maxHeight ? ScrollYBox : "div";

  return (
    <Dynamic component={rootComponent()} class={classes()} {...others}>
      <Show when={local.data.length === 0}>
        <div class="hud-table__empty">
          {local.emptyMessage || "No data available"}
        </div>
      </Show>

      <Show when={local.data.length > 0}>
        {/* Inner scroll region. Owns the scroll container so the sticky <thead>
            sticks relative to it: maxHeight caps + scrolls inline, while `fill`
            flex-grows it to fill the clipping outer wrapper (see Table.css). */}
        <Dynamic
          component={scrollComponent()}
          class="hud-table__scroll"
          style={tableContainerStyle(local.maxHeight)}
        >
          <table class="hud-table__table">
            <Show
              when={columnGroups()}
              fallback={
                /* Single-row header — no groups */
                <thead class="hud-table__head">
                  <tr class="hud-table__row">
                    <For each={local.columns}>
                      {(column) => renderColumnTh(column)}
                    </For>
                    <Show when={local.rowActions}>
                      <th class="hud-table__header-cell hud-table__actions-header" />
                    </Show>
                  </tr>
                </thead>
              }
            >
              {(groups) => (
                /* Two-row grouped header */
                <thead class="hud-table__head">
                  {/* Row 1: group spans + ungrouped with rowspan=2 */}
                  <tr class="hud-table__row">
                    <For each={groups()}>
                      {(span) => (
                        <Show
                          when={span.label !== null}
                          fallback={
                            /* Ungrouped column — rowspan=2, full sort behavior */
                            renderColumnTh(
                              local.columns[span.columnIndex],
                              "hud-table__header-cell--rowspan",
                              2,
                            )
                          }
                        >
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
                    <Show when={local.rowActions}>
                      <th
                        class="hud-table__header-cell hud-table__actions-header hud-table__header-cell--rowspan"
                        rowspan={2}
                      />
                    </Show>
                  </tr>
                  {/* Row 2: sub-column headers for grouped columns only */}
                  <tr class="hud-table__row">
                    <For each={local.columns}>
                      {(column) => (
                        <Show when={column.group}>
                          {renderColumnTh(
                            column,
                            "hud-table__header-cell--sub",
                          )}
                        </Show>
                      )}
                    </For>
                  </tr>
                </thead>
              )}
            </Show>
            <tbody class="hud-table__body">
              <For each={sortedData()}>
                {(row, rowIndex) => {
                  // Per-row tail-collapse: index of the column from which the row
                  // collapses into one spanning cell, or -1 for normal rendering
                  // (no spanRow, returned null, or an unknown fromColumnId).
                  const spanFromIndex = () => {
                    const span = local.spanRow?.(row, rowIndex());
                    if (!span) return -1;
                    return local.columns.findIndex(
                      (c) => c.id === span.fromColumnId,
                    );
                  };
                  return (
                    <tr
                      class={`hud-table__row ${local.getRowClass?.(row, rowIndex()) || ""}`}
                      onClick={() => local.onRowClick?.(row, rowIndex())}
                      style={clickableCursor(!!local.onRowClick)}
                    >
                      <Show
                        when={spanFromIndex() >= 0}
                        fallback={
                          <>
                            <For each={local.columns}>
                              {(column) => (
                                <td
                                  class="hud-table__cell"
                                  style={cellStyle(column)}
                                >
                                  {getCellValue(row, column)}
                                </td>
                              )}
                            </For>
                            <Show when={local.rowActions}>
                              {(rowActions) => (
                                // biome-ignore lint/a11y/useKeyWithClickEvents: onClick only stops mouse-click propagation to the row; it triggers no action, so no keyboard equivalent applies (keyboard activation fires on the inner buttons directly)
                                <td
                                  class="hud-table__cell hud-table__actions-cell"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div class="hud-table__actions-content">
                                    {rowActions()(row, rowIndex())}
                                  </div>
                                </td>
                              )}
                            </Show>
                          </>
                        }
                      >
                        {/* Leading columns before the span render normally… */}
                        <For each={local.columns.slice(0, spanFromIndex())}>
                          {(column) => (
                            <td
                              class="hud-table__cell"
                              style={cellStyle(column)}
                            >
                              {getCellValue(row, column)}
                            </td>
                          )}
                        </For>
                        {/* …then one cell spans the rest (+ the actions column). */}
                        <td
                          class="hud-table__cell hud-table__cell--span"
                          colspan={
                            local.columns.length -
                            spanFromIndex() +
                            (local.rowActions ? 1 : 0)
                          }
                        >
                          {local.spanRow!(row, rowIndex())!.content}
                        </td>
                      </Show>
                    </tr>
                  );
                }}
              </For>
            </tbody>
          </table>
        </Dynamic>
      </Show>
    </Dynamic>
  );
}

export function createBaseTable(
  defaults: Partial<
    Omit<BaseTableProps<TableRow>, "data" | "columns" | "children">
  >,
) {
  return <T extends TableRow>(props: BaseTableProps<T>) => (
    <BaseTable {...mergeProps(defaults, props)} />
  );
}
