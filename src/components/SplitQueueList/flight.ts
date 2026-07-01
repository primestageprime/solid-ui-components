/* SplitQueueList — the resolve/unresolve flight engine.
 *
 * This is the imperative, DOM-driving core: FLIP rect capture, resolve/unresolve
 * DETECTION (order- and batch-independent), the two-phase forward (playFlight)
 * and reverse (playReverse) animations, the arrival bg-fade, and the scroll-pin
 * that keeps the newest resolved row flush at the seam. It owns three reactive
 * effects (capture, detect, scroll-pin), the `prevRects` FLIP snapshot, the
 * `scrollAnimating` guard, and the `exitingKey` focus-suppression signal.
 *
 * Factored out of the component so the reactive SHELL (props, measurement,
 * layout, render) stays legible. The controller reads everything it needs as
 * accessors (see FlightDeps) and exposes only `exitingKey` — the one piece of
 * its state the shell's `focusedKey` memo needs.
 *
 * MUST be called synchronously during component setup: it registers effects and
 * an onCleanup in the caller's reactive owner. */
import { Accessor, createEffect, createSignal, on, onCleanup } from "solid-js";
import {
  computeEnterFrame,
  computeSplitLayout,
  type SplitLayout,
} from "./layout";
import { animateOnce, buildCollapsePlaceholder, cssEscape, tweenOverTime } from "./animation";

export interface FlightDeps {
  getRootEl: () => HTMLElement | undefined;
  getTopListEl: () => HTMLUListElement | undefined;
  // Sizing accessors (measured/derived in the shell).
  height: () => number;
  rowHeight: () => number;
  headerHeight: () => number;
  topCapRows: () => number;
  topFloorRows: () => number;
  animationMs: () => number;
  seamHeight: number;
  topOnly: () => boolean;
  topOnlyHeight: () => number;
  layout: () => SplitLayout;
  // Data as key arrays in list order (resolved oldest-first, unresolved next-first).
  resolvedKeys: () => string[];
  unresolvedKeys: () => string[];
  // Behavior.
  reducedMotion: () => boolean;
  onFocusChange: (key: string | null) => void;
}

export interface FlightController {
  /** The key whose exit collapse is in flight (focus is suppressed meanwhile),
   * or null. Consumed by the shell's `focusedKey` memo. */
  exitingKey: Accessor<string | null>;
}

