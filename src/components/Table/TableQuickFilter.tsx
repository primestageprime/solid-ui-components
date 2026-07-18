// ============================================
// TableQuickFilter — Depth 2 (zero CSS: reuses .hud-table-quickfilter from Table.css)
// The client-side filter module, composable with ANY table (ruled 2026-07-18):
// a fixed toolbar (filter input + shown-of-total count) over whatever the
// children render from the filtered rows. FilterableTable is this composed
// with BaseTable; FieldTable, ValueMatrix, or any custom table composes the
// same way:
//   <TableQuickFilter data={rows()} placeholder="Filter violations…">
//     {(filtered) => <SortableFieldTable data={filtered()} … />}
//   </TableQuickFilter>
// (Sibling: components/QuickFilter is the GENERIC collection filter —
// ThemedInput, no count toolbar; this one carries the table chrome, `fill`
// plumbing, and the table matching semantics.)
// ============================================
import { type Accessor, type JSX, createSignal, createMemo } from "solid-js";
import { Dynamic } from "solid-js/web";
import { FillColumn, NarrowStack, SpreadRow } from "../Layout/variants";
import { pipe, map, join } from "../../fn";

/**
 * Normalizes a value for searching:
 * - Converts to string
 * - Lowercases
 * - Removes symbols (. , $)
 */
export function normalizeValue(value: unknown): string {
  if (value == null) return "";
  const str = String(value);
  return str.replace(/[.,$]/g, "").toLowerCase();
}

/**
 * Creates a regex pattern from the filter string.
 * Spaces become .* for flexible matching.
 * All other characters are escaped for literal matching.
 */
export function createFilterPattern(filter: string): RegExp | null {
  if (!filter.trim()) return null;

  const escaped = filter
    .toLowerCase()
    .split(" ")
    .filter((part) => part.length > 0)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");

  return new RegExp(escaped, "i");
}

/** Extracts all searchable text from a row (every own value, normalized). */
function getRowSearchText(row: object): string {
  return pipe(Object.values(row), map(normalizeValue), join(" "));
}

export interface TableQuickFilterProps<T> {
  data: T[];
  /** Placeholder text for the filter input. */
  placeholder?: string;
  /** Flex-fill the wrapper so the composed table has a concrete height to
   *  scroll within (toolbar stays fixed). Pair with a `fill` table. */
  fill?: boolean;
  /** The composed table. Called ONCE with the filtered-rows accessor (so the
   *  table never remounts while typing — only its data updates):
   *  `{(filtered) => <FieldTable data={filtered()} … />}` */
  children: (filtered: Accessor<T[]>) => JSX.Element;
}

export function TableQuickFilter<T extends object>(props: TableQuickFilterProps<T>) {
  const [filter, setFilter] = createSignal("");

  const filtered = createMemo(() => {
    const pattern = createFilterPattern(filter());
    if (!pattern) return props.data;
    return props.data.filter((row) => pattern.test(getRowSearchText(row)));
  });

  const handleInput: JSX.EventHandler<HTMLInputElement, InputEvent> = (e) => {
    setFilter(e.currentTarget.value);
  };

  const formatCount = (n: number) => n.toLocaleString();

  // Wrapper column composed via Layout (layout-purity): `fill` → FillColumn,
  // otherwise a plain NarrowStack. Toolbar → SpreadRow.
  return (
    <Dynamic
      component={props.fill ? FillColumn : NarrowStack}
      class={
        props.fill
          ? "hud-table-quickfilter hud-table-quickfilter--fill"
          : "hud-table-quickfilter"
      }
    >
      <SpreadRow class="hud-table-quickfilter__toolbar">
        <input
          type="text"
          class="hud-table-quickfilter__input"
          placeholder={props.placeholder || "Filter..."}
          value={filter()}
          onInput={handleInput}
          maxLength={20}
        />
        <span class="hud-table-quickfilter__count">
          {filter() ? `${formatCount(filtered().length)} of ` : ""}
          {formatCount(props.data.length)}
        </span>
      </SpreadRow>
      {props.children(filtered)}
    </Dynamic>
  );
}
