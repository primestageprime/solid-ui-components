// ============================================
// Fixed y-range drafting — pure, no DOM, no Solid.
//
// The inline range editor (ScrubChartYRangeEditor) shows the two ends in the
// reader's unit and emits them in the chart's DATA unit. For a money chart the
// data unit is cents and the reader types dollars; for any other chart the two
// are the same. This file owns that conversion and the one rule a range must
// obey (both ends present, min below max), so the editor stays markup only and
// a test reads the whole policy as a table.
// ============================================

import { join, map } from "../../fn";

/** A y range in data units. */
export interface YRange {
  readonly min: number;
  readonly max: number;
}

/** How the editor shows a data value. `"number"` shows it as is;
 *  `"currency-cents"` shows cents as dollars. */
export type YRangeField = "number" | "currency-cents";

const SCALE: Readonly<Record<YRangeField, number>> = {
  number: 1,
  "currency-cents": 100,
};

/** A data value in the unit the field shows. */
export const toFieldValue = (value: number, field: YRangeField): number =>
  value / SCALE[field];

/** A field value back in the data unit. Cents round to whole cents. */
export const fromFieldValue = (value: number, field: YRangeField): number =>
  field === "number" ? value : Math.round(value * SCALE[field]);

/** The outcome of a draft: a range to emit, or the reason there is none. */
export type YRangeDraftResult =
  | { readonly ok: true; readonly range: YRange }
  | { readonly ok: false; readonly error: string };

/**
 * Turn the two field values into a range in data units, or say why not.
 * Fields are in the field unit (dollars for `"currency-cents"`); a cleared
 * field is `undefined`.
 */
export const draftYRange = (
  min: number | undefined,
  max: number | undefined,
  field: YRangeField,
): YRangeDraftResult => {
  if (min === undefined || max === undefined)
    return { ok: false, error: "Both ends are needed" };
  const range = { min: fromFieldValue(min, field), max: fromFieldValue(max, field) };
  if (!(range.min < range.max))
    return { ok: false, error: "Min must be below max" };
  return { ok: true, range };
};

/** The draft policy as text — one row per case, for a test log or an agent. */
export const yRangeDraftTable = (
  rows: readonly (readonly [number | undefined, number | undefined, YRangeField])[],
): string =>
  join("\n", [
    `${"min".padStart(10)}${"max".padStart(10)}  field           result`,
    ...map(([min, max, field]) => {
      const r = draftYRange(min, max, field);
      return `${String(min ?? "—").padStart(10)}${String(max ?? "—").padStart(10)}  ${field.padEnd(16)}${
        r.ok ? `{min: ${r.range.min}, max: ${r.range.max}}` : r.error
      }`;
    }, rows),
  ]);
