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
import { floorGeoAtLabel, humanize, toneWrap, type FieldCol, type FieldGeo } from "./shared";
import { LongTextCell } from "../textCells";

export const geo: FieldGeo = { minCh: 50, maxCh: 50, padPx: 16, css: "calc(50ch + 16px)" };

/** Fixed name geometry for a size class (5-ch steps, ruled 2026-07-21). */
export const sizedNameGeo = (n: number): FieldGeo => ({
  minCh: n,
  maxCh: n,
  padPx: 16,
  css: `calc(${n}ch + 16px)`,
});

export interface NameColOpts<T> {
  /** Recede knob (ruled 2026-07-18): the name renders muted when true —
   *  a single boolean, not the Tone vocabulary (e.g. bag membership). */
  muted?: (row: T) => boolean;
}

const makeNameCol =
  (colGeo: FieldGeo) =>
  <T,>(key: keyof T = "name" as keyof T, opts: NameColOpts<T> = {}): FieldCol<T> => {
    const label = humanize(String(key));
    const geo = floorGeoAtLabel(colGeo, label);
    return {
      id: String(key),
      header: label,
      width: geo.css,
      ellipsis: true,
      sortValue: (row) => String(row[key] ?? ""),
      geo,
      accessor: (row) => {
        const value = String(row[key] ?? "");
        // Blank, not the legacy em-dash (ruled 2026-07-18: no empty markers).
        if (value === "") return "";
        return toneWrap(
          opts.muted?.(row) ? "muted" : undefined,
          <LongTextCell value={value} clampLines={1} reveal="tooltip" />,
        );
      },
    };
  };

/** Known-field factory: the primary name/title column. Left-aligned humanized
 *  header, fixed 50ch (names never get squeezed); overflow ellipsizes with
 *  the full value in a hover tooltip. */
export const nameCol = makeNameCol(geo);

/** Curried sized names (ruled 2026-07-21): when a name column's population is
 *  known, pick the nearest 5-ch class ≥ the longest legitimate value instead
 *  of the survey-driven 50ch default. Same cell; dirty overflow ellipsizes
 *  with the tooltip. */
export const name10Col = makeNameCol(sizedNameGeo(10));
export const name15Col = makeNameCol(sizedNameGeo(15));
export const name20Col = makeNameCol(sizedNameGeo(20));
export const name25Col = makeNameCol(sizedNameGeo(25));
export const name30Col = makeNameCol(sizedNameGeo(30));
