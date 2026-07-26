/* ProgressionQueue — the transfer choreographer seam.
 *
 * The component knows only this interface. `createSlotMotion` is the shipped
 * implementation: the vacated slot closes, each arriving row opens from zero,
 * and every row whose position changed FLIP-slides to its new spot. The
 * deferred alternative — a clone flying over the bar from source rect to
 * destination rect, cross-fading its treatment en route — implements the SAME
 * interface, so trying it is one new file and one changed identifier in
 * ProgressionQueue.tsx. See docs/adr/0004-one-queue-component-and-the-motion-seam.md.
 *
 * All DOM work is feature-detected: without `Element.animate` (jsdom) or under
 * `prefers-reduced-motion`, every path degrades to instant placement. */
import type { Transfer } from "./transfer";

export interface MotionContext {
  root: HTMLElement;
  rowEl: (key: string) => HTMLElement | undefined;
  reducedMotion: boolean;
}

export interface TransferChoreographer {
  /** Snapshot row rects. Call after every paint so a detected transfer always
   *  has the PREVIOUS frame's geometry to animate from. */
  capture(root: HTMLElement): void;
  /** Play one whole batch of simultaneous moves. Resolves when the motion has
   *  settled. A single call over the coherent set — never one call per
   *  transfer — so a multi-item move gets one FLIP pass, not M competing
   *  ones. */
  play(transfers: readonly Transfer[], ctx: MotionContext): Promise<void>;
}

const EASING = "cubic-bezier(0.2, 0.8, 0.2, 1)";
const DURATION_MS = 260;

const canAnimate = (el: Element): boolean =>
  typeof (el as HTMLElement).animate === "function";

// The section a row lives in, keyed by the data-pq-section marker on each
// section element — the only way to compare "same section" once a moved row
// has already left its source section in the DOM.
const sectionOf = (el: Element): Element | null => el.closest("[data-pq-section]");

// True when `el` comes after `arriving` in document order.
const isFollowing = (arriving: Element, el: Element): boolean =>
  (arriving.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

export const createSlotMotion = (): TransferChoreographer => {
  // Rects of every keyed row as of the last paint — the "First" in FLIP.
  const prevRects = new Map<string, DOMRect>();
  // Animations from the last play(), retained so a transfer that lands
  // inside the previous one's window can cancel it before measuring, rather
  // than composing a second animation on top of a still-running one.
  let running: Animation[] = [];

  return {
    capture(root) {
      prevRects.clear();
      for (const el of root.querySelectorAll<HTMLElement>("[data-pq-key]")) {
        const key = el.dataset.pqKey;
        if (key) prevRects.set(key, el.getBoundingClientRect());
      }
    },

    async play(transfers, ctx) {
      // Cancel before measuring anything: a still-running animation leaves
      // an active transform on the element, and getBoundingClientRect()
      // below must see the row's true resting position, not a mid-flight
      // one. Cancelling also gives capture()'s next snapshot a clean rect.
      for (const anim of running) anim.cancel();
      running = [];

      if (ctx.reducedMotion || transfers.length === 0) return;

      const arrivals = transfers
        .map((transfer) => ({ transfer, el: ctx.rowEl(transfer.key) }))
        .filter(
          (a): a is { transfer: Transfer; el: HTMLElement } =>
            a.el != null && canAnimate(a.el),
        );
      if (arrivals.length === 0) return;

      const animations: Animation[] = [];

      // Every arriving row opens from zero height. Its old element was
      // removed from its source section by Solid, so the vacated slot
      // closes for free as its former siblings FLIP into place below.
      for (const { el } of arrivals) {
        const target = el.getBoundingClientRect();
        animations.push(
          el.animate(
            [
              { height: "0px", opacity: 0, overflow: "hidden" },
              { height: `${target.height}px`, opacity: 1, overflow: "hidden" },
            ],
            { duration: DURATION_MS, easing: EASING },
          ),
        );
      }

      // Every other row that shifted slides from where it was to where it
      // is — EXCEPT a row that lives in the same section as an arriving row
      // and follows it in document order. The browser's own layout already
      // animates that row's displacement for the full duration, as a side
      // effect of the arriving row's height growing from zero: FLIP-
      // translating it too would double-count the same motion. Rows in the
      // arriving row's SOURCE section still need FLIP — the departing
      // element is already gone from the DOM, so nothing else moves them.
      const arrivingKeys = new Set(arrivals.map((a) => a.transfer.key));
      for (const el of ctx.root.querySelectorAll<HTMLElement>("[data-pq-key]")) {
        const key = el.dataset.pqKey;
        if (!key || arrivingKeys.has(key) || !canAnimate(el)) continue;
        const before = prevRects.get(key);
        if (!before) continue;
        const displacedByArrival = arrivals.some(
          ({ el: arriving }) =>
            sectionOf(arriving) === sectionOf(el) && isFollowing(arriving, el),
        );
        if (displacedByArrival) continue;
        const after = el.getBoundingClientRect();
        const dy = before.top - after.top;
        if (Math.abs(dy) < 1) continue;
        animations.push(
          el.animate(
            [{ transform: `translateY(${dy}px)` }, { transform: "translateY(0)" }],
            { duration: DURATION_MS, easing: EASING },
          ),
        );
      }

      running = animations;
      await Promise.all(animations.map((a) => a.finished.catch(() => undefined)));
    },
  };
};
