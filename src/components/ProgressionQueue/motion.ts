/* ProgressionQueue — the transfer choreographer seam.
 *
 * The component knows only this interface. `createSlotMotion` is the shipped
 * implementation: the vacated slot closes, the arriving row opens from zero,
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
  durationMs: number;
  reducedMotion: boolean;
}

export interface TransferChoreographer {
  /** Snapshot row rects. Call after every paint so a detected transfer always
   *  has the PREVIOUS frame's geometry to animate from. */
  capture(root: HTMLElement): void;
  /** Play one move. Resolves when the motion has settled. */
  play(transfer: Transfer, ctx: MotionContext): Promise<void>;
}

const EASING = "cubic-bezier(0.2, 0.8, 0.2, 1)";

const canAnimate = (el: Element): boolean =>
  typeof (el as HTMLElement).animate === "function";

export const createSlotMotion = (): TransferChoreographer => {
  // Rects of every keyed row as of the last paint — the "First" in FLIP.
  const prevRects = new Map<string, DOMRect>();

  return {
    capture(root) {
      prevRects.clear();
      for (const el of root.querySelectorAll<HTMLElement>("[data-pq-key]")) {
        const key = el.dataset.pqKey;
        if (key) prevRects.set(key, el.getBoundingClientRect());
      }
    },

    async play(transfer, ctx) {
      if (ctx.reducedMotion) return;
      const arriving = ctx.rowEl(transfer.key);
      if (!arriving || !canAnimate(arriving)) return;

      const animations: Animation[] = [];

      // The arriving row opens from zero height. Its old element was removed
      // from the source section by Solid, so the vacated slot closes for free
      // as its former siblings FLIP into place below.
      const target = arriving.getBoundingClientRect();
      animations.push(
        arriving.animate(
          [
            { height: "0px", opacity: 0, overflow: "hidden" },
            { height: `${target.height}px`, opacity: 1, overflow: "hidden" },
          ],
          { duration: ctx.durationMs, easing: EASING },
        ),
      );

      // Every other row that shifted slides from where it was to where it is.
      for (const el of ctx.root.querySelectorAll<HTMLElement>("[data-pq-key]")) {
        const key = el.dataset.pqKey;
        if (!key || key === transfer.key || !canAnimate(el)) continue;
        const before = prevRects.get(key);
        if (!before) continue;
        const after = el.getBoundingClientRect();
        const dy = before.top - after.top;
        if (Math.abs(dy) < 1) continue;
        animations.push(
          el.animate(
            [{ transform: `translateY(${dy}px)` }, { transform: "translateY(0)" }],
            { duration: ctx.durationMs, easing: EASING },
          ),
        );
      }

      await Promise.all(animations.map((a) => a.finished.catch(() => undefined)));
    },
  };
};
