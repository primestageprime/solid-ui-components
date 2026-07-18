// fn — sortBy (Depth 0, pure). Data-last, ascending, STABLE, and NON-MUTATING:
// it copies before sorting (native `Array.prototype.sort` mutates in place).
// `keyFn` projects each element to a comparable (number | string | bigint);
// elements compare by `<`/`>` on that key. For descending, negate a numeric
// key. Empty and single-element inputs return a fresh copy unchanged.
export function sortBy<T>(
  keyFn: (value: T) => number | string | bigint,
): (array: readonly T[]) => T[] {
  return (array) =>
    [...array].sort((a, b) => {
      const ka = keyFn(a);
      const kb = keyFn(b);
      return ka < kb ? -1 : ka > kb ? 1 : 0;
    });
}
