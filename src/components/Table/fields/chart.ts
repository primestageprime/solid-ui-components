// Table field geometry — chart (Depth 0, no component imports).
// A fixed sparkline/trend strip cell. 12em: the Sparkline strip plus cell
// chrome — 10em tripped the cell's text-overflow ellipsis (bench-measured).
// Chart cells should drop text-overflow entirely when field CSS classes land.
import type { FieldGeo } from "./shared";

export const geo: FieldGeo = { minCh: 24, maxCh: 24, css: "12em" };
