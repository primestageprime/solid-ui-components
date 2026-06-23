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

  // During a resolve we animate the SECTION heights from their pre-resolve values
  // to the new layout values, so the categorized section visibly grows downward
  // from the seam (and the to-categorize section shrinks) in lockstep — instead
  // of the panes snapping to the memo's new heights. While this override is set
  // it takes precedence over the layout memo for the pane heights.
  const [heightOverride, setHeightOverride] =
    createSignal<{ top: number; bottom: number } | null>(null);
  const effTopHeight = () => heightOverride()?.top ?? layout().topHeight;
  const effBottomHeight = () => heightOverride()?.bottom ?? layout().bottomHeight;

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
  // The last RENDERED section heights, snapshotted post-paint alongside the rects.
  // On a resolve, playFlight (microtask) runs before the next rAF capture, so
  // these still hold the PRE-resolve heights — the values the section-height
  // grow/shrink animates away from.
  let prevTopH = layout().topHeight;
  let prevBottomH = layout().bottomHeight;

  const captureRects = () => {
    if (!rootEl) return;
    prevRects.clear();
    rootEl.querySelectorAll<HTMLElement>("[data-sql-key]").forEach((el) => {
      const k = el.dataset.sqlKey!;
      prevRects.set(k, el.getBoundingClientRect());
    });
    // Snapshot the rendered pane heights too (skip while an override animation
    // is mutating them, so we keep the true resting heights).
    if (!heightOverride()) {
      const topEl = rootEl.querySelector<HTMLElement>(".sui-sql__list--top");
      const botEl = rootEl.querySelector<HTMLElement>(".sui-sql__list--bottom");
      if (topEl) prevTopH = topEl.getBoundingClientRect().height;
      if (botEl) prevBottomH = botEl.getBoundingClientRect().height;
    }
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
  // SIMULTANEOUSLY the categorized (top) SECTION grows from its pre-resolve
  // height to its new height (seam descends), revealing the newest ✓ row at the
  // seam. Both run over the full animationMs; the seam moves as one.
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
    if (!first || !nowEl || !topList) return bail();

    const total = animationMs();
    const newFocusedContent = nowEl.innerHTML;
    const rowH = first.height;

    // ---- The SECTION-height animation (the headline motion) ----------------
    // The categorized (top) section GROWS from its pre-resolve height to the new
    // (taller) layout height, extending its bottom edge down = the seam DESCENDS.
    // The to-categorize (bottom) section shrinks complementarily, so the seam
    // moves as one. Heights are driven through `heightOverride` (which takes
    // precedence over the layout memo) so the panes don't snap. The newest row
    // (the real resolved row, at the bottom of the top list) grows in BLANK at
    // the seam — just the card shell — while the section grows; it's populated
    // with the ✓ content only AFTER the growth completes (in settle()). The top
    // list is overflow-clipped and pinned to its bottom so the card is revealed
    // from the seam upward, not sliding in from the top.
    const fromTop = prevTopH;
    const fromBottom = prevBottomH;
    const toTop = layout().topHeight;
    const toBottom = layout().bottomHeight;
    // Capture the scroll position BEFORE we override heights. When the top is
    // CAPPED (fromTop === toTop, e.g. 4+ resolved) the section can't grow, so the
    // newest row must SCROLL in at the seam while an equal amount scrolls off the
    // top: we animate scrollTop from its pre-resolve value to the new max. When
    // the section grows, scroll stays pinned to the bottom so the newest is
    // revealed by the growth.
    const fromScroll = topList.scrollTop;
    const capped = Math.abs(toTop - fromTop) < 1;
    setHeightOverride({ top: fromTop, bottom: fromBottom });
    topList.style.overflow = "hidden";

    // The newest categorized card grows in BLANK — just the card shell, no ✓ and
    // no text — while the section grows from the seam. It's populated with the
    // resolved content only AFTER the growth completes (in settle()). So during
    // the grow we hide the row's inner content via a class.
    nowEl.classList.add("sui-sql__row--blank");

    const driveScroll = (e: number) => {
      const maxScroll = topList.scrollHeight - topList.clientHeight;
      if (capped) {
        topList.scrollTop = fromScroll + (maxScroll - fromScroll) * e;
      } else {
        topList.scrollTop = maxScroll; // grown section reveals newest at seam
      }
    };

    // ---- The bottom orange head card collapse (kept) -----------------------
    // The resolved card was the head of the bottom list; the swap removed it and
    // pulled the rows up. We re-insert an orange focused placeholder at the head
    // slot and collapse it H→0 IN FLOW, so the orange card visibly disappears
    // under the "to categorize" header while the rows below glide up — mirroring
    // the top growing. (min-height:0 so it can actually reach 0; content pinned
    // to the bottom so the top edge clips it under the header.)
    const bottomHeader = bottomList?.querySelector<HTMLElement>(".sui-sql__header");
    let placeholder: HTMLLIElement | null = null;
    if (bottomList && bottomHeader) {
      placeholder = document.createElement("li");
      placeholder.className = "sui-sql__collapse";
      placeholder.style.height = `${rowH}px`;
      placeholder.style.minHeight = "0";
      placeholder.style.overflow = "hidden";
      placeholder.style.position = "relative";
      const inner = document.createElement("div");
      inner.className =
        "sui-sql__row sui-sql__row--unresolved sui-sql__row--focused";
      inner.innerHTML = newFocusedContent;
      const marker = inner.querySelector<HTMLElement>(".sui-sql__marker");
      if (marker) marker.textContent = "▸";
      inner.style.position = "absolute";
      inner.style.left = "0";
      inner.style.right = "0";
      inner.style.bottom = "0";
      inner.style.height = `${rowH}px`;
      inner.style.margin = "0";
      placeholder.appendChild(inner);
      bottomHeader.insertAdjacentElement("afterend", placeholder);
    }

    // ---- Drive everything from one progress 0→1 over the full duration -----
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3); // cubic-ish, matches EASE feel
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      placeholder?.remove();
      topList.style.overflow = "";
      setHeightOverride(null); // release the panes back to the layout memo
      topList.scrollTop = topList.scrollHeight; // newest flush at the seam
      // The card has finished growing — NOW populate it with the resolved
      // content (✓ + text repaints in).
      nowEl.classList.remove("sui-sql__row--blank");
      // The card is now entirely out of the bottom list — advance focus so the
      // new head lights up with the orange ▸ exactly now (end of the animation).
      advanceFocusAfterExit();
    };

    const now = () =>
      typeof performance !== "undefined" ? performance.now() : Date.now();
    const startTs = now();
    // Time-driven ticker: progress is computed from elapsed time, so the result
    // is correct regardless of how often ticks actually fire (smooth ~16ms when
    // visible; coarser but still correct if the tab is backgrounded). setTimeout
    // (not rAF) so it keeps advancing in a hidden tab instead of freezing.
    const frame = () => {
      if (settled) return;
      const p = total <= 0 ? 1 : Math.min(1, (now() - startTs) / total);
      const e = easeOut(p);
      setHeightOverride({
        top: fromTop + (toTop - fromTop) * e,
        bottom: fromBottom + (toBottom - fromBottom) * e,
      });
      if (placeholder) placeholder.style.height = `${rowH * (1 - e)}px`;
      driveScroll(e);
      if (p < 1) {
        setTimeout(frame, 16);
      } else {
        settle();
      }
    };

    if (total > 0 && typeof setTimeout === "function") {
      frame();
    } else {
      // Zero duration / no timers (jsdom edge) — settle immediately.
      settle();
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
  // Skipped while a resolve's section-height animation is running — that loop
  // drives scrollTop itself (and settles it to the bottom at the end).
  createEffect(
    on(
      () => [props.resolved.length, layout().topScrollToBottom, layout().topHeight] as const,
      ([, scrollToBottom]) => {
        queueMicrotask(() => {
          if (topListEl && scrollToBottom && !heightOverride()) {
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
      style={{ height: `${height()}px` }}
    >
      {/* TOP — resolved ("categorized"). Content-driven height between a 1-row
          floor and a 3-row cap; absorbs slack when the bottom is short. Sized
          explicitly from the JS layout (each pane includes its own header). */}
      <ul
        ref={topListEl}
        class="sui-sql__list sui-sql__list--top"
        style={{ height: `${effTopHeight()}px` }}
      >
        <li ref={headerProbeEl} class="sui-sql__header sui-sql__header--top">
          <span>{props.resolvedLabel ?? "Resolved"}</span>
          <span class="sui-sql__count">{props.resolved.length}</span>
        </li>
        <For each={props.resolved}>{(item) => renderRow(item, "resolved")}</For>
      </ul>

      <div class="sui-sql__seam" aria-hidden="true" />

      {/* BOTTOM — unresolved ("to categorize"). Gets the remaining space and
          scrolls when overfull; collapses to the "all clear" strip when empty. */}
      <ul
        class="sui-sql__list sui-sql__list--bottom"
        classList={{ "sui-sql__list--collapsed": props.unresolved.length === 0 }}
        style={{ height: `${effBottomHeight()}px` }}
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
    </div>
  );
}

/** Minimal CSS.escape fallback for attribute selectors (keys are usually
 * simple, but guard against quotes/brackets). */
function cssEscape(s: string): string {
  if (typeof CSS !== "undefined" && CSS.escape) return CSS.escape(s);
  return s.replace(/["\\\]]/g, "\\$&");
}
