// Table field module — `date` (Depth 1). A calendar-date column factory plus
// its geometry. Fixed width: "2026-07-15" is 10ch, +2ch chrome per side ⇒ 14ch,
// so min === max (never expands). Fixed-width fields center both header and
// values (ruled 2026-07-17), so header is centered() and align is "center".
// See docs/superpowers/plans/2026-07-16-semantic-props-metric.md §3a-geometry.
import type { FieldCol, FieldGeo } from "./shared";
import { centered, humanize } from "./shared";
import { DateCell } from "../dateCells";

export const geo: FieldGeo = { minCh: 10, maxCh: 10, padPx: 16, css: "calc(10ch + 16px)" };

export const dateCol = <T,>(key: keyof T): FieldCol<T> => ({
  id: String(key),
  header: centered(humanize(String(key))),
  align: "center",
  width: geo.css,
  sortable: true,
  geo,
  accessor: (row) => <DateCell value={row[key] as string} />,
});
