// BucketQueue — "what moved", as a pure map diff. An item MOVED iff it was
// present before and its bucket changed; adds, removes and intra-bucket
// reorders are not moves. Because a move is one atomic mutation of `items`,
// there is no intermediate state where an item belongs to no bucket — the
// whole class of two-array-diff bugs SplitQueueList defended against cannot
// arise here.
import { flatMap } from "../../fn";

export interface Transfer {
  key: string;
  /** Bucket key it left. */
  from: string;
  /** Bucket key it landed in. */
  to: string;
  /** +1 = moved DOWN the bucket order, -1 = moved UP. */
  direction: 1 | -1;
}

export const diffTransfers = (
  prev: ReadonlyMap<string, string>,
  next: ReadonlyMap<string, string>,
  bucketOrder: readonly string[],
): Transfer[] =>
  flatMap(([key, to]) => {
    const from = prev.get(key);
    if (from === undefined || from === to) return [];
    const delta = bucketOrder.indexOf(to) - bucketOrder.indexOf(from);
    if (delta === 0) return [];
    return [{ key, from, to, direction: delta > 0 ? 1 : -1 } as Transfer];
  }, [...next]);
