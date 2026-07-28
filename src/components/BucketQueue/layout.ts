// BucketQueue — the sizing model (pure, testable).
// A weighted water-fill (ruled 2026-07-22): populated buckets shrink-wrap when
// they fit; when the populated buckets' content overflows the available height
// they share it by weight, each CAPPED at its content, with the surplus from
// any bucket that shrinks under its share redistributed to the ones still
// short. Empty buckets are fixed at their summary-line (natural) height.
// A bucket may opt out of shrink-wrapping with `fill` (added 2026-07-28), in
// which case it claims the height left over once everyone is at their natural.

import { filter, find, flatMap, map, sum } from "../../fn";

/** Top + bottom border of a bucket box (`.bucket-queue__bucket`, 1px each). */
const BORDERS = 2;

export interface NaturalInput {
  /** Item count per bucket; 0 collapses the bucket to its summary line. */
  counts: number[];
  /** MEASURED height of a row in each bucket, index-aligned; null where that
   *  bucket has nothing to measure yet (empty, or the frame before its first
   *  row mounts). Per-bucket rather than one global sample because rows are the
   *  consumer's JSX: a queue can perfectly well pair one-line rows in one
   *  bucket with two-line rows in the next, and one sample applied to both
   *  mis-sizes whichever bucket it was not taken from. */
  rowHeights: (number | null)[];
  /** `Bucket.capRows` per bucket, null for none. */
  capRows: (number | null)[];
  /** Whether each bucket declares an `emptyLabel`. */
  hasEmptyLabel: boolean[];
  /** Measured header height. */
  headH: number;
  /** Measured empty-strip height, or null before one exists to measure. */
  emptyH: number | null;
  /** Row height for a bucket with no sample of its own AND no sibling's. */
  rowFallback: number;
}

/** Each bucket's CONTENT height — what it would take if nothing constrained it.
 *  The water-fill below allocates against these. */
export const naturalHeights = ({
  counts,
  rowHeights,
  capRows,
  hasEmptyLabel,
  headH,
  emptyH,
  rowFallback,
}: NaturalInput): number[] => {
  // Fallback chain: this bucket's own sample → the first real sample anywhere
  // in the queue → the tuned constant. A sibling's measurement is a guess, but
  // it is a guess drawn from this consumer's actual rows; the constant is not.
  const sampled = find((h: number | null) => h != null, rowHeights) ?? rowFallback;
  const rowH = (i: number): number => rowHeights[i] ?? sampled;
  return map((c: number, i: number) => {
    // Empty: the summary line, plus the empty strip if declared. The strip is
    // MEASURED, not assumed to be one row tall — `emptyLabel` is consumer JSX
    // and can wrap. rowH is only the fallback before a strip exists to measure.
    if (c === 0)
      return headH + (hasEmptyLabel[i] ? (emptyH ?? rowH(i)) : 0) + BORDERS;
    // `capRows` caps the bucket's NATURAL height, so it holds at the cap and
    // its body scrolls; the weighted water-fill below is unchanged.
    const cap = capRows[i];
    const rows = cap != null ? Math.min(c, Math.max(1, cap)) : c;
    return headH + rows * rowH(i) + BORDERS;
  }, counts);
};

/** Fold this frame's live row samples over the ones already held, in bucket
 *  order. A bucket with nothing measurable RIGHT NOW keeps its last real
 *  height instead of dropping out.
 *
 *  That retention is the point. Rows are re-created whenever `buckets` or
 *  `items` gets a new identity, and the replacement's height only arrives on
 *  the ResizeObserver's next delivery — never, in a backgrounded tab. A bucket
 *  that vanished from the map for that window fell back to a SIBLING's row
 *  height, which in a queue of one-line rows above two-line rows is visibly
 *  wrong. A stale measurement of this bucket's own row beats a fresh one of
 *  somebody else's; the bucket's next row overwrites it either way. */
export const retainRowHeights = (
  keys: string[],
  measured: ReadonlyMap<string, number>,
  prev: ReadonlyMap<string, number>,
): ReadonlyMap<string, number> =>
  new Map(
    flatMap((key: string) => {
      const h = measured.get(key) || prev.get(key);
      return h ? [[key, h] as const] : [];
    }, keys),
  );

export interface AllocateInput {
  /** Content height per bucket — header-only for an empty bucket. */
  natural: number[];
  /** Item count per bucket; 0 collapses the bucket to its summary line. */
  counts: number[];
  /** Relative overflow share per bucket (only used when content overflows). */
  weights: number[];
  /** Total height the bar fills. */
  available: number;
  /** Gap between buckets, px. */
  gap: number;
  /** `Bucket.fill` per bucket. Once every bucket has been allocated up to its
   *  natural height, whatever is left over is split among the POPULATED fill
   *  buckets in proportion to `weight`. Omit (or leave every entry false) and
   *  the leftover stays unallocated — the shrink-wrap this model shipped with. */
  fills?: boolean[];
}

export const allocateHeights = ({
  natural,
  counts,
  weights,
  available,
  gap,
  fills,
}: AllocateInput): number[] => {
  const out = [...natural];
  const weightOf = (i: number): number => weights[i] || 1;
  let pool = available - gap * Math.max(0, natural.length - 1);
  const active: number[] = [];
  for (let i = 0; i < natural.length; i++) {
    if (counts[i] === 0) pool -= natural[i]; // empty: fixed at its summary line
    else {
      out[i] = 0;
      active.push(i);
    }
  }
  let remaining = active;
  while (remaining.length && pool > 0.5) {
    const wSum = sum(map(weightOf, remaining));
    let capped = -1;
    for (const i of remaining) {
      const share = (pool * weightOf(i)) / wSum;
      if (share >= natural[i] - out[i] - 0.5) {
        capped = i;
        break;
      }
    }
    if (capped >= 0) {
      const room = natural[capped] - out[capped];
      out[capped] += room;
      pool -= room;
      remaining = filter((i: number) => i !== capped, remaining);
    } else {
      for (const i of remaining) out[i] += (pool * weightOf(i)) / wSum;
      pool = 0;
    }
  }
  // Every bucket now sits at (at most) its natural height, so anything left in
  // the pool is height NOBODY wants — the dead band under a shrink-wrapped
  // queue. `fill` claims it. Only populated buckets qualify: an empty bucket is
  // deliberately pinned to its summary line, and stretching a "nothing here"
  // strip over half the pane is not what filling is for. No qualifying bucket
  // (none declared, or every one of them empty) → the pool stays unallocated,
  // exactly as before `fill` existed.
  const filling = filter(
    (i: number) => fills?.[i] === true && counts[i] !== 0,
    active,
  );
  if (pool > 0.5 && filling.length) {
    const wSum = sum(map(weightOf, filling));
    for (const i of filling) out[i] += (pool * weightOf(i)) / wSum;
  }
  return out;
};
