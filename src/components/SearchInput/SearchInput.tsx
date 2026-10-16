// ============================================
// SearchInput — Composite (Depth 2)
// Owns zero CSS files and zero inline style={} (STYLE_GUIDE Layout Purity —
// composes the SearchField primitive and Icons only).
// A 32px search box: the search glyph at the left, the text, and a clear cross
// that appears while there is text to clear. Controlled by `value`; `onClear`
// is how the cross empties it.
//   <SearchInput value={q()} onInput={(e) => setQ(e.currentTarget.value)}
//                onClear={() => setQ("")} placeholder="Search tasks" />
// Data-only (value, handlers, placeholder, aria-label, any <input> attribute),
// so it is exported directly, like CountChip.
// ============================================
import type { Component } from "solid-js";
import { Icon } from "../Icon";
import { SearchField, type SearchFieldProps } from "./SearchField";

export type SearchInputProps = Omit<SearchFieldProps, "leading" | "clearIcon" | "type">;

export const SearchInput: Component<SearchInputProps> = (props) => (
  <SearchField
    aria-label="Search"
    {...props}
    leading={<Icon name="search" size="md" />}
    clearIcon={<Icon name="close" size="md" />}
  />
);
