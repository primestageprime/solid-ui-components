// Table field module — text (secondary text column).
// Expanding secondary text: absorbs slack between its bounds, then ellipsizes.
// Lower max than `name` (40ch vs 80ch), so when width is scarce it yields the
// space to the primary identifier. LEFT-aligned humanized header (flowing text,
// never centered()), sortable, ellipsis-clipped with the full value in a hover
// tooltip (ruled 2026-07-17: variable text ellipsizes with full-text tooltip by
// default). Composes LongTextCell from ../textCells. See
// docs/superpowers/plans/2026-07-16-semantic-props-metric.md §3a-geometry.
import { LongTextCell } from "../textCells";
import { floorGeoAtLabel, humanize, toneWrap, type FieldCol, type FieldGeo, type ToneFn } from "./shared";

/** Secondary text: expands between bounds, then ellipsis; yields to `name`. */
export const geo: FieldGeo = { minCh: 8, maxCh: 40, padPx: 16 };

export interface TextColOpts<T> {
  /** Configure-time treatment: (value, row) → Tone (ruled 2026-07-17). */
  tone?: ToneFn<T, string>;
}

/** A secondary-text column for `key`: humanized left header, sortable, clipped. */
export const textCol = <T,>(key: keyof T, opts: TextColOpts<T> = {}): FieldCol<T> => {
  const label = humanize(String(key));
  return {
  id: String(key),
  header: label,
  ellipsis: true,
  sortValue: (row) => String(row[key] ?? ""),
  geo: floorGeoAtLabel(geo, label),
  accessor: (row) => {
    const value = String(row[key] ?? "");
    // Blank, not the legacy em-dash (ruled 2026-07-18: no empty markers).
    if (value === "") return "";
    return toneWrap(
      opts.tone?.(value, row),
      <LongTextCell value={value} clampLines={1} reveal="tooltip" />,
    );
  },
  };
};
