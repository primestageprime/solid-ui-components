import { createSignal, createEffect, onCleanup, type Accessor } from "solid-js";
import { isServer } from "solid-js/web";

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
    let rafId: number | null = null;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = null;
        setIsNarrow(w < thresholdPx);
      });
    });
    ro.observe(el);
    onCleanup(() => {
      ro.disconnect();
      if (rafId !== null) cancelAnimationFrame(rafId);
    });
  });

  return isNarrow;
}
