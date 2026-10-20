// listDetail — views (Depth 0, types and identity builders; JSX-free so a leaf module can import it).
// The shape of the three panels of a list-and-detail app as plain data: one item in the rail (a card),
// the centre panel for the selected item (a detail) and the right panel (a log). The components that
// draw them are ConfiguredCard, ConfiguredDetail and ConfiguredLog; the app writes only these configs.
// No app nouns: every label, field and accessor is the caller's.
import type { IconName } from "../components/Icon/Icon";
import type { TableColumn } from "../components/Table/types";

/** How a status shows: its label and its colour. */
export type StatusVariant =
  | "active"
  | "success"
  | "warning"
  | "error"
  | "inactive"
  | "pending";
export type StatusMap = Record<
  string,
  { label?: string; variant: StatusVariant }
>;

/** One item in the rail: title top-left, status top-right, a detail line, who bottom-left, when bottom-right. */
export type CardConfig<T> = {
  title: (item: T) => string;
  /** The status id (a key of `map`) and how each id shows. */
  status?: { of: (item: T) => string; map: StatusMap };
  detail?: (item: T) => string;
  who?: (item: T) => string;
  /** An instant (ISO string, epoch ms or Date); shown as the time today, else the short date. */
  when?: (item: T) => string | number | Date;
};

/** A table of rows derived from the selected item (its children), the selected row driven by the app. */
export type TableSection<T, R> = {
  kind: "table";
  title: string;
  countNoun?: string;
  emptyLabel?: string;
  rowsOf: (item: T) => R[];
  columns: TableColumn<R>[];
  /** The id of the selected row, if any. */
  selectedOf?: (item: T) => string | undefined;
  onSelect?: (item: T, rowId: string) => void;
};
/** A section of the detail with its row type erased, so a list of sections can mix row types. */
export type DetailSection<T> = TableSection<T, object>;

/** The centre panel: an editable title, short "label: value" facts, one action button, then sections. */
export type DetailConfig<T> = {
  /** Shown when nothing is selected. */
  emptyLabel: string;
  /** The field the title edits (saved through the kit's `update`). */
  titleField: keyof T & string;
  facts?: { label: string; of: (item: T) => string }[];
  /** A button that runs the kit's `primary` verb; its hotkey is bound by the app's key handlers (armed=false). */
  action?: { hotkey: string; label: string; icon?: IconName };
  sections: DetailSection<T>[];
};

/** The right panel: a time + text log of rows derived from the selected item. */
export type SideConfig<T> = {
  title: string;
  emptyLabel: string;
  rowsOf: (item: T) => { id: string }[];
  at: (row: never) => string | number | Date;
  text: (row: never) => string;
  wrap?: boolean;
};

export const defineCard = <T>(config: CardConfig<T>): CardConfig<T> => config;

/** A table section; the row type is inferred from `rowsOf` and `columns`. */
export const tableSection = <T, R>(
  section: Omit<TableSection<T, R>, "kind">,
): DetailSection<T> =>
  ({ kind: "table", ...section }) as unknown as DetailSection<T>;

export const defineDetail = <T>(config: DetailConfig<T>): DetailConfig<T> =>
  config;

/** A side log; the row type is inferred from `rowsOf`, `at` and `text` and then erased. */
export const defineSide = <T, L extends { id: string }>(config: {
  title: string;
  emptyLabel: string;
  rowsOf: (item: T) => L[];
  at: (row: L) => string | number | Date;
  text: (row: L) => string;
  wrap?: boolean;
}): SideConfig<T> => config as unknown as SideConfig<T>;
