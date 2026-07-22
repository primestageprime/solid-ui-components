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
  /** Treatment override — default is the accent tone (derived value). */
  tone?: ToneFn<T, number>;
}

/** The mean of the finite members; null (→ blank) when there are none.
 *  (fn.mean returns NaN on an empty list, so the guard keeps the null.) */
const meanOrNull = (values: number[]): number | null =>
  values.length === 0 ? null : mean(values);

/** The mean of `keys` per row — aggregateCol with `meanOrNull`. Displays the
 *  RAW mean as given (ruled 2026-07-22: no display rounding). A mean is a
 *  calculation, so if you want it rounded, that is the calculation's job —
 *  use `aggregateCol` with a rounding combine (e.g. `(v) => Math.round(mean(v))`),
 *  not a display knob. */
export const avgCol = <T,>(
  keys: (keyof T)[],
  opts: AvgColOpts<T> = {},
): FieldCol<T> =>
  aggregateCol<T>(keys, meanOrNull, {
    id: opts.id ?? "avg",
    header: opts.header ?? "Avg",
    tone: opts.tone,
  });
