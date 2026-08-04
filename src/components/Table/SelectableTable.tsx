// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// SelectableTable — Depth 2 (zero CSS)
// Composes Button (Atomic/Depth 1).
// Table + checkbox selection + action bar.
// NOTE: CSS removed — inherits Table.css via
// BaseTable's shared stylesheet.
//
// Because the stylesheet is SHARED, the appearance
// flags must behave identically here and in
// BaseTable — same class, same default. Its props
// are BaseTableProps MINUS what this renderer
// cannot honour; widening that back without an
// implementation is the bug fixed on 2026-08-04.
// See `SelectableTableOmitted` in ./types.
// ============================================
import { splitProps, For, createMemo, Show, createEffect } from "solid-js";
import { Dynamic } from "solid-js/web";
import { clickableCursor } from "../../internal/style/clickable";
import {
  type SelectableTableProps,
  type TableRow,
  getCellValue,
  tableContainerStyle,
} from "./types";
import { Button } from "../Button/Button";
import { map, filter } from "../../fn";
import {
  Column,
  ClusterRow,
  GrowClusterRow,
  ScrollYBox,
} from "../Layout/variants";

export function SelectableTable<T extends TableRow>(
  props: SelectableTableProps<T>,
) {
  // Shift-select reads `shiftKey` off the mousedown event in `toggleRow`. A
  // pair of document-level keydown/keyup listeners used to track it into a
  // `_shiftHeld` flag as well — written on every keystroke, read nowhere, one
  // listener pair per mounted table. Removed 2026-08-04; the range selection it
  // was meant to serve is covered in SelectableTable.test.tsx and unchanged.
  const [local, others] = splitProps(props, [
    "data",
    "columns",
    "maxHeight",
    "stickyHeader",
    "striped",
    "hoverable",
    "compact",
    "emptyMessage",
    "getRowClass",
    "onRowClick",
    "class",
    "getRowId",
    "selectionStore",
    "selectionActions",
    "resultCount",
  ]);

  const { selected, setSelected } = local.selectionStore;

  // Every modifier here is the same class toggle BaseTable applies, against the
  // same Table.css rules — these tables share one stylesheet, so a flag that
  // means "denser" on one must mean it on the other. Until 2026-08-04 the four
  // appearance flags were declared and dropped, and `stickyHeader` defaulted
  // the OPPOSITE way to BaseTable's (truthy here, `!== false` there) from one
  // shared prop with one shared doc comment.
  const classes = () => {
    const classList = ["hud-table", "hud-table--selectable"];
    // Sticky by default, matching BaseTable: `stickyHeader={false}` opts out.
    if (local.stickyHeader !== false)
      classList.push("hud-table--sticky-header");
    if (local.striped) classList.push("hud-table--striped");
    if (local.hoverable) classList.push("hud-table--hoverable");
    if (local.compact) classList.push("hud-table--compact");
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  const allIds = createMemo(() =>
    map((row) => local.getRowId(row), local.data),
  );

  const allSelected = createMemo(() => {
    const sel = selected();
    const ids = allIds();
    return ids.length > 0 && ids.every((id) => sel.has(id));
  });

  const someSelected = createMemo(() => {
    const sel = selected();
    const ids = allIds();
    const count = filter((id) => sel.has(id), ids).length;
    return count > 0 && count < ids.length;
  });

  const isRowSelected = (row: T) => selected().has(local.getRowId(row));

  // Track last clicked index for shift-select
  let lastClickedIndex: number | null = null;

  const toggleRow = (row: T, index?: number, shiftKey?: boolean) => {
    const id = local.getRowId(row);

    if (
      shiftKey &&
      lastClickedIndex !== null &&
      index !== undefined &&
      index !== lastClickedIndex
    ) {
      // Shift-click: select range between last clicked and current
      const start = Math.min(lastClickedIndex, index);
      const end = Math.max(lastClickedIndex, index);
      setSelected((prev) => {
        const next = new Set(prev);
        for (let i = start; i <= end; i++) {
          const rangeId = local.getRowId(local.data[i]);
          next.add(rangeId);
        }
        return next;
      });
    } else {
      // Normal click: toggle single row
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    }

    if (index !== undefined) lastClickedIndex = index;
  };

  const toggleAll = () => {
    if (allSelected()) {
      // Deselect all visible rows
      setSelected((prev) => {
        const next = new Set(prev);
        for (const id of allIds()) {
          next.delete(id);
        }
        return next;
      });
    } else {
      // Select all visible rows
      setSelected((prev) => {
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
    return filter((row) => sel.has(local.getRowId(row)), local.data);
  });

  const handleRowClick = (row: T, index: number, e: MouseEvent) => {
    // Don't trigger row click when clicking checkbox
    if ((e.target as HTMLElement).closest(".hud-table__checkbox")) {
      return;
    }
    local.onRowClick?.(row, index);
  };

  return (
    <Column class="hud-selectable-table">
      <Show when={selected().size > 0 && local.selectionActions?.length}>
        <ClusterRow class="hud-selection-action-bar">
          <span class="hud-selection-action-bar__count">
            {selected().size} selected
          </span>
          <GrowClusterRow class="hud-selection-action-bar__actions">
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
          </GrowClusterRow>
          <button
            type="button"
            class="hud-selection-action-bar__clear"
            onClick={() => setSelected(new Set())}
            title="Clear selection"
          >
            Clear
          </button>
        </ClusterRow>
      </Show>

      {/* The table wrapper owns the maxHeight scroll: compose ScrollYBox so the
          capped body scrolls (overflow-y is composed, not in .hud-table CSS). */}
      <Dynamic
        component={local.maxHeight ? ScrollYBox : "div"}
        class={classes()}
        style={tableContainerStyle(local.maxHeight)}
        {...others}
      >
        {local.resultCount && (
          <div class="hud-table__result-count">
            Showing {local.resultCount.shown.toLocaleString()} of{" "}
            {local.resultCount.total.toLocaleString()}
          </div>
        )}
        {/* Empty state, mirroring BaseTable: the whole table is replaced, so
            the select-all checkbox goes with it — there is nothing to select.
            `resultCount` stays above, since "Showing 0 of 2131" and the reason
            why are more useful together than either alone. */}
        <Show when={local.data.length === 0}>
          <div class="hud-table__empty">
            {local.emptyMessage || "No data available"}
          </div>
        </Show>

        <Show when={local.data.length > 0}>
          <table class="hud-table__table">
            <thead class="hud-table__head">
              <tr class="hud-table__row">
                <th class="hud-table__header-cell hud-table__header-cell--checkbox">
                  <label class="hud-table__checkbox">
                    <input
                      type="checkbox"
                      checked={allSelected()}
                      ref={(el) =>
                        createEffect(() => {
                          el.indeterminate = someSelected();
                        })
                      }
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
                        "max-width": column.width,
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
                    style={clickableCursor(!!local.onRowClick)}
                  >
                    <td class="hud-table__cell hud-table__cell--checkbox">
                      <label
                        class="hud-table__checkbox"
                        onMouseDown={(e) => {
                          // Intercept before checkbox toggles — capture shiftKey and handle selection ourselves
                          e.preventDefault();
                          toggleRow(row, rowIndex(), e.shiftKey);
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isRowSelected(row)}
                          onChange={() => {
                            /* handled by mousedown on label */
                          }}
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
        </Show>
      </Dynamic>
    </Column>
  );
}
