// Table field module — `money` (Depth 1). A currency-column factory plus its
// geometry. PrimeStage stores money as integer cents in `*Cents` columns, so
// the accessor divides by 100 before formatting; `humanize` strips the trailing
// " Cents" suffix so "amountCents" → "Amount" (storage unit, not a label).
// Content-fits up to a cap: "$10,000,000,000.00" is 18ch, +2ch chrome per side
// ⇒ 22ch. MoneyCell caps its own width at the $10B default magnitude (see its
// `maxValue` mechanic in ../numericCells), which this field type generalizes.
// Header centered per the fixed-width rule; values keep their right alignment.
// See docs/superpowers/plans/2026-07-16-semantic-props-metric.md §3a-geometry.
import type { FieldCol, FieldGeo } from "./shared";
import { centered, humanize } from "./shared";
import { MoneyCell } from "../numericCells";

export const geo: FieldGeo = { minCh: 8, maxCh: 20, css: "20ch" };

export const moneyCol = <T,>(key: keyof T): FieldCol<T> => ({
  id: String(key),
  header: centered(humanize(String(key))),
  align: "right",
  width: geo.css,
  sortable: true,
  geo,
  accessor: (row) => <MoneyCell value={(row[key] as number) / 100} />,
});
