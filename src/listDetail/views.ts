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

/** A share of work: `done` and `active` out of `total`, in whatever unit the caller measures. */
export type Progress = { done: number; active?: number; total: number };

/** How a card is drawn: `card` (StatusCard: three rows, boxed) or `row` (RowCard: title + who, then a progress bar). */
export type CardLayout = "card" | "row";

/** One item in the rail: title top-left, status top-right, a detail line, who bottom-left, when bottom-right.
 *  With `layout: "row"` the item is a flush list row: title + `who` on line 1 and the `progress` bar on line 2
 *  (omitted while nothing is done or active); `status`, `detail` and `when` are not drawn. */
export type CardConfig<T> = {
  /** Default `card`. */
  layout?: CardLayout;
  title: (item: T) => string;
  /** The item's progress; `layout: "row"` draws it as a bar (solid done, hatched active). */
  progress?: (item: T) => Progress;
  /** The status id (a key of `map`) and how each id shows. */
  status?: { of: (item: T) => string; map: StatusMap };
  detail?: (item: T) => string;
  who?: (item: T) => string;
  /** An instant (ISO string, epoch ms or Date); shown as the time today, else the short date. */
  when?: (item: T) => string | number | Date;
  /** `layout: "row"` only: an icon at the right of line 1 (a warning triangle on an item that needs attention); undefined for none. */
  marker?: (item: T) => IconName | undefined;
  /** `layout: "row"` only: a muted second line, `left` text and `right` text spread apart (a date and a duration). Drawn under the progress bar when both are set. */
  foot?: { left?: (item: T) => string; right?: (item: T) => string };
};

/** A button in the detail's toolbar beside the primary one; it runs the caller's own action on the selected item. */
export type DetailAction<T> = {
  hotkey: string;
  label: string;
  icon?: IconName;
  onTrigger: (item: T) => void;
};

/** A one-line reading of the selected item: an icon and a sentence ("Non-compliant, 1 incident"), coloured by `variant`. */
export type DetailSummary = { text: string; icon?: IconName; variant?: StatusVariant };

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
/** How one node of a sequence flow is drawn; the caller maps its row to this. */
export type FlowNodeSpec = {
  label: string;
  /** `done` and `next` are small cards, `active` is the large one. */
  size: "done" | "active" | "next";
  /** Shown on the active node only. */
  description?: string;
  /** Preformatted ("12 min", "3:02"); drawn as "Est 12 min" / "Act 3:02" (the labels are the section's). */
  estimate?: string;
  actual?: string;
  progress?: Progress;
};

/** The selected item's children as a sequence flow (SequenceFlow): done nodes, the active node, the next ones,
 *  with a label on each edge. The primary action can sit on the active node (`DetailConfig.action.placement`). */
export type FlowSection<T, R> = {
  kind: "flow";
  /** Optional heading; omit for a bare flow. */
  title?: string;
  emptyLabel?: string;
  rowsOf: (item: T) => R[];
  nodeOf: (row: R, item: T) => FlowNodeSpec;
  /** The label on the edge from `prev` to `next` (an elapsed time, a count); undefined for none. */
  edgeLabelOf?: (prev: R, next: R, item: T) => string | undefined;
  /** Labels before the estimate and the actual; default "Est" and "Act". */
  estimateLabel?: string;
  actualLabel?: string;
  selectedOf?: (item: T) => string | undefined;
  onSelect?: (item: T, rowId: string) => void;
};

/** A section of the detail with its row type erased, so a list of sections can mix row types. */
export type DetailSection<T> = TableSection<T, object> | FlowSection<T, object>;

/** The centre panel: an editable title, short "label: value" facts, one action button, then sections. */
export type DetailConfig<T> = {
  /** Shown when nothing is selected. */
  emptyLabel: string;
  /** The field the title edits (saved through the kit's `update`). */
  titleField: keyof T & string;
  /** How big the title is: `md` (default) or `lg`, a headline on its own line. */
  titleSize?: "md" | "lg";
  /** A short boxed chip at the title's right (an owner, a state). */
  chip?: (item: T) => string;
  /** Muted text on the title line, after the title and before the chip (a range, a reference). */
  subtitle?: (item: T) => string;
  /** The line under the title: an icon and a sentence (a verdict and what drove it). */
  summary?: (item: T) => DetailSummary | undefined;
  facts?: { label: string; of: (item: T) => string }[];
  /** A button that runs the kit's `primary` verb; its hotkey is bound by the app's key handlers (armed=false).
   *  `placement: "activeNode"` moves it from under the title onto the active node of the first flow section;
   *  `placement: "toolbar"` draws it compact at the left of a ruled toolbar row, with `actions` beside it. */
  action?: { hotkey: string; label: string; icon?: IconName; placement?: "top" | "activeNode" | "toolbar" };
  /** More buttons in the toolbar row (`action.placement: "toolbar"`), after the primary one, each running the caller's own action. */
  actions?: DetailAction<T>[];
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
  /** `plain`: heading only, no column headers, airy wrapped rows (LogLineList's plain variant). Default `table`. */
  variant?: "table" | "plain";
  /** How `at` is shown (LogLineList's `timeFormat`). Default `time` (HH:MM:SS). */
  timeFormat?: "time" | "minutes" | "date-time" | "date";
};

export const defineCard = <T>(config: CardConfig<T>): CardConfig<T> => config;

/** A table section; the row type is inferred from `rowsOf` and `columns`. */
export const tableSection = <T, R>(
  section: Omit<TableSection<T, R>, "kind">,
): DetailSection<T> =>
  ({ kind: "table", ...section }) as unknown as DetailSection<T>;

/** A flow section; the row type is inferred from `rowsOf` and `nodeOf`. */
export const flowSection = <T, R>(
  section: Omit<FlowSection<T, R>, "kind">,
): DetailSection<T> =>
  ({ kind: "flow", ...section }) as unknown as DetailSection<T>;

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
  variant?: "table" | "plain";
  timeFormat?: "time" | "minutes" | "date-time" | "date";
}): SideConfig<T> => config as unknown as SideConfig<T>;
