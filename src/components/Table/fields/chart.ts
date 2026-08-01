// Table field geometry — chart (Depth 0, no component imports).
// A fixed sparkline/trend strip cell: the 80px Sparkline strip + the field-
// frame's 8px/side cell chrome = 96px = 6rem (rem, not ch/em — the strip is
// pixel content, so its width must not track the text basis). Chart cells
// should drop text-overflow entirely when field CSS classes land.
import type { FieldGeo } from "./shared";

export const geo: FieldGeo = { minCh: 13.4, maxCh: 13.4, css: "6rem" };
