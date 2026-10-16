// ============================================
// Bare-accessor columns — the pure rule behind the `bareAccessorColumns`
// health metric (scripts/health.mjs). Peter ruling 2026-10-16: a table column
// always goes through a value renderer (a column helper or an explicit
// `(row) => <Cell/>`), never `accessor: "key"`, which paints the raw value with
// no formatting and no data-sized width — the Hour column that wrapped
// "2026-01-15 08:00" onto two lines was one of these.
//
// Pure over source text so scripts/bare-accessor.test.ts can pin it without a
// fixture tree. Callers strip comments first (health.mjs `stripComments`), so
// a doc comment that quotes the forbidden form does not count.
// ============================================

/** `accessor:` whose value is a string literal — single or double quoted,
 *  with or without `as const`. A function or template accessor never matches. */
export const BARE_ACCESSOR = /\baccessor\s*:\s*["'][^"'\n]*["']/g;

/** 1-based line numbers of every bare string accessor in `text`. */
export function findBareAccessors(text) {
  const out = [];
  for (const m of text.matchAll(BARE_ACCESSOR))
    out.push(text.slice(0, m.index).split("\n").length);
  return out;
}