export function createFlightController(deps: FlightDeps): FlightController {
  // True while a resolve animation owns the top list's scrollTop (its scroll-up
  // tween, or a grow that ends by sitting at the bottom). The scroll-pin effect
  // skips its snap-to-bottom while this is set, so it can't race the tween and
  // collapse it to an instant jump. Always cleared at settle / instant-return.
  let scrollAnimating = false;

  // Rects of every keyed row captured on the previous render — the "First" in
  // FLIP. Read synchronously before the data swap reflows the DOM.
  const prevRects = new Map<string, DOMRect>();

  // While a resolve's exit collapse is animating, we suppress focus entirely so
  // the new head doesn't light up orange/▸ until the resolved card is fully gone
  // from the bottom list. Set to the resolving key for the duration of phase 1.
  const [exitingKey, setExitingKey] = createSignal<string | null>(null);

  // Fire onFocusChange with the current head of the unresolved list (null when
  // the queue is empty). The single source of truth for "advance focus", shared
  // by both flights' settle/bail paths so they can't drift apart.
  const focusHead = () => deps.onFocusChange(deps.unresolvedKeys()[0] ?? null);

  // ---- FLIP: snapshot the rects of every rendered row. We keep the snapshot
  // from the *previous* paint as the "First" position. Capture runs on rAF
  // (after paint), which also coalesces the consumer's two un-batched setters
  // (remove-from-unresolved + add-to-resolved) into ONE post-frame snapshot —
  // so a resolved key's pre-move rect survives. Resolve-detection schedules
  // playFlight on a microtask (runs before the next rAF), so during a flight
  // `prevRects` still holds the pre-swap rects.
  const captureRects = () => {
    const rootEl = deps.getRootEl();
    if (!rootEl) return;
    prevRects.clear();
    rootEl.querySelectorAll<HTMLElement>("[data-sql-key]").forEach((el) => {
      const k = el.dataset.sqlKey!;
      prevRects.set(k, el.getBoundingClientRect());
    });
  };

  // Fade the just-arrived row's BACKGROUND in once, at the end of the transfer
  // (not opacity — text/✓ stay solid). A one-shot CSS class drives a
  // @keyframes; we remove it on animationend (or a fallback timer where there's
  // no animationend, e.g. jsdom) so it can re-run on a later resolve. No-op under
  // reduced-motion / zero-duration (the row just shows its final bg).
  const markArrived = (key: string, panel: "top" | "bottom" = "top") => {
    const rootEl = deps.getRootEl();
    if (deps.reducedMotion() || deps.animationMs() <= 0 || !rootEl) return;
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
    focusHead();
  };

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
  const playFlight = (key: string, exitIndex = 0) => {
    const rootEl = deps.getRootEl();
    // If we can't run the flight (missing refs / no captured rect — e.g. the
    // tab was hidden so rAF capture didn't run), don't strand focus: clear the
    // exit suppression and advance immediately so the queue keeps draining.
    const bail = () => {
      scrollAnimating = false;
      setExitingKey(null);
      focusHead();
    };
    if (!rootEl) return bail();
    const first = prevRects.get(key);
    const nowEl = rootEl.querySelector<HTMLElement>(
      `[data-sql-key="${cssEscape(key)}"]`,
    );
    const bottomList = rootEl.querySelector<HTMLElement>(".sui-sql__list--bottom");
    const topList = deps.getTopListEl();

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
    if (deps.topOnly()) {
      if (!topList) return bail();
      const total = deps.animationMs();
      const newH = deps.topOnlyHeight();
      // The panel's height BEFORE this resolve = the same content-driven/capped
      // formula with one fewer resolved row. Below the cap this is newH - rowH
      // (panel grows a row); AT/above the cap it equals newH (already capped), so
      // newH <= oldH and the enter takes the scroll-up path instead of growing.
      const cap = deps.headerHeight() + deps.topCapRows() * deps.rowHeight();
      const prevRows = Math.max(0, deps.resolvedKeys().length - 1);
      const oldH = Math.min(
        deps.height(),
        cap,
        deps.headerHeight() + prevRows * deps.rowHeight(),
      );
      // scrollAnimating was set true synchronously in the detect effect (before
      // any microtask was queued) so the scroll-pin can't snap underneath us
      // regardless of microtask order. We only CLEAR it here, at settle.
      const advance = () => {
        scrollAnimating = false;
        setExitingKey(null);
        focusHead();
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
    const exitMs = deps.animationMs();

    const newFocusedContent = nowEl.innerHTML;

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
        totalHeight: deps.height(),
        rowHeight: deps.rowHeight(),
        resolvedCount: Math.max(0, deps.resolvedKeys().length - 1),
        unresolvedCount: deps.unresolvedKeys().length + 1,
        seamHeight: deps.seamHeight,
        headerHeight: deps.headerHeight(),
        topCapRows: deps.topCapRows(),
        topFloorRows: deps.topFloorRows(),
      });
      const oldTop = prevLayout.topHeight;
      const newTop = deps.layout().topHeight;
      const total = deps.animationMs();

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
            totalHeight: deps.height(),
            seamHeight: deps.seamHeight,
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

      // Orange focused-styled clone, clipped from the TOP as it collapses (pinned
      // to the bottom edge) — it disappears beneath the "to categorize" header.
      const placeholder = buildCollapsePlaceholder({
        rowH,
        innerClass: "sui-sql__row sui-sql__row--unresolved sui-sql__row--focused",
        markerGlyph: "▸", // focused glyph, not ✓
        pin: "bottom",
        contentHTML: newFocusedContent,
      });

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
    const rootEl = deps.getRootEl();
    const bail = () => {
      scrollAnimating = false;
      setExitingKey(null);
      focusHead();
    };
    if (!rootEl) return bail();
    const topList = deps.getTopListEl();
    const bottomList = rootEl.querySelector<HTMLElement>(".sui-sql__list--bottom");
    // The arrived card now lives at the head of the bottom list.
    const nowEl = rootEl.querySelector<HTMLElement>(
      `.sui-sql__list--bottom [data-sql-key="${cssEscape(key)}"]`,
    );
    const first = prevRects.get(key); // its pre-swap rect in the DONE (top) list
    if (!topList || !bottomList || !nowEl || !first) return bail();

    const total = deps.animationMs();
    const rowH = first.height;

    // The just-arrived to-categorize card fades its bg in and focus advances when
    // the transfer completes. Fire exactly once (whichever phase finishes last is
    // the full duration, so either is fine; we drive it from the exit collapse).
    const settleReverse = () => {
      setExitingKey(null);
      markArrived(key, "bottom");
      focusHead();
    };

    // ---- Phase 2 (enter): pane heights tween — top SHRINKS, bottom GROWS. Pre-
    // unresolve the top had one MORE resolved row; now it has one fewer. The
    // bottom is driven as the remainder so panes+seam always sum to total.
    const prevLayout = computeSplitLayout({
      totalHeight: deps.height(),
      rowHeight: deps.rowHeight(),
      resolvedCount: deps.resolvedKeys().length + 1,
      unresolvedCount: Math.max(0, deps.unresolvedKeys().length - 1),
      seamHeight: deps.seamHeight,
      headerHeight: deps.headerHeight(),
      topCapRows: deps.topCapRows(),
      topFloorRows: deps.topFloorRows(),
    });
    const oldTop = prevLayout.topHeight;
    const newTop = deps.layout().topHeight;

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
            totalHeight: deps.height(),
            seamHeight: deps.seamHeight,
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
    const placeholder = buildCollapsePlaceholder({
      rowH,
      innerClass: "sui-sql__row sui-sql__row--resolved",
      markerGlyph: "✓",
      pin: "top", // pinned to TOP → clipped from the BOTTOM as it shrinks
      contentHTML: nowEl.innerHTML, // same content; carries the ✓ marker
    });

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

  // Re-snapshot after every render's paint. Reading both array lengths makes
  // this effect depend on any data change; the rAF defers capture past paint.
  createEffect(
    on(
      () => [deps.resolvedKeys().length, deps.unresolvedKeys().length] as const,
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
  let prevResolvedKeys: string[] = deps.resolvedKeys();
  // Previous unresolved order, so we can recover the resolved card's ORIGINAL
  // position and collapse the exit at that index (random access — resolving a
  // MIDDLE card animates in place, not at the head). Owned solely by this effect.
  let prevUnresolvedKeys: string[] = deps.unresolvedKeys();
  let detectFirstRun = true;

  createEffect(() => {
    const resolvedKeys = deps.resolvedKeys();
    const unresolvedKeys = deps.unresolvedKeys();

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

    const willAnimate = !detectFirstRun && !deps.reducedMotion();
    detectFirstRun = false;

    if (!willAnimate) {
      // Reduced-motion / first-run: no phases. Advance focus to the current head
      // of the unresolved list (an unresolve prepends, so the head is that card).
      deps.onFocusChange(unresolvedKeys[0] ?? null);
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

  // When the top pane is capped/scrolling, pin it to the bottom so the newest
  // resolved row sits flush at the seam, adjacent to the next unresolved item.
  createEffect(
    on(
      () =>
        [
          deps.resolvedKeys().length,
          deps.layout().topScrollToBottom,
          deps.layout().topHeight,
        ] as const,
      ([, scrollToBottom]) => {
        queueMicrotask(() => {
          // Skip while a resolve tween owns scrollTop — otherwise this snap races
          // the tween and collapses it to an instant jump (the "scrolls once then
          // stops / card just appears" bug). The tween itself ends flush at the
          // bottom, so the pin is only needed for non-animated settles (mount with
          // pre-resolved items, reduced-motion, zero-duration).
          const topListEl = deps.getTopListEl();
          if (topListEl && scrollToBottom && !scrollAnimating) {
            topListEl.scrollTop = topListEl.scrollHeight;
          }
        });
      },
    ),
  );

  onCleanup(() => prevRects.clear());

  return { exitingKey };
}
