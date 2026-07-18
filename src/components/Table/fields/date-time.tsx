// Table field — dateTime (Depth 1: imports DateTimeCell from ../dateCells).
// A fixed timestamp column: "2026-07-15 14:10:00" (19ch) plus cell chrome →
// 23ch. Fixed-width fields center both header and values (ruled 2026-07-17);
// the column is sortable and owns its own width, so the client never reaches
// CSS. See docs/superpowers/plans/2026-07-16-semantic-props-metric.md §3a.
import { DateTimeCell } from "../dateCells";
import { centered, humanize, type FieldCol, type FieldGeo } from "./shared";

export const geo: FieldGeo = { minCh: 19, maxCh: 19, padPx: 18, css: "calc(19ch + 18px)" };

export interface DateTimeColOpts {
  /** Display zone (e.g. "America/Los_Angeles") — the data stays a semantic
   *  timestamp; the zone is a rendering concern (ruled 2026-07-18: retires
   *  pre-formatted Pacific-time string columns). */
  timeZone?: string;
}

export const dateTimeCol = <T,>(
  key: keyof T,
  opts: DateTimeColOpts = {},
): FieldCol<T> => ({
  id: String(key),
  header: centered(humanize(String(key))),
  align: "center",
  width: geo.css,
  // ISO timestamps order lexically — the raw value is the sort key.
  sortValue: (row) => row[key] as string,
  geo,
  accessor: (row) => {
    const value = row[key] as string | null | undefined;
    // Blank, never a placeholder (ruled 2026-07-18: empty value → empty cell).
    if (value == null || value === "") return "";
    return <DateTimeCell value={value} timeZone={opts.timeZone} />;
  },
});
