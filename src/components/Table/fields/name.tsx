// Table field — name (Depth 1: imports the StringCell renderer only).
// The expanding flex column: flowing text that grows between its bounds and
// ellipsis-clips past the cap. LEFT-aligned header (never centered — name is
// flowing text, not a fixed-width value). The 80ch cap is a plain literal: a
// live data survey may later revise it, so it stays inline, not a shared const.
import { humanize, type FieldCol, type FieldGeo } from "./shared";
import { StringCell } from "../textCells";

export const geo: FieldGeo = { minCh: 12, maxCh: 80 };

/** Known-field factory: the primary name/title column. Left-aligned humanized
 *  header, expands between `geo` bounds, ellipsis past the cap. */
export const nameCol = <T,>(key: keyof T = "name" as keyof T): FieldCol<T> => ({
  id: String(key),
  header: humanize(String(key)),
  ellipsis: true,
  sortable: true,
  geo,
  accessor: (row) => <StringCell value={String(row[key] ?? "")} />,
});
