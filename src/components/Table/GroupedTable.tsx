// ============================================
// GroupedTable — Atomic (Depth 1)
// Owns CSS (Table.css), no component imports.
// Table with rowspan grouping for merged cells.
// ============================================
import { JSX, For, Show, createMemo } from "solid-js";
import { getCellValue, tableContainerStyle } from "./types";
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
  header: string;
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

export function GroupedTable<T extends Record<string, any>>(
  props: GroupedTableProps<T>
) {
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
                  style={props.onRowClick ? { cursor: "pointer" } : undefined}
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
                          style={{
                            "text-align": column.align || "left",
                            "vertical-align": column.rowspan ? "middle" : undefined,
                          }}
                          rowSpan={column.rowspan && row.isFirstInGroup ? row.groupSize : undefined}
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

// ============================================
// Demo Component for Storybook / Dev Preview
// ============================================

interface VesselCallRow {
  vessel_name: string;
  barge: string;
  call_date: string;
  asset_id: string;
  connected_at: string;
  duration_hours: number;
  nox_emissions: number;
  rog_emissions: number;
}

const DEMO_DATA: GroupedRow<VesselCallRow>[] = [
  // American Freedom - 2 trains
  {
    groupKey: "vc-001",
    data: {
      vessel_name: "American Freedom",
      barge: "STAX 1",
      call_date: "2026-01-15",
      asset_id: "xbox1-1",
      connected_at: "2026-01-15T08:30:00Z",
      duration_hours: 27.5,
      nox_emissions: 2.42,
      rog_emissions: 0.08,
    },
  },
  {
    groupKey: "vc-001",
    data: {
      vessel_name: "American Freedom",
      barge: "STAX 1",
      call_date: "2026-01-15",
      asset_id: "xbox1-2",
      connected_at: "2026-01-15T09:15:00Z",
      duration_hours: 32.5,
      nox_emissions: 2.65,
      rog_emissions: 0.11,
    },
  },
  // Shanghai Highway - 1 train
  {
    groupKey: "vc-002",
    data: {
      vessel_name: "Shanghai Highway",
      barge: "STAX 1",
      call_date: "2026-01-19",
      asset_id: "xbox1-1",
      connected_at: "2026-01-19T16:30:00Z",
      duration_hours: 5.67,
      nox_emissions: 3.89,
      rog_emissions: 0.24,
    },
  },
  // AS Palina - 2 trains
  {
    groupKey: "vc-003",
    data: {
      vessel_name: "AS Palina",
      barge: "STAX 2",
      call_date: "2026-01-19",
      asset_id: "xbox3-1",
      connected_at: "2026-01-19T15:30:00Z",
      duration_hours: 41.0,
      nox_emissions: 2.67,
      rog_emissions: 0.15,
    },
  },
  {
    groupKey: "vc-003",
    data: {
      vessel_name: "AS Palina",
      barge: "STAX 2",
      call_date: "2026-01-19",
      asset_id: "xbox3-2",
      connected_at: "2026-01-19T16:00:00Z",
      duration_hours: 56.5,
      nox_emissions: 2.51,
      rog_emissions: 0.09,
    },
  },
];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDuration(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
}

export function GroupedTableDemo() {
  const columns: RowspanColumn<VesselCallRow>[] = [
    {
      id: "vessel",
      header: "Vessel",
      accessor: (row) => <span style={{ "font-weight": "600" }}>{row.vessel_name}</span>,
      rowspan: true,
      width: "180px",
    },
    {
      id: "barge",
      header: "Barge",
      accessor: "barge",
      rowspan: true,
      width: "80px",
    },
    {
      id: "date",
      header: "Date",
      accessor: (row) => formatDate(row.call_date),
      rowspan: true,
      width: "120px",
    },
    {
      id: "asset",
      header: "Asset",
      accessor: "asset_id",
      width: "100px",
    },
    {
      id: "duration",
      header: "Duration",
      accessor: (row) => formatDuration(row.duration_hours),
      width: "100px",
    },
    {
      id: "nox",
      header: "NOx",
      accessor: (row) => (
        <span style={{ color: row.nox_emissions > 2.8 ? "#ff6b6b" : undefined }}>
          {row.nox_emissions.toFixed(2)}
        </span>
      ),
      align: "right",
      width: "80px",
    },
    {
      id: "rog",
      header: "ROG",
      accessor: (row) => (
        <span style={{ color: row.rog_emissions > 0.125 ? "#ff6b6b" : undefined }}>
          {row.rog_emissions.toFixed(2)}
        </span>
      ),
      align: "right",
      width: "80px",
    },
  ];

  return (
    <div style={{ padding: "20px", background: "var(--hud-bg-deep, #030810)" }}>
      <h3 style={{ color: "var(--hud-accent, #00d4ff)", "margin-bottom": "16px" }}>
        Vessel Call Details (Rowspan Grouped)
      </h3>
      <GroupedTable
        rows={DEMO_DATA}
        columns={columns}
        compact
      />
    </div>
  );
}
