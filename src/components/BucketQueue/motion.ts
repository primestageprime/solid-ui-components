/* BucketQueue — the transfer choreographer seam.
 *
 * The component knows only this interface. `createSlotMotion` is the shipped
 * implementation: the vacated slot closes, each arriving row opens from zero,
 * and every row whose position changed FLIP-slides to its new spot. The
 * deferred alternative — a clone flying over the bar from source rect to
 * destination rect, cross-fading its treatment en route — implements the SAME
 * interface, so trying it is one new file and one changed identifier in
 * BucketQueue.tsx. See docs/adr/0004-one-queue-component-and-the-motion-seam.md.
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
   *  has the PREVIOUS frame's geometry to animate from. Safe to call at any
   *  time: a no-op while a play() is still in flight, since the DOM's rects
   *  would include its active transform/height keyframes rather than the
   *  row's true resting position. */
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

// The bucket a row lives in, keyed by the data-bq-bucket marker on each
// bucket element — the only way to compare "same bucket" once a moved row
// has already left its source bucket in the DOM.
const bucketElOf = (el: Element): Element | null => el.closest("[data-bq-bucket]");

// The scrolling ancestor whose scrollTop can move a row between two
// measurements without the row itself having moved in the DOM.
const scrollerOf = (el: Element): Element | null => el.closest(".bucket-queue__body");

// A row's top in its scroll container's CONTENT space rather than viewport
// space. getBoundingClientRect() alone reports viewport coordinates, which a
// scroll of `.bucket-queue__body` (overflow-y: auto) changes for every row in
// that body even though none of them moved relative to their content. Adding
// back the scroller's own scrollTop cancels that out, so snapshot() and the
// dy computation below agree regardless of what scrolled between them.
const topOf = (el: HTMLElement): number => {
  const scroller = scrollerOf(el);
  const top = el.getBoundingClientRect().top;
  return scroller
    ? top - scroller.getBoundingClientRect().top + scroller.scrollTop
    : top;
};

// True when `el` comes after `arriving` in document order.
const isFollowing = (arriving: Element, el: Element): boolean =>
  (arriving.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

export const createSlotMotion = (): TransferChoreographer => {
  // Content-space top of every keyed row as of the last paint — the "First"
  // in FLIP. Content space (not viewport space) so a scroll between snapshot
  // and play doesn't read as displacement; see topOf() above.
  const prevRects = new Map<string, number>();
  // Animations from the last play(), retained so a transfer that lands
  // inside the previous one's window can cancel it before measuring, rather
  // than composing a second animation on top of a still-running one. Also
  // doubles as the "is a play in flight" flag capture() consults below.
  let running: Animation[] = [];

  // The actual rect-recording work, shared by the public capture() and by
  // play()'s own post-settle re-capture below.
  const snapshot = (root: HTMLElement) => {
    prevRects.clear();
    for (const el of root.querySelectorAll<HTMLElement>("[data-bq-key]")) {
      const key = el.dataset.bqKey;
      if (key) prevRects.set(key, topOf(el));
    }
  };

  return {
    capture(root) {
      // A play() in flight has active transforms and mid-keyframe heights
      // on the DOM; getBoundingClientRect() would read that instead of the
      // rows' true resting positions, poisoning prevRects for the NEXT
      // transfer. Skip — play() takes its own clean snapshot the instant
      // its animations settle, so prevRects is never more than one frame
      // stale, and never mid-flight.
      if (running.length > 0) return;
      snapshot(root);
    },

    async play(transfers, ctx) {
      // Cancel before measuring anything: a still-running animation leaves
      // an active transform on the element, and getBoundingClientRect()
      // below must see the row's true resting position, not a mid-flight
      // one.
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

      // Read phase: measure every rect this play needs before starting any
      // animation. Once an animate() call below applies its first keyframe,
      // a later getBoundingClientRect() would see t=0 layout instead of the
      // row's final resting position — so all reads happen first.
      // The row's vertical padding is read too, because a padded box cannot be
      // shorter than its own padding: `height: 0` on a row padded 6px top and
      // bottom still occupies 12px, so the slot would pop open from 12px
      // instead of from nothing. Collapsing the padding alongside the height
      // restores a true zero-height first keyframe.
      const arrivalPlans = arrivals.map(({ el }) => {
        const style = getComputedStyle(el);
        return {
          el,
          targetHeight: el.getBoundingClientRect().height,
          padTop: style.paddingTop,
          padBottom: style.paddingBottom,
        };
      });

      // Every other row that shifted slides from where it was to where it
      // is — EXCEPT a row that lives in the same bucket as an arriving row
      // and follows it in document order. The browser's own layout already
      // animates that row's displacement for the full duration, as a side
      // effect of the arriving row's height growing from zero: FLIP-
      // translating it too would double-count the same motion. Rows in the
      // arriving row's SOURCE bucket still need FLIP — the departing
      // element is already gone from the DOM, so nothing else moves them.
      const arrivingKeys = new Set(arrivals.map((a) => a.transfer.key));
      const flipPlans: { el: HTMLElement; dy: number }[] = [];
      for (const el of ctx.root.querySelectorAll<HTMLElement>("[data-bq-key]")) {
        const key = el.dataset.bqKey;
        if (!key || arrivingKeys.has(key) || !canAnimate(el)) continue;
        const before = prevRects.get(key);
        // Explicit undefined check, not falsy: prevRects now holds numbers
        // (content-space tops), and a row sitting exactly at its scroller's
        // top has a legitimate before of 0.
        if (before === undefined) continue;
        // A missing data-bq-bucket marker makes bucketElOf() return null
        // for every row; null === null would then exclude every row from
        // FLIP with no error. Guard it explicitly so a dropped marker
        // disables the exclusion rule instead of disabling the animation.
        const displacedByArrival = arrivals.some(({ el: arriving }) => {
          const arrivingBucket = bucketElOf(arriving);
          return (
            arrivingBucket != null &&
            arrivingBucket === bucketElOf(el) &&
            isFollowing(arriving, el)
          );
        });
        if (displacedByArrival) continue;
        const dy = before - topOf(el);
        if (Math.abs(dy) < 1) continue;
        flipPlans.push({ el, dy });
      }

      // Write phase: start every animation only now that all geometry for
      // this play has been read.
      const animations = [
        ...arrivalPlans.map(({ el, targetHeight, padTop, padBottom }) =>
          el.animate(
            [
              {
                height: "0px",
                paddingTop: "0px",
                paddingBottom: "0px",
                opacity: 0,
                overflow: "hidden",
              },
              {
                height: `${targetHeight}px`,
                paddingTop: padTop,
                paddingBottom: padBottom,
                opacity: 1,
                overflow: "hidden",
              },
            ],
            { duration: DURATION_MS, easing: EASING },
          ),
        ),
        ...flipPlans.map(({ el, dy }) =>
          el.animate(
            [{ transform: `translateY(${dy}px)` }, { transform: "translateY(0)" }],
            { duration: DURATION_MS, easing: EASING },
          ),
        ),
      ];

      running = animations;
      await Promise.all(animations.map((a) => a.finished.catch(() => undefined)));

      // Settled. Re-snapshot now, against genuinely final layout, before the
      // component's own capture() rAF gets a chance to run — that keeps
      // prevRects clean for whichever transfer comes next. Guarded by
      // identity: a later play() that cancelled us has already replaced
      // `running` with its own animations, and stomping on those here would
      // reopen the very capture race this exists to close.
      if (running === animations) {
        snapshot(ctx.root);
        running = [];
      }
    },
  };
};
