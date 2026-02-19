// ============================================
// StatsTable — Atomic (Depth 1)
// Owns CSS (StatsTable.css), no component imports.
// Simple stats table with typed columns and row classes.
// ============================================
import { Component, JSX, splitProps, For, Show } from "solid-js";
import "./StatsTable.css";

export interface StatsColumn<T = any> {
  header: string;
  accessor: keyof T | ((row: T) => JSX.Element | string | number | null | undefined);
  align?: "left" | "right" | "center";
  width?: string;
}

export interface StatsTableProps<T = any> extends JSX.HTMLAttributes<HTMLDivElement> {
  columns: StatsColumn<T>[];
  rows: T[];
  getRowClass?: (row: T, index: number) => string | undefined;
  caption?: string;
}

export function StatsTable<T extends Record<string, any>>(props: StatsTableProps<T>) {
  const [local, others] = splitProps(props, [
    "columns",
    "rows",
    "getRowClass",
    "caption",
    "class",
  ]);

  const classes = () => {
    const classList = ["stats-table"];
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  const getCellValue = (row: T, column: StatsColumn<T>) => {
    if (typeof column.accessor === "function") {
      return column.accessor(row);
    }
    return row[column.accessor as keyof T];
  };

  return (
    <div class={classes()} {...others}>
      <Show when={local.caption}>
        <h3 class="stats-table__caption">{local.caption}</h3>
      </Show>
      <div class="stats-table__scroll">
        <table class="stats-table__table">
          <thead>
            <tr class="stats-table__header-row">
              <For each={local.columns}>
                {(col) => (
                  <th
                    class="stats-table__header-cell"
                    style={{
                      "text-align": col.align || "left",
                      width: col.width,
                    }}
                  >
                    {col.header}
                  </th>
                )}
              </For>
            </tr>
          </thead>
          <tbody>
            <For each={local.rows}>
              {(row, i) => (
                <tr class={`stats-table__row ${local.getRowClass?.(row, i()) ?? ""}`}>
                  <For each={local.columns}>
                    {(col) => (
                      <td
                        class="stats-table__cell"
                        style={{ "text-align": col.align || "left" }}
                      >
                        {getCellValue(row, col)}
                      </td>
                    )}
                  </For>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>
    </div>
  );
}
