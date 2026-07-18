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

const isFiniteNumber = (v: unknown): v is number =>
  typeof v === "number" && !Number.isNaN(v);

const mean = (values: number[]): number | null =>
  values.length === 0
    ? null
    : values.reduce((sum, v) => sum + v, 0) / values.length;

/** The mean of the row's numeric members among `keys`; null when none. */
const rowMean = <T,>(keys: (keyof T)[], row: T): number | null =>
  mean(keys.map((key): unknown => row[key]).filter(isFiniteNumber));

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
  sortValue: (row) => rowMean(keys, row),
  accessor: (row) => {
    const avg = rowMean(keys, row);
    if (avg == null) return "";
    return toneWrap(
      opts.tone?.(avg, row) ?? "accent",
      <FloatCell value={avg} precision={opts.precision ?? 2} />,
    );
  },
});
