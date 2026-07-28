import { createSignal, createEffect, onCleanup, type Accessor } from "solid-js";
import { isServer } from "solid-js/web";
import { observeSize } from "../internal/dom/observeSize";

/**
 * Reactive container-width hook.
 *
 * Returns an `Accessor<boolean>` that is `true` when the observed element's
 * content width is below `thresholdPx`. Uses `ResizeObserver` to react to
 * container resizes (not viewport), which is the right signal when a component
 * lives inside a layout that already constrains horizontal space (sidebars,
 * detail panes, splits, etc.).
 *
 * SSR-safe: returns `false` on the server and skips observer setup. Cleans up
 * on dispose.
 *
 * @param ref - Accessor that returns the element to observe (e.g. a Solid ref signal).
 * @param thresholdPx - Width in pixels below which `isNarrow` becomes `true`.
 * @example
 *   let containerRef: HTMLDivElement | undefined;
 *   const isNarrow = useContainerNarrow(() => containerRef, 900);
 *   return (
 *     <div ref={containerRef}>
 *       <Show when={!isNarrow()} fallback={<Cards />}><Table /></Show>
 *     </div>
 *   );
 */
export function useContainerNarrow(
  ref: () => HTMLElement | undefined,
  thresholdPx: number,
): Accessor<boolean> {
  const [isNarrow, setIsNarrow] = createSignal(false);
  if (isServer || typeof ResizeObserver === "undefined") return isNarrow;

  createEffect(() => {
    const el = ref();
    if (!el) return;
    // observeSize subsumes the hand-rolled rAF coalescing this hook used to do,
    // and adds the change-guard it lacked.
    onCleanup(observeSize(el, (size) => setIsNarrow(size.width < thresholdPx)));
  });

  return isNarrow;
}
