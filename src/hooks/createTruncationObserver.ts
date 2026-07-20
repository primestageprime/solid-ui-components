// Hook — createTruncationObserver (Depth 0: composes the DOM ResizeObserver
// only; no library imports).
import { createSignal, createEffect, onCleanup, type Accessor } from "solid-js";
import { isServer } from "solid-js/web";

/**
 * Reactive text-truncation hook.
 *
 * Returns an `Accessor<boolean>` that is `true` exactly when the observed
 * element is visually clipped — i.e. its rendered content overflows its box,
 * which is precisely the condition under which CSS `text-overflow: ellipsis`
 * (single-line) or `-webkit-line-clamp` (multi-line) paints an ellipsis.
 *
 * Truncation is derived, never assumed: `scrollWidth > clientWidth` catches
 * single-line horizontal clipping, `scrollHeight > clientHeight` catches
 * line-clamped vertical clipping. A 1px tolerance absorbs sub-pixel rounding.
 *
 * Why an observer rather than a one-shot `onMount` measurement: an element's
 * clip state depends on its box, and inside a table (or any responsive layout)
 * that box changes without a window `resize` — sibling columns reflow, the
 * container narrows, data loads and re-lays-out the grid. A `ResizeObserver`
 * on the element itself is the only signal that fires for all of those, so the
 * tooltip appears/disappears in lockstep with the ellipsis it mirrors. Pass a
 * `deps` accessor for content that changes without resizing the box (e.g. the
 * cell value): it forces a re-measure on the next microtask.
 *
 * SSR-safe: returns `false` on the server (and where `ResizeObserver` is
 * absent, e.g. jsdom without a stub) and skips observer setup. Cleans up on
 * dispose.
 *
 * @param ref - Accessor returning the element to observe (a Solid ref signal).
 * @param deps - Optional accessor; when its value changes, re-measure.
 * @example
 *   const [el, setEl] = createSignal<HTMLElement>();
 *   const isTruncated = createTruncationObserver(el, () => props.value);
 *   return <span ref={setEl}>{props.value}</span>;
 */
export function createTruncationObserver(
  ref: () => HTMLElement | undefined,
  deps?: () => unknown,
): Accessor<boolean> {
  const [isTruncated, setIsTruncated] = createSignal(false);
  if (isServer || typeof ResizeObserver === "undefined") return isTruncated;

  const measure = () => {
    const el = ref();
    if (!el) return;
    const overflowed =
      el.scrollWidth > el.clientWidth + 1 ||
      el.scrollHeight > el.clientHeight + 1;
    setIsTruncated(overflowed);
  };

  // Observe the element's own box; re-measure whenever it resizes.
  createEffect(() => {
    const el = ref();
    if (!el) return;
    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    onCleanup(() => ro.disconnect());
  });

  // Content can change the clip state without resizing the box (same width,
  // longer string). Re-measure on the next microtask so layout reflects it.
  if (deps) {
    createEffect(() => {
      deps();
      queueMicrotask(measure);
    });
  }

  return isTruncated;
}
