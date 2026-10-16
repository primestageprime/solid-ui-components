// Curried variants of BucketQueue. BucketQueue is generic over its item type,
// so a variant is a generic component, not a createX() result.
import type { JSX } from "solid-js";
import { BucketQueue } from "./BucketQueue";
import type { BucketQueueProps } from "./types";

/** BucketQueue for a narrow side pane: 11px headers, 20px rows (2px x 8px
 *  padding, 16px line), 12px text and a 4px gap between buckets. Pair its
 *  rows with `CompactLabel` (and `TextSublabel` for a muted row). */
export function CompactBucketQueue<T>(
  props: Omit<BucketQueueProps<T>, "density">,
): JSX.Element {
  return <BucketQueue<T> {...props} density="compact" />;
}
