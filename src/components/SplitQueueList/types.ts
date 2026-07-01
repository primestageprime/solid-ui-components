/* SplitQueueList — public props. Shared by the animated queue (./SplitQueueList)
 * and the static layout (./StaticSplitLayout) so neither imports the other. */
import { JSX } from "solid-js";

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
  /** Key of the focused unresolved item (controlled). Falls back to the
   * top of the unresolved list when omitted/stale. */
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
  /** Header label for the resolved (top) list. Default "Resolved". */
  resolvedLabel?: string;
  /** Header label for the unresolved (bottom) list. Default "Unresolved". */
  unresolvedLabel?: string;
  /** Copy for the collapsed strip when nothing is left to process. */
  allClearLabel?: JSX.Element;
  /** STATIC mode — a non-animated "two stacked labeled sections with a seam"
   * layout. There is no processing queue, no resolve/unresolve animation, and no
   * array diffing: the TOP section is a read-only list rendered from `topItems`
   * via `renderTop` (falls back to `resolved`/`renderItem` when omitted), and the
   * BOTTOM section is arbitrary `bottomContent` children. Use this when you want
   * SplitQueueList's framing (labeled top section + seam + bottom section, all in
   * the house style) around a top list of recent items and a bottom block you
   * compose yourself. The top section scrolls within `topCapRows`; the bottom
   * takes the remaining space and scrolls. Default false (the animated queue). */
  static?: boolean;
  /** STATIC mode only — items for the read-only TOP section. Falls back to
   * `resolved` when omitted. */
  topItems?: T[];
  /** STATIC mode only — render a TOP item's content. Falls back to `renderItem`
   * when omitted. */
  renderTop?: (item: T) => JSX.Element;
  /** STATIC mode only — arbitrary content for the BOTTOM section (nested as-is
   * below the seam). */
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
  /** Total height of the sidebar in px. Default 420. */
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
