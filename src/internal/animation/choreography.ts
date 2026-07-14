// Choreography — compose and sequence animation EFFECTS across components.
//
// The generalization of the AnimatedSwimlaneChart trajectory model to
// cross-component gestures. Same philosophy, new scale:
//
//   • EFFECTS are a small named vocabulary of verbs (collapse, expand,
//     fadeIn, slideDown, rollUp, glowIn) — each a pure description of
//     "animate THIS element THIS way for THIS long", executed with WAAPI
//     (`element.animate`) so every effect yields a Promise.
//   • A STEP runs its effects in parallel; steps run in sequence.
//   • A COMMIT is an explicit point in the sequence where reactive state
//     flips. Effects BEFORE the commit act on elements that are about to
//     leave; effects AFTER act on elements that only exist once state has
//     changed. (This is the leave→move→arrive phasing from
//     `trajectories/`, promoted to component scale.)
//   • Timing follows the `phasesFor` rule: each step's duration is a
//     WEIGHT-fraction of one total budget, so a whole gesture retimes
//     with a single knob.
//
// Targets are HANDLES, not refs: elements opt in with a `data-anim`
// attribute (e.g. `data-anim="unresolved:t5"`) and the choreographer
// resolves them at step time. A handle that doesn't resolve (the item
// has no snooze rail, the list is empty) just skips — sequences degrade
// gracefully instead of throwing.
//
//   await choreograph([
//     step(collapse("unresolved:t5"), collapse("detail")),
//     commit(() => setItems(...)),          // ← state flips HERE
//     step(expand("rail:person:t5"), rollUp("count:person")),
//     step(glowIn("unresolved:t6")),
//     step(slideDown("detail")),
//   ]);
//
// Pure module: no Solid imports. Honors `prefers-reduced-motion`
// (commits still run; motion durations drop to 0). Safe under jsdom
// (no `element.animate` → effects resolve immediately). Starting a new
// choreography FAST-FORWARDS any in-flight one: its remaining commits
// run synchronously (state is never lost), its animations cancel.

/**
 * Attribute-spread helper: `<InteractiveCard {...anim(`unresolved:${id}`)}>`
 * registers the element under a choreography handle without a wrapper div
 * (Solid's JSX types don't admit literal `data-*` attributes on components;
 * a typed spread does).
 */
export const anim = (handle: string): { "data-anim": string } => ({
  "data-anim": handle,
});

export type EffectFn = (el: HTMLElement, ms: number) => Animation | null;

export interface EffectInstance {
  /** `data-anim` handle of the target element. Empty string = no-op. */
  handle: string;
  /** Optional CSS selector resolved INSIDE the handle's element. */
  inner?: string;
  run: EffectFn;
}

export type Step =
  | { kind: "effects"; effects: EffectInstance[]; weight: number }
  | { kind: "commit"; fn: () => void };

/** Effects that run in parallel as one sequence step (weight 1). */
export const step = (...effects: EffectInstance[]): Step => ({
  kind: "effects",
  effects,
  weight: 1,
});

/** A step with an explicit share of the timing budget. */
export const weightedStep = (
  weight: number,
  ...effects: EffectInstance[]
): Step => ({ kind: "effects", effects, weight });

/** The point in the sequence where reactive state flips. Zero duration. */
export const commit = (fn: () => void): Step => ({ kind: "commit", fn });

// ─── timing ──────────────────────────────────────────────────────────────

export const DEFAULT_TOTAL_MS = 900;
const EASE = "cubic-bezier(0.33, 1, 0.68, 1)"; // easeOutCubic

const prefersReducedMotion = (): boolean =>
  typeof matchMedia === "function" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Double-RAF: state committed → DOM updated → styles applied. RAF never
 *  fires in a hidden/occluded tab (visibilityState "hidden"), which would
 *  wedge the sequence mid-gesture with a fill:forwards collapse holding
 *  height 0 — so a timer fallback guarantees progress either way. */
