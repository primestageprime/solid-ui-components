// ============================================
// FilterableTable — Depth 2 (zero CSS)
// TableQuickFilter composed with BaseTable: the historical convenience wrapper.
// The filter module itself lives in ./TableQuickFilter and composes with ANY
// table (ruled 2026-07-18) — reach for it directly with FieldTable etc.
// ============================================
import { splitProps } from "solid-js";
import { BaseTable } from "./BaseTable";
import { TableQuickFilter } from "./TableQuickFilter";
import type { BaseTableProps, TableRow } from "./types";

export interface FilterableTableProps<T> extends BaseTableProps<T> {
  /** Placeholder text for the filter input */
  filterPlaceholder?: string;
}

export function FilterableTable<T extends TableRow>(
  props: FilterableTableProps<T>,
) {
  const [local, tableProps] = splitProps(props, ["filterPlaceholder"]);

  // `fill` drives both the TableQuickFilter wrapper (flex-fills so the table has a
  // concrete height to scroll within, toolbar stays fixed) and, via
  // tableProps, the BaseTable itself.
  return (
    <TableQuickFilter
      data={props.data}
      placeholder={local.filterPlaceholder}
      fill={props.fill}
    >
      {(filtered) => <BaseTable {...tableProps} data={filtered()} />}
    </TableQuickFilter>
  );
}
