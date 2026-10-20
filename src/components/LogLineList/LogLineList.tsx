// LogLineList (Depth 2, composes BaseTable / SectionTable). Time + text rows for a
// narrow panel: a fixed time column, a text column that takes the rest and truncates with an
// ellipsis (or wraps), an empty state, and an optional selected row. No app nouns: the caller
// says which field is the time and which the text.
//
// `variant="plain"` (2026-10-20, the tasklist sketch): no table at all. The title is a plain
// heading with no count, there are no column headers and no grid; each entry is the time at the
// left and the text, wrapping, at the right, in airy rows. The default (table) look is unchanged.
import { For, Show } from "solid-js";
import { BaseTable } from "../Table/BaseTable";
import { SectionTable } from "../Table/SectionTable";
import type { TableColumn, TableRow } from "../Table/types";
import { SectionTitle } from "../Text/variants";
import "./LogLineList.css";

/** How the list is drawn: `table` (SectionTable / BaseTable) or `plain` (heading, airy time + text rows). */
export type LogLineListVariant = "table" | "plain";

/** How `instantOf` is shown in the time column: `time` is the time of day (narrow-safe, the default), `minutes` the time of day without seconds, `date-time` adds the date, `date` is the date alone. */
export type LogTimeFormat = "time" | "minutes" | "date-time" | "date";

const TIME_OPTIONS: Record<LogTimeFormat, Intl.DateTimeFormatOptions> = {
  time: { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false },
  minutes: { hour: "2-digit", minute: "2-digit", hour12: false },
  "date-time": { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false },
  date: { year: "numeric", month: "short", day: "numeric" },
};
/** Time column width per format, wide enough for the formatted text. */
const TIME_WIDTH: Record<LogTimeFormat, string> = { time: "5.5rem", minutes: "4rem", "date-time": "9rem", date: "7.5rem" };

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
  /** `plain` drops the table chrome: heading only, no column headers, wrapped text, no selection. Default `table`. */
  variant?: LogLineListVariant;
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
  const rowIdOf = (row: T): string => props.rowId?.(row) ?? String((row as { id?: unknown }).id);
  // The plain variant is a read-only list: no selection (the table variant keeps `selectedId` / `onSelect`).
  if (props.variant === "plain") {
    return (
      <div class="sui-log-lines">
        <Show when={props.title}>
          <SectionTitle class="sui-log-lines__title">{props.title}</SectionTitle>
        </Show>
        <Show when={props.rows.length > 0} fallback={<span class="sui-log-lines__empty">{props.emptyLabel ?? "No entries"}</span>}>
          <For each={props.rows}>
            {(row) => (
              <div class="sui-log-lines__row" data-row-id={rowIdOf(row)}>
                <span class="sui-log-lines__time">{timeText(row)}</span>
                <span class="sui-log-lines__text">{props.textOf(row)}</span>
              </div>
            )}
          </For>
        </Show>
      </div>
    );
  }
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
