// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// DateAxis — Atomic (Depth 1).
// Cadence-generic horizontal cell ribbon. One cell per item in `cells`;
// caller supplies a `renderCell` function that draws each cell's content.
//
// Use the helpers in ./cells (dailyCells, weeklyCells, monthlyCells, hourlyCells)
// to generate `Cell[]` for common cadences. For the original day-cell
// ergonomics, prefer the curried `DailyDateAxis` from ./DailyDateAxis.
// ============================================

import {
  type Component,
  For,
  type JSX,
  Show,
  createEffect,
  createMemo,
  createSignal,
  mergeProps,
  onCleanup,
  onMount,
} from "solid-js";
import "./DateAxis.css";
import { safeSetPointerCapture } from "../../internal/pointer/safeSetPointerCapture";
import { pipe, filter, join } from "../../fn";
import type { Cell } from "./cells";

export type { Cell } from "./cells";

/**
 * Per-cell context passed to `renderCell`. Lets the caller branch on the
 * cell's role and its index into the wider `cells` array.
 */
export interface DateAxisCellContext {
  /** `today` Date falls within this cell's [start, end). */
  isToday: boolean;
  /** This cell is the selected one. */
  isSelected: boolean;
  /** Zero-based position in `cells`. */
  index: number;
}

export interface DateAxisProps<C extends Cell = Cell> {
  /** The cells to render, left to right. Generate via the helpers in ./cells. */
  cells: C[];
  /**
   * Index of the selected cell. When provided, the axis scrolls smoothly so
   * the selected cell sits at the centre of the viewport — clamped at the
   * range ends, so the first/last cell pins to the left/right edge rather than
   * centring. Suppressed while the user is actively panning manually.
   */
  selected?: number;
  /**
   * A Date used to compute the today highlight. The cell whose [start, end)
   * contains it gets marked.
   */
  today?: Date;
  /**
   * Width in pixels of the DEFAULT cell chrome only. Default 40. Custom
   * `renderCell` content is self-sized (`width: auto`), so the rendered cell
   * may be wider or narrower than this — that is expected and supported. The
   * axis never trusts `cellWidth` for scroll math: it measures the real
   * per-cell width from its own layout (scrollWidth / cell count) to drive
   * recentre-on-select and the sticky month/year labels. So `cellWidth` and the
   * actual rendered width can diverge safely.
   */
  cellWidth?: number;
  /** Called when a cell is clicked or activated via Enter / Space. */
  onCellClick?: (index: number, cell: C) => void;
  /** Required cell content renderer. */
  renderCell: (cell: C, ctx: DateAxisCellContext) => JSX.Element;
  /**
   * Callback receiving the scroll container element on mount. Used by
   * ScrubChart to subscribe to the axis's scroll position; consumers that
   * don't need this can omit it.
   */
  scrollableRef?: (el: HTMLDivElement) => void;
}

/** True when `t` falls within `cell`'s [start, end). */
const cellContainsTime = (cell: Cell, t: Date): boolean =>
  t.getTime() >= cell.start.getTime() && t.getTime() < cell.end.getTime();

/** Threshold in ms within which a user-initiated scroll suppresses programmatic scroll. */
const USER_SCROLL_GRACE_MS = 250;

/** Safety net: clear the "programmatic scroll in flight" flag this long after a
 *  smooth-scroll begins, in case the user interrupts and we never reach the
 *  exact target (so the flag can't get stuck and swallow real user scrolls). A
 *  native smooth scroll across the viewport settles well within this. */
const MAX_PROGRAMMATIC_SCROLL_MS = 800;

/** Pretty "Mon YYYY" formatter, UTC-anchored to match the cell start dates. */
const formatMonthYear = (d: Date): string =>
  d.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

