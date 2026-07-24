/**
 * Sets pointer capture without letting a legitimately-possible failure crash
 * the app.
 *
 * `Element.setPointerCapture` throws in two cases that are expected during a
 * pointer gesture in a reactive UI, and are both benign:
 *
 * - `InvalidStateError` — the element is not connected to the DOM. A stored
 *   ref can be detached between the browser dispatching the pointer event and
 *   the (synchronously-delegated) handler running, e.g. when a reactive update
 *   earlier in the same handler replaces or removes the chart subtree. A
 *   disconnected element cannot own the pointer, and the gesture it would have
 *   supported is moot, so there is nothing to recover — swallow it.
 * - `NotFoundError` — no active pointer matches the id (the pointer was already
 *   released). Same story: nothing to capture.
 *
 * The optional-chaining guards the method being absent (jsdom implements none
 * of the pointer-capture methods); the try/catch guards it throwing. Any other
 * error is unexpected and surfaced via `console.warn` rather than thrown, so a
 * capture failure never breaks an in-progress interaction.
 */
export function safeSetPointerCapture(
  el: Element | null | undefined,
  pointerId: number,
): void {
  try {
    el?.setPointerCapture?.(pointerId);
  } catch (err) {
    if (
      err instanceof DOMException &&
      (err.name === "InvalidStateError" || err.name === "NotFoundError")
    ) {
      return;
    }
    console.warn("[SUI] setPointerCapture threw:", err);
  }
}
