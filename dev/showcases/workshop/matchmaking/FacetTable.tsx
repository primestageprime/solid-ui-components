// ============================================
// FacetTable — presentational. Also knows nothing about the filter engine.
//
// It does not know what filtering IS. It knows which of its rows are marked
// active, and who to call when a header or a cell is clicked. The bench
// decides what those clicks mean.
// ============================================
import { type Component, For, Show } from "solid-js";
import "./FacetTable.css";

export interface FacetTableColumn {
  id: string;
  header: string;
  align?: "start" | "end";
}

export interface FacetTableRow {
  value: string;
  label: string;
  cells: (string | number)[];
}

export interface FacetTableProps {
  title: string;
  columns: FacetTableColumn[];
  rows: FacetTableRow[];
  activeValues: string[];
  /** Header click — the shortcut for "filter on this dimension". */
  onHeaderClick: () => void;
  /** Cell click — toggle this member. */
  onCellClick: (value: string) => void;
}

export const FacetTable: Component<FacetTableProps> = (props) => {
  const isActive = (value: string) => props.activeValues.includes(value);

  return (
    <div class="mm-facet" classList={{ "mm-facet--filtered": props.activeValues.length > 0 }}>
      <button type="button" class="mm-facet__title" onClick={() => props.onHeaderClick()}>
        <span>{props.title}</span>
        <span class="mm-facet__meta">
          {props.rows.length}
          <Show when={props.activeValues.length > 0}>
            <span class="mm-facet__badge">{props.activeValues.length}</span>
          </Show>
        </span>
      </button>

      <div class="mm-facet__scroll">
        <table class="mm-facet__table">
          <thead>
            <tr>
              <For each={props.columns}>
                {(column) => (
                  <th class={column.align === "start" ? "is-start" : "is-end"}>
                    {column.header}
                  </th>
                )}
              </For>
            </tr>
          </thead>
          <tbody>
            <For
              each={props.rows}
              fallback={
                <tr>
                  <td class="mm-facet__empty" colSpan={props.columns.length}>
                    nothing matches the current filters
                  </td>
                </tr>
              }
            >
              {(row) => (
                <tr
                  class="mm-facet__row"
                  classList={{ "mm-facet__row--active": isActive(row.value) }}
                  onClick={() => props.onCellClick(row.value)}
                >
                  <td class="is-start mm-facet__member">
                    <span class="mm-facet__tick">{isActive(row.value) ? "✓" : ""}</span>
                    {row.label}
                  </td>
                  <For each={row.cells}>
                    {(cell, index) => (
                      <td
                        class={
                          props.columns[index() + 1]?.align === "start"
                            ? "is-start"
                            : "is-end"
                        }
                      >
                        {cell}
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
};
