import {
  Component,
  For,
  Show,
  JSX,
  createMemo,
  createSignal,
  createEffect,
  on,
  onMount,
  onCleanup,
} from "solid-js";
import { computeSplitLayout, computeEnterFrame } from "./layout";
import "./SplitQueueList.css";

/**
 * SplitQueueList — a linked two-list "processing queue" sidebar.
 *
 * One sidebar, two stacked lists sharing a fixed height. The TOP list holds
 * *resolved* (processed) items; the BOTTOM list holds *unresolved* (to-process)
 * items. The user works the bottom; resolving an item appends it to the BOTTOM
 * of the top list (at the seam between the two), so the most-recent work sits
 * adjacent to what's next and is one click away to revisit.
 *
 * Sizing (see ./layout.ts for the testable core; the component measures the
 * real header/row heights and re-measures on container resize via ResizeObserver):
 *  - The TOP list is content-driven between a 1-row floor and a 3-row cap: 0
 *    categorized still shows 1 row of space; 1/2/3 grow to fit; 4+ caps at 3 and
 *    the pane scrolls so the NEWEST row sits flush at the seam (newest-at-seam).
 *  - The BOTTOM list gets the remaining space and scrolls when overfull.
 *  - The cap holds only while the bottom has enough content to fill its area;
 *    when the bottom is short it shrinks to its content and the freed slack flows
 *    UP, so the top may grow past 3 rows.
 *  - When the bottom is empty, it collapses to a thin "all clear" strip.
 *
 * Animation (SUI owns it — the consumer just swaps the two arrays):
 *  When a key leaves `unresolved` and appears in `resolved`, the component
 *  FLIP-animates it from its old spot up across the seam to the bottom of the
 *  resolved list. During the slide it paints TWO clipped copies — one styled
 *  as unresolved (clipped by the bottom list's top edge) and one styled as
 *  resolved (emerging from the top list's bottom edge) — so the row visually
 *  *repaints* as it crosses the seam. Honors `prefers-reduced-motion`.
 *
 * Generic over the item type `T`; pass `keyOf` for identity and `renderItem`
 * for content.
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

const SEAM_HEIGHT = 2;

interface FlightState {
  key: string;
  /** translateY applied at frame 0 (old-minus-new), animated to 0. */
  fromY: number;
  content: JSX.Element;
}

