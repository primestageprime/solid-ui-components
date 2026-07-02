// ============================================
// StatusChip — Atomic Primitive (Depth 1)
// Owns CSS (StatusChip.css), no component imports.
//
// A fixed-width, editable status chip. The width is frozen to the longest
// option (in `ch` of the mono font) so neither hover, editing, nor a shorter
// status ever changes its geometry. Two hover-revealed edit regions: clicking
// the TEXT swaps in an inline <input> covering only the text; the caret at the
// chip's right edge opens a select menu of `options`. Escape cancels without
// committing (the `cancelled` flag guards the blur that follows). `highlight`
// fills the chip with the accent tint for the active status.
//
// The editable sibling of StatusBadge: StatusBadge is display-only (a compliance
// enum), StatusChip lets the user rename or pick the status inline. Use
// StatusBadge to show a status, StatusChip to edit one.
//
// NO curried variant — intentional, and by rule: every prop is data or a
// callback (`status` / `options` / `onChange` / `highlight` / `title`), nothing
// presentational to freeze. Same data-only exemption as SortableList.
// ============================================
import { Component, For, Show, createSignal } from "solid-js";
import "./StatusChip.css";

export interface StatusChipProps {
  /** Current status text. */
  status: string;
  /** Known statuses; drives the select menu AND the fixed chip width (longest option). */
  options?: string[];
  /** Called when the user edits (free text) or selects a status. When absent the chip is inert. */
  onChange?: (status: string) => void;
  /** Accent fill for the active status (e.g. DOING). Data-driven, not a style knob. */
  highlight?: boolean;
  /** Owner label, used to phrase the aria-labels ("Edit status of …"). */
  title: string;
}

export const StatusChip: Component<StatusChipProps> = (props) => {
  const [editing, setEditing] = createSignal(false);
  const [menuOpen, setMenuOpen] = createSignal(false);
  // Escape cancels: the resulting blur must not commit the draft.
  let cancelled = false;
  const options = () => props.options ?? [];
  // Fixed width: longest option (or current status), in ch of the mono font.
  const widthCh = () =>
    Math.max(props.status.length, ...options().map((o) => o.length)) + 1;
  const commit = (value: string) => {
    setEditing(false);
    setMenuOpen(false);
    const v = value.trim();
    if (v && v !== props.status) props.onChange?.(v);
  };
  return (
    <span
      class="sui-status-chip"
      classList={{ "sui-status-chip--highlight": props.highlight }}
      style={{ width: `${widthCh()}ch` }}
    >
      <Show
        when={!editing()}
        fallback={
          <input
            class="sui-status-chip__input"
            value={props.status}
            ref={(el) => queueMicrotask(() => { el.focus(); el.select(); })}
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
        }
      >
        <button
          type="button"
          class="sui-status-chip__text"
          aria-label={`Edit status of ${props.title}`}
          disabled={!props.onChange}
          onClick={() => setEditing(true)}
        >
          {props.status}
        </button>
      </Show>
      <Show when={props.onChange && options().length > 0}>
        <button
          type="button"
          class="sui-status-chip__caret"
          aria-label={`Select status of ${props.title}`}
          onClick={() => setMenuOpen((v) => !v)}
        >
          ▾
        </button>
        <Show when={menuOpen()}>
          <div class="sui-status-chip__menu" role="listbox">
            <For each={options()}>
              {(opt) => (
                <button
                  type="button"
                  role="option"
                  aria-selected={opt === props.status}
                  class="sui-status-chip__option"
                  classList={{
                    "sui-status-chip__option--current": opt === props.status,
                  }}
                  onClick={() => commit(opt)}
                >
                  {opt}
                </button>
              )}
            </For>
          </div>
        </Show>
      </Show>
    </span>
  );
};
