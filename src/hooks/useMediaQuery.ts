import { createSignal, onCleanup, type Accessor } from "solid-js";
import { isServer } from "solid-js/web";

/**
 * Reactive media query hook.
 *
 * Returns an `Accessor<boolean>` that tracks whether the given media query
 * currently matches. Safe to call during SSR — returns `false` on the server
 * and hydrates to the real value on the client.
 *
 * @param query - A CSS media query string, e.g. `"(max-width: 900px)"`
 * @example
 *   const isNarrow = useMediaQuery("(max-width: 900px)");
 *   return <Show when={!isNarrow()} fallback={<Cards />}><Table /></Show>;
 */
export function useMediaQuery(query: string): Accessor<boolean> {
  if (isServer || typeof window === "undefined" || typeof window.matchMedia !== "function") {
    const [matches] = createSignal(false);
    return matches;
  }

  const mql = window.matchMedia(query);
  const [matches, setMatches] = createSignal(mql.matches);
  const handler = (e: MediaQueryListEvent) => setMatches(e.matches);

  // Modern browsers: addEventListener("change", ...). Older Safari: addListener.
  if (typeof mql.addEventListener === "function") {
    mql.addEventListener("change", handler);
    onCleanup(() => mql.removeEventListener("change", handler));
  } else {
    // Legacy fallback
    (mql as MediaQueryList & { addListener: (l: (e: MediaQueryListEvent) => void) => void }).addListener(handler);
    onCleanup(() => {
      (mql as MediaQueryList & { removeListener: (l: (e: MediaQueryListEvent) => void) => void }).removeListener(handler);
    });
  }

  return matches;
}
