// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// QuickFilter — Molecule (Depth 2)
// Composes the ThemedInput primitive (Inputs/) for the search field; owns only
// its container layout + the compact (dense) sizing overrides in QuickFilter.css.
// Generic, composition-friendly: a search input that filters a list of items
// in-page on any text inside them. Works with lists, tables, trees, or any
// other collection — caller renders the filtered result via a render-prop
// child, OR caller listens to onQueryChange and filters externally.
// ============================================
import { type JSX, createSignal, createMemo, splitProps } from "solid-js";
import { ThemedInput } from "../Inputs";
import "./QuickFilter.css";

export interface QuickFilterProps<T> {
  items: readonly T[];
  /** Returns the searchable text from an item. Default: JSON.stringify(item). */
  extract?: (item: T) => string;
  /** Placeholder for the input. */
  placeholder?: string;
  /** Initial query value. */
  initialQuery?: string;
  /** Notified whenever the query changes. */
  onQueryChange?: (query: string) => void;
  /** Override input className. */
  class?: string;
  /** Render-prop child. Receives the filtered subset + the current query. */
  children: (filtered: readonly T[], query: string) => JSX.Element;
}

const defaultExtract = (item: unknown): string => {
  if (item == null) return "";
  if (typeof item === "string") return item;
  if (typeof item === "number" || typeof item === "boolean")
    return String(item);
  try {
    return JSON.stringify(item);
  } catch {
    return String(item);
  }
};

const tokens = (q: string): string[] =>
  q
    .toLowerCase()
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

export function QuickFilter<T>(rawProps: QuickFilterProps<T>) {
  const [local, others] = splitProps(rawProps, [
    "items",
    "extract",
    "placeholder",
    "initialQuery",
    "onQueryChange",
    "class",
    "children",
  ]);

  const [query, setQuery] = createSignal(local.initialQuery ?? "");
  const extract = () =>
    local.extract ?? (defaultExtract as (item: T) => string);

  const filtered = createMemo<readonly T[]>(() => {
    const q = query().trim();
    if (!q) return local.items;
    const ts = tokens(q);
    return local.items.filter((item) => {
      const hay = extract()(item).toLowerCase();
      return ts.every((t) => hay.includes(t));
    });
  });

  const onInput = (e: InputEvent & { currentTarget: HTMLInputElement }) => {
    const v = e.currentTarget.value;
    setQuery(v);
    local.onQueryChange?.(v);
  };

  return (
    <div
      class={`sui-quickfilter${local.class ? ` ${local.class}` : ""}`}
      {...(others as JSX.HTMLAttributes<HTMLDivElement>)}
    >
      <ThemedInput
        class="sui-quickfilter__input"
        type="search"
        placeholder={local.placeholder ?? "Filter…"}
        value={query()}
        onInput={onInput}
      />
      {local.children(filtered(), query())}
    </div>
  );
}
