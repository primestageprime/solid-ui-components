// Table field — dateTime (Depth 1: imports DateTimeCell from ../dateCells).
// A fixed timestamp column: "2026-07-15 14:10:00" (19ch) plus cell chrome →
// 23ch. Header is centered (fixed-width text); the column is sortable and owns
// its own width, so the client never reaches CSS. See docs/superpowers/plans/
// 2026-07-16-semantic-props-metric.md §3a.
import { DateTimeCell } from "../dateCells";
import { centered, humanize, type FieldCol, type FieldGeo } from "./shared";

export const geo: FieldGeo = { minCh: 23, maxCh: 23, css: "23ch" };

export const dateTimeCol = <T,>(key: keyof T): FieldCol<T> => ({
  id: String(key),
  header: centered(humanize(String(key))),
  width: geo.css,
  sortable: true,
  geo,
  accessor: (row) => <DateTimeCell value={row[key] as string} />,
});
