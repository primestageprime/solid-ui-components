// ============================================
// Table fields — FieldTable (Depth 2: composes resolveFields + DataTable)
// The consumer surface of the fields-as-functions system: data + an ordered
// fields gesture + a registry. Owns the sui-field-frame and its width-budget
// vars internally, so a client renders a complete field table without ever
// touching CSS:
//   <FieldTable data={rows} registry={registry}
//     fields={["name", "createdAt", "amount", ["edit", "delete"]]} />
// Column config is static (resolved once at setup); reactivity stays
// per-cell, inside the accessors.
// ============================================
import type { JSX } from "solid-js";
import type { TableColumn } from "../types";
import type { FieldCol, FieldSpec } from "./shared";
import { resolveFields } from "./resolve";
import { DataTable } from "../variants";

export interface FieldTableProps<T> {
  data: T[];
  /** The ordered compositional gesture: known ids, action clusters, col()s. */
  fields: FieldSpec<T>[];
  /** Plain object of column-factory results the ids resolve against. */
  registry: Record<string, FieldCol<T>>;
  /** Shown when `data` is empty. */
  emptyMessage?: string;
  /** Semantic scroll cap: show ~this many rows, then scroll (sticky header).
   *  Mapped to an em-based height internally so it scales with zoom — the
   *  client names a row count, never a height. */
  maxRows?: number;
}

// Row ≈ 10px pad ×2 + 1.4 line at the frame's 12px basis ⇒ ~3.1em; the header
// row is slightly taller (12px pads) ⇒ ~3.5em. A partial trailing row is
// intentional — it advertises the scroll.
const rowCapEm = (rows: number): string => `calc(3.5em + ${rows} * 3.1em)`;

export function FieldTable<T>(props: FieldTableProps<T>): JSX.Element {
  // Static config by design: fields/registry are setup-time values (the
  // reactive surface is the row data and the cells' own signals).
  const resolved = resolveFields(props.fields, props.registry);
  return (
    <div
      class="sui-field-frame"
      style={{
        "--sui-field-table-min": resolved.minW,
        "--sui-field-table-max": resolved.maxW,
      }}
    >
      <DataTable
        data={props.data as object[]}
        columns={resolved.columns as unknown as TableColumn<object>[]}
        fixedLayout
        fill={!props.maxRows}
        maxHeight={props.maxRows ? rowCapEm(props.maxRows) : undefined}
        emptyMessage={props.emptyMessage}
      />
    </div>
  );
}
