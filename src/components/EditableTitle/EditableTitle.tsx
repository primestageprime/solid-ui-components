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
import { Component, Show, createSignal } from "solid-js";
import "./EditableTitle.css";

export interface EditableTitleProps {
  /** The title text. */
  title: string;
  /** Called when the user renames the title. When absent the title is inert. */
  onChange?: (title: string) => void;
}

export const EditableTitle: Component<EditableTitleProps> = (props) => {
  const [editing, setEditing] = createSignal(false);
  const [draft, setDraft] = createSignal("");
  // Escape cancels: blur must NOT commit the draft. The blur fired by the
  // cancel's own focus-out (or the input unmounting) checks this flag.
  let cancelled = false;
  const commit = (value: string) => {
    setEditing(false);
    const v = value.trim();
    if (v && v !== props.title) props.onChange?.(v);
  };
  return (
    <span class="sui-editable-title">
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
        <button
          type="button"
          class="sui-editable-title__text"
          disabled={!props.onChange}
          aria-label={`Rename ${props.title}`}
          onClick={() => {
            setDraft(props.title);
            setEditing(true);
          }}
        >
          {props.title}
        </button>
      </Show>
    </span>
  );
};
