// ============================================
// SelectableTable — Depth 2 (zero CSS)
// Composes Button (Atomic/Depth 1).
// Table + checkbox selection + action bar.
// NOTE: CSS removed — inherits Table.css via
// BaseTable's shared stylesheet.
// ============================================
import { splitProps, For, createMemo, Show, createEffect } from "solid-js";
import { SelectableTableProps, getCellValue, tableContainerStyle } from "./types";
import { Button } from "../Button/Button";

export function SelectableTable<T extends Record<string, any>>(props: SelectableTableProps<T>) {
  const [local, others] = splitProps(props, [
    "data",
    "columns",
    "maxHeight",
    "stickyHeader",
    "getRowClass",
    "onRowClick",
    "class",
    "getRowId",
    "selectionStore",
    "selectionActions",
  ]);

  const { selected, setSelected } = local.selectionStore;

  const classes = () => {
    const classList = ["hud-table", "hud-table--selectable"];
    if (local.stickyHeader) classList.push("hud-table--sticky-header");
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  const allIds = createMemo(() => local.data.map(row => local.getRowId(row)));

  const allSelected = createMemo(() => {
    const sel = selected();
    const ids = allIds();
    return ids.length > 0 && ids.every(id => sel.has(id));
  });

  const someSelected = createMemo(() => {
    const sel = selected();
    const ids = allIds();
    const count = ids.filter(id => sel.has(id)).length;
    return count > 0 && count < ids.length;
  });

  const isRowSelected = (row: T) => selected().has(local.getRowId(row));

  const toggleRow = (row: T) => {
    const id = local.getRowId(row);
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected()) {
      // Deselect all visible rows
      setSelected(prev => {
        const next = new Set(prev);
        for (const id of allIds()) {
          next.delete(id);
        }
        return next;
      });
    } else {
      // Select all visible rows
      setSelected(prev => {
        const next = new Set(prev);
        for (const id of allIds()) {
          next.add(id);
        }
        return next;
      });
    }
  };

  const selectedRows = createMemo(() => {
    const sel = selected();
    return local.data.filter(row => sel.has(local.getRowId(row)));
  });

  const handleRowClick = (row: T, index: number, e: MouseEvent) => {
    // Don't trigger row click when clicking checkbox
    if ((e.target as HTMLElement).closest('.hud-table__checkbox')) {
      return;
    }
    local.onRowClick?.(row, index);
  };

  return (
    <div class="hud-selectable-table">
      <Show when={selected().size > 0 && local.selectionActions?.length}>
        <div class="hud-selection-action-bar">
          <span class="hud-selection-action-bar__count">
            {selected().size} selected
          </span>
          <div class="hud-selection-action-bar__actions">
            <For each={local.selectionActions}>
              {(action) => (
                <Button
                  variant={action.variant || "default"}
                  size="sm"
                  onClick={() => action.onClick(selected(), selectedRows())}
                >
                  {action.icon}
                  {action.label}
                </Button>
              )}
            </For>
          </div>
          <button
            class="hud-selection-action-bar__clear"
            onClick={() => setSelected(new Set())}
            title="Clear selection"
          >
            Clear
          </button>
        </div>
      </Show>

      <div class={classes()} style={tableContainerStyle(local.maxHeight)} {...others}>
        <table class="hud-table__table">
          <thead class="hud-table__head">
            <tr class="hud-table__row">
              <th class="hud-table__header-cell hud-table__header-cell--checkbox">
                <label class="hud-table__checkbox">
                  <input
                    type="checkbox"
                    checked={allSelected()}
                    ref={(el) => createEffect(() => { el.indeterminate = someSelected(); })}
                    onChange={toggleAll}
                  />
                  <span class="hud-table__checkbox-indicator" />
                </label>
              </th>
              <For each={local.columns}>
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
            <For each={local.data}>
              {(row, rowIndex) => (
                <tr
                  class={`hud-table__row ${isRowSelected(row) ? "hud-table__row--selected" : ""} ${local.getRowClass?.(row, rowIndex()) || ""}`}
                  onClick={(e) => handleRowClick(row, rowIndex(), e)}
                  style={local.onRowClick ? { cursor: "pointer" } : undefined}
                >
                  <td class="hud-table__cell hud-table__cell--checkbox">
                    <label class="hud-table__checkbox">
                      <input
                        type="checkbox"
                        checked={isRowSelected(row)}
                        onChange={() => toggleRow(row)}
                      />
                      <span class="hud-table__checkbox-indicator" />
                    </label>
                  </td>
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
      </div>
    </div>
  );
}
