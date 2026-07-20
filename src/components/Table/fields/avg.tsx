// Table field — avg (Depth 1: mean sugar over aggregateCol, ruled
// 2026-07-20). The arithmetic MEAN of the configured fields — and ONLY the
// mean: an aggregate with different math (a sum, a per-train split) is an
// aggregateCol with its combine function, never a "fixed" avgCol. Null
// members are skipped; a row with no numeric members renders BLANK; accent
// tone by default (derived values read as derived).
import { mean } from "../../../fn";
import { aggregateCol } from "./aggregate";
import type { FieldCol } from "./shared";
import type { ToneFn } from "./shared";

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

/** The mean of the finite members; null (→ blank) when there are none.
 *  (fn.mean returns NaN on an empty list, so the guard keeps the null.) */
const meanOrNull = (values: number[]): number | null =>
  values.length === 0 ? null : mean(values);

/** The mean of `keys` per row — aggregateCol with `meanOrNull`. */
export const avgCol = <T,>(
  keys: (keyof T)[],
  opts: AvgColOpts<T> = {},
): FieldCol<T> =>
  aggregateCol<T>(keys, meanOrNull, {
    id: opts.id ?? "avg",
    header: opts.header ?? "Avg",
    precision: opts.precision,
    tone: opts.tone,
  });
