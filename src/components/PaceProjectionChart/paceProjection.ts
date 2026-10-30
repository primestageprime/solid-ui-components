// ============================================
// paceProjection — pure geometry for PaceProjectionChart. No Solid, no DOM.
// ============================================

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
