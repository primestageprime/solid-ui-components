// listDetail — verbs (Depth 0, pure). The ten standard hotkey rows of a list-and-detail app and
// the names of the store actions they reach. Rows match singularity's HotkeyEntry shape; the
// app spreads them into its own HOTKEYS table and writes the literal handler block itself.
export type ListDetailScope = "global" | "list" | "detail" | "modal";
export type ListDetailVerb =
  | "next"
  | "prev"
  | "new"
  | "edit"
  | "delete"
  | "undo"
  | "search"
  | "sort"
  | "collapse"
  | "close"
  | "help"
  | "settings"
  | "open"
  | "complete";

export type ListDetailRow = {
  action: string;
  verb: ListDetailVerb;
  keys: string;
  scope: ListDetailScope;
};

export const LIST_DETAIL_VERBS = [
  { action: "next", verb: "next", keys: "j", scope: "list" },
  { action: "prev", verb: "prev", keys: "k", scope: "list" },
  { action: "new", verb: "new", keys: "n", scope: "global" },
  { action: "edit", verb: "edit", keys: "e", scope: "detail" },
  { action: "delete", verb: "delete", keys: "x", scope: "detail" },
  { action: "undo", verb: "undo", keys: "u", scope: "global" },
  { action: "search", verb: "search", keys: "/", scope: "global" },
  { action: "sort", verb: "sort", keys: "s", scope: "list" },
  { action: "collapse", verb: "collapse", keys: "-", scope: "list" },
  { action: "unwind", verb: "close", keys: "Escape", scope: "global" },
] as const satisfies ReadonlyArray<ListDetailRow>;

/** `?` and `,`: always served, since the kit owns the two dialog flags. */
export const LIST_DETAIL_MODAL_ROWS = [
  { action: "help", verb: "help", keys: "?", scope: "global" },
  { action: "settings", verb: "settings", keys: ",", scope: "global" },
] as const satisfies ReadonlyArray<ListDetailRow>;

/** `Enter` and `c`: served only when the config supplies the matching `open` / `primary`. */
export const LIST_DETAIL_CONFIGURED_ROWS = [
  { action: "open", verb: "open", keys: "Enter", scope: "detail" },
  { action: "complete", verb: "complete", keys: "c", scope: "detail" },
] as const satisfies ReadonlyArray<ListDetailRow>;

/** Hotkey action name -> store action name (they differ only where the verb and the action do). */
export const LIST_DETAIL_ACTION_OF: Record<string, string> = {
  next: "next",
  prev: "prev",
  new: "create",
  edit: "startEdit",
  delete: "remove",
  undo: "undo",
  search: "focusSearch",
  sort: "cycleSort",
  collapse: "collapseSelected",
  unwind: "unwind",
  help: "openHelp",
  settings: "openSettings",
  open: "open",
  complete: "primary",
};
