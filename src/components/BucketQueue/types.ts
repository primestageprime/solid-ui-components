// BucketQueue — public props. One queue component: N always-present
// buckets, a flat `items` list bucketed by `bucketOf`, controlled selection /
// focus / checking, and a transfer animation played whenever an item's bucket
// changes. Supersedes SplitQueueList (see
// docs/superpowers/specs/2026-07-24-bucket-queue-merge-design.md).
import type { JSX } from "solid-js";
import type { Tone } from "../../types";

/** One bucket of the progression bar. */
export interface Bucket {
  /** Stable key; `bucketOf` returns one of these. */
  key: string;
  /** Header label. */
  label: string;
  /** Dot color beside the label — the ONLY role color (chrome stays neutral). */
  tone: Tone;
  /** Relative share of the height when the populated buckets overflow their
   *  content. Default 1. */
  weight?: number;
  /** When the queue is in select mode (`checkedKeys` present), rows in THIS
   *  bucket render the check affordance and a click toggles the check instead
   *  of selecting. Buckets without it keep selecting on click even in select
   *  mode. Default false. */
  selectable?: boolean;
  /** Copy for the collapsed strip when this bucket has no items. Omit for the
   *  bare summary line (label + count). */
  emptyLabel?: JSX.Element;
  /** Soft cap in rows: the bucket stops growing past this many rows and its
   *  body scrolls. Omit to shrink-wrap to content. Succeeds SplitQueueList's
   *  `topCapRows`. Unlike that pane, a capped bucket never grows past its cap
   *  to absorb slack from a short neighbour. */
  capRows?: number;
}

export interface BucketQueueProps<T> {
  /** Buckets top → bottom. Every bucket is always shown, with its count. */
  buckets: Bucket[];
  /** All items; each is bucketed into a bucket by `bucketOf`. An item whose
   *  bucket matches no bucket renders nowhere. */
  items: T[];
  /** Item → the `key` of the bucket it belongs in. Changing an item's bucket
   *  is what plays the transfer animation. */
  bucketOf: (item: T) => string;
  /** Stable identity for an item (selection, list keys, transfer tracking). */
  keyOf: (item: T) => string;
  /** Render an item's row content. */
  renderItem: (item: T) => JSX.Element;

  /** Selected item key (controlled) — its row gets the selected treatment. */
  selectedKey?: string;
  /** Fires with an item's key when its row is activated by click or Enter/Space
   *  outside select mode, and when the TRIAGE ADVANCE moves the selection —
   *  the selected item leaving its bucket advances the selection to the next
   *  item still waiting there (see ./selection).
   *
   *  Fires with `null` — and ONLY from the advance, never from an activation —
   *  when that move emptied the bucket being worked. There is no next item, so
   *  the consumer should clear its selection and show its own "queue empty"
   *  state. A consumer that would rather keep the finished row on screen can
   *  simply ignore the `null`. */
  onSelect?: (key: string | null) => void;

  /** Key of the keyboard-focused row (controlled roving focus). When omitted or
   *  stale, no row is painted focused, but the single tab stop still lands on a
   *  sensible row. */
  focusedKey?: string;
  /** Fires when keyboard focus moves. */
  onFocusChange?: (key: string | null) => void;

  /** PRESENCE turns select mode on — an empty Set means "mode on, nothing
   *  checked". Rows in `selectable` buckets then render the check affordance
   *  and reflect membership in this set. Omit for the plain click-to-select
   *  baseline. */
  checkedKeys?: ReadonlySet<string>;
  /** Fires when a checkable row is activated while select mode is on, carrying
   *  the modifiers (shift = range, meta/ctrl = toggle). The consumer owns
   *  range/anchor semantics. Never fires outside select mode or for a
   *  non-selectable bucket. */
  onToggleCheck?: (key: string, modifiers: { shift: boolean; meta: boolean }) => void;

  /** Set to a key present in any bucket to scroll that row into view. Reacts
   *  on CHANGE: set it (or bump it) to request a scroll, then clear it. No-op
   *  when undefined or when no row carries the key. */
  scrollToKey?: string;

  /** Total height in px. Omit to fill the parent (the root is `height:100%`,
   *  so it stretches to a definite-height flex / `height:100%` ancestor). */
  height?: number;
  class?: string;
}
