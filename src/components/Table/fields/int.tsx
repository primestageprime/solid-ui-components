// Table field — int (Depth 1: composes the IntCell renderer).
// A content-fit integer column: right-aligned tabular value under a CENTERED
// header, width capped at the widest realistic magnitude ("9,999,999" + cell
// chrome). Geometry lives in `geo`; the client never reaches CSS.
//
// Source may be a row key OR a derived `(row) => value` fn (ruled
// 2026-07-18) — the derived form names its `id` explicitly; accessor and
// sortValue share the one reader. `suffix` renders the unit in-cell in muted
// ink and widens the geometry. Null renders BLANK (ruled 2026-07-18).
import { IntCell } from "../numericCells";
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

// "9,999,999" (7 digits + 2 group separators = 9ch) plus cell chrome
// (16px ≈ 2ch padding per side); content-fits down to `minCh`, caps at `maxCh`.
export const geo: FieldGeo = { minCh: 4, maxCh: 9, padPx: 18, css: "calc(9ch + 18px)" };

export interface IntColOpts<T> {
  /** Configure-time treatment: (value, row) → Tone (ruled 2026-07-17). */
  tone?: ToneFn<T, number>;
  /** In-cell unit — muted ink, widens the column. */
  suffix?: string;
  /** Column id — REQUIRED when the source is a derived function. */
  id?: string;
  /** Header label (default: humanized id). */
  header?: string;
}

/** A whole-number column: CENTERED header, right-aligned value, formatted by
 *  IntCell. Width/align are baked in from `geo`. */
export const intCol = <T,>(
  source: ValueSource<T, number | null | undefined>,
  opts: IntColOpts<T> = {},
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
          {toneWrap(opts.tone?.(value, row), <IntCell value={value} />)}
          {opts.suffix ? (
            <span class="sui-field-suffix"> {opts.suffix}</span>
          ) : null}
        </>
      );
    },
  };
};
