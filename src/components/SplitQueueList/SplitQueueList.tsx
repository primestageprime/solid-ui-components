import {
  Component,
  For,
  Show,
  JSX,
  createMemo,
  createEffect,
  on,
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
 * Sizing (see ./layout.ts for the testable core):
 *  - The bottom list has priority: it gets the height it needs, up to
 *    `total - topMinRows*rowHeight`. The top list keeps a floor of `topMinRows`
 *    (default 3) and auto-scrolls to its bottom so the newest sits at the seam.
 *  - When the bottom is short, the top absorbs the slack and grows past 3.
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
  /** Minimum rows the top list keeps. Default 3. */
  topMinRows?: number;
  /** Per-row height in px. Default 40. */
  rowHeight?: number;
  /** Total height of the sidebar in px. Default 420. */
  height?: number;
  /** Slide duration in ms. Default 360. */
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
  const rowHeight = () => props.rowHeight ?? 40;
  const topMinRows = () => props.topMinRows ?? 3;
  const height = () => props.height ?? 420;
  const animationMs = () => props.animationMs ?? 360;

  let topListEl: HTMLUListElement | undefined;
  let rootEl: HTMLDivElement | undefined;

  // Rects of every keyed row captured on the previous render — the "First" in
  // FLIP. Read synchronously before the data swap reflows the DOM.
  const prevRects = new Map<string, DOMRect>();
  let prevUnresolvedKeys: string[] = [];

  const layout = createMemo(() =>
    computeSplitLayout({
      totalHeight: height(),
      rowHeight: rowHeight(),
      topMinRows: topMinRows(),
      resolvedCount: props.resolved.length,
      unresolvedCount: props.unresolved.length,
      seamHeight: SEAM_HEIGHT,
    }),
  );

  const reducedMotion = () =>
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // The focused unresolved key — controlled prop, falling back to the head of
  // the unresolved list so focus always lands on the next item to process.
  const focusedKey = createMemo(() => {
    const keys = props.unresolved.map(props.keyOf);
    if (props.focusedKey && keys.includes(props.focusedKey)) return props.focusedKey;
    return keys[0] ?? null;
  });

  // ---- FLIP: snapshot the rects of every rendered row. We keep the snapshot
  // from the *previous* paint as the "First" position. Capture runs on rAF
  // (after paint); resolve-detection + playFlight run on a microtask (before
  // the next rAF), so during a flight `prevRects` still holds pre-swap rects.
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
      () => {
        requestAnimationFrame(captureRects);
      },
      { defer: false },
    ),
  );

  // Detect a resolve (key moved unresolved -> resolved) and play the flight.
  createEffect(
    on(
      () => props.resolved.map(props.keyOf).join(""),
      (resolvedSig, prevSig) => {
        const resolvedKeys = resolvedSig.split("").filter(Boolean);
        const prevResolved = (prevSig ?? "").split("").filter(Boolean);
        const newlyResolved = resolvedKeys.filter(
          (k) => !prevResolved.includes(k) && prevUnresolvedKeys.includes(k),
        );
        // Auto-advance focus to the new head of the unresolved list.
        if (newlyResolved.length > 0) {
          props.onFocusChange?.(props.unresolved.map(props.keyOf)[0] ?? null);
        }
        prevUnresolvedKeys = props.unresolved.map(props.keyOf);

        if (newlyResolved.length === 0 || prevSig === undefined) return;
        if (reducedMotion()) return;
        // Defer to the post-render frame so new rects are final, then FLIP.
        const movedKey = newlyResolved[newlyResolved.length - 1];
        queueMicrotask(() => playFlight(movedKey));
      },
    ),
  );

  // Keep prevUnresolvedKeys current even when no resolve happens (e.g. adds).
  createEffect(() => {
    prevUnresolvedKeys = props.unresolved.map(props.keyOf);
  });

  const playFlight = (key: string) => {
    if (!rootEl) return;
    const first = prevRects.get(key);
    const nowEl = rootEl.querySelector<HTMLElement>(
      `[data-sql-key="${cssEscape(key)}"]`,
    );
    if (!first || !nowEl) return;
    const last = nowEl.getBoundingClientRect();
    const fromY = first.top - last.top;
    if (Math.abs(fromY) < 1) return;

    nowEl.classList.add("sui-sql__row--landing");
    nowEl.animate(
      [{ transform: `translateY(${fromY}px)` }, { transform: "translateY(0)" }],
      { duration: animationMs(), easing: "cubic-bezier(.22,.61,.36,1)" },
    ).finished.finally(() => nowEl.classList.remove("sui-sql__row--landing"));

    // Seam repaint: a transient clipped "ghost" of the moving row styled as
    // *unresolved*, riding up inside the bottom list and clipped away at its
    // top edge. The real (resolved-styled) row provides the emerging half.
    paintSeamGhost(key, nowEl);
  };

  // Render a clipped unresolved-styled clone inside the bottom list that
  // travels from the row's old position up to the seam, then fades as it is
  // clipped by overflow. Removed when the animation ends.
  const paintSeamGhost = (key: string, resolvedRowEl: HTMLElement) => {
    const bottomList = rootEl?.querySelector<HTMLElement>(".sui-sql__list--bottom");
    const first = prevRects.get(key);
    if (!bottomList || !first) return;
    const listRect = bottomList.getBoundingClientRect();

    const ghost = document.createElement("div");
    ghost.className = "sui-sql__ghost sui-sql__row sui-sql__row--unresolved";
    ghost.innerHTML = resolvedRowEl.innerHTML;
    ghost.style.position = "absolute";
    ghost.style.left = "0";
    ghost.style.right = "0";
    ghost.style.top = `${first.top - listRect.top}px`;
    ghost.style.height = `${first.height}px`;
    bottomList.appendChild(ghost);

    // Slide the ghost up by the same distance the real row travels (out the top
    // of the bottom list, where overflow:hidden clips it — the seam repaint).
    const dist = first.top - listRect.top + first.height;
    ghost
      .animate(
        [
          { transform: "translateY(0)", opacity: 1 },
          { transform: `translateY(${-dist}px)`, opacity: 1 },
        ],
        { duration: animationMs(), easing: "cubic-bezier(.22,.61,.36,1)" },
      )
      .finished.finally(() => ghost.remove());
  };

  // Auto-scroll the top list to its bottom so the newest resolved row sits at
  // the seam, adjacent to the next unresolved item.
  createEffect(
    on(
      () => props.resolved.length,
      () => {
        queueMicrotask(() => {
          if (topListEl) topListEl.scrollTop = topListEl.scrollHeight;
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
      {/* TOP — resolved. Grows to absorb slack; min-height = topMinRows. */}
      <ul
        ref={topListEl}
        class="sui-sql__list sui-sql__list--top"
        style={{ "min-height": `${topMinRows() * rowHeight()}px` }}
      >
        <li class="sui-sql__header sui-sql__header--top">
          <span>{props.resolvedLabel ?? "Resolved"}</span>
          <span class="sui-sql__count">{props.resolved.length}</span>
        </li>
        <For each={props.resolved}>{(item) => renderRow(item, "resolved")}</For>
      </ul>

      <div class="sui-sql__seam" aria-hidden="true" />

      {/* BOTTOM — unresolved. Priority height; collapses when empty. */}
      <ul
        class="sui-sql__list sui-sql__list--bottom"
        classList={{ "sui-sql__list--collapsed": layout().bottomCollapsed }}
        style={{ "max-height": `${layout().bottomHeight}px` }}
      >
        <Show
          when={!layout().bottomCollapsed}
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
