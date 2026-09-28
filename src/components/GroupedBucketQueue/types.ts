// GroupedBucketQueue — public props. Composes BucketQueue's row semantics
// (selection, roving-tabindex keyboard nav, triage-advance) over a NESTED
// tree of collapsible group headers instead of BucketQueue's one flat level
// of buckets. See ./groupTree for the pure tree core and ../BucketQueue for
// the row semantics this reuses directly (not re-exported publicly — this
// component imports BucketQueue's internal ./keyboard and ./selection
// modules by relative path, so BucketQueue's own public surface is
// untouched).
import type { JSX } from "solid-js";
import type { GroupNode } from "./groupTree";

export interface GroupedBucketQueueProps<T> {
  /** The nested group tree, top to bottom. A leaf (`bucketKey` set) is where
   *  `items` land; a branch (`children` set) is a pure header. */
  groups: readonly GroupNode[];
  /** All items; each is bucketed into a LEAF group by `bucketOf`. An item
   *  whose bucket matches no leaf renders nowhere (mirrors BucketQueue). */
  items: T[];
  /** Item → the `bucketKey` of the leaf group it belongs in. */
  bucketOf: (item: T) => string;
  /** Stable identity for an item (selection, list keys, advance tracking). */
  keyOf: (item: T) => string;
  /** Render an item's row content. */
  renderItem: (item: T) => JSX.Element;

  /** Selected item key (controlled) — its row gets the selected treatment. */
  selectedKey?: string;
  /** Fires with an item's key when its row is activated by click or
   *  Enter/Space outside select mode, and when triage-advance moves the
   *  selection after the selected item's bucket changes (see ./advance). */
  onSelect?: (key: string | null) => void;
  /** Controlled roving-tabindex focus. */
  focusedKey?: string;
  onFocusChange?: (key: string | null) => void;

  /** Select mode is on iff this is present — an empty Set means "mode on,
   *  nothing checked" (mirrors BucketQueue). Applies only within a leaf group
   *  whose `GroupLeafNode.selectable` is true. */
  checkedKeys?: ReadonlySet<string>;
  onToggleCheck?: (
    key: string,
    modifiers: { shift: boolean; meta: boolean },
  ) => void;
  /** Per-item veto, consulted only in a selectable leaf while select mode is
   *  on. Fail-open: omit, or return true, and every row stays checkable. */
  isCheckable?: (item: T) => boolean;
  uncheckableReason?: (item: T) => string | undefined;

  /** Scroll a row into view on change (mirrors BucketQueue). */
  scrollToKey?: string;
  class?: string;
}
