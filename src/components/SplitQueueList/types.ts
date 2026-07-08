/* SplitQueueList — public props. Shared by the animated queue (./SplitQueueList)
 * and the static layout (./StaticSplitLayout) so neither imports the other. */
import type { JSX } from "solid-js";

export interface SplitQueueListProps<T> {
  /** Resolved (processed) items — rendered top list, oldest first. Required for
   * the animated queue; ignored in `static` mode (use `topItems`). */
  resolved?: T[];
  /** Unresolved (to-process) items — rendered bottom list, next first. Required
   * for the animated queue; ignored in `static` mode (use `bottomContent`). */
  unresolved?: T[];
  /** Render an item's content. Required for the animated queue; in `static` mode
   * the top uses `renderTop` (falling back to this). */
  renderItem?: (item: T) => JSX.Element;
  /** Stable identity for an item — drives the resolve animation. Required for the
   * animated queue; optional in `static` mode. */
  keyOf?: (item: T) => string;
  /** Key of the focused unresolved item (controlled) — the row painted with the
   * orange ▸ fill. When omitted/stale NO row is painted focused (the highlight is
   * strictly opt-in), though the keyboard's default tab stop still lands on the
   * unresolved head. */
  focusedKey?: string;
  /** Fires when focus should move (e.g. after a resolve auto-advances). */
  onFocusChange?: (key: string | null) => void;
  /** DEPRECATED — clicking a row no longer resolves it. Resolve/unresolve are
   * driven by the consumer mutating the arrays (the component detects + animates
   * the swap). Kept optional for back-compat; unused. */
  onResolve?: (key: string) => void;
  /** Key of the user-SELECTED card in EITHER panel (controlled). The matching
   * resolved-or-unresolved row gets `sui-sql__row--selected` (a subtle ring,
   * distinct from the focused orange ▸ fill). Drives a consumer-owned detail
   * panel. */
  selectedKey?: string;
  /** Fires when ANY row is clicked (resolved or unresolved), with its key. The
   * consumer typically sets `selectedKey` from this and opens a detail panel. */
  onSelect?: (key: string) => void;
  /** When set to a key present in either list, that row is scrolled into view.
   * Reacts on CHANGE — set it (or bump it) to request a scroll, then clear it.
   * No-op when undefined or when no row carries the key. Default behavior (no
   * auto-scroll) is unchanged when omitted. */
  scrollToKey?: string;
  /** Turns the unresolved list into a multi-SELECT surface (bag-of-stuff
   *  grouping). Default false: no selection affordance is rendered and a row
   *  click OPENS the item (`onSelect`) — the baseline behavior. When true, an
   *  unresolved row shows a check indicator + highlight for its `checkedKeys`
   *  membership and a row click TOGGLES selection (via `onToggleCheck`) instead
   *  of opening. Callers that never pass it are unaffected. */
  selectMode?: boolean;
  /** Membership set the select-mode check indicator / highlight reflects. Read
   *  only while `selectMode` is true; the consumer owns the set. */
  checkedKeys?: ReadonlySet<string>;
  /** Fires when an unresolved row is clicked WHILE `selectMode` is true, carrying
   *  the click modifiers (shift = range, ctrl/cmd = toggle) — the consumer owns
   *  range/anchor semantics. Never fires outside select mode. */
  onToggleCheck?: (key: string, modifiers: { shift: boolean; meta: boolean }) => void;
  /** Header label for the resolved (top) list. Default "Resolved". */
  resolvedLabel?: string;
  /** Header label for the unresolved (bottom) list. Default "Unresolved". */
  unresolvedLabel?: string;
  /** Copy for the collapsed strip when nothing is left to process. */
  allClearLabel?: JSX.Element;
  /**
   * @deprecated Use the standalone {@link StaticSplitLayoutProps | StaticSplitLayout}
   * component instead. `static` gates a completely different, non-animated layout
   * behind a boolean, leaving the queue-only and static-only props all optional and
   * mutually mixable; the dedicated component makes the invalid combinations
   * unrepresentable. This flag still works (it delegates to StaticSplitLayout) and
   * will be removed in the next major.
   */
  static?: boolean;
  /** @deprecated STATIC mode only — see {@link StaticSplitLayoutProps}. Items for
   * the read-only TOP section; falls back to `resolved` when omitted. */
  topItems?: T[];
  /** @deprecated STATIC mode only — see {@link StaticSplitLayoutProps}. Renders a
   * TOP item's content; falls back to `renderItem` when omitted. */
  renderTop?: (item: T) => JSX.Element;
  /** @deprecated STATIC mode only — see {@link StaticSplitLayoutProps}. Arbitrary
   * content for the BOTTOM section (nested as-is below the seam). */
  bottomContent?: JSX.Element;
  /** Soft cap on the top (resolved) pane, in rows. Beyond this the top pane
   * scrolls with the newest row pinned at the seam. Default 3. */
  topCapRows?: number;
  /** Floor on the top pane, in rows. Default 0 — at 0 categorized the top
   * collapses to its header only and grows as cards resolve. */
  topFloorRows?: number;
  /** Per-row height in px. Used as the initial estimate; the component measures
   * the real rendered row height and sizes from that. Default 40. */
  rowHeight?: number;
  /** Total height of the sidebar in px. Optional — when omitted, the sidebar
   * fills its parent (root is `height:100%`) and measures the parent-allotted
   * height as its layout total, stretching to the bottom of a flex / `height:100%`
   * container. 420 is only the pre-measure / unmeasurable floor (e.g. jsdom). */
  height?: number;
  /** Slide duration in ms. Default 800. */
  animationMs?: number;
  /** Render ONLY the top (resolved / "categorized") panel at full height —
   * omit the bottom "to categorize" list and the seam. The resolve animation's
   * enter/grow into the top still plays; the bottom-collapse half is naturally
   * skipped (there is no bottom list). Default false (full two-panel layout,
   * baseline behavior unchanged). */
  topOnly?: boolean;
  class?: string;
}

/**
 * Props for {@link StaticSplitLayout} — a non-animated "two stacked labeled
 * sections with a seam" layout: a read-only TOP list of recent items over an
 * arbitrary BOTTOM block you compose. It shares SplitQueueList's chrome (labeled
 * top section + seam + bottom section, house style) but none of the queue
 * machinery — no resolve/unresolve animation, no selection, no keyboard. Use it
 * when you want that framing around a list of recent items and a bottom block.
 *
 * A dedicated component (rather than a `static` flag on SplitQueueList) so the
 * queue-only and static-only props can't be mixed — invalid combinations are
 * unrepresentable.
 */
export interface StaticSplitLayoutProps<T> {
  /** Items for the read-only TOP section (recent / done), oldest first. */
  items?: T[];
  /** Render a TOP item's content. */
  renderItem?: (item: T) => JSX.Element;
  /** Arbitrary content for the BOTTOM section, nested as-is below the seam. */
  bottomContent?: JSX.Element;
  /** Header label for the TOP section. Default "Resolved". */
  label?: string;
  /** Copy shown in the TOP section when `items` is empty. Default "Nothing yet". */
  emptyLabel?: JSX.Element;
  /** Soft cap on the TOP section, in rows; beyond it the section scrolls. Default 3. */
  capRows?: number;
  /** Per-row height in px (initial estimate; the real height is measured). Default 40. */
  rowHeight?: number;
  /** Total height in px. Omit to fill the parent. */
  height?: number;
  class?: string;
}
