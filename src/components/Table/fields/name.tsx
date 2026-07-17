// Table field — name (Depth 1: imports the LongTextCell renderer only).
// The expanding flex column: flowing text that grows between its bounds and
// ellipsis-clips past the cap, revealing the full value in a tooltip (ruled
// 2026-07-17: variable text ellipsizes with full-text tooltip by default).
// LEFT-aligned header (never centered — name is flowing text, not a
// fixed-width value).
//
// The 50ch cap is data-driven: the 2026-07-17 production survey
// (docs/superpowers/plans/2026-07-17-name-length-survey.md, 171,926 values
// across rhinotools/jtf/dside/thorcasting) found p95 = 29ch, p99 = 41ch, and
// the longest LEGITIMATE name at 43ch — everything past ~48ch is dirty data
// (addresses, emails, notes in name columns) that SHOULD truncate. 50 covers
// >99.7% of real values with headroom over the longest clean name.
import { humanize, type FieldCol, type FieldGeo } from "./shared";
import { LongTextCell } from "../textCells";

export const geo: FieldGeo = { minCh: 12, maxCh: 50, padPx: 16 };

/** Known-field factory: the primary name/title column. Left-aligned humanized
 *  header, expands between `geo` bounds; overflow ellipsizes with the full
 *  value in a hover tooltip. */
export const nameCol = <T,>(key: keyof T = "name" as keyof T): FieldCol<T> => ({
  id: String(key),
  header: humanize(String(key)),
  ellipsis: true,
  sortable: true,
  geo,
  accessor: (row) => (
    <LongTextCell
      value={String(row[key] ?? "")}
      clampLines={1}
      reveal="tooltip"
    />
  ),
});
