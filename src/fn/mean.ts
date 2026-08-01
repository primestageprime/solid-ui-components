// fn — mean (Depth 0, pure). Arithmetic mean of a numeric array. Empty input is
// `NaN` (0 / 0) by design — callers that need a null/blank for "no data" guard
// on `.length` before calling (e.g. Table/fields/avg).
import { sum } from "./sum";

export function mean(values: readonly number[]): number {
  return sum(values) / values.length;
}
