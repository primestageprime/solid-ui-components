// Table field module — `duration` (Depth 1). An elapsed-time column factory
// plus its geometry. Content-fit ≤ cap: day scale is the max basis — "365d 23h" is 9ch, +chrome ⇒
// caps at 14ch, so min (10) < max (14). Right-aligned value, header centered per
// the fixed-width rule. The input `unit` (ms/s/m/h) is a semantic knob, not CSS.
// See docs/superpowers/plans/2026-07-16-semantic-props-metric.md §3a-geometry.
import type { FieldCol, FieldGeo, ValueSource } from "./shared";
import { centered, humanize, idOf, readerOf } from "./shared";
import { DurationCell } from "../numericCells";

export const geo: FieldGeo = { minCh: 5, maxCh: 9, padPx: 36, css: "calc(9ch + 36px)" };

export interface DurationColOpts {
  /** Column id — REQUIRED when the source is a derived function
   *  (ruled 2026-07-18: durations computed from two timestamps). */
  id?: string;
  /** Header label (default: humanized id). */
  header?: string;
}

export const durationCol = <T,>(
  source: ValueSource<T, number | null | undefined>,
  unit: "ms" | "s" | "m" | "h" = "s",
  opts: DurationColOpts = {},
): FieldCol<T> => {
  const read = readerOf(source);
  const id = idOf(source, opts.id);
  return {
    id,
    header: centered(opts.header ?? humanize(id)),
    align: "right",
    width: geo.css,
    sortValue: read,
    geo,
    accessor: (row) => {
      const value = read(row);
      // Blank, never a placeholder (ruled 2026-07-18: empty value → empty cell).
      if (value == null || Number.isNaN(value)) return "";
      return <DurationCell value={value} unit={unit} />;
    },
  };
};
