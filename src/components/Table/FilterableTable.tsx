// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// FilterableTable — Depth 2 (zero CSS)
// Composes BaseTable (Atomic/Depth 1).
// Filter input + table passthrough.
// ============================================
import { type JSX, createSignal, createMemo, splitProps } from "solid-js";
import { BaseTable } from "./BaseTable";
import type { BaseTableProps, TableRow } from "./types";

export interface FilterableTableProps<T> extends BaseTableProps<T> {
  /** Placeholder text for the filter input */
  filterPlaceholder?: string;
}

/**
 * Normalizes a value for searching:
 * - Converts to string
 * - Lowercases
 * - Removes symbols (. , $)
 */
function normalizeValue(value: unknown): string {
  if (value == null) return "";
  const str = String(value);
  // Remove . , $ and lowercase
  return str.replace(/[.,$]/g, "").toLowerCase();
}

/**
 * Creates a regex pattern from the filter string.
 * Spaces become .* for flexible matching.
 * All other characters are escaped for literal matching.
 */
function createFilterPattern(filter: string): RegExp | null {
  if (!filter.trim()) return null;

  // Escape special regex characters except space
  const escaped = filter
    .toLowerCase()
    .split(" ")
    .filter((part) => part.length > 0)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");

  return new RegExp(escaped, "i");
}

/**
 * Extracts all searchable text from a row
 */
function getRowSearchText<T extends TableRow>(row: T): string {
  return Object.values(row).map(normalizeValue).join(" ");
}

export function FilterableTable<T extends TableRow>(
  props: FilterableTableProps<T>,
) {
  const [local, tableProps] = splitProps(props, ["filterPlaceholder"]);
  const [filter, setFilter] = createSignal("");

  const filteredData = createMemo(() => {
    const pattern = createFilterPattern(filter());
    if (!pattern) return props.data;

    return props.data.filter((row) => {
      const searchText = getRowSearchText(row);
      return pattern.test(searchText);
    });
  });

  const handleInput: JSX.EventHandler<HTMLInputElement, InputEvent> = (e) => {
    setFilter(e.currentTarget.value);
  };

  const formatCount = (n: number) => n.toLocaleString();

  // `fill` passes straight through to BaseTable (still in tableProps); the
  // wrapper just needs to become a filling flex column so the table has a
  // concrete height to scroll within — the toolbar stays fixed, table grows.
  const wrapperClass = () =>
    props.fill
      ? "hud-table-quickfilter hud-table-quickfilter--fill"
      : "hud-table-quickfilter";

  return (
    <div class={wrapperClass()}>
      <div class="hud-table-quickfilter__toolbar">
        <input
          type="text"
          class="hud-table-quickfilter__input"
          placeholder={local.filterPlaceholder || "Filter..."}
          value={filter()}
          onInput={handleInput}
          maxLength={20}
        />
        <span class="hud-table-quickfilter__count">
          {filter() ? `${formatCount(filteredData().length)} of ` : ""}
          {formatCount(props.data.length)}
        </span>
      </div>
      <BaseTable {...tableProps} data={filteredData()} />
    </div>
  );
}
