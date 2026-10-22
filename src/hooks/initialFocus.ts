// ============================================
// initialFocus — an opened form puts the cursor in its first field.
//
// The owner rule (thorcasting, 2026-10-21): "opening a form composed of sui
// components should always put focus in the right place so I don't have to
// click or hit tab to be in the first input". `Modal` (and so
// `ConfirmationModal`) and `BottomSheet` call `focusOnOpen` with their dialog
// element. A plain container can call it too.
//
// THE ORDER (`initialFocusTarget`):
//   1. an element marked `data-autofocus` or `autofocus` (or the first field
//      inside a marked wrapper);
//   2. the first enabled, visible FORM FIELD in DOM order — an `<input>`, a
//      `<textarea>`, a `<select>`, a combobox input or a select trigger
//      (`aria-haspopup="listbox"`). SUI's `ThemedInput`, `ThemedNumberInput`,
//      `CurrencyInput` and `Combobox` render a real `<input>`, so the query
//      lands on that input, not on the wrapper;
//   3. the first enabled `type="submit"` button;
//   4. the container itself (it gets `tabindex="-1"` for this).
//
// A field is skipped when it is disabled, read-only, `type="hidden"`, out of
// the tab order (`tabindex="-1"`, as Kobalte's hidden native `<select>` is),
// or inside a `hidden` / `aria-hidden="true"` / `display: none` /
// `visibility: hidden` ancestor.
//
// WHEN: one animation frame after the container mounts, so the portal is in
// the document and the open transition has started, with `preventScroll` so
// the page does not jump. Only on OPEN: the caller runs it from the
// container's `ref`, which Solid calls once per mount, never on a re-render.
// If focus is already inside the container by then (a field the consumer
// focused itself), it is left alone.
//
// ON CLOSE, focus goes back to the element that had it when the container
// opened (the opener), if that element is still in the document.
// ============================================
import { onCleanup } from "solid-js";
import { find, map } from "../fn";

/** The form fields an opened container focuses, in DOM order. */
const FIELD_SELECTOR = [
  'input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"])',
  "textarea",
  "select",
  '[role="combobox"]',
  'button[aria-haspopup="listbox"]',
].join(", ");

const MARKED_SELECTOR = "[data-autofocus], [autofocus]";

const SUBMIT_SELECTOR = 'button[type="submit"], input[type="submit"]';

/** True when nothing between `el` and `root` hides it. */
function isShown(el: Element, root: Element): boolean {
  for (
    let node: Element | null = el;
    node && node !== root.parentElement;
    node = node.parentElement
  ) {
    if (node.hasAttribute("hidden")) return false;
    if (node.getAttribute("aria-hidden") === "true") return false;
    const style = getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden") return false;
  }
  return true;
}

/** True when a reader can type into or operate `el` right now. */
function isFocusable(el: Element, root: Element): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  if (el.matches(":disabled")) return false;
  if (el.getAttribute("aria-disabled") === "true") return false;
  if (el.getAttribute("tabindex") === "-1") return false;
  if (
    (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) &&
    el.readOnly
  )
    return false;
  return isShown(el, root);
}

/** Every element under `root` that matches `selector`, in DOM order. */
const allOf = (root: Element, selector: string): readonly Element[] =>
  Array.from(root.querySelectorAll(selector));

const firstOf = (root: Element, selector: string): HTMLElement | undefined =>
  find((el: Element) => isFocusable(el, root), allOf(root, selector)) as
    | HTMLElement
    | undefined;

/**
 * Where focus goes when `root` opens (see the header for the order). Returns
 * `root` itself when nothing inside it can take focus.
 */
export function initialFocusTarget(root: HTMLElement): HTMLElement {
  const marked = find(
    (el: HTMLElement | undefined) => el !== undefined,
    map(
      (el: Element) =>
        isFocusable(el, root) ? el : firstOf(el, FIELD_SELECTOR),
      allOf(root, MARKED_SELECTOR),
    ),
  );
  return (
    marked ??
    firstOf(root, FIELD_SELECTOR) ??
    firstOf(root, SUBMIT_SELECTOR) ??
    root
  );
}

/**
 * Focus `root`'s initial target one frame after it mounts, and give focus
 * back to the opener when the calling owner is disposed (the container
 * closes). Call it from the container's `ref`.
 */
export function focusOnOpen(root: HTMLElement): void {
  const opener =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  if (!root.hasAttribute("tabindex")) root.setAttribute("tabindex", "-1");
  const frame = requestAnimationFrame(() => {
    if (!root.isConnected) return;
    if (root.contains(document.activeElement)) return;
    initialFocusTarget(root).focus({ preventScroll: true });
  });
  onCleanup(() => {
    cancelAnimationFrame(frame);
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  });
}