export function SplitQueueList<T>(props: SplitQueueListProps<T>): JSX.Element {
  // Internal accessors so the animated queue can read the (now optional) data
  // props safely. The animated path requires them; `static` mode ignores them.
  const resolvedItems = (): T[] => props.resolved ?? [];
  const unresolvedItems = (): T[] => props.unresolved ?? [];
  const keyOf = (item: T): string => (props.keyOf ?? ((x) => String(x)))(item);
  const renderItemFn = (item: T): JSX.Element =>
    (props.renderItem ?? (() => null))(item);

  const rowHeightProp = () => props.rowHeight ?? 40;
  const topCapRows = () => props.topCapRows ?? 3;
  const topFloorRows = () => props.topFloorRows ?? 0;
  const height = () => props.height ?? 420;
  const animationMs = () => props.animationMs ?? 800;

  let topListEl: HTMLUListElement | undefined;
  let rootEl: HTMLDivElement | undefined;
  // True while a resolve animation owns the top list's scrollTop (its scroll-up
  // tween, or a grow that ends by sitting at the bottom). The scroll-pin effect
  // skips its snap-to-bottom while this is set, so it can't race the tween and
  // collapse it to an instant jump. Always cleared at settle / instant-return.
  let scrollAnimating = false;
  // The top header is always rendered (the bottom one disappears when the queue
  // collapses), and both share the same `.sui-sql__header` metrics, so we
  // measure this one. We also measure a real row to size from actual rendered
  // height (the earlier clip bug was rows overflowing their configured slot).
  let headerProbeEl: HTMLLIElement | undefined;

  // Rects of every keyed row captured on the previous render — the "First" in
  // FLIP. Read synchronously before the data swap reflows the DOM.
  const prevRects = new Map<string, DOMRect>();

  // Measured header / row heights. Seeded with sensible defaults so the first
  // paint (before measurement) is close; the effects below replace them with
  // exact measured values, and the container ResizeObserver re-measures on
  // resize.
  const DEFAULT_HEADER_HEIGHT = 28;
  const [headerHeight, setHeaderHeight] = createSignal(DEFAULT_HEADER_HEIGHT);
  const [rowHeight, setRowHeight] = createSignal(rowHeightProp());

  const measure = () => {
    if (headerProbeEl) {
      const h = headerProbeEl.getBoundingClientRect().height;
      if (h > 0) setHeaderHeight(h);
    }
    // Measure the first real row in either pane to learn the true row height.
    const row = rootEl?.querySelector<HTMLElement>(".sui-sql__row");
    if (row) {
      const rh = row.getBoundingClientRect().height;
      if (rh > 0) setRowHeight(rh);
    }
  };
  // Measure after mount (fonts/borders applied), and on every container resize
  // so the JS-computed pane heights track the real available space.
  let resizeObserver: ResizeObserver | undefined;
  onMount(() => {
    requestAnimationFrame(measure);
    if (typeof ResizeObserver !== "undefined" && rootEl) {
      resizeObserver = new ResizeObserver(() => measure());
      resizeObserver.observe(rootEl);
    }
  });
  onCleanup(() => resizeObserver?.disconnect());

  const layout = createMemo(() =>
    computeSplitLayout({
      totalHeight: height(),
      rowHeight: rowHeight(),
      resolvedCount: resolvedItems().length,
      unresolvedCount: unresolvedItems().length,
      seamHeight: SEAM_HEIGHT,
      headerHeight: headerHeight(),
      topCapRows: topCapRows(),
      topFloorRows: topFloorRows(),
    }),
  );

  // In topOnly mode the categorized panel is CONTENT-DRIVEN up to a CAP: it starts
  // as just the header when empty (S edge visible), grows by one row per resolved
  // card, then HOLDS at the cap (header + topCapRows rows, default 3). Past the
  // cap the panel stops growing and the list SCROLLS UP instead (handled in the
  // enter branch), so older rows glide up smoothly rather than popping. (The
  // normal two-panel layout uses layout().topHeight, unchanged.)
  const topOnlyHeight = () => {
    const rows = resolvedItems().length;
    const capHeight = headerHeight() + topCapRows() * rowHeight();
    const contentHeight = headerHeight() + rows * rowHeight();
    // Grow row-by-row up to the cap, then hold; never exceed the container.
    return Math.min(height(), capHeight, contentHeight);
  };

  const reducedMotion = () =>
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // A TIME-DRIVEN tween: progress is computed from ELAPSED time (not rAF/WAAPI),
  // so it lands correctly even when the tab is backgrounded (where rAF/WAAPI
  // throttle) and can't strand mid-animation. `onFrame(progress)` is called with
  // eased progress each step; `onSettle` runs exactly once at the end. Returns a
  // cancel fn. Falls back to settling immediately if setTimeout is unavailable.
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
  const tweenOverTime = (
    durationMs: number,
    onFrame: (easedProgress: number) => void,
    onSettle: () => void,
  ): (() => void) => {
    if (durationMs <= 0 || typeof setTimeout !== "function") {
      onSettle();
      return () => {};
    }
    const now = () =>
      typeof performance !== "undefined" ? performance.now() : Date.now();
    const startTs = now();
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      onSettle();
    };
    const tick = () => {
      if (settled) return;
      const p = Math.min(1, (now() - startTs) / durationMs);
      onFrame(easeOutCubic(p));
      if (p < 1) setTimeout(tick, 16);
      else settle();
    };
    tick();
    return settle;
  };

  // While a resolve's exit collapse is animating, we suppress focus entirely so
  // the new head doesn't light up orange/▸ until the resolved card is fully gone
  // from the bottom list. Set to the resolving key for the duration of phase 1.
  const [exitingKey, setExitingKey] = createSignal<string | null>(null);

  // The focused unresolved key — controlled prop, falling back to the head of
  // the unresolved list so focus always lands on the next item to process.
  // Returns null during the exit collapse so NO real bottom row shows the
  // focused styling while the card is collapsing (only the orange clone does).
  const focusedKey = createMemo(() => {
    if (exitingKey()) return null;
    const keys = unresolvedItems().map(keyOf);
    if (props.focusedKey && keys.includes(props.focusedKey)) return props.focusedKey;
    return keys[0] ?? null;
  });

  // ---- FLIP: snapshot the rects of every rendered row. We keep the snapshot
  // from the *previous* paint as the "First" position. Capture runs on rAF
  // (after paint), which also coalesces the consumer's two un-batched setters
  // (remove-from-unresolved + add-to-resolved) into ONE post-frame snapshot —
  // so a resolved key's pre-move rect survives. Resolve-detection schedules
  // playFlight on a microtask (runs before the next rAF), so during a flight
  // `prevRects` still holds the pre-swap rects.
  const captureRects = () => {
    if (!rootEl) return;
    prevRects.clear();
    rootEl.querySelectorAll<HTMLElement>("[data-sql-key]").forEach((el) => {
      const k = el.dataset.sqlKey!;
      prevRects.set(k, el.getBoundingClientRect());
    });
  };

  // Re-snapshot after every render's paint. Reading both array lengths makes
  // this effect depend on any data change; the rAF defers capture past paint.
  createEffect(
    on(
      () => [resolvedItems().length, unresolvedItems().length] as const,
      () => requestAnimationFrame(captureRects),
    ),
  );

  // Detect a resolve and play the flight, then advance focus.
  //
  // A newly-resolved key is simply one that is in `resolved` now but was not in
  // the previous `resolved`. We intentionally do NOT also require it to have
  // been in the previous `unresolved`: consumers update the two arrays in two
  // separate (un-batched) setter calls, and depending on order there is an
  // intermediate frame where the key sits in NEITHER list. Guarding on the
  // unresolved snapshot would miss the resolve in that frame — this was the
  // "stuck after one item" bug. Entering `resolved` is sufficient evidence of a
  // resolve; `playFlight` self-guards by only animating rows it captured a rect
  // for (i.e. rows that were actually rendered in the unresolved list).
  //
  // This single effect owns `prevResolvedKeys`; nothing else writes it, so the
  // diff is order- and batch-independent.
  let prevResolvedKeys: string[] = resolvedItems().map(keyOf);
  // Previous unresolved order, so we can recover the resolved card's ORIGINAL
  // position and collapse the exit at that index (random access — resolving a
  // MIDDLE card animates in place, not at the head). Owned solely by this effect.
  let prevUnresolvedKeys: string[] = unresolvedItems().map(keyOf);
  let detectFirstRun = true;

  createEffect(() => {
    const resolvedKeys = resolvedItems().map(keyOf);
    const unresolvedKeys = unresolvedItems().map(keyOf);

    // FORWARD (resolve): a key now in `resolved` that wasn't before.
    const newlyResolved = resolvedKeys.filter(
      (k) => !prevResolvedKeys.includes(k),
    );
    // REVERSE (unresolve): a key now in `unresolved` that was in the PREVIOUS
    // `resolved` (came back from done) and wasn't already in `unresolved`. Read
    // against the OLD snapshots, before we overwrite them below.
    const newlyUnresolved = unresolvedKeys.filter(
      (k) => prevResolvedKeys.includes(k) && !prevUnresolvedKeys.includes(k),
    );

    if (newlyResolved.length === 0 && newlyUnresolved.length === 0) {
      // No swap this run. Consumers update the two arrays in two separate
      // (un-batched) setter calls, so this may be the intermediate frame where a
      // moving card is in NEITHER list. We must NOT refresh the snapshot a moving
      // card was leaving, or we'd lose its pre-swap index/membership before the
      // swap is detected. Only refresh each snapshot when its list GREW (genuine
      // new items), never when it shrank (a swap in flight).
      if (resolvedKeys.length > prevResolvedKeys.length)
        prevResolvedKeys = resolvedKeys;
      if (unresolvedKeys.length > prevUnresolvedKeys.length)
        prevUnresolvedKeys = unresolvedKeys;
      detectFirstRun = false;
      return;
    }

    // The forward card's index in the PREVIOUS unresolved order (before the swap
    // removed it), for the random-access exit collapse. Captured from the old
    // snapshot, which still contains the key.
    const movedKey = newlyResolved[newlyResolved.length - 1];
    const exitIndex = movedKey ? prevUnresolvedKeys.indexOf(movedKey) : 0;
    const unmovedKey = newlyUnresolved[newlyUnresolved.length - 1];

    prevResolvedKeys = resolvedKeys;
    prevUnresolvedKeys = unresolvedKeys;

    const willAnimate = !detectFirstRun && !reducedMotion();
    detectFirstRun = false;

    if (!willAnimate) {
      // Reduced-motion / first-run: no phases. Advance focus to the current head
      // of the unresolved list (an unresolve prepends, so the head is that card).
      props.onFocusChange?.(unresolvedKeys[0] ?? null);
      return;
    }

    // Claim ownership of the top list's scrollTop NOW, synchronously, before any
    // microtask is queued. The scroll-pin effect queues its snap-to-bottom in a
    // microtask too, and depending on effect-run order that microtask can run
    // BEFORE the flight's; setting the flag here (not inside the flight) means the
    // pin always sees it true and skips, so it can't pre-snap and collapse the
    // tween. The flight clears it at settle. (Cleared in bail() too.)
    scrollAnimating = true;

    if (movedKey) {
      // Suppress focus during the exit collapse: no real bottom row shows the
      // orange ▸ until the resolved card is entirely gone. Fire onFocusChange at
      // the END of phase 1 (in playFlight's exit-finish callback).
      setExitingKey(movedKey);
      // Defer to a microtask so the resolved row is in its final DOM spot for
      // `last`; `prevRects` still holds the pre-swap rect for `first`.
      queueMicrotask(() => playFlight(movedKey, exitIndex));
    } else if (unmovedKey) {
      // Reverse: the mirror of the forward flight (done tail collapses, card
      // grows in at the to-categorize head). Focus advances at settle.
      setExitingKey(unmovedKey);
      queueMicrotask(() => playReverse(unmovedKey));
    }
  });

  // Two-phase resolve animation. The card does NOT fly over the seam; instead it
  // moves INSIDE each list's clipped region:
  //   Phase 1 (exit): an orange focused-styled clone in the BOTTOM list slides
  //     up and is clipped away under the sticky "to categorize" header — it
  //     disappears beneath the label (the header sits above it via z-index).
  //   Phase 2 (enter): once it's gone, a resolved-styled clone in the TOP list
  //     slides up from under its bottom edge into the resolved row's slot,
  //     clipped by the top list so it appears to emerge from under the seam.
  // The real resolved row is hidden until phase 2 lands (repaint-on-arrival).
  // animationMs is split ~50/50 across the phases so the knob controls total time.
  const EASE = "cubic-bezier(.22,.61,.36,1)";

  const playFlight = (key: string, exitIndex = 0) => {
    // If we can't run the flight (missing refs / no captured rect — e.g. the
    // tab was hidden so rAF capture didn't run), don't strand focus: clear the
    // exit suppression and advance immediately so the queue keeps draining.
    const bail = () => {
      scrollAnimating = false;
      setExitingKey(null);
      props.onFocusChange?.(unresolvedItems().map(keyOf)[0] ?? null);
    };
    if (!rootEl) return bail();
    const first = prevRects.get(key);
    const nowEl = rootEl.querySelector<HTMLElement>(
      `[data-sql-key="${cssEscape(key)}"]`,
    );
    const bottomList = rootEl.querySelector<HTMLElement>(".sui-sql__list--bottom");
    const topList = topListEl;

    // topOnly enter: the PANEL adjusts to the card, not the card to the panel.
    // The newest resolved row is already rendered at its FULL, fixed height at
    // the bottom of the list. We animate the PANEL's own height from its
    // pre-resolve value (one row shorter) up to its new value; overflow:hidden
    // clips the stationary full-size card, so as the panel grows its descending
    // S (bottom) edge uncovers the card N-edge-first, in lockstep — revealed
    // height == panel growth at every frame. No clone, no translate, no card
    // resize, and no rAF rect-capture, so it can't bail in a throttled tab.
    //
    // The tween is TIME-DRIVEN via setTimeout (not WAAPI): progress is computed
    // from elapsed time so it lands correctly even when the tab is backgrounded
    // (where rAF/WAAPI throttle), and it can't strand the panel mid-height.
    if (props.topOnly) {
      if (!topList) return bail();
      const total = animationMs();
      const newH = topOnlyHeight();
      // The panel's height BEFORE this resolve = the same content-driven/capped
      // formula with one fewer resolved row. Below the cap this is newH - rowH
      // (panel grows a row); AT/above the cap it equals newH (already capped), so
      // newH <= oldH and the enter takes the scroll-up path instead of growing.
      const cap = headerHeight() + topCapRows() * rowHeight();
      const prevRows = Math.max(0, resolvedItems().length - 1);
      const oldH = Math.min(height(), cap, headerHeight() + prevRows * rowHeight());
      // scrollAnimating was set true synchronously in the detect effect (before
      // any microtask was queued) so the scroll-pin can't snap underneath us
      // regardless of microtask order. We only CLEAR it here, at settle.
      const advance = () => {
        scrollAnimating = false;
        setExitingKey(null);
        props.onFocusChange?.(unresolvedItems().map(keyOf)[0] ?? null);
      };
      // Instant settle for reduced-motion / zero-duration / no timer.
      if (total <= 0 || typeof setTimeout !== "function") {
        advance();
        return;
      }
      // AT CAP (panel can't grow any further): the list SCROLLS UP instead, so
      // older rows glide up smoothly at the same rate the newest card emerges at
      // the S edge — not an instant pop. Same scrollTop tween the full two-panel
      // column uses when its top is capped.
      if (newH <= oldH + 0.5) {
        const fromScroll = topList.scrollTop;
        const toScroll = topList.scrollHeight - topList.clientHeight;
        if (toScroll <= fromScroll + 0.5) {
          advance(); // nothing to scroll (e.g. content fits) — just settle
          return;
        }
        tweenOverTime(
          total,
          (e) => {
            topList.scrollTop = fromScroll + (toScroll - fromScroll) * e;
          },
          () => {
            topList.scrollTop = toScroll;
            advance();
          },
        );
        return;
      }
      // BELOW CAP: the panel grows to reveal the card N-edge-first (unchanged).
      const prevOverflow = topList.style.overflow;
      const prevHeight = topList.style.height;
      topList.style.overflow = "hidden";
      tweenOverTime(
        total,
        (e) => {
          topList.style.height = `${oldH + (newH - oldH) * e}px`;
        },
        () => {
          // Release the inline override back to the reactive content height.
          topList.style.height = prevHeight;
          topList.style.overflow = prevOverflow;
          advance();
        },
      );
      return;
    }

    if (!first || !nowEl || !topList) return bail();

    // Both phases run SIMULTANEOUSLY over the FULL duration, mirrored across the
    // seam: as the bottom card collapses up under the "to categorize" header, the
    // top pane grows to reveal the resolved card at the same time — the card
    // reads as passing up through the seam in one synchronized motion.
    const exitMs = animationMs();

    const newFocusedContent = nowEl.innerHTML;

    // Animate `el` through `keyframes` and fire `then` exactly once — on WAAPI
    // finish/cancel OR a timeout fallback (WAAPI events don't fire in a hidden
    // tab; without the fallback a phase could stall and strand state). If WAAPI
    // is unavailable entirely (e.g. jsdom, where Element.animate is missing), we
    // skip the motion and settle on the next microtask so `then` still runs.
    const animateOnce = (
      el: HTMLElement,
      keyframes: Keyframe[],
      ms: number,
      then: () => void,
    ) => {
      let done = false;
      const fire = () => {
        if (done) return;
        done = true;
        then();
      };
      if (typeof el.animate !== "function") {
        queueMicrotask(fire);
        return;
      }
      const anim = el.animate(keyframes, { duration: ms, easing: EASE });
      anim.onfinish = fire;
      anim.oncancel = fire;
      setTimeout(fire, ms + 80);
    };

    // ---- Phase 2 (enter): the TOP panel GROWS to reveal a STATIONARY, full-size
    // card — the same mechanism the topOnly column uses, now applied to the full
    // two-panel layout.
    //
    // The newest resolved row (nowEl) is already rendered at its FULL fixed
    // height at the bottom of the top list; it NEVER resizes or translates. We
    // animate the PANE HEIGHTS: the top grows oldTop→newTop while the bottom is
    // DRIVEN as the remainder (computeEnterFrame), so the two panes + seam always
    // sum to the total — the seam descends smoothly with no one-row gap. The top's
    // overflow:hidden clips the full card, so the growing S edge reveals it
    // N-edge-first at the seam, in lockstep (revealed height == pane growth).
    //
    // Time-driven via tweenOverTime (setTimeout, elapsed-time progress) so it's
    // robust/measurable even when the tab is backgrounded.
    const bottomListEl = bottomList; // the bottom <ul>, sized by computeEnterFrame
    const runEnter = () => {
      // Pane heights BEFORE this resolve (one more unresolved, one fewer
      // resolved) and AFTER (the current layout). These bracket the tween.
      const prevLayout = computeSplitLayout({
        totalHeight: height(),
        rowHeight: rowHeight(),
        resolvedCount: Math.max(0, resolvedItems().length - 1),
        unresolvedCount: unresolvedItems().length + 1,
        seamHeight: SEAM_HEIGHT,
        headerHeight: headerHeight(),
        topCapRows: topCapRows(),
        topFloorRows: topFloorRows(),
      });
      const oldTop = prevLayout.topHeight;
      const newTop = layout().topHeight;
      const total = animationMs();

      // This resolve owns the top list's scrollTop until it settles — block the
      // scroll-pin effect from snapping underneath it (the capped path below
      // animates scrollTop; the grow path ends with the newest at the bottom).
      scrollAnimating = true;
      const prevTopOverflow = topList.style.overflow;
      const prevTopHeight = topList.style.height;
      const prevBottomHeight = bottomListEl?.style.height ?? "";
      const releaseHeights = () => {
        // Release the inline overrides back to the reactive layout-driven heights.
        scrollAnimating = false;
        topList.style.overflow = prevTopOverflow;
        topList.style.height = prevTopHeight;
        if (bottomListEl) bottomListEl.style.height = prevBottomHeight;
      };

      // Capped top (4+ resolved): the pane can't grow (oldTop == newTop). Reveal
      // the newest row at the seam by scrolling the top to its bottom over the
      // duration, so it reads as "grow in at the seam", not a snap.
      if (newTop <= oldTop + 0.5) {
        const fromScroll = topList.scrollTop;
        const toScroll = topList.scrollHeight - topList.clientHeight;
        if (toScroll <= fromScroll + 0.5) {
          scrollAnimating = false; // nothing to reveal — release the guard
          return;
        }
        tweenOverTime(
          total,
          (e) => {
            topList.scrollTop = fromScroll + (toScroll - fromScroll) * e;
          },
          () => {
            topList.scrollTop = toScroll;
            scrollAnimating = false;
          },
        );
        return;
      }

      // Growing top: clip the full card and tween both pane heights in lockstep.
      topList.style.overflow = "hidden";
      tweenOverTime(
        total,
        (e) => {
          const f = computeEnterFrame({
            oldTop,
            newTop,
            totalHeight: height(),
            seamHeight: SEAM_HEIGHT,
            progress: e,
          });
          topList.style.height = `${f.topHeight}px`;
          if (bottomListEl) bottomListEl.style.height = `${f.bottomHeight}px`;
        },
        releaseHeights,
      );
    };

    // ---- Phase 1 (exit): HEIGHT COLLAPSE of the resolved card in the bottom
    // list, AT ITS ORIGINAL POSITION (random access — a middle card animates in
    // place, not at the head). The data swap already removed the card and pulled
    // the rows below it up by one. We re-insert an orange focused-styled
    // placeholder IN FLOW at the resolved card's original index `exitIndex`
    // (pushing the rows below back down to where they were), then collapse its
    // height to 0 — so the list below glides up in LOCKSTEP, smoothly and
    // together, with no card sliding over another and no instant jump. The
    // placeholder clips its content from the TOP (content pinned to the bottom of
    // the shrinking box, overflow:hidden), keeping its orange bg until it hits 0.
    const bottomHeader = bottomList?.querySelector<HTMLElement>(".sui-sql__header");
    if (bottomList && bottomHeader) {
      const rowH = first.height;

      const placeholder = document.createElement("li");
      placeholder.className = "sui-sql__collapse";
      placeholder.style.height = `${rowH}px`;
      // CRITICAL: min-height:0 — real rows carry an inline min-height:120px, and
      // without overriding it here the height animation can't actually reach 0
      // (the collapse would jam at the row's min-height). This is the "fight"
      // between the JS height animation and the CSS row sizing.
      placeholder.style.minHeight = "0";
      placeholder.style.overflow = "hidden";
      placeholder.style.position = "relative";

      // Inner card pinned to the bottom of the placeholder, fixed at full row
      // height, so as the placeholder shrinks the TOP edge clips it away.
      const inner = document.createElement("div");
      inner.className =
        "sui-sql__row sui-sql__row--unresolved sui-sql__row--focused";
      inner.innerHTML = newFocusedContent;
      const marker = inner.querySelector<HTMLElement>(".sui-sql__marker");
      if (marker) marker.textContent = "▸"; // focused glyph, not ✓
      inner.style.position = "absolute";
      inner.style.left = "0";
      inner.style.right = "0";
      inner.style.bottom = "0";
      inner.style.height = `${rowH}px`;
      inner.style.margin = "0";
      placeholder.appendChild(inner);

      // Insert at the resolved card's original index. After the swap the rows are
      // the post-removal set; the row now at index `exitIndex` is the one that sat
      // just below the removed card, so inserting the placeholder BEFORE it
      // recreates the original gap. exitIndex 0 → head (after the header), exactly
      // as before. exitIndex >= remaining count (resolved the LAST card) → append
      // after the last row, or after the header if the list is now empty.
      const remainingRows = [
        ...bottomList.querySelectorAll<HTMLElement>(":scope > .sui-sql__row"),
      ];
      const idx = Math.max(0, exitIndex);
      if (idx < remainingRows.length) {
        remainingRows[idx].insertAdjacentElement("beforebegin", placeholder);
      } else if (remainingRows.length > 0) {
        remainingRows[remainingRows.length - 1].insertAdjacentElement(
          "afterend",
          placeholder,
        );
      } else {
        bottomHeader.insertAdjacentElement("afterend", placeholder);
      }

      // Start the enter slide AT THE SAME TIME as the exit collapse — they run
      // in parallel over the same duration and finish together (mirrored).
      runEnter();

      animateOnce(
        placeholder,
        [{ height: `${rowH}px` }, { height: "0px" }],
        exitMs,
        () => {
          placeholder.remove();
          // The collapse has finished (= end of the full animation), so the
          // resolved card is now entirely gone from the bottom list. Advance
          // focus here so the new head lights up with the orange ▸ only now, and
          // fade the just-arrived resolved row's background in.
          advanceFocusAfterExit(key);
        },
      );
    } else {
      // No bottom list (queue emptied) — just run the enter phase. Nothing is
      // collapsing, so focus can advance immediately.
      advanceFocusAfterExit(key);
      runEnter();
    }
  };

  // ---- Reverse (unresolve) animation: a MIRROR of playFlight across the seam.
  //   Phase 1 (exit): collapse a resolved-styled placeholder at the DONE (top)
  //     list's TAIL, clipped from the BOTTOM edge (content pinned to TOP) — the
  //     opposite of the forward head-collapse. As it shrinks, the done pane loses
  //     a row and the seam ASCENDS.
  //   Phase 2 (enter): the card grows in at the HEAD of the TO-CATEGORIZE
  //     (bottom) list, revealed top-first as the seam ascends. Pane heights tween
  //     via computeEnterFrame (top shrinks oldTop→newTop, bottom is the
  //     remainder), so panes + seam always sum to total — no gap.
  // Both phases run simultaneously over animationMs. The arriving bottom card
  // gets the same background fade-in on settle.
  const playReverse = (key: string) => {
    const bail = () => {
      scrollAnimating = false;
      setExitingKey(null);
      props.onFocusChange?.(unresolvedItems().map(keyOf)[0] ?? null);
    };
    if (!rootEl) return bail();
    const topList = topListEl;
    const bottomList = rootEl.querySelector<HTMLElement>(".sui-sql__list--bottom");
    // The arrived card now lives at the head of the bottom list.
    const nowEl = rootEl.querySelector<HTMLElement>(
      `.sui-sql__list--bottom [data-sql-key="${cssEscape(key)}"]`,
    );
    const first = prevRects.get(key); // its pre-swap rect in the DONE (top) list
    if (!topList || !bottomList || !nowEl || !first) return bail();

    const total = animationMs();
    const rowH = first.height;

    const animateOnce = (
      el: HTMLElement,
      keyframes: Keyframe[],
      ms: number,
      then: () => void,
    ) => {
      let done = false;
      const fire = () => {
        if (done) return;
        done = true;
        then();
      };
      if (typeof el.animate !== "function") {
        queueMicrotask(fire);
        return;
      }
      const anim = el.animate(keyframes, { duration: ms, easing: EASE });
      anim.onfinish = fire;
      anim.oncancel = fire;
      setTimeout(fire, ms + 80);
    };

    // The just-arrived to-categorize card fades its bg in and focus advances when
    // the transfer completes. Fire exactly once (whichever phase finishes last is
    // the full duration, so either is fine; we drive it from the exit collapse).
    const settleReverse = () => {
      setExitingKey(null);
      markArrived(key, "bottom");
      props.onFocusChange?.(unresolvedItems().map(keyOf)[0] ?? null);
    };

    // ---- Phase 2 (enter): pane heights tween — top SHRINKS, bottom GROWS. Pre-
    // unresolve the top had one MORE resolved row; now it has one fewer. The
    // bottom is driven as the remainder so panes+seam always sum to total.
    const prevLayout = computeSplitLayout({
      totalHeight: height(),
      rowHeight: rowHeight(),
      resolvedCount: resolvedItems().length + 1,
      unresolvedCount: Math.max(0, unresolvedItems().length - 1),
      seamHeight: SEAM_HEIGHT,
      headerHeight: headerHeight(),
      topCapRows: topCapRows(),
      topFloorRows: topFloorRows(),
    });
    const oldTop = prevLayout.topHeight;
    const newTop = layout().topHeight;

    const prevBottomOverflow = bottomList.style.overflow;
    const prevTopHeight = topList.style.height;
    const prevBottomHeight = bottomList.style.height;
    const releaseHeights = () => {
      scrollAnimating = false;
      bottomList.style.overflow = prevBottomOverflow;
      topList.style.height = prevTopHeight;
      bottomList.style.height = prevBottomHeight;
    };

    const runReverseEnter = () => {
      if (newTop >= oldTop - 0.5 || total <= 0 || typeof setTimeout !== "function") {
        // No height delta to animate (capped/floor) — just release.
        releaseHeights();
        return;
      }
      // Clip the bottom list so the arriving head card is revealed top-first as
      // the bottom grows (mirror of the forward top-clip).
      bottomList.style.overflow = "hidden";
      tweenOverTime(
        total,
        (e) => {
          const f = computeEnterFrame({
            oldTop,
            newTop,
            totalHeight: height(),
            seamHeight: SEAM_HEIGHT,
            progress: e,
          });
          topList.style.height = `${f.topHeight}px`;
          bottomList.style.height = `${f.bottomHeight}px`;
        },
        releaseHeights,
      );
    };

    // ---- Phase 1 (exit): collapse a placeholder at the DONE (top) list TAIL,
    // clipped from the BOTTOM (content pinned to the TOP of the shrinking box).
    const topHeader = topList.querySelector<HTMLElement>(".sui-sql__header");
    const placeholder = document.createElement("li");
    placeholder.className = "sui-sql__collapse";
    placeholder.style.height = `${rowH}px`;
    placeholder.style.minHeight = "0";
    placeholder.style.overflow = "hidden";
    placeholder.style.position = "relative";

    const inner = document.createElement("div");
    inner.className = "sui-sql__row sui-sql__row--resolved";
    inner.innerHTML = nowEl.innerHTML; // same content; carries the ✓ marker
    const marker = inner.querySelector<HTMLElement>(".sui-sql__marker");
    if (marker) marker.textContent = "✓";
    inner.style.position = "absolute";
    inner.style.left = "0";
    inner.style.right = "0";
    inner.style.top = "0"; // pinned to TOP → clipped from the BOTTOM as it shrinks
    inner.style.height = `${rowH}px`;
    inner.style.margin = "0";
    placeholder.appendChild(inner);

    // Append at the done list's TAIL (after the last resolved row, or after the
    // header if the done list is now empty).
    const doneRows = [
      ...topList.querySelectorAll<HTMLElement>(":scope > .sui-sql__row"),
    ];
    if (doneRows.length > 0) {
      doneRows[doneRows.length - 1].insertAdjacentElement("afterend", placeholder);
    } else if (topHeader) {
      topHeader.insertAdjacentElement("afterend", placeholder);
    } else {
      topList.appendChild(placeholder);
    }

    // Run both phases together.
    runReverseEnter();
    animateOnce(
      placeholder,
      [{ height: `${rowH}px` }, { height: "0px" }],
      total,
      () => {
        placeholder.remove();
        settleReverse();
      },
    );
  };

  // Fade the just-arrived row's BACKGROUND in once, at the end of the transfer
  // (not opacity — text/✓ stay solid). A one-shot CSS class drives a
  // @keyframes; we remove it on animationend (or a fallback timer where there's
  // no animationend, e.g. jsdom) so it can re-run on a later resolve. No-op under
  // reduced-motion / zero-duration (the row just shows its final bg).
  const markArrived = (key: string, panel: "top" | "bottom" = "top") => {
    if (reducedMotion() || animationMs() <= 0 || !rootEl) return;
    const row = rootEl.querySelector<HTMLElement>(
      `.sui-sql__list--${panel} [data-sql-key="${cssEscape(key)}"]`,
    );
    if (!row) return;
    row.classList.add("sui-sql__row--arriving");
    let done = false;
    const clear = () => {
      if (done) return;
      done = true;
      row.classList.remove("sui-sql__row--arriving");
      row.removeEventListener("animationend", clear);
    };
    row.addEventListener("animationend", clear);
    // Fallback for environments without animationend (jsdom) or a missed event.
    if (typeof setTimeout === "function") setTimeout(clear, 400);
  };

  // Clear the exit suppression and fire onFocusChange with the current head of
  // the unresolved list (null if the queue is now empty). Called at the END of
  // the exit collapse so focus advances exactly when the resolved card is gone.
  // Guarantees onFocusChange still fires for every animated resolve. The resolved
  // `key` lets us fade its background in on arrival.
  const advanceFocusAfterExit = (key?: string) => {
    setExitingKey(null);
    if (key) markArrived(key);
    props.onFocusChange?.(unresolvedItems().map(keyOf)[0] ?? null);
  };

  // When the top pane is capped/scrolling, pin it to the bottom so the newest
  // resolved row sits flush at the seam, adjacent to the next unresolved item.
  createEffect(
    on(
      () => [resolvedItems().length, layout().topScrollToBottom, layout().topHeight] as const,
      ([, scrollToBottom]) => {
        queueMicrotask(() => {
          // Skip while a resolve tween owns scrollTop — otherwise this snap races
          // the tween and collapses it to an instant jump (the "scrolls once then
          // stops / card just appears" bug). The tween itself ends flush at the
          // bottom, so the pin is only needed for non-animated settles (mount with
          // pre-resolved items, reduced-motion, zero-duration).
          if (topListEl && scrollToBottom && !scrollAnimating) {
            topListEl.scrollTop = topListEl.scrollHeight;
          }
        });
      },
    ),
  );

  onCleanup(() => prevRects.clear());

  const renderRow = (item: T, kind: "resolved" | "unresolved") => {
    const key = keyOf(item);
    const isFocused = () => kind === "unresolved" && focusedKey() === key;
    const isSelected = () => props.selectedKey === key;
    return (
      <li
        data-sql-key={key}
        class={`sui-sql__row sui-sql__row--${kind}`}
        classList={{
          "sui-sql__row--focused": isFocused(),
          "sui-sql__row--selected": isSelected(),
        }}
        style={{ "min-height": `${rowHeightProp()}px` }}
        // Clicking a row only SELECTS it (emits onSelect) — it no longer resolves.
        // Resolve/unresolve are driven by the consumer mutating the arrays.
        onClick={() => props.onSelect?.(key)}
      >
        <span class="sui-sql__marker" aria-hidden="true">
          {kind === "resolved" ? "✓" : isFocused() ? "▸" : ""}
        </span>
        <span class="sui-sql__content">{renderItemFn(item)}</span>
      </li>
    );
  };

  // ---- STATIC mode: two labeled sections with a seam, no queue animation.
  // The TOP section is a read-only list; the BOTTOM section is arbitrary
  // children. Shares the chrome (headers, seam, row styling) with the animated
  // queue but skips all of the diff/FLIP/scroll-pin machinery above.
  const renderStaticRow = (item: T) => {
    const render = props.renderTop ?? renderItemFn;
    return (
      <li class="sui-sql__row sui-sql__row--resolved">
        <span class="sui-sql__marker" aria-hidden="true">
          ✓
        </span>
        <span class="sui-sql__content">{render(item)}</span>
      </li>
    );
  };

  if (props.static) {
    const topItems = () => props.topItems ?? resolvedItems();
    // Fill the parent by default so the rail tracks the available height; an
    // explicit `height` prop pins a fixed px height instead.
    return (
      <div
        ref={rootEl}
        class={`sui-sql sui-sql--static${props.class ? " " + props.class : ""}`}
        style={{ height: props.height != null ? `${props.height}px` : "100%" }}
      >
        {/* TOP — read-only list, capped to topCapRows then scrolls. */}
        <ul
          class="sui-sql__list sui-sql__list--top"
          style={{
            "max-height": `${headerHeight() + topCapRows() * rowHeight()}px`,
          }}
        >
          <li class="sui-sql__header sui-sql__header--top">
            <span>{props.resolvedLabel ?? "Resolved"}</span>
            <span class="sui-sql__count">{topItems().length}</span>
          </li>
          <Show
            when={topItems().length > 0}
            fallback={
              <li class="sui-sql__clear">
                {props.allClearLabel ?? "Nothing yet"}
              </li>
            }
          >
            <For each={topItems()}>{(item) => renderStaticRow(item)}</For>
          </Show>
        </ul>

        <div class="sui-sql__seam" aria-hidden="true" />

        {/* BOTTOM — arbitrary consumer content, takes the remaining space. */}
        <div class="sui-sql__list sui-sql__list--bottom sui-sql__static-bottom">
          {props.bottomContent}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={rootEl}
      class={`sui-sql${props.class ? " " + props.class : ""}`}
      // In topOnly the root hugs its single (top) panel so the container follows
      // the panel's content-driven / animated height — "one line" when empty,
      // growing with the panel as it reveals each card. The normal two-panel
      // layout keeps the fixed total height.
      style={{ height: props.topOnly ? undefined : `${height()}px` }}
    >
      {/* TOP — resolved ("categorized"). Content-driven height between a 1-row
          floor and a 3-row cap; absorbs slack when the bottom is short. Sized
          explicitly from the JS layout (each pane includes its own header). */}
      <ul
        ref={topListEl}
        class="sui-sql__list sui-sql__list--top"
        style={{
          height: props.topOnly
            ? `${topOnlyHeight()}px`
            : `${layout().topHeight}px`,
        }}
      >
        <li ref={headerProbeEl} class="sui-sql__header sui-sql__header--top">
          <span>{props.resolvedLabel ?? "Resolved"}</span>
          <span class="sui-sql__count">{resolvedItems().length}</span>
        </li>
        <For each={resolvedItems()}>{(item) => renderRow(item, "resolved")}</For>
      </ul>

      {/* Seam + BOTTOM panel are omitted in topOnly mode — the categorized list
          takes the full height. The resolve enter/grow still plays. */}
      <Show when={!props.topOnly}>
        <div class="sui-sql__seam" aria-hidden="true" />

        {/* BOTTOM — unresolved ("to categorize"). Gets the remaining space and
            scrolls when overfull; collapses to the "all clear" strip when empty. */}
        <ul
          class="sui-sql__list sui-sql__list--bottom"
          classList={{ "sui-sql__list--collapsed": unresolvedItems().length === 0 }}
          style={{ height: `${layout().bottomHeight}px` }}
        >
          <Show
            when={unresolvedItems().length > 0}
            fallback={
              <li class="sui-sql__clear">
                {props.allClearLabel ?? "All clear — nothing to process"}
              </li>
            }
          >
            <li class="sui-sql__header sui-sql__header--bottom">
              <span>{props.unresolvedLabel ?? "Unresolved"}</span>
              <span class="sui-sql__count">{unresolvedItems().length}</span>
            </li>
            <For each={unresolvedItems()}>
              {(item) => renderRow(item, "unresolved")}
            </For>
          </Show>
        </ul>
      </Show>
    </div>
  );
}

/** Minimal CSS.escape fallback for attribute selectors (keys are usually
 * simple, but guard against quotes/brackets). */
function cssEscape(s: string): string {
  if (typeof CSS !== "undefined" && CSS.escape) return CSS.escape(s);
  return s.replace(/["\\\]]/g, "\\$&");
}
