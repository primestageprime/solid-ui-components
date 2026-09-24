/**
 * DirtyComboBox — the model, as plain functions. No Solid, no DOM, no CSS.
 *
 * A list of things that can be SAVED or RESET, with dirty detection (Peter,
 * 2026-09-24). First consumer: thorcasting's payroll scenario strip,
 *
 *     [Baseline] vs [ S-2026-09-24 | ▾ | 💾 ]      ↺
 *
 * The wiring, stated once:
 *
 *   draft vs saved ──equals──▶ dirty ──▶ the save segment AND the reset button
 *   selectedId ──────────────▶ deletableIds (every row except the selected one)
 *   every label ─────────────▶ widthCh (the LONGEST, capped at 30 — so the
 *                               combo never jumps when the selection changes)
 *
 * PRISTINE (draft equals saved) shows neither save nor reset. DIRTY shows
 * both. There is no third state: `canSave` and `canReset` are the same fact
 * read twice, kept as two fields so a caller that later wants to split them
 * (a read-only scenario that can reset but not save) has a place to do it.
 *
 * The transitions below (select / save / reset / remove) are a caller's
 * store, as pure functions over one `DirtyComboStore`, so the whole click
 * path is testable without a browser.
 */
import { filter, find, map, pipe, some } from "../../fn";

/** One row of the list. `label` is what the combo and the menu print. */
export interface DirtyComboItem {
  id: string;
  label: string;
}

/** Everything the control draws, derived — never stored. */
export interface DirtyComboView {
  /** The draft differs from the selected item's saved config. */
  dirty: boolean;
  /** Show the save segment. */
  canSave: boolean;
  /** Show the reset button. */
  canReset: boolean;
  /** Rows that carry a trash icon: every row except the selected one. */
  deletableIds: string[];
  /** The combo's name width in ch: the longest label, capped at 30. */
  widthCh: number;
  /** The selected row's label, or "" when nothing is selected. */
  selectedLabel: string;
}

/** Peter: "comfortably fits 30 characters", ellipsis beyond that. */
export const DIRTY_COMBO_MAX_WIDTH_CH = 30;

/** A narrow combo still has to read as a combo. */
export const DIRTY_COMBO_MIN_WIDTH_CH = 4;

/** Structural equality over plain data (records, arrays, primitives). The
 *  default `equals`: a config is plain data, and two configs with the same
 *  numbers ARE the same config, whatever object holds them. */
export const dirtyComboEqual = (a: unknown, b: unknown): boolean => {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object") return false;
  if (a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  const differs = (key: string): boolean =>
    !dirtyComboEqual(
      (a as Record<string, unknown>)[key],
      (b as Record<string, unknown>)[key],
    );
  return !some(differs, aKeys);
};

const labelLength = (item: DirtyComboItem): number => item.label.length;

/** Longest label in ch, clamped to [DIRTY_COMBO_MIN_WIDTH_CH, DIRTY_COMBO_MAX_WIDTH_CH]. */
export const dirtyComboWidthCh = (items: readonly DirtyComboItem[]): number =>
  Math.min(
    DIRTY_COMBO_MAX_WIDTH_CH,
    Math.max(DIRTY_COMBO_MIN_WIDTH_CH, ...map(labelLength, items)),
  );

/** Derive what the control draws from the list, the selection, and the
 *  draft/saved pair. */
export function dirtyComboModel<C>(
  items: readonly DirtyComboItem[],
  selectedId: string,
  draft: C,
  saved: C,
  equals: (a: C, b: C) => boolean = dirtyComboEqual,
): DirtyComboView {
  const dirty = !equals(draft, saved);
  const notSelected = (item: DirtyComboItem): boolean => item.id !== selectedId;
  const selected = find((item) => item.id === selectedId, items);
  return {
    dirty,
    canSave: dirty,
    canReset: dirty,
    deletableIds: pipe(
      items,
      filter(notSelected),
      map((item) => item.id),
    ),
    widthCh: dirtyComboWidthCh(items),
    selectedLabel: selected?.label ?? "",
  };
}

// ── the store: transitions as pure functions ─────────────────────────────

/** A saved item: a row plus the config it last saved. */
export interface DirtyComboSavedItem<C> extends DirtyComboItem {
  saved: C;
}

/** The whole bench state. `draft` is the selected item's working copy. */
export interface DirtyComboStore<C> {
  items: DirtyComboSavedItem<C>[];
  selectedId: string;
  draft: C;
}

const savedOf = <C>(store: DirtyComboStore<C>, id: string): C | undefined =>
  find((item) => item.id === id, store.items)?.saved;

/** Derive the view straight from a store. */
export const dirtyComboViewOf = <C>(
  store: DirtyComboStore<C>,
  equals?: (a: C, b: C) => boolean,
): DirtyComboView =>
  dirtyComboModel(
    store.items,
    store.selectedId,
    store.draft,
    savedOf(store, store.selectedId) as C,
    equals,
  );

/** Switch to another item. The draft becomes that item's saved config, so
 *  any unsaved edit on the one being left is DISCARDED (no prompt — the same
 *  "no confirm" call Peter made for reset). An unknown id is a no-op. */
export const dirtyComboSelect = <C>(
  store: DirtyComboStore<C>,
  id: string,
): DirtyComboStore<C> => {
  const saved = savedOf(store, id);
  return saved === undefined
    ? store
    : { ...store, selectedId: id, draft: saved };
};

/** Commit the draft as the selected item's saved config. */
export const dirtyComboSave = <C>(
  store: DirtyComboStore<C>,
): DirtyComboStore<C> => {
  const commit = (item: DirtyComboSavedItem<C>): DirtyComboSavedItem<C> =>
    item.id === store.selectedId ? { ...item, saved: store.draft } : item;
  return { ...store, items: map(commit, store.items) };
};

/** Throw the draft away: back to the selected item's saved config. */
export const dirtyComboReset = <C>(
  store: DirtyComboStore<C>,
): DirtyComboStore<C> => dirtyComboSelect(store, store.selectedId);

/** Delete a row. The SELECTED row cannot be deleted — refused as a no-op,
 *  the same rule `deletableIds` draws. */
export const dirtyComboRemove = <C>(
  store: DirtyComboStore<C>,
  id: string,
): DirtyComboStore<C> =>
  id === store.selectedId
    ? store
    : { ...store, items: filter((item) => item.id !== id, store.items) };
