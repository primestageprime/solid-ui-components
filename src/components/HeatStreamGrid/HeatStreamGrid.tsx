// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// HeatStreamGrid — Depth 2
// Composes HeatStream (Depth 1).
// Renders a grid table with rows (e.g. assets) and
// columns (e.g. time windows), each cell containing
// a compact HeatStream.
// ============================================
import {
  type Component,
  type JSX,
  splitProps,
  For,
  Show,
  createMemo,
} from "solid-js";
import { HeatStream, type HeatStreamItem } from "../HeatStream";
import type { SelectionStore } from "../Table/types";
import "./HeatStreamGrid.css";

export interface HeatStreamGridProps
  extends JSX.HTMLAttributes<HTMLDivElement> {
  rows: string[];
  columns: string[];
  keys: string[];
  data: (row: string, col: string) => HeatStreamItem[];
  onCellClick?: (row: string, col: string) => void;
  selectionStore?: SelectionStore<string>;
  rowLabels?: Record<string, string>;
}

const cellKey = (row: string, col: string) => `${row}:${col}`;

export const HeatStreamGrid: Component<HeatStreamGridProps> = (props) => {
  const [local, others] = splitProps(props, [
    "rows",
    "columns",
    "keys",
    "data",
    "onCellClick",
    "selectionStore",
    "rowLabels",
    "class",
    "style",
  ]);

  // Fluid-fill: if parent gives this component a height, distribute it evenly
  // across the data rows. Exposed via a CSS variable so the stylesheet can
  // compute `calc(100% / N)` per row without JS-time measurement.
  const rootStyle = (): JSX.CSSProperties => ({
    ...((typeof local.style === "object" && local.style) || {}),
    "--jtf-hs-grid-row-count": String(Math.max(1, local.rows.length)),
  });

  // Largest item count across every visible cell. Drives the shared compact
  // cell width so the fullest cell fills its column and all marks are uniform.
  const maxItems = createMemo(() => {
    let m = 1;
    for (const row of local.rows) {
      for (const col of local.columns) {
        const n = local.data(row, col).length;
        if (n > m) m = n;
      }
    }
    return m;
  });

  // Selection helpers — "include unless all already included, then exclude"
  const toggleKeys = (keys: string[]) => {
    const store = local.selectionStore;
    if (!store) return;
    const allSelected = keys.every((k) => store.selected().has(k));
    store.setSelected((prev) => {
      const next = new Set(prev);
      for (const k of keys) {
        if (allSelected) next.delete(k);
        else next.add(k);
      }
      return next;
    });
  };

  const nonEmptyKeysForRow = (row: string) =>
    local.columns
      .filter((col) => local.data(row, col).length > 0)
      .map((col) => cellKey(row, col));

  const nonEmptyKeysForCol = (col: string) =>
    local.rows
      .filter((row) => local.data(row, col).length > 0)
      .map((row) => cellKey(row, col));

  const allNonEmptyKeys = () =>
    local.rows.flatMap((row) => nonEmptyKeysForRow(row));

  const toggleCell = (row: string, col: string) =>
    toggleKeys([cellKey(row, col)]);
  const toggleRow = (row: string) => toggleKeys(nonEmptyKeysForRow(row));
  const toggleCol = (col: string) => toggleKeys(nonEmptyKeysForCol(col));
  const toggleAll = () => toggleKeys(allNonEmptyKeys());

  const isSelected = (row: string, col: string) =>
    local.selectionStore?.selected().has(cellKey(row, col)) ?? false;

  const isRowAllSelected = (row: string) => {
    const keys = nonEmptyKeysForRow(row);
    return (
      keys.length > 0 &&
      keys.every((k) => local.selectionStore!.selected().has(k))
    );
  };

  const isColAllSelected = (col: string) => {
    const keys = nonEmptyKeysForCol(col);
    return (
      keys.length > 0 &&
      keys.every((k) => local.selectionStore!.selected().has(k))
    );
  };

  const selectable = () => !!local.selectionStore;

  const hasSelection = () => (local.selectionStore?.selected().size ?? 0) > 0;

  const classes = () => {
    const list = ["jtf-heatstream-grid"];
    if (selectable()) list.push("jtf-heatstream-grid--selectable");
    if (hasSelection()) list.push("jtf-heatstream-grid--has-selection");
    if (local.class) list.push(local.class);
    return list.join(" ");
  };

  return (
    <div class={classes()} style={rootStyle()} {...others}>
      <table class="jtf-heatstream-grid__table">
        <thead>
          <tr>
            <th
              class="jtf-heatstream-grid__header jtf-heatstream-grid__header--label"
              onClick={() => selectable() && toggleAll()}
            />
            <For each={local.columns}>
              {(col) => (
                <th
                  class="jtf-heatstream-grid__header"
                  classList={{
                    "jtf-heatstream-grid__header--all-selected":
                      selectable() && isColAllSelected(col),
                  }}
                  onClick={() => selectable() && toggleCol(col)}
                >
                  {col}
                </th>
              )}
            </For>
          </tr>
        </thead>
        <tbody>
          <For each={local.rows}>
            {(row) => (
              <tr>
                <td
                  class="jtf-heatstream-grid__row-label"
                  classList={{
                    "jtf-heatstream-grid__row-label--all-selected":
                      selectable() && isRowAllSelected(row),
                  }}
                  role={selectable() ? "button" : undefined}
                  tabIndex={selectable() ? 0 : undefined}
                  onClick={() => selectable() && toggleRow(row)}
                  onKeyDown={(e) => {
                    if (selectable() && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      toggleRow(row);
                    }
                  }}
                >
                  {row}
                </td>
                <For each={local.columns}>
                  {(col) => {
                    const items = () => local.data(row, col);
                    const handleClick = () => {
                      if (items().length === 0) return;
                      if (selectable()) {
                        toggleCell(row, col);
                      } else {
                        local.onCellClick?.(row, col);
                      }
                    };
                    return (
                      <td
                        class="jtf-heatstream-grid__cell"
                        classList={{
                          "jtf-heatstream-grid__cell--selected":
                            selectable() && isSelected(row, col),
                        }}
                        role={
                          items().length > 0 &&
                          (selectable() || local.onCellClick)
                            ? "button"
                            : undefined
                        }
                        tabIndex={
                          items().length > 0 &&
                          (selectable() || local.onCellClick)
                            ? 0
                            : undefined
                        }
                        onClick={handleClick}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleClick();
                          }
                        }}
                        style={
                          items().length > 0 &&
                          (selectable() || local.onCellClick)
                            ? { cursor: "pointer" }
                            : undefined
                        }
                      >
                        <Show when={items().length > 0}>
                          <HeatStream
                            items={items()}
                            keys={local.keys}
                            variant="compact"
                            showLabels={false}
                            maxItems={maxItems()}
                            previewLabel={local.rowLabels?.[row] ?? row}
                          />
                        </Show>
                      </td>
                    );
                  }}
                </For>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  );
};
