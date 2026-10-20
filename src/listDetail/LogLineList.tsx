// listDetail — LogLineList (Depth 2, composes BaseTable / SectionTable). Time + text rows for a
// narrow panel: a fixed time column, a text column that takes the rest and truncates with an
// ellipsis (or wraps), an empty state, and an optional selected row. No app nouns: the caller
// says which field is the time and which the text.
import { BaseTable } from "../components/Table/BaseTable";
import { SectionTable } from "../components/Table/SectionTable";
import type { TableColumn, TableRow } from "../components/Table/types";

export interface LogLineListProps<T extends TableRow> {
  rows: T[];
  /** The time text of a row, already formatted ("12:04:31"). */
  timeOf: (row: T) => string;
  /** The line's text. */
  textOf: (row: T) => string;
  /** With a title the list is a SectionTable (title and "N lines" count); without, a bare table. */
  title?: string;
  /** Noun for the count, default "line". */
  countNoun?: string;
  /** Shown when there are no rows. Default "No entries". */
  emptyLabel?: string;
  /** Header text of the time column. Default "Time". */
  timeHeader?: string;
  /** Header text of the text column. Default "Message". */
  textHeader?: string;
  /** Width of the time column. Default "5.5rem" (fits HH:MM:SS). */
  timeWidth?: string;
  /** Wrap long text over several lines instead of truncating it with an ellipsis. */
  wrap?: boolean;
  /** Id of the selected row and its click handler (see BaseTable); `rowId` defaults to `row.id`. */
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  rowId?: (row: T) => string;
}

export function LogLineList<T extends TableRow>(props: LogLineListProps<T>) {
  const columns = (): TableColumn<T>[] => [
    {
      id: "time",
      header: props.timeHeader ?? "Time",
      accessor: props.timeOf,
      width: props.timeWidth ?? "5.5rem",
    },
    {
      id: "text",
      header: props.textHeader ?? "Message",
      accessor: props.textOf,
      ellipsis: !props.wrap,
    },
  ];
  const table = {
    get data() { return props.rows; },
    get columns() { return columns(); },
    get emptyMessage() { return props.emptyLabel ?? "No entries"; },
    get fixedLayout() { return !props.wrap; },
    get selectedId() { return props.selectedId; },
    get onSelect() { return props.onSelect; },
    get rowId() { return props.rowId; },
    flush: true,
    fill: true,
    compact: true,
  };
  return props.title ? (
    <SectionTable
      title={props.title}
      countNoun={props.countNoun ?? "line"}
      {...table}
    />
  ) : (
    <BaseTable {...table} />
  );
}
