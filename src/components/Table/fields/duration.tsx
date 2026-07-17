// Table field module — `duration` (Depth 1). An elapsed-time column factory
// plus its geometry. Content-fit ≤ cap: "12h 30m 45s" is ~11ch, +cell chrome ⇒
// caps at 14ch, so min (10) < max (14). Right-aligned value, header centered per
// the fixed-width rule. The input `unit` (ms/s/m/h) is a semantic knob, not CSS.
// See docs/superpowers/plans/2026-07-16-semantic-props-metric.md §3a-geometry.
import type { FieldCol, FieldGeo } from "./shared";
import { centered, humanize } from "./shared";
import { DurationCell } from "../numericCells";

export const geo: FieldGeo = { minCh: 10, maxCh: 14, css: "14ch" };

export const durationCol = <T,>(
  key: keyof T,
  unit: "ms" | "s" | "m" | "h" = "s",
): FieldCol<T> => ({
  id: String(key),
  header: centered(humanize(String(key))),
  align: "right",
  width: geo.css,
  sortable: true,
  geo,
  accessor: (row) => <DurationCell value={row[key] as number} unit={unit} />,
});
