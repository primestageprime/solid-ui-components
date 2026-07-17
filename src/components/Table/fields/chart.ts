// Table field geometry — chart (Depth 0, no component imports).
// A fixed sparkline/trend strip cell: the 80px Sparkline strip + the field-
// frame's 8px/side cell chrome = 96px = 6em. Chart cells should drop
// text-overflow entirely when field CSS classes land.
import type { FieldGeo } from "./shared";

export const geo: FieldGeo = { minCh: 12, maxCh: 12, css: "6em" };
