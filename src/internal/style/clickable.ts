// ============================================
// Shared inline-style fragment for "interactive only when wired" elements.
//
// Rows, cells, segments and markers across SUI show a pointer cursor ONLY when
// a click handler is actually supplied — otherwise they leave the cursor
// untouched (no `cursor: undefined` noise, no misleading pointer on inert
// content). That conditional appeared verbatim in a dozen components; this is
// the single source of truth.
//
// Returns `{ cursor: "pointer" }` when `active`, else `undefined` so the
// property is omitted entirely. Works two ways:
//   • as a standalone style prop:  style={clickableCursor(!!local.onRowClick)}
//   • spread into a larger object:  { ...base, ...clickableCursor(active) }
// (spreading `undefined` is a no-op, so the omit-when-inactive semantics hold
// in both positions).
// ============================================
import type { JSX } from "solid-js";

/** Pointer cursor when `active`, otherwise nothing (property omitted). */
export const clickableCursor = (
  active: boolean,
): JSX.CSSProperties | undefined =>
  active ? { cursor: "pointer" } : undefined;
