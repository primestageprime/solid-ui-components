// fn — prop (Depth 0, pure). Dual form (ruled 2026-07-18: Peter demands
// function-first property access — `prop(key, obj)` over `obj.key` in the
// contexts the convention governs, e.g. `lengthOf`). Curried `prop(key)` for
// `pipe`, direct `prop(key, obj)` for immediate use. 2-ary dispatch on
// arguments.length.
//
// The DIRECT form is tightly typed — `prop<T, K extends keyof T>(key, obj)`
// returns `T[K]`. The CURRIED form keeps the value type as tight as TS allows
// for a deferred accessor: it recovers `T[K]` when applied to a concrete object.
//
// Caveat (survey 2026-07-18): a curried `prop(key)` passed as an ARGUMENT to a
// higher-order helper loses its value type — `sortBy(prop("w"))` types the key
// as `unknown`. For sort keys use a typed arrow (`sortBy((r) => r.w)`); for
// array projection use `pluck`. `prop` is for direct object access.
export function prop<K extends PropertyKey>(
  key: K,
): <T extends { [P in K]: unknown }>(obj: T) => T[K];
export function prop<T, K extends keyof T>(key: K, obj: T): T[K];
export function prop<K extends PropertyKey>(
  key: K,
  obj?: { [P in K]: unknown },
): unknown | ((obj: { [P in K]: unknown }) => unknown) {
  const run = (o: { [P in K]: unknown }): unknown => o[key];
  return arguments.length >= 2 ? run(obj as { [P in K]: unknown }) : run;
}
