// fn — pluck (Depth 0, pure). Dual form (ruled 2026-07-18): curried `pluck(key)`
// for `pipe`, direct `pluck(key, array)` for immediate use (preferred over
// `array.map(x => x.key)`). Collects one property across the array. In the
// direct form the element type is inferred from the array, so the property's
// value type is recovered. 2-ary dispatch on arguments.length.
export function pluck<K extends PropertyKey>(
  key: K,
): <T extends { [P in K]: unknown }>(array: readonly T[]) => T[K][];
export function pluck<K extends PropertyKey, T extends { [P in K]: unknown }>(
  key: K,
  array: readonly T[],
): T[K][];
export function pluck<K extends PropertyKey>(
  key: K,
  array?: readonly { [P in K]: unknown }[],
): unknown[] | ((array: readonly { [P in K]: unknown }[]) => unknown[]) {
  const run = (arr: readonly { [P in K]: unknown }[]): unknown[] =>
    arr.map((el) => el[key]);
  return arguments.length >= 2
    ? run(array as readonly { [P in K]: unknown }[])
    : run;
}
