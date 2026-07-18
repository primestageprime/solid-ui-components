// Table field — avg (Depth 1: composes FloatCell).
// An AGGREGATE column: the mean of a configured set of numeric fields on the
// same row (ruled 2026-07-18). Derived values read as derived — the cell
// wears the accent tone by default; a configure-time tone fn overrides it.
// Null/missing members are skipped; a row with no numeric members renders
// BLANK (ruled 2026-07-18: empty markers distract from real data).
// Geometry is the float type's.
import { FloatCell } from "../numericCells";
import { geo as floatGeo } from "./float";
import { centered, toneWrap, type FieldCol, type ToneFn } from "./shared";

export interface AvgColOpts<T> {
  /** Column id (default "avg"). */
  id?: string;
  /** Header label (default "Avg"). */
  header?: string;
  /** Fraction digits (default 2, matching floatCol). */
  precision?: number;
  /** Treatment override — default is the accent tone (derived value). */
  tone?: ToneFn<T, number>;
}

/** The mean of `keys` per row: right-aligned float at float geometry,
 *  centered header, accent-toned unless configured otherwise. */
export const avgCol = <T,>(
  keys: (keyof T)[],
  opts: AvgColOpts<T> = {},
): FieldCol<T> => ({
  id: opts.id ?? "avg",
  header: centered(opts.header ?? "Avg"),
  align: "right",
  width: floatGeo.css,
  geo: floatGeo,
  accessor: (row) => {
    const values = keys
      .map((key) => row[key])
      .filter(
        (v): v is Extract<T[keyof T], number> =>
          typeof v === "number" && !Number.isNaN(v),
      );
    if (values.length === 0) return "";
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    return toneWrap(
      opts.tone?.(avg, row) ?? "accent",
      <FloatCell value={avg} precision={opts.precision ?? 2} />,
    );
  },
});
