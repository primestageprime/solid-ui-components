// ============================================
// EditableTitle — Atomic Primitive (Depth 1)
// Owns CSS (EditableTitle.css), no component imports.
//
// A title that is inert text by default, or (with `onChange`) a hover-underlined
// click-to-edit target that covers ONLY the text itself — the rest of a row
// stays free for drag. The inline <input> is fitted to the rendered text via a
// hidden inline-grid replica (::after { content: attr(data-value) }), so it is
// exactly as wide as its content (same font, live per keystroke). Enter/blur
// commit; Escape cancels via the `cancelled` flag guarding the follow-up blur.
//
// Distinct from InlineText: InlineText is a styleless, NON-editable <span> that
// only recolours inherited text. EditableTitle adds the click-to-edit input,
// the fitted-width editor, and the commit/cancel lifecycle — a different job, so
// it is a separate component rather than an InlineText variant.
//
// NO curried variant — intentional, and by rule: every prop is data or a
// callback (`title` / `onChange`), nothing presentational to freeze. Same
// data-only exemption as SortableList.
// ============================================
import {
  type Component,
  Show,
  createEffect,
  createSignal,
  on,
  onCleanup,
  onMount,
} from "solid-js";
import "./EditableTitle.css";

/** What gesture opens the inline editor.
 *  - `"singleClick"` (default) — a single click on the title text enters edit;
 *    the title is a `<button>` (excluded from an enclosing row's click target).
 *  - `"doubleClick"` — a DOUBLE click enters edit; the title renders as a
 *    non-`<button>` element so a SINGLE click falls through to an enclosing
 *    row's own click handler (e.g. row selection).
 *  - `"clickSelected"` — the file-list rename idiom: a click on the title edits
 *    ONLY when the row is already selected (pass `rowSelected`); the first click
 *    on an unselected row falls through to select it, and a second click on the
 *    now-selected title opens the editor. Modifier clicks (shift/ctrl/meta) never
 *    edit — they stay selection gestures. Requires the enclosing row to feed
 *    `rowSelected`. */
export type EditTrigger = "singleClick" | "doubleClick" | "clickSelected";

export interface EditableTitleProps {
  /** The title text. */
  title: string;
  /** Called when the user renames the title. When absent the title is inert. */
  onChange?: (title: string) => void;
  /** Which gesture opens the editor. Default `"singleClick"` (unchanged
   *  behavior). See {@link EditTrigger}. */
  editTrigger?: EditTrigger;
  /** Selection state of the enclosing row — consulted only in `"clickSelected"`
   *  mode, where a title click edits iff the row is already selected. */
  rowSelected?: boolean;
  /** Open the editor as soon as the title MOUNTS — focused, text selected — as
   *  if it had just been clicked. For a thing the user has just created and
   *  should name now (DirtyComboBox's "new"). Read once, at mount; an inert
   *  title (no `onChange`) never opens. Default false (unchanged behavior). */
  autoEdit?: boolean;
  /** Stretch across the title's slot: the click target covers the blank
   *  space after the text too (text left-aligned), and the field fills the
   *  same width. For a title that IS its slot (DirtyComboBox's name, Peter
   *  2026-09-24); a list-row title keeps the default text-only target so the
   *  rest of the row stays free for drag. Default false. */
  fill?: boolean;
}

/** How long a committed name is shown while the parent has not taken it. */
const PENDING_TIMEOUT_MS = 2000;

