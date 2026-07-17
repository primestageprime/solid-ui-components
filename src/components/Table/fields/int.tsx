// Table field — int (Depth 1: composes the IntCell renderer).
// A content-fit integer column: right-aligned tabular value under a CENTERED
// header, width capped at the widest realistic magnitude ("9,999,999" + cell
// chrome). Geometry lives in `geo`; the client never reaches CSS.
import { IntCell } from "../numericCells";
import { type FieldCol, type FieldGeo, type ToneFn, centered, humanize, toneWrap } from "./shared";

// "9,999,999" (7 digits + 2 group separators = 9ch) plus cell chrome
// (16px ≈ 2ch padding per side); content-fits down to `minCh`, caps at `maxCh`.
export const geo: FieldGeo = { minCh: 4, maxCh: 9, padPx: 18, css: "calc(9ch + 18px)" };

export interface IntColOpts<T> {
  /** Configure-time treatment: (value, row) → Tone (ruled 2026-07-17). */
  tone?: ToneFn<T, number>;
}

/** A whole-number column keyed on `key`: CENTERED header, right-aligned value,
 *  sortable, formatted by IntCell. Width/align are baked in from `geo`. */
export const intCol = <T,>(key: keyof T, opts: IntColOpts<T> = {}): FieldCol<T> => ({
  id: String(key),
  header: centered(humanize(String(key))),
  align: "right",
  width: geo.css,
  sortable: true,
  geo,
  accessor: (row) => {
    const value = row[key] as number;
    return toneWrap(opts.tone?.(value, row), <IntCell value={value} />);
  },
});
