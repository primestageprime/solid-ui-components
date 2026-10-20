// listDetail — defineListDetail (Depth 1, headless Solid store). Configuration in, behaviour out:
// the persisted store, view state (selection, search, sort, collapsed groups, edit flag), derived
// grouped/visible lists, an undo stack with extendable ops, layered Escape, the standard verb rows
// and handlers, and a dump(). Everything entity-specific arrives as configuration; there are no
// app nouns here. Named `define*` (not `create*`) on purpose: singularity canon C11 rejects any
// `create*` factory imported from SUI.
import { createSignal } from "solid-js";
import { createStore, unwrap, type SetStoreFunction } from "solid-js/store";
import { filter, find, map } from "../fn";
import { focusById, watchFocus } from "./focus";
import {
  LAYER,
  groupedList,
  live,
  neighbourAfterRemove,
  neighbourId,
  nextInCycle,
  toggled,
  unwindLayer,
  visibleIds,
  type EntityBase,
  type Group,
  type ListSpec,
} from "./listkit";
import {
  LIST_DETAIL_ACTION_OF,
  LIST_DETAIL_CONFIGURED_ROWS,
  LIST_DETAIL_MODAL_ROWS,
  LIST_DETAIL_VERBS,
  type ListDetailRow,
} from "./verbs";

/** One reversible step. `create` and `remove` are built in; add an `op` of your own with a matching `undoers[op]`. */
export type UndoEntry = { op: string; id: string; prev?: unknown };

export type ListDetailConfig<
  T extends EntityBase,
  G extends string,
  S extends string,
  C extends string,
  XD extends object,
  XV extends object,
> = {
  /** localStorage key the whole state persists under. */
  storageKey: string;
  /** Key of the entity array under `state.data` (keeps an app's existing dump shape). */
  collection: C;
  entity: {
    /** A new entity as `create` adds it; the id must be fresh (use `newId()`). */
    blank: () => T;
    /** All the text a search query may match. */
    textOf: (item: T) => string;
  };
  groups: {
    order: readonly G[];
    of: (item: T) => G;
    /** The heading each group shows in a grouped selector (a map or a function); defaults to the id. */
    title?: Record<G, string> | ((id: G) => string);
  };
  sorts: {
    order: readonly S[];
    default: S;
    by: Record<S, (a: T, b: T) => number>;
  };
  /** The entities a fresh install starts with; the first visible one is selected. */
  seed: readonly T[];
  /** Undo handlers for the app's own ops, recorded with `actions.record({ op, id, prev })`. */
  undoers?: Record<string, (entry: UndoEntry, kit: ListDetail<T, G, S, C, XD, XV>) => void>;
  /** App-owned fields persisted alongside the kit's own. */
  extra?: { data?: XD; view?: XV };
  /** True while an app dialog (beyond the kit's help and settings) is open, so Escape closes it before anything else. */
  modalOpen?: () => boolean;
  /** Closes the app's dialog; Escape calls it while `modalOpen()` is true. */
  closeModal?: () => void;
  /** The `open` verb (Enter): what opening the selected entity does. Without it the row is not emitted. */
  open?: (item: T, kit: ListDetail<T, G, S, C, XD, XV>) => void;
  /** The `complete` verb (c): the entity's primary domain action. Without it the row is not emitted. */
  primary?: (item: T, kit: ListDetail<T, G, S, C, XD, XV>) => void;
  /** Id of the search field `focusSearch` moves the keyboard into. Default "search-field". */
  searchId?: string;
};

export type ListDetailData<T, C extends string, XD> = { [K in C]: T[] } & {
  history: UndoEntry[];
} & XD;
export type ListDetailView<S extends string, XV> = {
  selectedId: string | null;
  search: string;
  sort: S;
  collapsed: string[];
} & XV;
export type ListDetailState<T, S extends string, C extends string, XD, XV> = {
  data: ListDetailData<T, C, XD>;
  view: ListDetailView<S, XV>;
};

export type ListDetail<
  T extends EntityBase,
  G extends string,
  S extends string,
  C extends string,
  XD extends object,
  XV extends object,
> = ReturnType<typeof defineListDetail<T, G, S, C, XD, XV>>;

export function defineListDetail<
  T extends EntityBase,
  G extends string,
  S extends string,
  C extends string = "items",
  XD extends object = Record<never, never>,
  XV extends object = Record<never, never>,
