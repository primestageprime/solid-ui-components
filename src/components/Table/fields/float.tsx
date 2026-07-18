// Table field — float (Depth 1, imports FloatCell from ../numericCells).
// A right-aligned decimal column with a centered header. 12ch: the widest
// realistic value "1,234,567.89" plus cell chrome; content-fits up to the cap.
// Geometry is owned here in ch so it scales with theme font-size and zoom —
// the client never reaches CSS. See docs/superpowers/plans/
// 2026-07-16-semantic-props-metric.md §3a.
//
// Source may be a row key OR a derived `(row) => value` fn (ruled
// 2026-07-18) — the derived form names its `id` explicitly; accessor and
// sortValue share the one reader. `suffix` renders the unit in-cell ("%",
// "ppm", "kW") in muted ink and widens the geometry by its glyphs. Null
// renders BLANK (ruled 2026-07-18: empty value → empty cell, always).
import { FloatCell } from "../numericCells";
import {
  centered,
  humanize,
  idOf,
  readerOf,
  toneWrap,
  widen,
  type FieldCol,
  type FieldGeo,
  type ToneFn,
  type ValueSource,
} from "./shared";

export const geo: FieldGeo = { minCh: 6, maxCh: 12, padPx: 18, css: "calc(12ch + 18px)" };

export interface FloatColOpts<T> {
  /** Fraction digits (default 2). */
  precision?: number;
  /** Configure-time treatment: (value, row) → Tone (ruled 2026-07-17). */
  tone?: ToneFn<T, number>;
  /** In-cell unit ("%", "ppm", "kW") — muted ink, widens the column. */
  suffix?: string;
  /** Column id — REQUIRED when the source is a derived function. */
  id?: string;
  /** Header label (default: humanized id). */
  header?: string;
}

/** A decimal field: right-aligned values, centered header, `precision`
 *  fraction digits. Clients never see width/align — the factory owns it. */
export const floatCol = <T,>(
  source: ValueSource<T, number | null | undefined>,
  opts: FloatColOpts<T> = {},
): FieldCol<T> => {
  const read = readerOf(source);
  const id = idOf(source, opts.id);
  const colGeo = widen(geo, opts.suffix ? opts.suffix.length + 1 : 0);
  return {
    id,
    header: centered(opts.header ?? humanize(id)),
    align: "right",
    width: colGeo.css,
    sortValue: read,
    geo: colGeo,
    accessor: (row) => {
      const value = read(row);
      if (value == null || Number.isNaN(value)) return "";
      return (
        <>
          {toneWrap(
            opts.tone?.(value, row),
            <FloatCell value={value} precision={opts.precision ?? 2} />,
          )}
          {opts.suffix ? (
            <span class="sui-field-suffix"> {opts.suffix}</span>
          ) : null}
        </>
      );
    },
  };
};
