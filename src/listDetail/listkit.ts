// listDetail — listkit (Depth 0, pure). The generic list machinery: grouping, search, sort,
// collapse, the order j and k walk, neighbours, the Escape layers. Pure functions over plain
// data; no store, no signals, no DOM. Ported from the singularity scaffold's list-detail
// library. The domain supplies a ListSpec; nothing here names an app's entity.
import { filter, flatMap, map } from "../fn";
import { sortWith } from "../fn/sortWith";

export type EntityBase = { id: string; deleted?: boolean };

/** `EntityBase` plus the one field every list item shows: `type Task = ListItem & { done: boolean }`. */
export type ListItem = EntityBase & { title: string };

/** The view state every list persists: the search text, the active sort key and the collapsed group ids. */
export type ListView<S extends string = string> = {
  search: string;
  sort: S;
  collapsed: string[];
};

/** What the domain supplies: which group an item is in, the group order, the text search looks in, and the sort keys. */
export type ListSpec<
  T,
  G extends string = string,
  S extends string = string,
> = {
  groupOf: (item: T) => G;
  groupOrder: readonly G[];
  /** The heading a group shows (a selector's group header); defaults to the group id. */
  groupTitle?: (id: G) => string;
  /** All the text a search query may match, in one string. */
  textOf: (item: T) => string;
  sorters: Record<S, (a: T, b: T) => number>;
  /** The order the sort verb cycles through. */
  sortOrder: readonly S[];
  defaultSort: S;
};

export type Group<T, G extends string = string> = {
  id: G;
  /** The group's heading: `spec.groupTitle(id)`, else the id. */
  title: string;
  count: number;
  collapsed: boolean;
  items: T[];
};

let counter = 0;
/** A short unique id; no randomness API needed, so it loads under Node. */
export const newId = (): string =>
  `${Date.now().toString(36)}${(counter++).toString(36)}`;

/** The items that are not deleted, in collection order. */
export const live = <T extends EntityBase>(list: readonly T[]): T[] =>
  filter((e) => !e.deleted, list);

/** The id `step` places away from `id` in `ids`, clamped to the ends; the first id when `id` is null or gone. */
export function neighbourId(
  ids: readonly string[],
  id: string | null,
  step: 1 | -1,
): string | null {
  if (ids.length === 0) return null;
  const at = id === null ? -1 : ids.indexOf(id);
  if (at < 0) return ids[0];
  return ids[Math.min(ids.length - 1, Math.max(0, at + step))];
}

/** Where selection lands when `id` is removed from `ids`: the next one, else the previous one, else null. */
export function neighbourAfterRemove(
  ids: readonly string[],
  id: string,
): string | null {
  const next = neighbourId(ids, id, 1);
  const to = next === id ? neighbourId(ids, id, -1) : next;
  return to === id ? null : to;
}

/** The key after `current` in `order`, wrapping round. */
export const nextInCycle = <K extends string>(
  order: readonly K[],
  current: K,
): K => order[(order.indexOf(current) + 1) % order.length];

/** `list` with `id` added when absent, removed when present. */
export const toggled = <K extends string>(list: readonly K[], id: K): K[] =>
  list.includes(id) ? filter((x) => x !== id, list) : [...list, id];

/** Every group in `spec.groupOrder` (empty ones too), each holding the live items that match the search, sorted by the view's sort key. */
export function groupedList<
  T extends EntityBase,
  G extends string,
  S extends string,
>(
  items: readonly T[],
  spec: ListSpec<T, G, S>,
  view: ListView<S>,
): Group<T, G>[] {
  const q = view.search.trim().toLowerCase();
  const shown = filter(
    (e: T) => q === "" || spec.textOf(e).toLowerCase().includes(q),
    live(items),
  );
  return map((id: G) => {
    const inGroup = sortWith(
      spec.sorters[view.sort],
      filter((e: T) => spec.groupOf(e) === id, shown),
    );
    return {
      id,
      title: spec.groupTitle?.(id) ?? id,
      count: inGroup.length,
      collapsed: view.collapsed.includes(id),
      items: inGroup,
    };
  }, spec.groupOrder);
}

/** The ids in the order the list shows them, collapsed groups left out: the order j and k walk. */
export const visibleIds = <
  T extends EntityBase,
  G extends string,
  S extends string,
>(
  items: readonly T[],
  spec: ListSpec<T, G, S>,
  view: ListView<S>,
): string[] =>
  flatMap(
    (g) => (g.collapsed ? [] : map((e) => e.id, g.items)),
    groupedList(items, spec, view),
  );

/** The layers Escape closes, innermost first. */
export const LAYER = {
  dialog: "dialog",
  field: "field",
  selected: "selected",
  idle: "idle",
} as const;
export type Layer = (typeof LAYER)[keyof typeof LAYER];

/** The layer Escape closes next: an open dialog, then a field in edit, then the selection; idle when none is open. */
export function unwindLayer(s: {
  modalOpen: boolean;
  editing: boolean;
  selectedId: string | null;
}): Layer {
  if (s.modalOpen) return LAYER.dialog;
  if (s.editing) return LAYER.field;
  return s.selectedId !== null ? LAYER.selected : LAYER.idle;
}
