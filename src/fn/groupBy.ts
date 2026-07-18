// fn — groupBy (Depth 0, pure). Dual form (ruled 2026-07-18): curried
// `groupBy(keyFn)` for `pipe`, direct `groupBy(keyFn, array)` for immediate use.
// Buckets an array into a `Map` from key to the elements that produced it,
// preserving input order within each bucket. Empty input yields an empty Map.
// A Map (not a record) so non-string keys work and iteration order is the
// first-seen order of the keys. 2-ary dispatch on arguments.length.
export function groupBy<T, K>(
  keyFn: (value: T) => K,
): (array: readonly T[]) => Map<K, T[]>;
export function groupBy<T, K>(
  keyFn: (value: T) => K,
  array: readonly T[],
): Map<K, T[]>;
export function groupBy<T, K>(
  keyFn: (value: T) => K,
  array?: readonly T[],
): Map<K, T[]> | ((array: readonly T[]) => Map<K, T[]>) {
  const run = (arr: readonly T[]): Map<K, T[]> => {
    const out = new Map<K, T[]>();
    for (const el of arr) {
      const key = keyFn(el);
      const bucket = out.get(key);
      if (bucket) bucket.push(el);
      else out.set(key, [el]);
    }
    return out;
  };
  return arguments.length >= 2 ? run(array as readonly T[]) : run;
}
