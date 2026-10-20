// fn — sortWith (Depth 0, pure). Dual form (ruled 2026-07-18): curried `sortWith(compare)`
// for `pipe`, direct `sortWith(compare, array)` for immediate use. Like `sortBy` but takes a
// full comparator `(a, b) => number` for orderings a single key cannot express. STABLE and
// NON-MUTATING: it copies before sorting. 2-ary dispatch on arguments.length. Not re-exported
// from the `fn` barrel; the list-detail kit imports it directly.
export function sortWith<T>(
  compare: (a: T, b: T) => number,
): (array: readonly T[]) => T[];
export function sortWith<T>(
  compare: (a: T, b: T) => number,
  array: readonly T[],
): T[];
export function sortWith<T>(
  compare: (a: T, b: T) => number,
  array?: readonly T[],
): T[] | ((array: readonly T[]) => T[]) {
  const run = (arr: readonly T[]): T[] => [...arr].sort(compare);
  return arguments.length >= 2 ? run(array as readonly T[]) : run;
}
