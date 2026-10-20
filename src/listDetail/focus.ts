// listDetail — focus (Depth 0, DOM-touching but Node-safe). The edit flag's and the search
// field's DOM half, installed once at boot. Every function guards on `document`, so the
// module loads under Node. The search field is found by id, which the app supplies.
const ESCAPE = "Escape";

const byId = (id: string): HTMLElement | null =>
  typeof document === "undefined" ? null : document.getElementById(id);

/** A text field, select or contenteditable: somewhere the user is typing. */
export const isTyping = (el: EventTarget | null): el is HTMLElement =>
  typeof HTMLElement !== "undefined" &&
  el instanceof HTMLElement &&
  (el.isContentEditable ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement ||
    el instanceof HTMLInputElement);

/** Move the keyboard into the element with id `searchId`. */
export function focusById(searchId: string): void {
  byId(searchId)?.focus();
}

export type WatchFocusOptions = {
  /** Id of the search field; focus changes on it are reported through `onSearchFocus`. */
  searchId: string;
  onSearchFocus?: (focused: boolean) => void;
  /** Called when Escape leaves a typed-in field (end the store's edit flag here). */
  onLeave: () => void;
};

/**
 * Track search focus and make Escape leave whatever field is being typed in. A component such
 * as EditableTitle owns its own edit state and cannot report that it ended, so a capture-phase
 * keydown runs `onLeave` and blurs the field, handing the keyboard back to the list with the
 * selection kept. Returns the remover.
 */
export function watchFocus(opts: WatchFocusOptions): () => void {
  if (typeof document === "undefined") return () => {};
  const report = opts.onSearchFocus ?? (() => {});
  const onIn = (e: FocusEvent) => {
    if ((e.target as HTMLElement | null)?.id === opts.searchId) report(true);
  };
  const onOut = (e: FocusEvent) => {
    if ((e.target as HTMLElement | null)?.id === opts.searchId) report(false);
  };
  const onKey = (e: KeyboardEvent) => {
    const field = e.target;
    if (e.key !== ESCAPE || !isTyping(field)) return;
    queueMicrotask(() => {
      opts.onLeave();
      field.blur();
    });
  };
  document.addEventListener("focusin", onIn);
  document.addEventListener("focusout", onOut);
  document.addEventListener("keydown", onKey, true);
  return () => {
    document.removeEventListener("focusin", onIn);
    document.removeEventListener("focusout", onOut);
    document.removeEventListener("keydown", onKey, true);
  };
}

/** A key for `<Show when={editKey(id, editing)} keyed>` around an EditableTitle with `autoEdit={editing}`: it remounts when the selection or the edit flag changes, so the editor opens and closes. */
export const editKey = (
  selectedId: string | null,
  editing: boolean,
): string | null => (selectedId === null ? null : `${selectedId}:${editing}`);
