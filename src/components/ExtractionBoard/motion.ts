// lastReviewedAt: 2026-06-17
// lastReviewedBy: peter.stradinger
// ============================================
// ExtractionBoard — FLIP card-motion engine (a RUNTIME MECHANISM, not UI).
//
// A tiny FLIP (First-Last-Invert-Play) utility scoped to the board. It adds
// NO DOM and NO CSS: it finds cards by the `data-flip-*` attributes the board
// stamps onto its Surfaces and animates them purely with the Web Animations
// API (transform/opacity only).
//
// THE RULE: the "front" card departs first, then the gap fills. The three
// motions run in strict beats, each waiting for the previous:
//   1. SLURP — a card whose key disappeared (the previous Done card, now
//      folded into the Summary aggregate) shrinks and flies into its lane's
//      Summary anchor ([data-flip-anchor]).
//   2. SLIDE — a card whose key persists but whose column changed slides from
//      its old screen position into the new one.
//   3. ENTER — a brand-new card (the next Todo, once the front one left) grows
//      out of its lane's lozenge ([data-flip-lozenge]) into place.
//
// sync() is gated on a structural signature so it measures/animates ONLY on a
// real transition — never mid-animation on a plain bar-fill tick. The measure
// happens in requestAnimationFrame so the board's DOM has flushed and laid out
// (measuring mid-update mis-routes a card). Only horizontal COLUMN moves
// animate; pure vertical reflow (lanes below shifting) snaps. A bulk change
// (>4 slurps, e.g. a reset) snaps instead of animating the burst.
// ============================================

const EASE = "cubic-bezier(0.33, 0, 0.2, 1)";

// A real transition is a COLUMN (horizontal) change. The board has many
// swimlanes, and when one lane's height changes (a Doing card appears, the
// Summary grows) every lane below it shifts VERTICALLY — that reflow is not a
// move and must not animate, or unrelated cards fly around. So only animate
// when the horizontal delta clears this threshold; pure vertical shifts snap.
const COLUMN_MOVE_MIN = 24;

export interface CardFlipOptions {
  /** Slide duration when a card moves columns (ms). */
  moveMs?: number;
  /** Slurp duration when a card folds into its Summary anchor (ms). */
  slurpMs?: number;
  /** Enter duration when a new card grows out of the lozenge (ms). */
  enterMs?: number;
  /** Run the beats strictly in sequence (slurp → slide → enter). */
  sequence?: boolean;
}

export interface CardFlip {
  /** ref for the board root that contains the cards + anchors. */
  setRoot: (el: HTMLElement) => void;
  /** Run on every render (inside a createEffect that reads the data); cheap
   *  no-op unless the structural `signature` changed since the last call. */
  sync: (signature: string) => void;
  /** Forget prior positions so the next sync() is treated as a fresh first
   *  frame (no animation) — used on a board reset / bulk snap. */
  reset: () => void;
}

interface Snap {
  rect: DOMRect;
  cat: string;
}

