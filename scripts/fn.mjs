// ============================================
// fn — scripts-side JS mirror of src/fn (ruled 2026-07-18: function-first
// over method/property chains, even in tooling). Node runs these scripts
// without a TS loader, so the library module can't be imported here; this
// mirror carries the few helpers scripts need. When src/fn is extracted to
// its own package, delete this and depend on it.
// Convention matches the library: direct form `f(x, data)` outside pipes,
// curried form `f(x)` inside.
// ============================================

/** prop(key, obj) → obj[key]; prop(key) → (obj) => obj[key]. */
export function prop(key, obj) {
  if (arguments.length === 1) return (o) => o[key];
  return obj[key];
}

/** length(xs) → xs.length. */
export const length = (xs) => xs.length;

/** lengthOf(key, obj) → length(prop(key, obj)); lengthOf(key) curries. */
export function lengthOf(key, obj) {
  if (arguments.length === 1) return (o) => length(prop(key, o));
  return length(prop(key, obj));
}
