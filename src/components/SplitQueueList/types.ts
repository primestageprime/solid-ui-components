/* SplitQueueList — public props. Shared by the animated queue (./SplitQueueList)
 * and the static layout (./StaticSplitLayout) so neither imports the other. */
import type { JSX } from "solid-js";

/**
 * @deprecated Use `BucketQueueProps` — `SplitQueueList` is now a shim over
 * {@link BucketQueue} and is removed in the next major. `topCapRows` maps
 * to the resolved section's `capRows`; `topOnly`, `topFloorRows`, `animationMs`
 * and `rowHeight` are accepted but IGNORED on the animated path (the merged
 * component measures rows, collapses empty sections, and owns its own
 * motion). `static` mode is a separate story: it still delegates to
 * StaticSplitLayout (not deprecated), which keeps forwarding and actively
 * using both `rowHeight` and `topCapRows` — only `topOnly`, `topFloorRows`,
 * and `animationMs` go unread there too.
 */
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
  /** Key of the focused unresolved item (controlled) — the row painted with a
   * `1px` focus outline. When omitted/stale NO row is painted focused (the
   * highlight is strictly opt-in), though the keyboard's default tab stop still
   * lands on the unresolved head. */
  focusedKey?: string;
  /** Fires when focus should move (e.g. after a resolve auto-advances). */
  onFocusChange?: (key: string | null) => void;
  /** DEPRECATED — clicking a row no longer resolves it. Resolve/unresolve are
   * driven by the consumer mutating the arrays (the component detects + animates
   * the swap). Kept optional for back-compat; unused. */
  onResolve?: (key: string) => void;
  /** Key of the user-SELECTED card in EITHER panel (controlled). The matching
   * resolved-or-unresolved row gets an inset accent-colored bar (no fill),
   * distinct from the focused row's outline. Drives a consumer-owned detail
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
  /** Soft cap on the top (resolved) pane, in rows. Maps to the resolved
   * section's `capRows`: beyond this many rows the section holds at
   * `header + capRows × rowHeight` and its body scrolls, rather than growing
   * further. Unlike the old top pane, it never grows past the cap to absorb
   * slack from a short bottom pane. Default 3. */
  topCapRows?: number;
  /** Floor on the top pane, in rows. Default 0 — at 0 categorized the top
   * collapses to its header only and grows as cards resolve.
   * IGNORED — `BucketQueue` sizes a section from its own content
   * (`capRows` only sets a ceiling, not a floor) and `static` mode has no
   * equivalent either. Kept only so existing call sites keep compiling. */
  topFloorRows?: number;
  /** Per-row height in px, used as the initial layout estimate before the real
   * rendered row height is measured. Default 40.
   * IGNORED on the animated path — `BucketQueue` measures its own row
   * height and sizes from that. Still read (and used the same way) in `static`
   * mode by `StaticSplitLayout`. */
  rowHeight?: number;
  /** Total height of the sidebar in px. Optional — when omitted, the sidebar
   * fills its parent (root is `height:100%`), stretching to the bottom of a
   * flex / `height:100%` container. On the animated path `BucketQueue`
   * additionally measures the parent-allotted height via `ResizeObserver` to
   * drive its water-fill sizing; there is no fallback floor, so before that
   * first measurement (e.g. jsdom, or a not-yet-laid-out parent) the allotted
   * height reads as 0. */
  height?: number;
  /** Slide duration in ms. Default 800.
   * IGNORED — `BucketQueue` owns its own motion; there is no dial for it.
   * Kept only so existing call sites keep compiling. */
  animationMs?: number;
  /** Render ONLY the top (resolved / "categorized") panel at full height —
   * omit the bottom "to categorize" list and the seam. Default false.
   * IGNORED — the shim always declares both sections and `BucketQueue`
   * renders every declared section, so the bottom list is never omitted.
   * `static` mode has no equivalent either (compose `bottomContent` yourself
   * there). Kept only so existing call sites keep compiling. */
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
