// Table field module — text (secondary text column).
// Expanding secondary text: absorbs slack between its bounds, then ellipsizes.
// Lower max than `name` (40ch vs 80ch), so when width is scarce it yields the
// space to the primary identifier. LEFT-aligned humanized header (flowing text,
// never centered()), sortable, ellipsis-clipped. Composes StringCell from
// ../textCells. See docs/superpowers/plans/2026-07-16-semantic-props-metric.md
// §3a-geometry.
import { StringCell } from "../textCells";
import { humanize, type FieldCol, type FieldGeo } from "./shared";

/** Secondary text: expands between bounds, then ellipsis; yields to `name`. */
export const geo: FieldGeo = { minCh: 8, maxCh: 40 };

/** A secondary-text column for `key`: humanized left header, sortable, clipped. */
export const textCol = <T,>(key: keyof T): FieldCol<T> => ({
  id: String(key),
  header: humanize(String(key)),
  ellipsis: true,
  sortable: true,
  geo,
  accessor: (row) => <StringCell value={String(row[key] ?? "")} />,
});