const nextFrame = (): Promise<void> =>
  new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    if (typeof requestAnimationFrame === "function")
      requestAnimationFrame(() => requestAnimationFrame(finish));
    setTimeout(finish, 50);
  });

// ─── engine ──────────────────────────────────────────────────────────────

interface RunningSequence {
  fastForward: () => void;
}

let current: RunningSequence | null = null;

const resolveTarget = (e: EffectInstance): HTMLElement | null => {
  if (!e.handle || typeof document === "undefined") return null;
  const root = document.querySelector<HTMLElement>(
    `[data-anim="${e.handle}"]`,
  );
  if (!root) return null;
  return e.inner ? root.querySelector<HTMLElement>(e.inner) ?? root : root;
};

/**
 * Run a sequence. Steps execute in order; a step's effects run in
 * parallel and the sequence waits for the slowest. Each effect-step
 * gets `totalMs × weight / Σweights`. Returns when the last step
 * settles. Never rejects — a cancelled animation is normal flow.
 */
export async function choreograph(
  steps: Step[],
  opts?: { totalMs?: number },
): Promise<void> {
  // Fast-forward any in-flight gesture: run its remaining commits (state
  // must never be lost), cancel its animations.
  current?.fastForward();

  const totalMs = prefersReducedMotion() ? 0 : opts?.totalMs ?? DEFAULT_TOTAL_MS;
  const totalWeight = steps.reduce(
    (sum, s) => sum + (s.kind === "effects" ? s.weight : 0),
    0,
  );

  let cancelled = false;
  let live: Animation[] = [];
  let idx = 0;

  const mine: RunningSequence = {
    fastForward: () => {
      cancelled = true;
      live.forEach((a) => a.cancel());
      for (; idx < steps.length; idx++) {
        const s = steps[idx];
        if (s.kind === "commit") s.fn();
      }
    },
  };
  current = mine;

  while (idx < steps.length && !cancelled) {
    const s = steps[idx];
    if (s.kind === "commit") {
      s.fn();
      idx++; // advance BEFORE awaiting — a fastForward during the wait must not re-run this commit
      await nextFrame();
      continue;
    }
    const ms = totalWeight > 0 ? (totalMs * s.weight) / totalWeight : 0;
    const anims = s.effects
      .map((e) => {
        const el = resolveTarget(e);
        return el ? e.run(el, ms) : null;
      })
      .filter((a): a is Animation => a !== null);
    live = anims;
    // `animation.finished` is serviced from the RENDERING loop — in a
    // hidden/occluded tab it never resolves even once playState is
    // "finished" (verified in Chrome). The duration is known, so race
    // the promise against a timer; on timeout the timeline has already
    // carried the animation to its end state (or the next effect's
    // takeOver will supersede it) — proceeding is always safe.
    if (anims.length)
      await Promise.race([
        Promise.all(anims.map((a) => a.finished.catch(() => {}))),
        new Promise((r) => setTimeout(r, ms + 80)),
      ]);
    live = [];
    idx++;
  }

  if (current === mine) current = null;
}

// ─── effect helpers ──────────────────────────────────────────────────────

const canAnimate = (el: HTMLElement): boolean =>
  typeof el.animate === "function";

/** Cancel anything already animating this element (a prior step's
 *  fill:forwards hold, an interrupted gesture) so this effect owns it. */
const takeOver = (el: HTMLElement) => {
  if (typeof el.getAnimations === "function")
    el.getAnimations().forEach((a) => a.cancel());
};

// ─── the verbs ───────────────────────────────────────────────────────────

/**
 * Shrink to zero height and fade. Holds the collapsed state
 * (fill:forwards) — meant to be followed by a commit that removes the
 * element, or by a later effect on the same handle (expand/slideDown),
 * which takes the animation over.
 */
