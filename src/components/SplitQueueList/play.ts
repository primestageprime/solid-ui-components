/* SplitQueueList — the resolve/unresolve flight orchestrators.
 *
 * The imperative, DOM-driving core of the flight engine: the two-phase forward
 * (playFlight) and reverse (playReverse) animations, the arrival bg-fade hookup,
 * and the exit-collapse placeholders. Factored out of ./flight.ts so the
 * reactive SHELL there (state ownership + the capture/detect/scroll-pin effects)
 * stays legible.
 *
 * These two functions are a MIRRORED PAIR and belong together. They read
 * `prevRects` (the FLIP snapshot, owned by the controller) and WRITE two pieces
 * of controller state through injected setters: `setExitingKey` (focus
 * suppression) and `setScrollAnimating` (the scroll-ownership lock the
 * scroll-pin effect reads). They never READ that lock — it is one-directional —
 * so the controller keeps sole ownership of the state while the animation
 * mechanics live here. */
import {
  animateOnce,
  buildCollapsePlaceholder,
  cssEscape,
  tweenOverTime,
} from "./animation";
import { markArrived } from "./arrival";
import type { FlightDeps } from "./flight";
import { computeEnterFrame, computeSplitLayout } from "./layout";

/** Everything the flights need from the controller: the shell accessors, the
 * FLIP snapshot map (read-only here), and the two state setters they drive. */
export interface FlightAnimationDeps {
  deps: FlightDeps;
  prevRects: Map<string, DOMRect>;
  setExitingKey: (key: string | null) => void;
  setScrollAnimating: (active: boolean) => void;
}

export interface FlightAnimations {
  playFlight: (key: string, exitIndex?: number) => void;
  playReverse: (key: string) => void;
}

export function createFlightAnimations(
  ops: FlightAnimationDeps,
): FlightAnimations {
  const { deps, prevRects, setExitingKey, setScrollAnimating } = ops;

  // Fire onFocusChange with the current head of the unresolved list (null when
  // the queue is empty). The single source of truth for "advance focus", shared
  // by both flights' settle/bail paths so they can't drift apart.
  const focusHead = () => deps.onFocusChange(deps.unresolvedKeys()[0] ?? null);

  // Clear the exit suppression and fire onFocusChange with the current head of
  // the unresolved list (null if the queue is now empty). Called at the END of
  // the exit collapse so focus advances exactly when the resolved card is gone.
  // Guarantees onFocusChange still fires for every animated resolve. The resolved
  // `key` lets us fade its background in on arrival.
  const advanceFocusAfterExit = (key?: string) => {
    setExitingKey(null);
    if (key) markArrived(deps, key);
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
      setScrollAnimating(false);
      setExitingKey(null);
      focusHead();
    };
    if (!rootEl) return bail();
    const first = prevRects.get(key);
    const nowEl = rootEl.querySelector<HTMLElement>(
      `[data-sql-key="${cssEscape(key)}"]`,
    );
    const bottomList = rootEl.querySelector<HTMLElement>(
      ".sui-sql__list--bottom",
    );
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
        setScrollAnimating(false);
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
      setScrollAnimating(true);
      const prevTopOverflow = topList.style.overflow;
      const prevTopHeight = topList.style.height;
      const prevBottomHeight = bottomListEl?.style.height ?? "";
      const releaseHeights = () => {
        // Release the inline overrides back to the reactive layout-driven heights.
        setScrollAnimating(false);
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
          setScrollAnimating(false); // nothing to reveal — release the guard
          return;
        }
        tweenOverTime(
          total,
          (e) => {
            topList.scrollTop = fromScroll + (toScroll - fromScroll) * e;
          },
          () => {
            topList.scrollTop = toScroll;
            setScrollAnimating(false);
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
    const bottomHeader =
      bottomList?.querySelector<HTMLElement>(".sui-sql__header");
    if (bottomList && bottomHeader) {
      const rowH = first.height;

      // Orange focused-styled clone, clipped from the TOP as it collapses (pinned
      // to the bottom edge) — it disappears beneath the "to categorize" header.
      const placeholder = buildCollapsePlaceholder({
        rowH,
        innerClass:
          "sui-sql__row sui-sql__row--unresolved sui-sql__row--focused",
        markerGlyph: "▸", // focused glyph, not ✓
        pin: "bottom",
        sourceRow: nowEl,
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
      setScrollAnimating(false);
      setExitingKey(null);
      focusHead();
    };
    if (!rootEl) return bail();
    const topList = deps.getTopListEl();
    const bottomList = rootEl.querySelector<HTMLElement>(
      ".sui-sql__list--bottom",
    );
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
      markArrived(deps, key, "bottom");
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
      setScrollAnimating(false);
      bottomList.style.overflow = prevBottomOverflow;
      topList.style.height = prevTopHeight;
      bottomList.style.height = prevBottomHeight;
    };

    const runReverseEnter = () => {
      if (
        newTop >= oldTop - 0.5 ||
        total <= 0 ||
        typeof setTimeout !== "function"
      ) {
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
      sourceRow: nowEl, // same content; carries the ✓ marker
    });

    // Append at the done list's TAIL (after the last resolved row, or after the
    // header if the done list is now empty).
    const doneRows = [
      ...topList.querySelectorAll<HTMLElement>(":scope > .sui-sql__row"),
    ];
    if (doneRows.length > 0) {
      doneRows[doneRows.length - 1].insertAdjacentElement(
        "afterend",
        placeholder,
      );
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

  return { playFlight, playReverse };
}
