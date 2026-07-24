// ProgressionQueue — public props. One queue component: N always-present
// sections, a flat `items` list bucketed by `bucketOf`, controlled selection /
// focus / checking, and a transfer animation played whenever an item's bucket
// changes. Supersedes SplitQueueList (see
// docs/superpowers/specs/2026-07-24-progression-queue-merge-design.md).
import type { JSX } from "solid-js";
import type { Tone } from "../../types";

/** One section of the progression bar. */
export interface ProgressionSection {
  /** Stable key; `bucketOf` returns one of these. */
  key: string;
  /** Header label. */
  label: string;
  /** Dot color beside the label — the ONLY role color (chrome stays neutral). */
  tone: Tone;
  /** Relative share of the height when the populated sections overflow their
   *  content. Default 1. */
  weight?: number;
  /** When the queue is in select mode (`checkedKeys` present), rows in THIS
   *  section render the check affordance and a click toggles the check instead
   *  of selecting. Sections without it keep selecting on click even in select
   *  mode. Default false. */
  selectable?: boolean;
  /** Copy for the collapsed strip when this section has no items. Omit for the
   *  bare summary line (label + count). */
  emptyLabel?: JSX.Element;
  /** Soft cap in rows: the section stops growing past this many rows and its
   *  body scrolls. Omit to shrink-wrap to content. Succeeds SplitQueueList's
   *  `topCapRows`. Unlike that pane, a capped section never grows past its cap
   *  to absorb slack from a short neighbour. */
  capRows?: number;
}

export interface ProgressionQueueProps<T> {
  /** Sections top → bottom. Every section is always shown, with its count. */
  sections: ProgressionSection[];
  /** All items; each is bucketed into a section by `bucketOf`. An item whose
   *  bucket matches no section renders nowhere. */
  items: T[];
  /** Item → the `key` of the section it belongs in. Changing an item's bucket
   *  is what plays the transfer animation. */
  bucketOf: (item: T) => string;
  /** Stable identity for an item (selection, list keys, transfer tracking). */
  keyOf: (item: T) => string;
  /** Render an item's row content. */
  renderItem: (item: T) => JSX.Element;

  /** Selected item key (controlled) — its row gets the selected treatment. */
  selectedKey?: string;
  /** Fires with an item's key when its row is activated by click or Enter/Space
   *  outside select mode. */
  onSelect?: (key: string) => void;

  /** Key of the keyboard-focused row (controlled roving focus). When omitted or
   *  stale, no row is painted focused, but the single tab stop still lands on a
   *  sensible row. */
  focusedKey?: string;
  /** Fires when keyboard focus moves. */
  onFocusChange?: (key: string | null) => void;

  /** PRESENCE turns select mode on — an empty Set means "mode on, nothing
   *  checked". Rows in `selectable` sections then render the check affordance
   *  and reflect membership in this set. Omit for the plain click-to-select
   *  baseline. */
  checkedKeys?: ReadonlySet<string>;
  /** Fires when a checkable row is activated while select mode is on, carrying
   *  the modifiers (shift = range, meta/ctrl = toggle). The consumer owns
   *  range/anchor semantics. Never fires outside select mode or for a
   *  non-selectable section. */
  onToggleCheck?: (key: string, modifiers: { shift: boolean; meta: boolean }) => void;

  /** Set to a key present in any section to scroll that row into view. Reacts
   *  on CHANGE: set it (or bump it) to request a scroll, then clear it. No-op
   *  when undefined or when no row carries the key. */
  scrollToKey?: string;

  /** Total height in px. Omit to fill the parent (the root is `height:100%`,
   *  so it stretches to a definite-height flex / `height:100%` ancestor). */
  height?: number;
  class?: string;
}