export function createCardFlip(opts: CardFlipOptions = {}): CardFlip {
  const moveMs = opts.moveMs ?? 400;
  const slurpMs = opts.slurpMs ?? 600;
  const enterMs = opts.enterMs ?? 600;
  const sequence = opts.sequence ?? true;

  let root: HTMLElement | undefined;
  let overlay: HTMLElement | undefined;
  let prev = new Map<string, Snap>();
  let prevEls = new Map<string, HTMLElement>();
  let lastSig: string | null = null;
  let firstDone = false; // first measurement establishes positions, no animation
  let pending = false; // a measure is already scheduled this frame
  const running = new Set<Animation>();

  // One fixed, click-through layer for slurp ghosts (a motion artifact — not
  // authored UI).
  function ensureOverlay(): HTMLElement {
    if (overlay) return overlay;
    const el = document.createElement("div");
    el.style.cssText =
      "position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:40";
    document.body.appendChild(el);
    overlay = el;
    return el;
  }

  function measure(): {
    rects: Map<string, Snap>;
    els: Map<string, HTMLElement>;
    anchors: Map<string, DOMRect>;
    lozenges: Map<string, DOMRect>;
  } {
    const rects = new Map<string, Snap>();
    const els = new Map<string, HTMLElement>();
    const anchors = new Map<string, DOMRect>();
    const lozenges = new Map<string, DOMRect>();
    if (!root) return { rects, els, anchors, lozenges };
    for (const el of root.querySelectorAll<HTMLElement>("[data-flip-key]")) {
      rects.set(el.dataset.flipKey!, {
        rect: el.getBoundingClientRect(),
        cat: el.dataset.flipCat ?? "",
      });
      els.set(el.dataset.flipKey!, el);
    }
    for (const el of root.querySelectorAll<HTMLElement>("[data-flip-anchor]"))
      anchors.set(el.dataset.flipAnchor!, el.getBoundingClientRect());
    for (const el of root.querySelectorAll<HTMLElement>("[data-flip-lozenge]"))
      lozenges.set(el.dataset.flipLozenge!, el.getBoundingClientRect());
    return { rects, els, anchors, lozenges };
  }

  function track(anim: Animation) {
    running.add(anim);
    const done = () => running.delete(anim);
    anim.onfinish = done;
    anim.oncancel = done;
  }

  function slide(el: HTMLElement, dx: number, dy: number, delay: number) {
    track(
      el.animate(
        [
          { transform: `translate(${dx}px, ${dy}px)` },
          { transform: "translate(0, 0)" },
        ],
        { duration: moveMs, easing: EASE, delay, fill: "backwards" },
      ),
    );
  }

  // Grow a brand-new card out of `from` (its lane's lozenge) into place.
  function enter(
    el: HTMLElement,
    rest: DOMRect,
    from: DOMRect | undefined,
    delay: number,
  ) {
    const fx = from
      ? from.left + from.width / 2 - (rest.left + rest.width / 2)
      : rest.width;
    const fy = from
      ? from.top + from.height / 2 - (rest.top + rest.height / 2)
      : 0;
    track(
      el.animate(
        [
          { transform: `translate(${fx}px, ${fy}px) scale(0.06)`, opacity: 0 },
          { transform: "translate(0, 0) scale(1)", opacity: 1 },
        ],
        { duration: enterMs, easing: EASE, delay, fill: "backwards" },
      ),
    );
  }

  function slurp(el: HTMLElement, from: DOMRect, target: DOMRect | undefined) {
    const ov = ensureOverlay();
    el.style.position = "absolute";
    el.style.margin = "0";
    el.style.left = `${from.left}px`;
    el.style.top = `${from.top}px`;
    el.style.width = `${from.width}px`;
    el.style.height = `${from.height}px`;
    ov.appendChild(el);
    const tx = target
      ? target.left + target.width / 2 - (from.left + from.width / 2)
      : -from.width;
    const ty = target
      ? target.top + target.height / 2 - (from.top + from.height / 2)
      : 0;
    const anim = el.animate(
      [
        { transform: "translate(0, 0) scale(1)", opacity: 1 },
        { transform: `translate(${tx}px, ${ty}px) scale(0.06)`, opacity: 0 },
      ],
      { duration: slurpMs, easing: EASE },
    );
    const cleanup = () => el.remove();
    anim.onfinish = cleanup;
    anim.oncancel = cleanup;
  }

  // Measure + animate. Called from a requestAnimationFrame so the board's DOM
  // has fully flushed and laid out — measuring mid-update would read a
  // half-updated board and mis-route a card (e.g. slurp the Todo card into the
  // Summary).
  function run() {
    if (!root) return;
    // Snap any in-flight slides/enters to rest so we measure true layout, not a
    // mid-animation transform.
    for (const a of running) a.finish();
    running.clear();

    const { rects: next, els: nextEls, anchors, lozenges } = measure();

    if (firstDone) {
      // Classify the three motions.
      const slurps: Array<{ el: HTMLElement; from: DOMRect; cat: string }> = [];
      for (const [key, before] of prev) {
        if (next.has(key)) continue;
        const el = prevEls.get(key);
        if (el) slurps.push({ el, from: before.rect, cat: before.cat });
      }
      // A bulk change (e.g. a board reset returning everything to Todo) would
      // slurp many cards at once → snap instead of animating the burst.
      if (slurps.length <= 4) {
        const moves: Array<{ el: HTMLElement; dx: number; dy: number }> = [];
        const enters: Array<{ el: HTMLElement; rest: DOMRect; cat: string }> =
          [];
        for (const [key, snap] of next) {
          const el = nextEls.get(key)!;
          const before = prev.get(key);
          if (!before) {
            enters.push({ el, rest: snap.rect, cat: snap.cat });
            continue;
          }
          const dx = before.rect.left - snap.rect.left;
          const dy = before.rect.top - snap.rect.top;
          // Only animate a real COLUMN change (horizontal). A pure vertical
          // shift is just another lane reflowing — snap it, don't animate.
          if (Math.abs(dx) > COLUMN_MOVE_MIN) moves.push({ el, dx, dy });
        }

        // Strict beats: the front departs (slurp), then slides fill, then new
        // cards enter — each waiting for the previous beat to finish.
        const slideDelay = sequence && slurps.length ? slurpMs : 0;
        const enterDelay = sequence
          ? slideDelay + (moves.length ? moveMs : 0)
          : 0;

        for (const s of slurps) slurp(s.el, s.from, anchors.get(s.cat));
        for (const m of moves) slide(m.el, m.dx, m.dy, slideDelay);
        for (const e of enters)
          enter(e.el, e.rest, lozenges.get(e.cat), enterDelay);
      }
    }

    firstDone = true;
    prev = next;
    prevEls = nextEls;
  }

  function sync(signature: string) {
    if (signature === lastSig) return; // no structural change → leave anims be
    lastSig = signature;
    if (pending) return; // coalesce multiple changes within a frame
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      run();
    });
  }

  function reset() {
    for (const a of running) a.cancel();
    running.clear();
    prev = new Map();
    prevEls = new Map();
    lastSig = null;
    firstDone = false;
  }

  return { setRoot: (el) => (root = el), sync, reset };
}
