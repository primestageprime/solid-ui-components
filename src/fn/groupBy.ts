// fn — groupBy (Depth 0, pure). Data-last: `groupBy(keyFn)` returns a function
// bucketing an array into a `Map` from key to the elements that produced it,
// preserving input order within each bucket. Empty input yields an empty Map.
// A Map (not a record) so non-string keys work and iteration order is the
// first-seen order of the keys.
export function groupBy<T, K>(
  keyFn: (value: T) => K,
): (array: readonly T[]) => Map<K, T[]> {
  return (array) => {
    const out = new Map<K, T[]>();
    for (const el of array) {
      const key = keyFn(el);
      const bucket = out.get(key);
      if (bucket) bucket.push(el);
      else out.set(key, [el]);
    }
    return out;
  };
}
