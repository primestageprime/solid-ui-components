// Table field geometry — status (Depth 0, no component imports).
// A fixed status cell: light/dot plus a short count or label ("● 118/140").
import type { FieldGeo } from "./shared";

export const geo: FieldGeo = { minCh: 9, maxCh: 9, padPx: 16, css: "calc(9ch + 16px)" };
