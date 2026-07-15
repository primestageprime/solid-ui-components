// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// VirtualTable — Atomic (Depth 1). Native table markup; composes no library components.
/**
 * VirtualTable — renders only visible rows using @tanstack/solid-virtual.
 * Same API as BaseTable but with virtual scrolling for large datasets.
 * Uses dynamic row measurement for correct behavior under browser zoom.
 */
import { For, Show, type JSX } from "solid-js";
import { splitProps } from "solid-js";
import { createVirtualizer } from "@tanstack/solid-virtual";
import type { BaseTableProps, TableColumn } from "./types";
import { getCellValue } from "./types";
import "./Table.css";

export interface VirtualTableProps<T> extends BaseTableProps<T> {
  /** Estimated height of each row in pixels (used before measurement). Default: 36 */
  rowHeight?: number;
  /** Number of rows to render outside visible area. Default: 5 */
  overscan?: number;
}

export function VirtualTable<T>(props: VirtualTableProps<T>): JSX.Element {
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
    "rowHeight",
    "overscan",
    "class",
  ]);

  const rowHeight = () => local.rowHeight ?? 36;
  const overscan = () => local.overscan ?? 5;

  let scrollEl: HTMLDivElement | undefined;

  const virtualizer = createVirtualizer({
    get count() {
      return local.data.length;
    },
    getScrollElement: () => scrollEl ?? null,
    estimateSize: () => rowHeight(),
    overscan: overscan(),
  });

  const cellPad = () => (local.compact ? "4px 6px" : "6px 10px");

  function headerCellStyle(col: TableColumn<T>): JSX.CSSProperties {
    return {
      padding: cellPad(),
      "text-align": col.align ?? "left",
      "font-size": "11px",
      "text-transform": "uppercase",
      "letter-spacing": "0.03em",
      color: "var(--sui-accent)",
      "white-space": "nowrap",
      ...(col.width ? { width: col.width, "min-width": col.width } : {}),
    };
  }

  function cellStyle(col: TableColumn<T>): JSX.CSSProperties {
    return {
      padding: cellPad(),
      "text-align": col.align ?? "left",
      ...(col.width ? { width: col.width, "min-width": col.width } : {}),
    };
  }

  return (
    <div
      class={["sui-virtual-table", local.class].filter(Boolean).join(" ")}
      {...others}
    >
      {/* Scrollable container — max-height inline only when the prop is set;
          the CSS class carries the default. */}
      <div
        ref={(el) => {
          scrollEl = el;
          // Force virtualizer to re-measure once the element is available
          queueMicrotask(() => virtualizer.measure());
        }}
        class="sui-virtual-table__scroll"
        style={{ "max-height": local.maxHeight }}
      >
        <table
          class="sui-virtual-table__table"
          classList={{
            "sui-virtual-table__table--compact": local.compact,
          }}
        >
          {/* Sticky header */}
          <thead>
            <tr
              class="sui-virtual-table__head-row"
              classList={{
                "sui-virtual-table__head-row--sticky":
                  local.stickyHeader !== false,
              }}
            >
              <For each={local.columns}>
                {(col) => <th style={headerCellStyle(col)}>{col.header}</th>}
              </For>
            </tr>
          </thead>

          {/* Virtual body */}
          <tbody>
            <Show
              when={local.data.length > 0}
              fallback={
                <tr>
                  <td
                    colspan={local.columns.length}
                    class="sui-virtual-table__empty-cell"
                  >
                    {local.emptyMessage ?? "No data"}
                  </td>
                </tr>
              }
            >
              {/* Spacer for rows above viewport */}
              <tr
                style={{
                  height: `${virtualizer.getVirtualItems()[0]?.start ?? 0}px`,
                }}
              >
                <td
                  class="hud-table__virtual-spacer-cell"
                  colspan={local.columns.length}
                />
              </tr>

              <For each={virtualizer.getVirtualItems()}>
                {(virtualRow) => {
                  const row = () => local.data[virtualRow.index];
                  const rowClass = () =>
                    local.getRowClass?.(row(), virtualRow.index) ?? "";
                  return (
                    <tr
                      ref={(el) =>
                        queueMicrotask(() => virtualizer.measureElement(el))
                      }
                      data-index={virtualRow.index}
                      class={`sui-virtual-table__row ${rowClass()}`}
                      classList={{
                        "sui-virtual-table__row--clickable":
                          !!local.onRowClick,
                        "sui-virtual-table__row--striped":
                          local.striped && virtualRow.index % 2 === 1,
                        "sui-virtual-table__row--hoverable": local.hoverable,
                      }}
                      style={{ "min-height": `${rowHeight()}px` }}
                      onClick={() =>
                        local.onRowClick?.(row(), virtualRow.index)
                      }
                    >
                      <For each={local.columns}>
                        {(col) => (
                          <td style={cellStyle(col)}>
                            {getCellValue(row(), col)}
                          </td>
                        )}
                      </For>
                    </tr>
                  );
                }}
              </For>

              {/* Spacer for rows below viewport */}
              <tr
                style={{
                  height: `${virtualizer.getTotalSize() - (virtualizer.getVirtualItems().at(-1)?.end ?? 0)}px`,
                }}
              >
                <td
                  class="hud-table__virtual-spacer-cell"
                  colspan={local.columns.length}
                />
              </tr>
            </Show>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default VirtualTable;
