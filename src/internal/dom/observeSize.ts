// ============================================
// Loop-safe element size observation.
//
// A ResizeObserver callback runs INSIDE the browser's layout-delivery phase.
// Writing a signal there synchronously re-renders, which mutates layout, which
// re-queues the observer within the same frame. The browser gives up and emits
//
//     "ResizeObserver loop completed with undelivered notifications."
//
// Every measuring component in this library hit that warning and grew its own
// private workaround (CashflowChart, AnimatedSwimlaneChart, ...). This is the
// single source of truth for the pattern. Two defences, both required:
//
//   1. Change-guard — the callback is skipped entirely when the rounded box
//      size is identical to the last delivered one. Most observer fires during
//      a window drag carry an unchanged size; dropping them removes the
//      feedback at its source and costs nothing.
//   2. rAF deferral — the surviving call is scheduled out of the observer's
//      synchronous phase, so the browser finishes delivering notifications
//      before any render work runs. Scheduling coalesces: a pending frame is
//      cancelled and rescheduled, so only the newest measurement lands per
//      frame and the consumer never lags behind a drag (a debounce would).
//
// Sizes are ROUNDED before the guard compares them. Sub-pixel jitter from
// fractional layout is a primary loop driver, and no consumer needs sub-pixel
// resolution.
//
// SSR / jsdom safe: where `ResizeObserver` is undefined the observer is never
// constructed and the returned disposer is a no-op, so callers don't need
// their own `typeof ResizeObserver === "undefined"` guard.
// ============================================

export interface ObservedSize {
  /** Rounded content-box width in px. */
  width: number;
  /** Rounded content-box height in px. */
  height: number;
}

/**
 * Observe `el`'s size and invoke `onSize` when it actually changes, deferred
 * out of the ResizeObserver dispatch phase.
 *
 * The callback is free to ignore the supplied size and re-measure the element
 * itself (`clientWidth`, `scrollHeight`, ...) — the size argument governs *when*
 * the callback runs, not what it must use.
 *
 * @returns a disposer that disconnects the observer and cancels any pending
 * frame. Call it from `onCleanup` so an unmounted component can never write to
 * a disposed signal.
 */
export function observeSize(
  el: Element,
  onSize: (size: ObservedSize) => void,
): () => void {
  if (typeof ResizeObserver === "undefined") return () => {};

  const canDefer = typeof requestAnimationFrame === "function";
  let frameId: number | null = null;
  let pending: ObservedSize | null = null;
  // Last size handed to `onSize` — the change-guard's reference point.
  let delivered: ObservedSize | null = null;

  const cancelFrame = () => {
    if (frameId === null) return;
    if (canDefer) cancelAnimationFrame(frameId);
    else clearTimeout(frameId);
    frameId = null;
  };

  const flush = () => {
    frameId = null;
    const size = pending;
    pending = null;
    if (!size) return;
    delivered = size;
    onSize(size);
  };

  const observer = new ResizeObserver((entries) => {
    // Only the newest entry matters — earlier ones in the same dispatch are
    // already stale by the time the frame runs.
    const entry = entries[entries.length - 1];
    if (!entry) return;
    // Prefer the border-box size where the browser reports it; contentRect is
    // the portable fallback. Both can be absent — polyfills and test doubles
    // dispatch minimal `{ target }` entries — so fall back to measuring the
    // element. Callbacks that re-measure the element themselves must not break
    // just because the entry carried no size.
    const box = entry.borderBoxSize?.[0];
    const rect =
      entry.contentRect ?? entry.target?.getBoundingClientRect?.() ?? null;
    const size: ObservedSize = box
      ? { width: Math.round(box.inlineSize), height: Math.round(box.blockSize) }
      : {
          width: Math.round(rect?.width ?? 0),
          height: Math.round(rect?.height ?? 0),
        };
    // (1) Change-guard — drop no-op fires before they can schedule anything.
    // Compare against the NEWEST known size, which is the queued measurement
    // when one is waiting, not the last delivered one. Guarding on `delivered`
    // alone strands a superseded value: given delivered=A, a fire with B queues
    // B, and a fire back to A (sub-pixel jitter reverting within the same
    // frame) would match `delivered` and return early — leaving B queued, so
    // the flush reports B for an element that is actually A. It self-corrects
    // on the next fire, but a drag that ENDS on that fire leaves the consumer
    // sized to a width the element no longer has.
    const last = pending ?? delivered;
    if (last && last.width === size.width && last.height === size.height) {
      return;
    }
    // (2) Defer + coalesce.
    pending = size;
    cancelFrame();
    frameId = canDefer
      ? requestAnimationFrame(flush)
      : (setTimeout(flush, 0) as unknown as number);
  });

  observer.observe(el);

  return () => {
    cancelFrame();
    pending = null;
    observer.disconnect();
  };
}
