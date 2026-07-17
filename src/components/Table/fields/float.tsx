// Table field — float (Depth 1, imports FloatCell from ../numericCells).
// A right-aligned decimal column with a centered header. 16ch: the widest
// realistic value "1,234,567.89" plus cell chrome; content-fits up to the cap.
// Geometry is owned here in ch so it scales with theme font-size and zoom —
// the client never reaches CSS. See docs/superpowers/plans/
// 2026-07-16-semantic-props-metric.md §3a.
import { FloatCell } from "../numericCells";
import { centered, humanize, type FieldCol, type FieldGeo } from "./shared";

export const geo: FieldGeo = { minCh: 10, maxCh: 16, css: "16ch" };

/** A decimal field: right-aligned values, centered header, `precision`
 *  fraction digits. Clients never see width/align — the factory owns it. */
export const floatCol = <T,>(key: keyof T, precision = 2): FieldCol<T> => ({
  id: String(key),
  header: centered(humanize(String(key))),
  align: "right",
  width: geo.css,
  sortable: true,
  geo,
  accessor: (row) => <FloatCell value={row[key] as number} precision={precision} />,
});
