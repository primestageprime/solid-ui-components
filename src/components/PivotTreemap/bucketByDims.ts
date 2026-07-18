// ============================================
// bucketByDims — pure data util for PivotTreemap.
//
// Buckets rows by an outer × inner dimension. Multi-valued tags (e.g. a row
// that returns both "SOLID-UI-COMPONENTS" and "DAG-CHART" for the FEATURE
// dim) contribute to *every* matching bucket — so summed child counts can
// exceed the row count when an axis is multi-valued. The library leaves
// that honesty to the caller; we don't dedupe.
//
// Pure: no JSX, no Solid imports beyond the type declarations carried in by
// the public API surface. Safe to import from server code.
// ============================================

import { sortBy } from "../../fn";

/** A row's accessor surface for one or more pivot dimensions. */
export interface PivotAccessors<T, Dim extends string> {
  /** Distinct dimension keys the user can pivot on. */
  dims: readonly Dim[];
  /** All values a row carries on a given dimension. Multi-valued returns
   *  multiple; single-valued returns 1; absent returns []. */
  values: (row: T, dim: Dim) => readonly string[];
}

/** Per-bucket metric tally configuration. */
export interface PivotMetrics<T> {
  /** Predicate counting "done" rows in a bucket. */
  done: (row: T) => boolean;
  /** Predicate counting "in flight" rows. Optional. */
  doing?: (row: T) => boolean;
}

export interface PivotBucket {
  key: string;
  total: number;
  /** Optional bucket-level tally. Present iff `metrics` was passed. */
  metrics?: { done: number; doing: number };
  children: PivotBucket[];
}

/** Bucket label used when a row has no value for the inner dim. */
export const EMPTY_INNER_KEY = "—";

const tally = <T>(rows: readonly T[], metrics: PivotMetrics<T> | undefined) => {
  if (!metrics) return undefined;
  let done = 0;
  let doing = 0;
  for (const r of rows) {
    if (metrics.done(r)) done += 1;
    if (metrics.doing?.(r)) doing += 1;
  }
  return { done, doing };
};

/**
 * Bucket rows by `outer` × `inner` dimension. Result is sorted by `total`
 * descending at every level. Children are independent buckets — a row with
 * multi-valued inner tags lands in multiple children, so summing children
 * may exceed the parent's `total`. The parent's `total` is the count of
 * distinct (row, outerValue) contributions, NOT a sum of children.
 */
export function bucketByDims<T, Dim extends string>(
  rows: readonly T[],
  outer: Dim,
  inner: Dim,
  accessors: PivotAccessors<T, Dim>,
  metrics?: PivotMetrics<T>,
): PivotBucket[] {
  const outerMap = new Map<string, T[]>();
  for (const r of rows) {
    for (const ov of accessors.values(r, outer)) {
      const arr = outerMap.get(ov);
      if (arr) arr.push(r);
      else outerMap.set(ov, [r]);
    }
  }
  const out: PivotBucket[] = [];
  for (const [ok, group] of outerMap) {
    const innerMap = new Map<string, T[]>();
    for (const r of group) {
      const ivs = accessors.values(r, inner);
      if (ivs.length === 0) {
        const arr = innerMap.get(EMPTY_INNER_KEY) ?? [];
        arr.push(r);
        innerMap.set(EMPTY_INNER_KEY, arr);
      } else {
        for (const iv of ivs) {
          const arr = innerMap.get(iv) ?? [];
          arr.push(r);
          innerMap.set(iv, arr);
        }
      }
    }
    const children: PivotBucket[] = [];
    for (const [ik, sub] of innerMap) {
      const child: PivotBucket = {
        key: ik,
        total: sub.length,
        children: [],
      };
      const m = tally(sub, metrics);
      if (m) child.metrics = m;
      children.push(child);
    }
    const bucket: PivotBucket = {
      key: ok,
      total: group.length,
      children: sortBy((c: PivotBucket) => -c.total)(children),
    };
    const m = tally(group, metrics);
    if (m) bucket.metrics = m;
    out.push(bucket);
  }
  return sortBy((b: PivotBucket) => -b.total)(out);
}
