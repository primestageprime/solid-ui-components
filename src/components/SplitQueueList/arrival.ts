/* SplitQueueList — arrival background fade.
 *
 * The one-shot bg-fade played on a row the instant it lands in its new list at
 * the end of a resolve/unresolve transfer. Factored out of the flight engine
 * (./flight.ts) because it closes over nothing but the shell's accessors: it
 * takes `deps` and the arriving key, so it's independently testable and shared
 * verbatim by the forward (top) and reverse (bottom) flights. */
import { cssEscape } from "./animation";
import type { FlightDeps } from "./flight";

/**
 * Fade the just-arrived row's BACKGROUND in once, at the end of the transfer
 * (not opacity — text/✓ stay solid). A one-shot CSS class drives a
 * @keyframes; we remove it on animationend (or a fallback timer where there's
 * no animationend, e.g. jsdom) so it can re-run on a later resolve. No-op under
 * reduced-motion / zero-duration (the row just shows its final bg).
 */
export const markArrived = (
  deps: FlightDeps,
  key: string,
  panel: "top" | "bottom" = "top",
): void => {
  const rootEl = deps.getRootEl();
  if (deps.reducedMotion() || deps.animationMs() <= 0 || !rootEl) return;
  const row = rootEl.querySelector<HTMLElement>(
    `.sui-sql__list--${panel} [data-sql-key="${cssEscape(key)}"]`,
  );
  if (!row) return;
  row.classList.add("sui-sql__row--arriving");
  let done = false;
  const clear = () => {
    if (done) return;
    done = true;
    row.classList.remove("sui-sql__row--arriving");
    row.removeEventListener("animationend", clear);
  };
  row.addEventListener("animationend", clear);
  // Fallback for environments without animationend (jsdom) or a missed event.
  if (typeof setTimeout === "function") setTimeout(clear, 400);
};
