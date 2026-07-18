// fn — sortBy (Depth 0, pure). Dual form (ruled 2026-07-18): curried `sortBy(keyFn)`
// for `pipe`, direct `sortBy(keyFn, array)` for immediate use (preferred over
// `[...array].sort(cmp)`). Ascending, STABLE, and NON-MUTATING: it copies before
// sorting (native `Array.prototype.sort` mutates in place). `keyFn` projects each
// element to a comparable (number | string | bigint); descending = negate a
// numeric key. In the direct form the element type is inferred from the array,
// so `keyFn`'s parameter needs no annotation. 2-ary dispatch on arguments.length.
export function sortBy<T>(
  keyFn: (value: T) => number | string | bigint,
): (array: readonly T[]) => T[];
export function sortBy<T>(
  keyFn: (value: T) => number | string | bigint,
  array: readonly T[],
): T[];
export function sortBy<T>(
  keyFn: (value: T) => number | string | bigint,
  array?: readonly T[],
): T[] | ((array: readonly T[]) => T[]) {
  const run = (arr: readonly T[]): T[] =>
    [...arr].sort((a, b) => {
      const ka = keyFn(a);
      const kb = keyFn(b);
      return ka < kb ? -1 : ka > kb ? 1 : 0;
    });
  return arguments.length >= 2 ? run(array as readonly T[]) : run;
}
