// LogLineList (Depth 2, composes BaseTable / SectionTable). Time + text rows for a
// narrow panel: a fixed time column, a text column that takes the rest and truncates with an
// ellipsis (or wraps), an empty state, and an optional selected row. No app nouns: the caller
// says which field is the time and which the text.
import { BaseTable } from "../Table/BaseTable";
import { SectionTable } from "../Table/SectionTable";
import type { TableColumn, TableRow } from "../Table/types";

/** How `instantOf` is shown in the time column: `time` is the time of day (narrow-safe, the default), `date-time` adds the date, `date` is the date alone. */
export type LogTimeFormat = "time" | "date-time" | "date";

const TIME_OPTIONS: Record<LogTimeFormat, Intl.DateTimeFormatOptions> = {
  time: { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false },
  "date-time": { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false },
  date: { year: "numeric", month: "short", day: "numeric" },
};
/** Time column width per format, wide enough for the formatted text. */
const TIME_WIDTH: Record<LogTimeFormat, string> = { time: "5.5rem", "date-time": "9rem", date: "7.5rem" };

export interface LogLineListProps<T extends TableRow> {
  rows: T[];
  /** The time text of a row, already formatted ("12:04:31"). Wins over `instantOf` when both are given. */
  timeOf?: (row: T) => string;
  /** The instant of a row (an ISO string, epoch ms or Date); the list formats it per `timeFormat`, so the caller does not. */
  instantOf?: (row: T) => string | number | Date;
  /** Format of `instantOf`. Default `"time"`: the time of day, which fits a narrow panel. */
  timeFormat?: LogTimeFormat;
  /** Locale for `instantOf` (default: the runtime's). */
  locale?: string;
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
  /** Width of the time column. Default follows `timeFormat` ("5.5rem" fits HH:MM:SS). */
  timeWidth?: string;
  /** Wrap long text over several lines instead of truncating it with an ellipsis. */
  wrap?: boolean;
  /** Id of the selected row and its click handler (see BaseTable); `rowId` defaults to `row.id`. */
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  rowId?: (row: T) => string;
}

export function LogLineList<T extends TableRow>(props: LogLineListProps<T>) {
  const format = (): LogTimeFormat => props.timeFormat ?? "time";
  const timeText = (row: T): string => {
    if (props.timeOf) return props.timeOf(row);
    if (!props.instantOf) return "";
    const d = new Date(props.instantOf(row));
    return Number.isNaN(d.getTime()) ? "" : new Intl.DateTimeFormat(props.locale, TIME_OPTIONS[format()]).format(d);
  };
  const columns = (): TableColumn<T>[] => [
    {
      id: "time",
      header: props.timeHeader ?? "Time",
      accessor: timeText,
      width: props.timeWidth ?? TIME_WIDTH[format()],
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
