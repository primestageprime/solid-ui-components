// Table field — name (Depth 1: imports the LongTextCell renderer only).
// The primary-identity column: flowing text at a FIXED 50ch, ellipsis-clipping
// only dirty data past the cap with the full value in a tooltip (ruled
// 2026-07-17: variable text ellipsizes with full-text tooltip by default).
// LEFT-aligned header (never centered — name is flowing text, not a
// fixed-width value).
//
// FIXED at 50ch (ruled 2026-07-18: names never get squeezed — a 12ch-min
// squeeze truncated the primary identity while every other column kept its
// data; the table scrolls instead). The 50 is data-driven: the 2026-07-17
// production survey (docs/superpowers/plans/2026-07-17-name-length-survey.md,
// 171,926 values across rhinotools/jtf/dside/thorcasting) found p95 = 29ch,
// p99 = 41ch, and the longest LEGITIMATE name at 43ch — everything past ~48ch
// is dirty data (addresses, emails, notes in name columns) that SHOULD
// truncate; ellipsis remains for exactly that case.
import { humanize, type FieldCol, type FieldGeo } from "./shared";
import { LongTextCell } from "../textCells";

export const geo: FieldGeo = { minCh: 50, maxCh: 50, padPx: 16, css: "calc(50ch + 16px)" };

/** Known-field factory: the primary name/title column. Left-aligned humanized
 *  header, fixed 50ch (names never get squeezed); overflow ellipsizes with
 *  the full value in a hover tooltip. */
export const nameCol = <T,>(key: keyof T = "name" as keyof T): FieldCol<T> => ({
  id: String(key),
  header: humanize(String(key)),
  width: geo.css,
  ellipsis: true,
  sortValue: (row) => String(row[key] ?? ""),
  geo,
  accessor: (row) => {
    const value = String(row[key] ?? "");
    // Blank, not the legacy em-dash (ruled 2026-07-18: no empty markers).
    if (value === "") return "";
    return <LongTextCell value={value} clampLines={1} reveal="tooltip" />;
  },
});
