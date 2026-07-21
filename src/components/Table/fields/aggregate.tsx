// Table field — aggregate (Depth 1: composes FloatCell).
// The GENERIC aggregate column (ruled 2026-07-20): declares the sibling
// fields it aggregates; the MATH is a configure-time pure function
// `combine(values, row)` — the generic shape is curried, the custom math is
// passed in. Members are the keys' finite-number values (null/NaN members
// skipped); `combine` returning null renders BLANK (ruled 2026-07-18).
// Derived values read as derived — accent tone by default. avgCol is the
// mean sugar over this type. First consumers: power-log-ocr (true mean),
// PowerLogCacheView per-train kW (sum of positive readings ÷ trains — the
// column DECLARES its math, so it can never again be "fixed" into a mean).
import { FloatCell } from "../numericCells";
import { geo as floatGeo } from "./float";
import { pipe, map, filter } from "../../../fn";
import { centered, floorGeoAtLabel, humanize, toneWrap, type FieldCol, type ToneFn } from "./shared";

const isFiniteNumber = (v: unknown): v is number =>
  typeof v === "number" && !Number.isNaN(v);

export interface AggregateColOpts<T> {
  /** Column id (default "aggregate"). */
  id?: string;
  /** Header label (default: humanized id). */
  header?: string;
  /** Fraction digits (default 2, matching floatCol). */
  precision?: number;
  /** Treatment override — default is the accent tone (derived value). */
  tone?: ToneFn<T, number>;
}

/** An aggregate of `keys` per row: right-aligned float at float geometry,
 *  centered header, accent-toned unless configured otherwise. The one
 *  `value` reader feeds accessor AND sortValue. */
export const aggregateCol = <T,>(
  keys: (keyof T)[],
  combine: (values: number[], row: T) => number | null,
  opts: AggregateColOpts<T> = {},
): FieldCol<T> => {
  const members = (row: T): number[] =>
    pipe(
      keys,
      map((key: keyof T): unknown => row[key]),
      filter(isFiniteNumber),
    );
  const value = (row: T): number | null => combine(members(row), row);
  const id = opts.id ?? "aggregate";
  const label = opts.header ?? humanize(id);
  const colGeo = floorGeoAtLabel(floatGeo, label);
  return {
    id,
    header: centered(label),
    align: "right",
    width: colGeo.css,
    geo: colGeo,
    sortValue: value,
    accessor: (row) => {
      const v = value(row);
      if (v == null || Number.isNaN(v)) return "";
      return toneWrap(
        opts.tone?.(v, row) ?? "accent",
        <FloatCell value={v} precision={opts.precision ?? 2} />,
      );
    },
  };
};
