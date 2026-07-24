// ProgressionQueue — bucketing. ONE pass over `items` produces BOTH the
// per-section row arrays the render needs AND the key → section map the
// transfer diff needs, so the two can never disagree about where an item is.
// (The accumulator is mutated locally; the function itself is pure.)

export interface Buckets<T> {
  /** Section key → its items in `items` order. Every section key is present. */
  bySection: Map<string, T[]>;
  /** Item key → the section key it landed in. Unknown buckets are omitted. */
  sectionOf: Map<string, string>;
}

export const bucketItems = <T>(
  items: readonly T[],
  sectionKeys: readonly string[],
  bucketOf: (item: T) => string,
  keyOf: (item: T) => string,
): Buckets<T> =>
  items.reduce<Buckets<T>>(
    (acc, item) => {
      // An item whose bucket matches no declared section renders nowhere.
      const rows = acc.bySection.get(bucketOf(item));
      if (!rows) return acc;
      rows.push(item);
      acc.sectionOf.set(keyOf(item), bucketOf(item));
      return acc;
    },
    {
      bySection: new Map(sectionKeys.map((k) => [k, [] as T[]])),
      sectionOf: new Map(),
    },
  );
