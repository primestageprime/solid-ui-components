// Table field — float (Depth 1). A right-aligned decimal column with a centered
// header. 12ch: the widest realistic value "1,234,567.89" plus cell chrome;
// content-fits up to the cap. Geometry is owned here in ch so it scales with
// theme font-size and zoom — the client never reaches CSS. See
// docs/superpowers/plans/2026-07-16-semantic-props-metric.md §3a.
//
// DISPLAY AS GIVEN (ruled 2026-07-22): this column NEVER mutates the value.
// It groups thousands (pure presentation, no magnitude/precision change) and
// renders exactly the number it is handed — it does NOT round. There is
// deliberately no `precision` prop: rounding is a DATA decision, not a display
// one, and belongs at the storage/query layer (or the calculation function
// deriving the value) so that EVERY display of the same value agrees. If a
// float shows too many digits, fix it where the number is produced, not here —
// a table that rounds hides storage imprecision and lets two views of the same
// figure disagree.
//
// Source may be a row key OR a derived `(row) => value` fn (ruled
// 2026-07-18) — the derived form names its `id` explicitly; accessor and
// sortValue share the one reader. `suffix` renders the unit in-cell ("%",
// "ppm", "kW") in muted ink and widens the geometry by its glyphs. Null
// renders BLANK (ruled 2026-07-18: empty value → empty cell, always).
import {
  centered,
  humanize,
  floorGeoAtLabel,
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

// Group thousands, preserve the value's OWN fraction digits (max 20 ≈ never
// rounds real data) — grouping doesn't change the number, only its rendering.
// Shared with aggregateCol so every numeric field displays-as-given identically.
export const asGiven = (value: number): string =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 20 }).format(value);

export interface FloatColOpts<T> {
  /** Configure-time treatment: (value, row) → Tone (ruled 2026-07-17). */
  tone?: ToneFn<T, number>;
  /** In-cell unit ("%", "ppm", "kW") — muted ink, widens the column. */
  suffix?: string;
  /** Column id — REQUIRED when the source is a derived function. */
  id?: string;
  /** Header label (default: humanized id). */
  header?: string;
}

/** A decimal field: right-aligned values, centered header. Displays the value
 *  AS GIVEN (grouped, never rounded — see module note). Clients never see
 *  width/align — the factory owns it. */
export const floatCol = <T,>(
  source: ValueSource<T, number | null | undefined>,
  opts: FloatColOpts<T> = {},
): FieldCol<T> => {
  const read = readerOf(source);
  const id = idOf(source, opts.id);
  const label = opts.header ?? humanize(id);
  const colGeo = floorGeoAtLabel(
    widen(geo, opts.suffix ? opts.suffix.length + 1 : 0),
    label,
  );
  return {
    id,
    header: centered(label),
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
            <span class="cell-float">{asGiven(value)}</span>,
          )}
          {opts.suffix ? (
            <span class="sui-field-suffix"> {opts.suffix}</span>
          ) : null}
        </>
      );
    },
  };
};
