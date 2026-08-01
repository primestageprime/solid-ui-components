// BucketQueue — which buckets render as a collapsed summary line, and the
// user's toggle, as pure data.
//
// Collapse has TWO independent sources and this module deliberately reports
// only ONE of them. An EMPTY bucket collapses automatically and shows its
// `emptyLabel`; a `collapsible` bucket collapses because the user said so and
// shows nothing but its header. They size identically — see ./layout, where
// both are pinned to the summary line and kept out of the water-fill — but
// they RENDER differently, so merging them here would put a chevron on an
// empty bucket that has nothing to expand into.
import { map } from "../../fn";

/** The `Bucket` fields this module reads. Structural rather than `Bucket`
 *  itself so the decision stays testable without building whole buckets. */
export interface CollapsibleBucket {
  key: string;
  collapsible?: boolean;
  collapsedByDefault?: boolean;
}

/** The user's per-bucket choice, keyed by bucket key. A bucket ABSENT from
 *  this map is one the user has never toggled — which is not the same as one
 *  they toggled open, and is why this is a map rather than a set. */
export type CollapseOverrides = ReadonlyMap<string, boolean>;

export interface CollapseInput {
  buckets: readonly CollapsibleBucket[];
  /** Item count per bucket, index-aligned with `buckets`. */
  counts: readonly number[];
  overrides: CollapseOverrides;
}

/** Index-aligned with `buckets`: is this bucket rendering as a MANUALLY
 *  collapsed summary line right now?
 *
 *  `collapsedByDefault` is only the state before the user has touched the
 *  bucket — deliberately not "the value at mount". A bucket that is empty at
 *  mount and receives its first item later has still never been touched and
 *  must start collapsed, which a mount-time read would get wrong. */
export const collapsedFlags = ({
  buckets,
  counts,
  overrides,
}: CollapseInput): boolean[] =>
  map((bucket: CollapsibleBucket, i: number) => {
    if (bucket.collapsible !== true) return false;
    if ((counts[i] ?? 0) === 0) return false;
    return overrides.get(bucket.key) ?? bucket.collapsedByDefault === true;
  }, buckets);

/** Record the user's toggle. Their choice STICKS for the life of the
 *  component — including across the bucket draining to empty and refilling.
 *  If they expanded the pile, they wanted it expanded; the component does not
 *  undo user intent. */
export const toggleCollapse = (
  overrides: CollapseOverrides,
  bucketKey: string,
  currentlyCollapsed: boolean,
): CollapseOverrides => new Map(overrides).set(bucketKey, !currentlyCollapsed);
