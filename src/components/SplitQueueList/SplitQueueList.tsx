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
import { computeSplitLayout } from "./layout";
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
  /** Resolved (processed) items — rendered top list, oldest first. */
  resolved: T[];
  /** Unresolved (to-process) items — rendered bottom list, next first. */
  unresolved: T[];
  /** Render an item's content. */
  renderItem: (item: T) => JSX.Element;
  /** Stable identity for an item — drives the resolve animation. */
  keyOf: (item: T) => string;
  /** Key of the focused unresolved item (controlled). Falls back to the
   * top of the unresolved list when omitted/stale. */
  focusedKey?: string;
  /** Fires when focus should move (e.g. after a resolve auto-advances). */
  onFocusChange?: (key: string | null) => void;
  /** Fires when a focused row is activated (Enter / click on the marker). */
  onResolve?: (key: string) => void;
  /** Header label for the resolved (top) list. Default "Resolved". */
  resolvedLabel?: string;
  /** Header label for the unresolved (bottom) list. Default "Unresolved". */
  unresolvedLabel?: string;
  /** Copy for the collapsed strip when nothing is left to process. */
  allClearLabel?: JSX.Element;
  /** Soft cap on the top (resolved) pane, in rows. Beyond this the top pane
   * scrolls with the newest row pinned at the seam. Default 3. */
  topCapRows?: number;
  /** Floor on the top pane, in rows (shown even with 0 categorized). Default 1. */
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
  const rowHeightProp = () => props.rowHeight ?? 40;
  const topCapRows = () => props.topCapRows ?? 3;
  const topFloorRows = () => props.topFloorRows ?? 1;
  const height = () => props.height ?? 420;
  const animationMs = () => props.animationMs ?? 800;

  let topListEl: HTMLUListElement | undefined;
  let rootEl: HTMLDivElement | undefined;
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
      resolvedCount: props.resolved.length,
      unresolvedCount: props.unresolved.length,
      seamHeight: SEAM_HEIGHT,
      headerHeight: headerHeight(),
      topCapRows: topCapRows(),
      topFloorRows: topFloorRows(),
    }),
  );

  // In topOnly mode the categorized panel is CONTENT-DRIVEN: it starts ~1 row
  // tall when empty (header + the row floor) so its S edge is visible, and grows
  // with each resolved card (header + N rows), uncapped but never exceeding the
  // container height. This makes the "card emerges from the S edge" enter
  // watchable. (The normal two-panel layout uses layout().topHeight, unchanged.)
  const topOnlyHeight = () => {
    // "One line" (just the header) when empty; grows by exactly one row per
    // resolved card so every resolve animates the panel open and reveals the
    // newest card at the S edge.
    const rows = props.resolved.length;
    return Math.min(height(), headerHeight() + rows * rowHeight());
  };

  const reducedMotion = () =>
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

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
    const keys = props.unresolved.map(props.keyOf);
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
      () => [props.resolved.length, props.unresolved.length] as const,
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
  let prevResolvedKeys: string[] = props.resolved.map(props.keyOf);
  let detectFirstRun = true;

  createEffect(() => {
    const resolvedKeys = props.resolved.map(props.keyOf);
    const unresolvedKeys = props.unresolved.map(props.keyOf);

    const newlyResolved = resolvedKeys.filter(
      (k) => !prevResolvedKeys.includes(k),
    );
    prevResolvedKeys = resolvedKeys;

    if (newlyResolved.length === 0) {
      detectFirstRun = false;
      return;
    }

    const willAnimate = !detectFirstRun && !reducedMotion();
    detectFirstRun = false;

    if (willAnimate) {
      // Suppress focus during the exit collapse: no real bottom row should show
      // the orange ▸ styling until the resolved card is entirely gone. We mark
      // the resolving key as exiting and fire onFocusChange at the END of phase
      // 1 (in playFlight's exit-finish callback) instead of now.
      const movedKey = newlyResolved[newlyResolved.length - 1];
      setExitingKey(movedKey);
      // Defer to a microtask so the resolved row is in its final DOM spot for
      // `last`; `prevRects` still holds the pre-swap rect for `first`.
      queueMicrotask(() => playFlight(movedKey));
    } else {
      // Reduced-motion / first-run: no phases, so advance focus immediately.
      // Next item to process = current head of the post-swap unresolved list,
      // or null when the queue is now empty. Fires on EVERY resolve so a
      // consumer that resolves the focused key advances each time.
      props.onFocusChange?.(unresolvedKeys[0] ?? null);
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

  const playFlight = (key: string) => {
    // If we can't run the flight (missing refs / no captured rect — e.g. the
    // tab was hidden so rAF capture didn't run), don't strand focus: clear the
    // exit suppression and advance immediately so the queue keeps draining.
    const bail = () => {
      setExitingKey(null);
      props.onFocusChange?.(props.unresolved.map(props.keyOf)[0] ?? null);
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
    if (props.topOnly) {
      if (!topList) return bail();
      const total = animationMs();
      const newH = topOnlyHeight();
      const oldH = Math.max(headerHeight(), newH - rowHeight());
      const advance = () => {
        setExitingKey(null);
        props.onFocusChange?.(props.unresolved.map(props.keyOf)[0] ?? null);
      };
      if (newH <= oldH || typeof topList.animate !== "function") {
        advance();
        return;
      }
      const prevOverflow = topList.style.overflow;
      topList.style.overflow = "hidden";
      let fired = false;
      const finish = () => {
        if (fired) return;
        fired = true;
        topList.style.overflow = prevOverflow;
        advance();
      };
      const anim = topList.animate(
        [{ height: `${oldH}px` }, { height: `${newH}px` }],
        { duration: total, easing: EASE },
      );
      anim.onfinish = finish;
      anim.oncancel = finish;
      setTimeout(finish, total + 80);
      return;
    }

    if (!first || !nowEl || !topList) return bail();
    const last = nowEl.getBoundingClientRect();

    // Both phases run SIMULTANEOUSLY over the FULL duration, mirrored across the
    // seam: as the bottom card collapses up under the "to categorize" header,
    // the resolved clone slides up into the top list at the same time — the card
    // reads as passing up through the seam in one synchronized motion.
    const total = animationMs();
    const exitMs = total;
    const enterMs = total;

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

    // ---- Phase 2 (enter): the newest resolved card's N (top) edge emerges from
    // the panel's S (bottom) edge and slides UP into its resting slot.
    //
    // No pre-reserved blank slot: the real row (nowEl) is collapsed to height 0
    // for the whole slide, so it reserves NO space and no empty gap is visible.
    // The visible motion is a clone that rests exactly where nowEl WILL be (the
    // bottom of the current content) and starts pushed one row DOWN so its N edge
    // sits at the panel's S edge (clipped by the list's overflow:hidden), then
    // slides up. On finish the clone is removed and nowEl is restored into the
    // same spot — a seamless swap, with the card having filled its own slot as it
    // emerged from the S edge.
    const enterRowH = last.height;
    const runEnter = () => {
      const prevOverflow = topList.style.overflow;
      topList.style.overflow = "hidden";

      // Collapse the real row so it reserves no slot during the slide.
      const restoreRow = () => {
        nowEl.style.height = "";
        nowEl.style.minHeight = "";
        nowEl.style.overflow = "";
        nowEl.style.visibility = "";
      };
      nowEl.style.height = "0px";
      nowEl.style.minHeight = "0";
      nowEl.style.overflow = "hidden";
      nowEl.style.visibility = "hidden";

      // With nowEl collapsed, the clone rests right after the last visible row
      // (= nowEl's own future position). Measure that bottom-of-content now.
      const topRect = topList.getBoundingClientRect();
      const restTop = nowEl.offsetTop; // offset within the scrolling list

      const enterClone = document.createElement("div");
      enterClone.className = "sui-sql__row sui-sql__row--resolved sui-sql__phase";
      enterClone.innerHTML = newFocusedContent; // already carries the ✓ marker
      enterClone.style.position = "absolute";
      enterClone.style.left = "0";
      enterClone.style.right = "0";
      enterClone.style.top = `${restTop}px`;
      enterClone.style.height = `${enterRowH}px`;
      topList.appendChild(enterClone);

      // Distance from the rest slot down to the panel's S edge — start the clone
      // there so its N edge first appears at the S edge, then slides up to rest.
      const slotTopInView = restTop - topList.scrollTop; // px from panel N edge
      const startY = Math.max(0, topRect.height - slotTopInView);

      animateOnce(
        enterClone,
        [{ transform: `translateY(${startY}px)` }, { transform: "translateY(0)" }],
        enterMs,
        () => {
          enterClone.remove();
          restoreRow(); // real ✓ row takes over its slot, seamless
          topList.style.overflow = prevOverflow;
        },
      );
    };

    // ---- Phase 1 (exit): HEIGHT COLLAPSE of the resolved card in the bottom
    // list. The card was the head of the bottom list; the data swap already
    // pulled the rows below it up by one row. We re-insert an orange
    // focused-styled placeholder IN FLOW at the head slot (which pushes those
    // rows back down to where they were), then collapse its height to 0 — so the
    // whole list below glides up in LOCKSTEP, smoothly and together, with no
    // card sliding over another and no instant jump. The placeholder clips its
    // content from the TOP (content pinned to the bottom of the shrinking box,
    // overflow:hidden), keeping its orange background until it reaches 0.
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

      // Insert at the head slot (right after the sticky header).
      bottomHeader.insertAdjacentElement("afterend", placeholder);

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
          // focus here so the new head lights up with the orange ▸ only now.
          advanceFocusAfterExit();
        },
      );
    } else {
      // No bottom list (queue emptied) — just run the enter phase. Nothing is
      // collapsing, so focus can advance immediately.
      advanceFocusAfterExit();
      runEnter();
    }
  };

  // Clear the exit suppression and fire onFocusChange with the current head of
  // the unresolved list (null if the queue is now empty). Called at the END of
  // the exit collapse so focus advances exactly when the resolved card is gone.
  // Guarantees onFocusChange still fires for every animated resolve.
  const advanceFocusAfterExit = () => {
    setExitingKey(null);
    props.onFocusChange?.(props.unresolved.map(props.keyOf)[0] ?? null);
  };

  // When the top pane is capped/scrolling, pin it to the bottom so the newest
  // resolved row sits flush at the seam, adjacent to the next unresolved item.
  createEffect(
    on(
      () => [props.resolved.length, layout().topScrollToBottom, layout().topHeight] as const,
      ([, scrollToBottom]) => {
        queueMicrotask(() => {
          if (topListEl && scrollToBottom) {
            topListEl.scrollTop = topListEl.scrollHeight;
          }
        });
      },
    ),
  );

  onCleanup(() => prevRects.clear());

  const renderRow = (item: T, kind: "resolved" | "unresolved") => {
    const key = props.keyOf(item);
    const isFocused = () => kind === "unresolved" && focusedKey() === key;
    return (
      <li
        data-sql-key={key}
        class={`sui-sql__row sui-sql__row--${kind}`}
        classList={{ "sui-sql__row--focused": isFocused() }}
        style={{ "min-height": `${rowHeightProp()}px` }}
        onClick={() => {
          if (kind === "unresolved") {
            props.onFocusChange?.(key);
            props.onResolve?.(key);
          }
        }}
      >
        <span class="sui-sql__marker" aria-hidden="true">
          {kind === "resolved" ? "✓" : isFocused() ? "▸" : ""}
        </span>
        <span class="sui-sql__content">{props.renderItem(item)}</span>
      </li>
    );
  };

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
          <span class="sui-sql__count">{props.resolved.length}</span>
        </li>
        <For each={props.resolved}>{(item) => renderRow(item, "resolved")}</For>
      </ul>

      {/* Seam + BOTTOM panel are omitted in topOnly mode — the categorized list
          takes the full height. The resolve enter/grow still plays. */}
      <Show when={!props.topOnly}>
        <div class="sui-sql__seam" aria-hidden="true" />

        {/* BOTTOM — unresolved ("to categorize"). Gets the remaining space and
            scrolls when overfull; collapses to the "all clear" strip when empty. */}
        <ul
          class="sui-sql__list sui-sql__list--bottom"
          classList={{ "sui-sql__list--collapsed": props.unresolved.length === 0 }}
          style={{ height: `${layout().bottomHeight}px` }}
        >
          <Show
            when={props.unresolved.length > 0}
            fallback={
              <li class="sui-sql__clear">
                {props.allClearLabel ?? "All clear — nothing to process"}
              </li>
            }
          >
            <li class="sui-sql__header sui-sql__header--bottom">
              <span>{props.unresolvedLabel ?? "Unresolved"}</span>
              <span class="sui-sql__count">{props.unresolved.length}</span>
            </li>
            <For each={props.unresolved}>
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
