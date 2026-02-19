// ============================================
// QuickFilter — Depth 2 (zero CSS)
// Composes BaseTable (Atomic/Depth 1).
// Filter input + table passthrough.
// ============================================
import { JSX, createSignal, createMemo, splitProps } from "solid-js";
import { BaseTable } from "./BaseTable";
import { BaseTableProps } from "./types";

export interface QuickFilterProps<T> extends BaseTableProps<T> {
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
  return str.replace(/[.,\$]/g, "").toLowerCase();
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
    .filter(part => part.length > 0)
    .map(part => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");

  return new RegExp(escaped, "i");
}

/**
 * Extracts all searchable text from a row
 */
function getRowSearchText<T extends Record<string, any>>(row: T): string {
  return Object.values(row)
    .map(normalizeValue)
    .join(" ");
}

export function QuickFilter<T extends Record<string, any>>(props: QuickFilterProps<T>) {
  const [local, tableProps] = splitProps(props, ["filterPlaceholder"]);
  const [filter, setFilter] = createSignal("");

  const filteredData = createMemo(() => {
    const pattern = createFilterPattern(filter());
    if (!pattern) return props.data;

    return props.data.filter(row => {
      const searchText = getRowSearchText(row);
      return pattern.test(searchText);
    });
  });

  const handleInput: JSX.EventHandler<HTMLInputElement, InputEvent> = (e) => {
    setFilter(e.currentTarget.value);
  };

  const formatCount = (n: number) => n.toLocaleString();

  return (
    <div class="hud-table-quickfilter">
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
          {filter() ? `${formatCount(filteredData().length)} of ` : ""}{formatCount(props.data.length)}
        </span>
      </div>
      <BaseTable {...tableProps} data={filteredData()} />
    </div>
  );
}
