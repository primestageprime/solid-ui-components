// BucketQueue — bucketing. ONE pass over `items` produces BOTH the
// per-bucket row arrays the render needs AND the key → bucket map the
// transfer diff needs, so the two can never disagree about where an item is.
// (The accumulator is mutated locally; the function itself is pure.)

export interface BucketIndex<T> {
  /** Bucket key → its items in `items` order. Every bucket key is present. */
  byBucket: Map<string, T[]>;
  /** Item key → the bucket key it landed in. Unknown buckets are omitted. */
  bucketByKey: Map<string, string>;
}

export const bucketItems = <T>(
  items: readonly T[],
  bucketKeys: readonly string[],
  bucketOf: (item: T) => string,
  keyOf: (item: T) => string,
): BucketIndex<T> =>
  items.reduce<BucketIndex<T>>(
    (acc, item) => {
      // An item whose bucket matches no declared bucket renders nowhere.
      const rows = acc.byBucket.get(bucketOf(item));
      if (!rows) return acc;
      rows.push(item);
      acc.bucketByKey.set(keyOf(item), bucketOf(item));
      return acc;
    },
    {
      byBucket: new Map(bucketKeys.map((k) => [k, [] as T[]])),
      bucketByKey: new Map(),
    },
  );
