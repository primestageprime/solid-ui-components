/* SplitQueueList — FLIP rect snapshot.
 *
 * Captures the bounding rect of every keyed row into the caller-owned
 * `prevRects` map — the "First" in FLIP, read on the previous paint so a
 * resolved row's pre-move position survives the data swap. Factored out of the
 * flight engine (./flight.ts) as a pure function of `deps` + the passed map: the
 * controller keeps owning the map's lifecycle (fill/clear) while the snapshot
 * mechanics live here. */
import type { FlightDeps } from "./flight";

/**
 * Snapshot the rects of every rendered `[data-sql-key]` row into `prevRects`
 * (cleared first). Scheduled by the controller on rAF (after paint), which also
 * coalesces the consumer's two un-batched setters (remove-from-unresolved +
 * add-to-resolved) into ONE post-frame snapshot — so a resolved key's pre-move
 * rect survives. No-op when the root is gone (e.g. the tab was hidden).
 */
export const captureRects = (
  deps: FlightDeps,
  prevRects: Map<string, DOMRect>,
): void => {
  const rootEl = deps.getRootEl();
  if (!rootEl) return;
  prevRects.clear();
  rootEl.querySelectorAll<HTMLElement>("[data-sql-key]").forEach((el) => {
    const k = el.dataset.sqlKey!;
    prevRects.set(k, el.getBoundingClientRect());
  });
};
