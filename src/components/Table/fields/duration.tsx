// Table field module — `duration` (Depth 1). An elapsed-time column factory
// plus its geometry. Content-fit ≤ cap: day scale is the max basis — "365d 23h" is 9ch, +chrome ⇒
// caps at 14ch, so min (10) < max (14). Right-aligned value, header centered per
// the fixed-width rule. The input `unit` (ms/s/m/h) is a semantic knob, not CSS.
// See docs/superpowers/plans/2026-07-16-semantic-props-metric.md §3a-geometry.
import type { FieldCol, FieldGeo } from "./shared";
import { centered, humanize } from "./shared";
import { DurationCell } from "../numericCells";

export const geo: FieldGeo = { minCh: 5, maxCh: 9, padPx: 36, css: "calc(9ch + 36px)" };

export const durationCol = <T,>(
  key: keyof T,
  unit: "ms" | "s" | "m" | "h" = "s",
): FieldCol<T> => ({
  id: String(key),
  header: centered(humanize(String(key))),
  align: "right",
  width: geo.css,
  sortValue: (row) => row[key] as number,
  geo,
  accessor: (row) => <DurationCell value={row[key] as number} unit={unit} />,
});
