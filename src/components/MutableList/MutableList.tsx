// ============================================
// MutableList — Composite (Depth 3).
// A SortableList specialized into editable, deletable cards. It IS a
// SortableList: it COMPOSES `<SortableList>` (Depth 2) and supplies a
// `renderItem` whose card shows an inline-editable NAME on the left and a
// hover-revealed DELETE button on the right. All drag-reorder mechanics —
// the grip, the placeholder gap, the live reflow — are inherited from
// SortableList (built on the headless `createDnDReorder` hook); MutableList
// adds only the per-card rename + delete affordances.
//
// Reused primitives (public composition only): `<SortableList>` for the list
// shell + drag, and the curried `IconOnlyButton` for the × delete control.
// There is no SUI inline-editable-text primitive (InlineText is a styleless
// read-only <span>; ThemedInput is a labelled input GROUP, too heavy for an
// in-row edit), so the inline edit is a bare <input> styled by MutableList.css.
//
// NO curried variant — intentional, and by rule. Like SortableList,
// DnDHierarchySortBar and SplitQueueList, every prop here is DATA or a
// CALLBACK (`items` / `getId` / `getName` / `onReorder` / `onRename` /
// `onDelete` / `label` / `renderDetail`); there is nothing presentational
// (size / variant / tone) to freeze. The "curried set" rule's exception is
// exactly these data-only components — the base is already zero-config at the
// call site, so a curried drop-in would add no value.
//
// DRAG vs EDIT/DELETE: SortableList makes the WHOLE row `draggable`. A native
// draggable ancestor steals mouse-down/selection from a descendant <input>, so
// while editing we toggle the closest row's `draggable` OFF (restored on
// commit/cancel) — this is the only way to get a usable caret/selection in the
// inline input. The interactive zones also carry `draggable={false}`. The
// delete button and the name trigger are real <button>/<input> controls, so a
// single click never starts a drag; only the grip/row body does.
// ============================================

import { createSignal, JSX, Show } from "solid-js";
import { SortableList } from "../SortableList";
import { IconOnlyButton } from "../Button";
import "./MutableList.css";

// ── Types ─────────────────────────────────────────────────────────────────

export interface MutableListProps<T> {
  /** Current ordered list of items (controlled — the caller owns the order). */
  items: T[];
  /** Stable id for an item; used by reorder/rename/delete callbacks. */
  getId: (item: T) => string;
  /** Display name for an item — shown in the card and edited inline. */
  getName: (item: T) => string;
  /** Called with the new ordered array of ids after a successful drop. */
  onReorder: (orderedIds: string[]) => void;
  /**
   * Called when an inline rename commits (Enter or blur) with a CHANGED,
   * non-empty value. Not fired if the name is unchanged or cleared, and not
   * fired on Escape (which reverts).
   */
  onRename: (id: string, name: string) => void;
  /** Called when a card's delete button is clicked. The consumer owns confirmation. */
  onDelete: (id: string) => void;
  /** Accessible label for the list region. */
  label?: string;
  /** Optional secondary content rendered BELOW the name (e.g. a meta line). */
  renderDetail?: (item: T) => JSX.Element;
}

// ── Card (per-row content) ──────────────────────────────────────────────────

interface CardProps {
  id: string;
  name: string;
  detail?: JSX.Element;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

function MutableListCard(props: CardProps): JSX.Element {
  const [editing, setEditing] = createSignal(false);
  const [draft, setDraft] = createSignal(props.name);
  let inputRef: HTMLInputElement | undefined;
  let wrapperRef: HTMLDivElement | undefined;

  // The SortableList row our content is mounted into. We toggle its native
  // `draggable` off during editing so the input keeps the caret/selection.
  const rowEl = (): HTMLElement | null =>
    (wrapperRef?.closest(".sui-sortable-list__row") as HTMLElement | null) ?? null;

  const setRowDraggable = (on: boolean) => {
    const row = rowEl();
    if (row) row.draggable = on;
  };

  const startEdit = () => {
    setDraft(props.name);
    setEditing(true);
    setRowDraggable(false);
    queueMicrotask(() => {
      inputRef?.focus();
      inputRef?.select();
    });
  };

  const stopEdit = () => {
    setEditing(false);
    setRowDraggable(true);
  };

  const commit = () => {
    const next = draft().trim();
    // Don't fire onRename if unchanged or emptied.
    if (next && next !== props.name) props.onRename(props.id, next);
    stopEdit();
  };

  const cancel = () => {
    setDraft(props.name);
    stopEdit();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
  };

  return (
    <div class="sui-mutable-list__card" ref={wrapperRef}>
      <div class="sui-mutable-list__main" draggable={false}>
        <Show
          when={editing()}
          fallback={
            <button
              type="button"
              class="sui-mutable-list__name"
              title="Click to rename"
              draggable={false}
              onClick={startEdit}
            >
              {props.name}
            </button>
          }
        >
          <input
            ref={inputRef}
            class="sui-mutable-list__input"
            draggable={false}
            value={draft()}
            aria-label="Edit name"
            onInput={(e) => setDraft(e.currentTarget.value)}
            onKeyDown={onKeyDown}
            onBlur={commit}
          />
        </Show>
        <Show when={props.detail}>
          <div class="sui-mutable-list__detail">{props.detail}</div>
        </Show>
      </div>
      <IconOnlyButton
        class="sui-mutable-list__delete"
        aria-label={`Delete ${props.name}`}
        title="Delete"
        draggable={false}
        onClick={() => props.onDelete(props.id)}
      >
        ×
      </IconOnlyButton>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────

export function MutableList<T>(props: MutableListProps<T>): JSX.Element {
  return (
    <SortableList
      items={props.items}
      getId={props.getId}
      onReorder={props.onReorder}
      label={props.label}
      renderItem={(item) => (
        <MutableListCard
          id={props.getId(item)}
          name={props.getName(item)}
          detail={props.renderDetail ? props.renderDetail(item) : undefined}
          onRename={props.onRename}
          onDelete={props.onDelete}
        />
      )}
    />
  );
}
