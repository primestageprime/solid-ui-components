// Table field module — `date` (Depth 1). A calendar-date column factory plus
// its geometry. Fixed width: "2026-07-15" is 10ch, +2ch chrome per side ⇒ 14ch,
// so min === max (never expands). Fixed-width fields center both header and
// values (ruled 2026-07-17), so header is centered() and align is "center".
// See docs/superpowers/plans/2026-07-16-semantic-props-metric.md §3a-geometry.
import type { FieldCol, FieldGeo } from "./shared";
import { centered, floorGeoAtLabel, humanize } from "./shared";
import { DateCell } from "../dateCells";

export const geo: FieldGeo = { minCh: 10, maxCh: 10, padPx: 18, css: "calc(10ch + 18px)" };

export const dateCol = <T,>(key: keyof T): FieldCol<T> => {
  const label = humanize(String(key));
  const colGeo = floorGeoAtLabel(geo, label);
  return {
    id: String(key),
    header: centered(label),
    align: "center",
    width: colGeo.css,
    // ISO date strings order lexically — the raw value is the sort key.
    sortValue: (row) => row[key] as string,
    geo: colGeo,
    accessor: (row) => <DateCell value={row[key] as string} />,
  };
};
