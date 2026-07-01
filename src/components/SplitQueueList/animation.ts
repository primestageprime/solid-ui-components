/* SplitQueueList — animation primitives.
 *
 * Pure / DOM-factory helpers shared by the resolve/unresolve flight engine
 * (./flight.ts). None of these close over component state: they take everything
 * they need as arguments, so they're independently testable and reusable across
 * the forward (playFlight) and reverse (playReverse) flights. */

/** Shared WAAPI easing for the collapse/enter keyframes. */
export const EASE = "cubic-bezier(.22,.61,.36,1)";

/** Cubic ease-out used by the time-driven tween. */
export const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;

/**
 * A TIME-DRIVEN tween: progress is computed from ELAPSED time (not rAF/WAAPI),
 * so it lands correctly even when the tab is backgrounded (where rAF/WAAPI
 * throttle) and can't strand mid-animation. `onFrame(progress)` is called with
 * eased progress each step; `onSettle` runs exactly once at the end. Returns a
 * cancel fn. Falls back to settling immediately if setTimeout is unavailable.
 */
export const tweenOverTime = (
  durationMs: number,
  onFrame: (easedProgress: number) => void,
  onSettle: () => void,
): (() => void) => {
  if (durationMs <= 0 || typeof setTimeout !== "function") {
    onSettle();
    return () => {};
  }
  const now = () =>
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const startTs = now();
  let settled = false;
  const settle = () => {
    if (settled) return;
    settled = true;
    onSettle();
  };
  const tick = () => {
    if (settled) return;
    const p = Math.min(1, (now() - startTs) / durationMs);
    onFrame(easeOutCubic(p));
    if (p < 1) setTimeout(tick, 16);
    else settle();
  };
  tick();
  return settle;
};

/**
 * Animate `el` through `keyframes` and fire `then` exactly once — on WAAPI
 * finish/cancel OR a timeout fallback (WAAPI events don't fire in a hidden tab;
 * without the fallback a phase could stall and strand state). If WAAPI is
 * unavailable entirely (e.g. jsdom, where Element.animate is missing), skip the
 * motion and settle on the next microtask so `then` still runs. Shared by the
 * forward and reverse flights (identical mechanics, mirrored keyframes).
 */
export const animateOnce = (
  el: HTMLElement,
  keyframes: Keyframe[],
  ms: number,
  then: () => void,
): void => {
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

/**
 * Build the exit-collapse placeholder shared by both flights: an in-flow <li>
 * that shrinks its height to 0, clipping a full-height inner clone pinned to one
 * edge (`pin: "bottom"` clips from the TOP as it collapses — the forward
 * head-collapse; `pin: "top"` clips from the BOTTOM — the reverse tail-collapse).
 * Returns the placeholder ready to insert; the caller animates its height→0.
 *
 * The inner card's content is DEEP-CLONED from `sourceRow` (the real row being
 * collapsed) rather than round-tripped through innerHTML — so nodes are copied
 * exactly, nothing is re-parsed (no injection surface), and richer `renderItem`
 * output survives intact. `markerGlyph` overrides the cloned marker (e.g. the
 * resolved ✓ becomes the focused ▸ on the forward collapse).
 */
export const buildCollapsePlaceholder = (opts: {
  rowH: number;
  innerClass: string;
  markerGlyph: string;
  pin: "top" | "bottom";
  sourceRow: HTMLElement;
}): HTMLLIElement => {
  const placeholder = document.createElement("li");
  placeholder.className = "sui-sql__collapse";
  placeholder.style.height = `${opts.rowH}px`;
  // CRITICAL: min-height:0 — real rows carry an inline min-height, and without
  // overriding it here the height animation can't reach 0 (the collapse would
  // jam at the row's min-height). This is the "fight" between the JS height
  // animation and the CSS row sizing.
  placeholder.style.minHeight = "0";
  placeholder.style.overflow = "hidden";
  placeholder.style.position = "relative";

  // Inner card pinned to one edge of the placeholder, fixed at full row height,
  // so as the placeholder shrinks the opposite edge clips it away.
  const inner = document.createElement("div");
  inner.className = opts.innerClass;
  // Move the source row's deep-cloned children (marker + content) into `inner`.
  // Cloning the <li> and hoisting its children copies the nodes verbatim without
  // re-serializing to an HTML string.
  const clone = opts.sourceRow.cloneNode(true) as HTMLElement;
  while (clone.firstChild) inner.appendChild(clone.firstChild);
  const marker = inner.querySelector<HTMLElement>(".sui-sql__marker");
  if (marker) marker.textContent = opts.markerGlyph;
  inner.style.position = "absolute";
  inner.style.left = "0";
  inner.style.right = "0";
  inner.style[opts.pin] = "0";
  inner.style.height = `${opts.rowH}px`;
  inner.style.margin = "0";
  placeholder.appendChild(inner);
  return placeholder;
};

/**
 * Minimal CSS.escape fallback for attribute selectors (keys are usually simple,
 * but guard against quotes/brackets).
 */
export const cssEscape = (s: string): string => {
  if (typeof CSS !== "undefined" && CSS.escape) return CSS.escape(s);
  return s.replace(/["\\\]]/g, "\\$&");
};