export const EditableTitle: Component<EditableTitleProps> = (props) => {
  const [editing, setEditing] = createSignal(false);
  const [draft, setDraft] = createSignal("");
  // Escape cancels: blur must NOT commit the draft. The blur fired by the
  // cancel's own focus-out (or the input unmounting) checks this flag.
  let cancelled = false;
  // THE COMMITTED NAME, shown until the parent's `title` catches up. Leaving
  // edit mode renders `title`, and a parent whose rename round-trips (a store,
  // a server) still holds the OLD one for a moment — the name flashed back
  // before the new one arrived (Peter, 2026-09-25). So the draft is shown
  // optimistically, and dropped the moment `title` changes (or already
  // matches). A parent that never updates (a refused rename) gets the old name
  // back after PENDING_TIMEOUT_MS rather than showing a name it didn't take.
  const [pending, setPending] = createSignal<string | undefined>(undefined);
  let pendingTimer: ReturnType<typeof setTimeout> | undefined;
  const clearPending = () => {
    if (pendingTimer !== undefined) clearTimeout(pendingTimer);
    pendingTimer = undefined;
    setPending(undefined);
  };
  createEffect(on(() => props.title, clearPending, { defer: true }));
  onCleanup(clearPending);
  const shown = () => pending() ?? props.title;
  const commit = (value: string) => {
    const v = value.trim();
    const renamed = v !== "" && v !== props.title;
    if (renamed) {
      setPending(v);
      pendingTimer = setTimeout(clearPending, PENDING_TIMEOUT_MS);
    }
    setEditing(false);
    if (renamed) props.onChange?.(v);
  };
  // Open the editor (guarded — an inert title with no `onChange` never edits).
  const startEdit = () => {
    if (!props.onChange) return;
    clearPending();
    setDraft(props.title);
    setEditing(true);
  };
  onMount(() => {
    if (props.autoEdit) startEdit();
  });
  // Both "doubleClick" and "clickSelected" swap the title button for a
  // non-button element so a plain single click can reach the enclosing row
  // (selection) instead of editing. Only meaningful when editable.
  const fallsThrough = () =>
    (props.editTrigger === "doubleClick" || props.editTrigger === "clickSelected") &&
    !!props.onChange;
  // "clickSelected": edit only when the row is already selected, and only for a
  // plain click (a modifier click is a selection gesture). stopPropagation keeps
  // the already-selected row from re-toggling. On an unselected row the handler
  // no-ops and the click bubbles to the row's own selection handler.
  const onTextClick = (e: MouseEvent) => {
    if (props.editTrigger !== "clickSelected") return;
    if (!props.rowSelected) return;
    if (e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return;
    e.stopPropagation();
    startEdit();
  };
  const onTextDblClick = () => {
    if (props.editTrigger === "doubleClick") startEdit();
  };
  return (
    <span
      class={
        props.fill
          ? "sui-editable-title sui-editable-title--fill"
          : "sui-editable-title"
      }
    >
      <Show
        when={!editing()}
        fallback={
          /* inline-grid + hidden ::after replica of the draft — the input is
             fitted to the text's true rendered width, not a ch estimate. */
          <span class="sui-editable-title__editor" data-value={draft()}>
            <input
              class="sui-editable-title__input"
              value={props.title}
              size={1}
              ref={(el) => queueMicrotask(() => { el.focus(); el.select(); })}
              onInput={(e) => setDraft(e.currentTarget.value)}
              onBlur={(e) => {
                if (!cancelled) commit(e.currentTarget.value);
                cancelled = false;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit(e.currentTarget.value);
                if (e.key === "Escape") {
                  cancelled = true;
                  e.currentTarget.blur();
                  setEditing(false);
                }
              }}
            />
          </span>
        }
      >
        <Show
          when={fallsThrough()}
          fallback={
            <button
              type="button"
              class="sui-editable-title__text"
              disabled={!props.onChange}
              aria-label={`Rename ${shown()}`}
              onClick={startEdit}
            >
              {shown()}
            </button>
          }
        >
          {/* Non-button (plain text span) so a single click falls through to
              the enclosing row's click handler (row selection) — the row's
              inner-control exclusion selector (`button, input, …`) does NOT
              match a span, so the fall-through stands. The editor opens on a
              double click ("doubleClick") or a click of the already-selected
              title ("clickSelected"). Keeping it non-interactive (no
              role/tabindex) means the row, not the label, is the selectable
              unit; editing is the power gesture, mirroring a file-list rename. */}
          {/* biome-ignore lint/a11y/noStaticElementInteractions: deliberate — the label must stay a non-interactive text node so its single click reaches the enclosing row's selection handler; opening the editor is the row's opt-in editTrigger affordance, not an independent control. */}
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: same rationale — a keyboard handler here would make the label an independent control. The keyboard route to renaming is the real <button> rendered by the sibling branch above; this span is the pointer-only power gesture. */}
          <span
            class="sui-editable-title__text"
            onClick={onTextClick}
            onDblClick={onTextDblClick}
          >
            {shown()}
          </span>
        </Show>
      </Show>
    </span>
  );
};
