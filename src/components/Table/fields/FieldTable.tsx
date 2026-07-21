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
  /** Table-level sorting (ruled 2026-07-18): a sortable table makes EVERY
   *  column sortable — except field types with no valid sort order (selection,
   *  actions, lists, charts), which simply lack a `sortValue`. There is no
   *  per-column opt-out; prefer the curried `SortableFieldTable`. */
  sortable?: boolean;
}

// Row ≈ 10px pad ×2 + 1.4 line at the frame's 12px basis ⇒ ~3.1em; the header
// row is slightly taller (12px pads) ⇒ ~3.5em. A partial trailing row is
// intentional — it advertises the scroll.
const rowCapEm = (rows: number): string => `calc(3.5em + ${rows} * 3.1em)`;

export function FieldTable<T>(props: FieldTableProps<T>): JSX.Element {
  // Static config by design: fields/registry are setup-time values (the
  // reactive surface is the row data and the cells' own signals).
  const resolved = resolveFields(props.fields, props.registry, {
    sortable: props.sortable,
  });
  // Sortability is a table-level mode: flip on every column that carries a
  // comparable value. Columns without a sortValue have no valid sort.
  // (The 2026-07-21 spacer column is retired: under table-layout AUTO the
  // width model needs no slack absorber — columns grow to their max, the
  // table caps at Σmax, and the surplus stays outside the table.)
  const columns = props.sortable
    ? resolved.columns.map((c) => ({ ...c, sortable: c.sortValue != null }))
    : resolved.columns;
  // `fill` is implicit: no maxRows cap ⇒ the composed BaseTable runs in fill
  // mode (ClipFillColumnFlush + inner ScrollFillColumn, height:100%), which
  // only resolves against a definite-height flex ancestor. The frame must BE
  // that flex context in fill mode — see `.sui-field-frame--fill` in shared.css.
  const fill = !props.maxRows;
  return (
    <div
      class={`sui-field-frame${fill ? " sui-field-frame--fill" : ""}`}
      style={{
        "--sui-field-table-min": resolved.minW,
        "--sui-field-table-max": resolved.maxW,
      }}
    >
      {/* table-layout AUTO (ruled 2026-07-21): the legacy auto algorithm is
          the width model — surplus over minimums distributes ∝ (max − min);
          fixed layout cannot express min+max and is retired for fields. */}
      <DataTable
        data={props.data as object[]}
        columns={columns as unknown as TableColumn<object>[]}
        fill={fill}
        maxHeight={props.maxRows ? rowCapEm(props.maxRows) : undefined}
        emptyMessage={props.emptyMessage}
      />
    </div>
  );
}

/** Curried sortable variant (ruled 2026-07-18): the table is sortable or it
 *  isn't — pick the variant, never configure columns. */
export function SortableFieldTable<T>(
  props: Omit<FieldTableProps<T>, "sortable">,
): JSX.Element {
  return <FieldTable {...props} sortable />;
}