>(config: ListDetailConfig<T, G, S, C, XD, XV>) {
  type State = ListDetailState<T, S, C, XD, XV>;
  type Inner = {
    data: { history: UndoEntry[]; [key: string]: unknown };
    view: {
      selectedId: string | null;
      search: string;
      sort: S;
      collapsed: string[];
      [key: string]: unknown;
    };
  };
  const searchId = config.searchId ?? "search-field";
  const spec: ListSpec<T, G, S> = {
    groupOf: config.groups.of,
    groupOrder: config.groups.order,
    groupTitle: (id) => {
      const t = config.groups.title;
      return t === undefined ? id : typeof t === "function" ? t(id) : t[id];
    },
    textOf: config.entity.textOf,
    sorters: config.sorts.by,
    sortOrder: config.sorts.order,
    defaultSort: config.sorts.default,
  };
  const [editing, setEditing] = createSignal(false);
  const [searchFocused, setSearchFocused] = createSignal(false);
  const [helpOpen, setHelpOpen] = createSignal(false);
  const [settingsOpen, setSettingsOpen] = createSignal(false);
  const anyModalOpen = (): boolean =>
    helpOpen() || settingsOpen() || (config.modalOpen?.() ?? false);
  const selectedEntity = (): T | undefined =>
    find((x) => x.id === inner.view.selectedId, list());

  const initial = (): State => {
    const s = {
      data: {
        ...(config.extra?.data ?? {}),
        [config.collection]: map((e) => ({ ...e }), config.seed),
        history: [],
      },
      view: {
        ...(config.extra?.view ?? {}),
        search: "",
        sort: config.sorts.default,
        collapsed: [],
        selectedId: null,
      },
    } as unknown as State;
    s.view.selectedId =
      visibleIds(s.data[config.collection] as T[], spec, s.view)[0] ?? null;
    return s;
  };

  const load = (): State => {
    const base = initial();
    if (typeof localStorage === "undefined") return base;
    try {
      const raw = localStorage.getItem(config.storageKey);
      if (!raw) return base;
      const saved = JSON.parse(raw) as Partial<State>;
      return {
        data: { ...base.data, ...(saved.data ?? {}) },
        view: { ...base.view, ...(saved.view ?? {}) },
      };
    } catch {
      return base;
    }
  };

  // The store is typed loosely inside (the collection key and the app's extra fields are
  // generic) and handed out typed as State; the casts below are that one seam.
  const [inner, setInner] = createStore<Inner>(load() as unknown as Inner);
  const state = inner as unknown as State;
  const setState = setInner as unknown as SetStoreFunction<State>;
  const list = (): T[] => inner.data[config.collection] as T[];
  const setList = (fn: (l: T[]) => T[]) =>
    setInner("data", config.collection, fn as never);
  const patchEntity = (id: string, patch: Partial<T>) =>
    setInner(
      "data",
      config.collection,
      ((e: T) => e.id === id) as never,
      patch as never,
    );
  const ids = (): string[] => visibleIds(list(), spec, state.view);

  const persist = (): void => {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(config.storageKey, JSON.stringify(unwrap(inner)));
  };

  const actions = {
    /** Call after any setState so the change persists; wrap domain actions with it. */
    commit(): void {
      persist();
    },
    select(id: string | null): void {
      setInner("view", "selectedId", id);
      setEditing(false);
      actions.commit();
    },
    next(): void {
      actions.select(neighbourId(ids(), inner.view.selectedId, 1));
    },
    prev(): void {
      actions.select(neighbourId(ids(), inner.view.selectedId, -1));
    },
    /** Add an entity from `blank()`, select it at once (the `new` verb) and open it for edit; search and its group's collapse never hide it. */
    create(): void {
      const e = config.entity.blank();
      setList((l) => [...l, e]);
      setInner("view", "search", "");
      setInner("view", "collapsed", (c) =>
        filter((g) => g !== config.groups.of(e), c),
      );
      actions.record({ op: "create", id: e.id });
      actions.select(e.id);
      setEditing(true);
    },
    /** Soft-delete the selected entity and select its neighbour. */
    remove(): void {
      const id = inner.view.selectedId;
      if (id === null) return;
      const to = neighbourAfterRemove(ids(), id);
      patchEntity(id, { deleted: true } as Partial<T>);
      actions.record({ op: "remove", id });
      actions.select(to);
    },
    /** Merge `patch` into the entity with `id`. */
    update(id: string, patch: Partial<T>): void {
      patchEntity(id, patch);
      actions.commit();
    },
    /** Push an undo step; domain actions call it with their own `op`. */
    record(entry: UndoEntry): void {
      setInner("data", "history", (h) => [...h, entry]);
    },
    /** Reverse the last step: create, remove, or an op registered in `config.undoers`. */
    undo(): void {
      const history = inner.data.history;
      const last = history[history.length - 1];
      if (!last) return;
      setInner("data", "history", (h) => h.slice(0, -1));
      if (last.op === "create") {
        setList((l) => filter((e) => e.id !== last.id, l));
        if (inner.view.selectedId === last.id)
          setInner("view", "selectedId", null);
      } else if (last.op === "remove") {
        patchEntity(last.id, { deleted: false } as Partial<T>);
        setInner("view", "selectedId", last.id);
      } else config.undoers?.[last.op]?.(last, kit);
      actions.commit();
    },
    startEdit(): void {
      if (inner.view.selectedId !== null) setEditing(true);
    },
    endEdit(): void {
      setEditing(false);
    },
    /** Escape: close a dialog (the app's), else leave edit, else clear the selection. */
    unwind(): void {
      const layer = unwindLayer({
        modalOpen: anyModalOpen(),
        editing: editing(),
        selectedId: inner.view.selectedId,
      });
      if (layer === LAYER.dialog) actions.closeModals();
      else if (layer === LAYER.field) actions.endEdit();
      else if (layer === LAYER.selected) actions.select(null);
    },
    /** The `help` verb (?): open the key-cap overlay. */
    openHelp(): void {
      setHelpOpen(true);
    },
    closeHelp(): void {
      setHelpOpen(false);
    },
    /** The `settings` verb (,): open the settings modal. */
    openSettings(): void {
      setSettingsOpen(true);
    },
    closeSettings(): void {
      setSettingsOpen(false);
    },
    /** Close the kit's dialogs and the app's (through `config.closeModal`). */
    closeModals(): void {
      setHelpOpen(false);
      setSettingsOpen(false);
      if (config.modalOpen?.()) config.closeModal?.();
    },
    /** The `open` verb (Enter): run the configured open on the selected entity. */
    open(): void {
      const e = selectedEntity();
      if (e) config.open?.(e, kit);
    },
    /** The `complete` verb (c): run the configured primary action on the selected entity. */
    primary(): void {
      const e = selectedEntity();
      if (e) config.primary?.(e, kit);
    },
    setSearch(search: string): void {
      setInner("view", "search", search);
      actions.commit();
    },
    focusSearch(): void {
      setSearchFocused(true);
      focusById(searchId);
    },
    setSearchFocused(on: boolean): void {
      setSearchFocused(on);
    },
    setSort(sort: S): void {
      setInner("view", "sort", sort);
      actions.commit();
    },
    /** The `sort` verb: through the sort order, round again. */
    cycleSort(): void {
      actions.setSort(nextInCycle(spec.sortOrder, inner.view.sort));
    },
    toggleGroup(id: G): void {
      setInner("view", "collapsed", (c) => toggled(c as G[], id));
      actions.commit();
    },
    /** The `collapse` verb: fold or unfold the group of the selected entity (the first group when nothing is selected). */
    collapseSelected(): void {
      const e = selectedEntity();
      actions.toggleGroup(e ? config.groups.of(e) : spec.groupOrder[0]);
    },
  };

  /** The standard handlers (the ten base verbs, help, settings, and open and complete when configured), keyed by hotkey action. Canon C04b reads a literal `handlers:` block, so a canon app writes these out; the kit's copy serves tests and non-canon apps. */
  const handlers: Record<string, () => void> = Object.fromEntries(
    map(
      ([action, name]) => [
        action,
        () => (actions as unknown as Record<string, () => void>)[name](),
      ],
      Object.entries(LIST_DETAIL_ACTION_OF),
    ),
  );

  const kit = {
    state,
    setState,
    actions,
    /** The edit flag and search focus, as signals the app's ui may re-export. */
    ui: { editing, searchFocused, helpOpen, settingsOpen, modalOpen: anyModalOpen },
    /** The live entities, grouped, filtered and sorted for the current view. */
    grouped: (): Group<T, G>[] => groupedList(list(), spec, inner.view),
    visibleIds: ids,
    live: (): T[] => live(list()),
    spec,
    /** The hotkey rows this kit serves: ten base verbs, help and settings, plus open (Enter) and complete (c) when configured. */
    verbs: [
      ...LIST_DETAIL_VERBS,
      ...LIST_DETAIL_MODAL_ROWS,
      ...filter(
        (r) => (r.action === "open" ? !!config.open : !!config.primary),
        LIST_DETAIL_CONFIGURED_ROWS,
      ),
    ] as readonly ListDetailRow[],
    handlers,
    /** Install search-focus tracking and Escape-leaves-a-field; call once at boot. Returns the remover. */
    install(): () => void {
      return watchFocus({
        searchId,
        onSearchFocus: setSearchFocused,
        onLeave: () => actions.endEdit(),
      });
    },
    /** The kit's observable state: data, view and chrome. An app's dump() spreads this and adds its own chrome. */
    dumpObject(): Record<string, unknown> {
      return {
        ...unwrap(inner),
        chrome: {
          editing: editing(),
          searchFocused: searchFocused(),
          helpOpen: helpOpen(),
          settingsOpen: settingsOpen(),
        },
      };
    },
    dump(): string {
      return JSON.stringify(kit.dumpObject(), null, 2);
    },
  };
  return kit;
}
