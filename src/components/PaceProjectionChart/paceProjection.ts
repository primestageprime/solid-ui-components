// ============================================
// paceProjection — pure geometry for PaceProjectionChart. No Solid, no DOM.
// ============================================
import { sortBy } from "../../fn";

export interface PacePoint {
  x: number;
  y: number;
}

/**
 * Where a series' projection ends: the straight line from its last point to
 * (finishX, total), cut at the chart's right edge `xMax`. Null when there is
 * nothing to project — no points, already at the total, or no finish.
 */
export function projectionEnd(
  points: readonly PacePoint[],
  finishX: number | null | undefined,
  total: number,
  xMax: number,
): PacePoint | null {
  const last = points[points.length - 1];
  if (!last || last.y >= total || finishX == null || finishX <= last.x)
    return null;
  if (finishX <= xMax) return { x: finishX, y: total };
  const t = (xMax - last.x) / (finishX - last.x);
  return { x: xMax, y: last.y + t * (total - last.y) };
}

/**
 * Stack caption boxes into rows so none overlap: each box (centre x, width,
 * in px) takes the first row whose last box ends at least `gap` px before it
 * starts. Returns the row index per input box, in input order.
 */
export function stackLabelRows(
  boxes: readonly { readonly x: number; readonly width: number }[],
  gap = 4,
): number[] {
  const order = sortBy(
    (i: number) => boxes[i].x,
    Array.from({ length: boxes.length }, (_, i) => i),
  );
  const rowEnds: number[] = [];
  const rows = new Array<number>(boxes.length);
  for (const i of order) {
    const left = boxes[i].x - boxes[i].width / 2;
    let r = 0;
    while (r < rowEnds.length && rowEnds[r] + gap > left) r++;
    rowEnds[r] = boxes[i].x + boxes[i].width / 2;
    rows[i] = r;
  }
  return rows;
}
