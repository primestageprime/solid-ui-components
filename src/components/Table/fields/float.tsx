// Table field — float (Depth 1, imports FloatCell from ../numericCells).
// A right-aligned decimal column with a centered header. 16ch: the widest
// realistic value "1,234,567.89" plus cell chrome; content-fits up to the cap.
// Geometry is owned here in ch so it scales with theme font-size and zoom —
// the client never reaches CSS. See docs/superpowers/plans/
// 2026-07-16-semantic-props-metric.md §3a.
import { FloatCell } from "../numericCells";
import { centered, humanize, toneWrap, type FieldCol, type FieldGeo, type ToneFn } from "./shared";

export const geo: FieldGeo = { minCh: 6, maxCh: 12, padPx: 18, css: "calc(12ch + 18px)" };

export interface FloatColOpts<T> {
  /** Fraction digits (default 2). */
  precision?: number;
  /** Configure-time treatment: (value, row) → Tone (ruled 2026-07-17). */
  tone?: ToneFn<T, number>;
}

/** A decimal field: right-aligned values, centered header, `precision`
 *  fraction digits. Clients never see width/align — the factory owns it. */
export const floatCol = <T,>(key: keyof T, opts: FloatColOpts<T> = {}): FieldCol<T> => ({
  id: String(key),
  header: centered(humanize(String(key))),
  align: "right",
  width: geo.css,
  sortable: true,
  geo,
  accessor: (row) => {
    const value = row[key] as number;
    return toneWrap(
      opts.tone?.(value, row),
      <FloatCell value={value} precision={opts.precision ?? 2} />,
    );
  },
});