export const collapse = (handle: string, inner?: string): EffectInstance => ({
  handle,
  inner,
  run: (el, ms) => {
    if (!canAnimate(el)) return null;
    takeOver(el);
    const h = el.getBoundingClientRect().height;
    el.style.overflow = "hidden";
    return el.animate(
      [
        { height: `${h}px`, opacity: 1 },
        { height: "0px", opacity: 0 },
      ],
      { duration: ms, easing: EASE, fill: "forwards" },
    );
  },
});

/** Grow from zero to natural height while fading in. Run AFTER the
 *  commit that created the element (it measures the natural height). */
export const expand = (handle: string, inner?: string): EffectInstance => ({
  handle,
  inner,
  run: (el, ms) => {
    if (!canAnimate(el)) return null;
    takeOver(el);
    const h = el.getBoundingClientRect().height;
    const prevOverflow = el.style.overflow;
    el.style.overflow = "hidden";
    const anim = el.animate(
      [
        { height: "0px", opacity: 0 },
        { height: `${h}px`, opacity: 1 },
      ],
      { duration: ms, easing: EASE },
    );
    anim.finished
      .then(() => {
        el.style.overflow = prevOverflow;
      })
      .catch(() => {});
    return anim;
  },
});

export const fadeIn = (handle: string, inner?: string): EffectInstance => ({
  handle,
  inner,
  run: (el, ms) => {
    if (!canAnimate(el)) return null;
    takeOver(el);
    return el.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: ms,
      easing: EASE,
    });
  },
});

export const fadeOut = (handle: string, inner?: string): EffectInstance => ({
  handle,
  inner,
  run: (el, ms) => {
    if (!canAnimate(el)) return null;
    takeOver(el);
    return el.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: ms,
      easing: EASE,
      fill: "forwards",
    });
  },
});

/** Content slides in downward from just above its resting place. */
export const slideDown = (handle: string, inner?: string): EffectInstance => ({
  handle,
  inner,
  run: (el, ms) => {
    if (!canAnimate(el)) return null;
    takeOver(el);
    el.style.overflow = "";
    return el.animate(
      [
        { transform: "translateY(-12px)", opacity: 0 },
        { transform: "none", opacity: 1 },
      ],
      { duration: ms, easing: EASE },
    );
  },
});

/** A count "rolls" up into place — pair with the reactive text change
 *  at the commit so the NEW number is what rolls in. */
export const rollUp = (handle: string, inner?: string): EffectInstance => ({
  handle,
  inner,
  run: (el, ms) => {
    if (!canAnimate(el)) return null;
    takeOver(el);
    return el.animate(
      [
        { transform: "translateY(0.7em)", opacity: 0 },
        { transform: "none", opacity: 1 },
      ],
      { duration: ms, easing: EASE },
    );
  },
});

/** Selection arrives: box-shadow glow + border ease in from nothing to
 *  the element's CURRENT (already-selected) computed style — WAAPI's
 *  implicit to-keyframe fills the destination from the live styles. */
export const glowIn = (handle: string, inner?: string): EffectInstance => ({
  handle,
  inner,
  run: (el, ms) => {
    if (!canAnimate(el)) return null;
    takeOver(el);
    return el.animate(
      [
        {
          boxShadow: "0 0 0 rgba(0, 0, 0, 0)",
          borderColor: "rgba(128, 160, 176, 0.25)",
          offset: 0,
        },
      ],
      { duration: ms, easing: EASE },
    );
  },
});

/** Generic settle: animate from the given style values to the element's
 *  current computed style (implicit to-keyframe). The escape hatch for
 *  one-off arrivals that don't warrant a named verb yet. */
export const settleIn = (
  handle: string,
  from: Keyframe,
  inner?: string,
): EffectInstance => ({
  handle,
  inner,
  run: (el, ms) => {
    if (!canAnimate(el)) return null;
    takeOver(el);
    return el.animate([{ ...from, offset: 0 }], { duration: ms, easing: EASE });
  },
});