export const DateAxis = <C extends Cell = Cell>(
  props: DateAxisProps<C>,
): JSX.Element => {
  const cellW = () => props.cellWidth ?? 40;
  const clickable = () => props.onCellClick !== undefined;
  let scrollEl: HTMLDivElement | undefined;
  // Scroll↔index math must use the cells' REAL rendered width, not the
  // `cellWidth` prop. Custom (renderCell) cells are content-sized
  // (`width: auto`), so the prop is only a hint for the default cell chrome —
  // trusting it made recentre-on-select and the sticky labels land on the
  // wrong cell whenever the rendered width differed. Cells tile uniformly, so
  // scrollWidth / count is the true per-cell width; fall back to the prop
  // before first layout (scrollWidth === 0).
  const measuredCellW = (): number => {
    const n = props.cells.length;
    const sw = scrollEl ? scrollEl.scrollWidth : 0;
    return n > 0 && sw > 0 ? sw / n : cellW();
  };
  // Tracks the timestamp of the most recent user-initiated scroll so we can
  // suppress programmatic scroll-into-view when the user is actively panning.
  let lastUserScrollAt = 0;
  // While we drive a programmatic smooth-scroll, the `scroll` events it emits
  // must NOT be counted as user scrolls — otherwise each animation frame
  // re-arms the grace window and the *next* recentre (e.g. a click that lands
  // mid-flight) gets suppressed, so it can't take over. We flag the
  // programmatic scroll, ignore its scroll events, and clear the flag once the
  // viewport settles on the target (or the safety timer fires).
  let programmaticScrollActive = false;
  let programmaticTarget = 0;
  let programmaticTimer: ReturnType<typeof setTimeout> | undefined;

  const endProgrammaticScroll = () => {
    programmaticScrollActive = false;
    if (programmaticTimer !== undefined) {
      clearTimeout(programmaticTimer);
      programmaticTimer = undefined;
    }
  };

  // ── Visible-window tracking → sticky month/year labels ─────────────────
  // The two corner labels show the month + year of the leftmost and
  // rightmost cells currently in the scroll viewport so the user always
  // knows which months they're looking at without having to scroll up to
  // find a month-marker cell.
  const [scrollLeft, setScrollLeft] = createSignal(0);
  const [viewportWidth, setViewportWidth] = createSignal(0);

  const leftVisibleIdx = createMemo(() => {
    const w = measuredCellW();
    if (w <= 0 || props.cells.length === 0) return 0;
    return Math.max(
      0,
      Math.min(props.cells.length - 1, Math.floor(scrollLeft() / w)),
    );
  });
  const rightVisibleIdx = createMemo(() => {
    const w = measuredCellW();
    const vw = viewportWidth();
    if (w <= 0 || vw === 0 || props.cells.length === 0) return leftVisibleIdx();
    return Math.max(
      0,
      Math.min(props.cells.length - 1, Math.floor((scrollLeft() + vw - 1) / w)),
    );
  });
  const leftMonthLabel = createMemo(() =>
    props.cells.length > 0
      ? formatMonthYear(props.cells[leftVisibleIdx()].start)
      : "",
  );
  const rightMonthLabel = createMemo(() =>
    props.cells.length > 0
      ? formatMonthYear(props.cells[rightVisibleIdx()].start)
      : "",
  );
  // Show the right label only when it differs from the left — otherwise the
  // single "May 2026" on the left already tells the whole story.
  const showRightLabel = () => rightMonthLabel() !== leftMonthLabel();

  onMount(() => {
    if (scrollEl) props.scrollableRef?.(scrollEl);
  });

  // Programmatic scroll-into-view on selected change. Reacts to every
  // `selected` change, so clicking a new cell while a previous recentre is
  // still gliding issues a fresh `scrollTo` — the browser smoothly redirects
  // the in-flight smooth scroll from the old target to the new one.
  createEffect(() => {
    const idx = props.selected;
    if (idx === undefined || idx < 0 || idx >= props.cells.length) return;
    const el = scrollEl;
    if (!el) return;
    // A genuine user scroll/pan within the grace window wins — don't fight it.
    // (Our own in-flight programmatic frames no longer count, see onScrollListener.)
    if (Date.now() - lastUserScrollAt < USER_SCROLL_GRACE_MS) return;
    const w = measuredCellW();
    const cellLeft = idx * w;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    const target = Math.max(
      0,
      Math.min(maxScroll, cellLeft + w / 2 - el.clientWidth / 2),
    );
    // Already centred (within 1px) — nothing to animate, and arming the flag
    // for a no-op scroll could leave it stuck.
    if (Math.abs(el.scrollLeft - target) <= 1) return;
    // `scrollTo` is unavailable in some test environments (JSDOM); fall back
    // to assigning `scrollLeft` directly. Real browsers always have scrollTo.
    if (typeof el.scrollTo === "function") {
      programmaticTarget = target;
      programmaticScrollActive = true;
      if (programmaticTimer !== undefined) clearTimeout(programmaticTimer);
      programmaticTimer = setTimeout(
        endProgrammaticScroll,
        MAX_PROGRAMMATIC_SCROLL_MS,
      );
      el.scrollTo({ left: target, behavior: "smooth" });
    } else {
      el.scrollLeft = target;
    }
  });

  const onScrollListener = () => {
    const el = scrollEl;
    if (!el) return;
    setScrollLeft(el.scrollLeft);
    if (programmaticScrollActive) {
      // Our own smooth-scroll frame — don't treat it as a user scroll. Clear
      // the flag once we've essentially landed on the target.
      if (Math.abs(el.scrollLeft - programmaticTarget) <= 1) {
        endProgrammaticScroll();
      }
      return;
    }
    lastUserScrollAt = Date.now();
  };

  // ── Drag-to-pan (mouse / pen) ─────────────────────────────────────────
  // Mouse/pen click-and-drag horizontally on the ribbon pans the visible
  // window — it's a grab-and-slide gesture on the cells themselves, not
  // just on the scrollbar. Capture only kicks in once movement exceeds a
  // small threshold so taps on cells still resolve to the per-cell click
  // handler (no capture set = click target stays on the cell).
  //
  // Touch is left to native horizontal scroll so phone / tablet users
  // don't lose pan-to-scroll. Tap-to-select still works on touch via the
  // per-cell onClick below.
  const PAN_THRESHOLD_PX = 4;
  let panState: {
    startClientX: number;
    startScrollLeft: number;
    pointerId: number;
    active: boolean;
  } | null = null;

  const handleAxisPointerDown = (e: PointerEvent) => {
    if (!scrollEl || e.pointerType === "touch" || e.button !== 0) return;
    panState = {
      startClientX: e.clientX,
      startScrollLeft: scrollEl.scrollLeft,
      pointerId: e.pointerId,
      active: false,
    };
  };
  const handleAxisPointerMove = (e: PointerEvent) => {
    if (!panState || !scrollEl) return;
    const dx = e.clientX - panState.startClientX;
    if (!panState.active) {
      if (Math.abs(dx) < PAN_THRESHOLD_PX) return;
      panState.active = true;
      safeSetPointerCapture(scrollEl, panState.pointerId);
      // User grabbed the ribbon mid-recentre — drop programmatic control so
      // their drag is treated as a user scroll (and isn't fought by the flag).
      endProgrammaticScroll();
    }
    scrollEl.scrollLeft = panState.startScrollLeft - dx;
    lastUserScrollAt = Date.now();
  };
  const handleAxisPointerUp = (e: PointerEvent) => {
    if (!panState) return;
    if (panState.active) {
      try {
        scrollEl?.releasePointerCapture?.(panState.pointerId);
      } catch {
        /* not captured */
      }
    }
    panState = null;
    // Mark the gesture as a user scroll so any pending programmatic
    // recentre-on-selected stays out of the way for the grace window.
    if (e.type !== "pointercancel") lastUserScrollAt = Date.now();
  };

  return (
    <div class="sui-date-axis-wrapper">
      <div
        class="sui-date-axis__sticky-month sui-date-axis__sticky-month--left"
        aria-hidden="true"
      >
        {leftMonthLabel()}
      </div>
      <Show when={showRightLabel()}>
        <div
          class="sui-date-axis__sticky-month sui-date-axis__sticky-month--right"
          aria-hidden="true"
        >
          {rightMonthLabel()}
        </div>
      </Show>
      {/* biome-ignore lint/a11y/useSemanticElements: intentional ARIA row of columnheaders; native <tr> would break the flex scroll-container layout */}
      <div
        class="sui-date-axis"
        style={{ "--sui-date-axis-cell-width": `${cellW()}px` }}
        role="row"
        // -1 keeps the scroll container programmatically focusable without adding a tab stop; the cells are the keyboard-activated targets.
        tabIndex={-1}
        aria-label="Date axis"
        ref={(el) => {
          scrollEl = el;
          setScrollLeft(el.scrollLeft);
          setViewportWidth(el.clientWidth);
          el.addEventListener("scroll", onScrollListener, { passive: true });
          el.addEventListener("pointerdown", handleAxisPointerDown);
          el.addEventListener("pointermove", handleAxisPointerMove);
          el.addEventListener("pointerup", handleAxisPointerUp);
          el.addEventListener("pointercancel", handleAxisPointerUp);
          if (typeof ResizeObserver !== "undefined") {
            const ro = new ResizeObserver(() =>
              setViewportWidth(el.clientWidth),
            );
            ro.observe(el);
            onCleanup(() => ro.disconnect());
          }
          onCleanup(() => {
            el.removeEventListener("scroll", onScrollListener);
            el.removeEventListener("pointerdown", handleAxisPointerDown);
            el.removeEventListener("pointermove", handleAxisPointerMove);
            el.removeEventListener("pointerup", handleAxisPointerUp);
            el.removeEventListener("pointercancel", handleAxisPointerUp);
            endProgrammaticScroll();
          });
        }}
      >
        <div class="sui-date-axis__track">
          <For each={props.cells}>
            {(cell, idx) => {
              const isToday = () =>
                props.today !== undefined &&
                cellContainsTime(cell, props.today);
              const isSelected = () => props.selected === idx();
              const ctx = (): DateAxisCellContext => ({
                isToday: isToday(),
                isSelected: isSelected(),
                index: idx(),
              });
              const activate = () => props.onCellClick?.(idx(), cell);

              return (
                // biome-ignore lint/a11y/noStaticElementInteractions: dual-mode cell — role resolves to "button" exactly when the click/key handlers are attached (clickable()); "columnheader" otherwise carries no handlers
                // biome-ignore lint/a11y/useAriaPropsSupportedByRole: aria-pressed is emitted only when clickable(), i.e. only when role is "button" (which supports it); it is undefined under the "columnheader" role
                <div
                  class={pipe(
                    [
                      "sui-date-axis__cell",
                      "sui-date-axis__cell--custom",
                      isToday() ? "sui-date-axis__cell--today" : "",
                      isSelected() ? "sui-date-axis__cell--selected" : "",
                      clickable() ? "sui-date-axis__cell--clickable" : "",
                    ],
                    filter(Boolean),
                    join(" "),
                  )}
                  role={clickable() ? "button" : "columnheader"}
                  tabindex={clickable() ? 0 : undefined}
                  aria-current={isToday() ? "date" : undefined}
                  aria-pressed={clickable() ? isSelected() : undefined}
                  onClick={clickable() ? activate : undefined}
                  onKeyDown={
                    clickable()
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            activate();
                          }
                        }
                      : undefined
                  }
                >
                  {props.renderCell(cell, ctx())}
                </div>
              );
            }}
          </For>
        </div>
      </div>
    </div>
  );
};

// ── Override / Data split + factory ────────────────────────────────────────

/**
 * Props that are visual/static overrides — locked at variant-definition time.
 * `cellWidth` is the only presentational knob; everything else is data/callback.
 */
export type DateAxisOverrides<C extends Cell = Cell> = Pick<
  DateAxisProps<C>,
  "cellWidth"
>;

/** Props that remain available to consumers of a curried DateAxis variant. */
export type DateAxisDataProps<C extends Cell = Cell> = Omit<
  DateAxisProps<C>,
  keyof DateAxisOverrides<C>
>;

/**
 * Factory that returns a curried DateAxis with a baked-in presentational
 * `cellWidth`. Call sites then receive only `DateAxisDataProps`.
 */
export function createDateAxis<C extends Cell = Cell>(
  defaults: Partial<Omit<DateAxisProps<C>, "children">>,
): Component<DateAxisDataProps<C>> {
  return (props) => (
    <DateAxis {...(mergeProps(defaults, props) as DateAxisProps<C>)} />
  );
}
