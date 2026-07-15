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
import { clickableCursor } from "../../internal/style/clickable";
import { createVirtualizer } from "@tanstack/solid-virtual";
import type { BaseTableProps, TableColumn } from "./types";
import { getCellValue } from "./types";

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

  const containerHeight = () => local.maxHeight ?? "calc(100vh - 300px)";

  return (
    <div
      class={["sui-virtual-table", local.class].filter(Boolean).join(" ")}
      {...others}
    >
      {/* Scrollable container */}
      <div
        ref={(el) => {
          scrollEl = el;
          // Force virtualizer to re-measure once the element is available
          queueMicrotask(() => virtualizer.measure());
        }}
        style={{
          "max-height": containerHeight(),
          "overflow-y": "auto",
          "overflow-x": "auto",
          position: "relative",
        }}
      >
        <table
          style={{
            width: "100%",
            "border-collapse": "collapse",
            "font-size": local.compact ? "12px" : "13px",
            "table-layout": "fixed",
          }}
        >
          {/* Sticky header */}
          <thead>
            <tr
              style={{
                "border-bottom": "1px solid var(--sui-border)",
                ...(local.stickyHeader !== false
                  ? {
                      position: "sticky",
                      top: "0",
                      background: "var(--sui-bg-primary)",
                      "z-index": "2",
                    }
                  : {}),
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
                    style={{
                      padding: "24px",
                      "text-align": "center",
                      color: "var(--sui-text-muted)",
                    }}
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
                  colspan={local.columns.length}
                  style={{ padding: "0", border: "none" }}
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
                      class={rowClass()}
                      style={{
                        "min-height": `${rowHeight()}px`,
                        "border-bottom": "1px solid rgba(74,106,128,0.15)",
                        ...clickableCursor(!!local.onRowClick),
                        ...(local.striped && virtualRow.index % 2 === 1
                          ? { background: "rgba(var(--sui-accent-rgb), 0.02)" }
                          : {}),
                      }}
                      onClick={() =>
                        local.onRowClick?.(row(), virtualRow.index)
                      }
                      onMouseEnter={
                        local.hoverable
                          ? (e) => {
                              e.currentTarget.style.background =
                                "rgba(var(--sui-accent-rgb), 0.04)";
                            }
                          : undefined
                      }
                      onMouseLeave={
                        local.hoverable
                          ? (e) => {
                              e.currentTarget.style.background =
                                local.striped && virtualRow.index % 2 === 1
                                  ? "rgba(var(--sui-accent-rgb), 0.02)"
                                  : "";
                            }
                          : undefined
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
                  colspan={local.columns.length}
                  style={{ padding: "0", border: "none" }}
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
