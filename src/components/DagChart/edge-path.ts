// ============================================
// Edge geometry — pure math (no Solid/DOM/reactivity).
//
// Everything about turning a layout-produced polyline into a drawable SVG
// edge lives here. The DagChart component owns reactivity and rendering; this
// module owns the geometry so it stays deterministic and unit-testable in
// isolation.
//
// The pipeline a single edge flows through:
//
//  1. clipPolyline  — trim the raw polyline's endpoints back to the source /
//     target node BOUNDARIES (via clipToRectBoundary) so the stroke starts and
//     stops at the box edges instead of the box centers. A degenerate-guard
//     falls back to the un-clipped points when clipping would collapse a short
//     2-point edge to zero length (which would leave the arrowhead with no
//     direction and the midpoint stranded inside the target node).
//  2. buildEdgePath — emit the SVG path `d` string, quadratic-smoothed through
//     interior waypoints, straight for the simple 2-point case.
//  3. polylineMidpoint — the arc-length midpoint, used to anchor edge labels
//     and the delete badge in the free space between nodes.
//
// All functions here are PURE: same input → same output, no mutation of the
// caller's arrays (points are always copied), no side effects.
// ============================================

/** Axis-aligned box centered at (x, y) with the given extent. */
export type Rect = { x: number; y: number; width: number; height: number };

/** A 2D point in layout coordinates. */
export type Point = { x: number; y: number };

/**
 * Find where the line from `from` toward `to` exits `rect` (centered at `from`).
 * Returns the intersection point on the rectangle boundary.
 */
export function clipToRectBoundary(from: Point, to: Point, rect: Rect): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 0 && dy === 0) return from;

  const halfW = rect.width / 2;
  const halfH = rect.height / 2;

  const scaleX = dx !== 0 ? halfW / Math.abs(dx) : Infinity;
  const scaleY = dy !== 0 ? halfH / Math.abs(dy) : Infinity;
  const scale = Math.min(scaleX, scaleY);

  return { x: from.x + dx * scale, y: from.y + dy * scale };
}

/**
 * Clip the endpoints of a polyline to the source/target node boundaries.
 * Returns the clipped points (a new array). If clipping would make the
 * polyline degenerate (zero-length), falls back to the un-clipped input.
 */
export function clipPolyline(
  points: Point[],
  sourceRect: Rect | undefined,
  targetRect: Rect | undefined,
): Point[] {
  if (points.length < 2) return points.map((p) => ({ ...p }));
  const pts = points.map((p) => ({ ...p }));

  if (sourceRect) {
    const center = { x: sourceRect.x, y: sourceRect.y };
    pts[0] = clipToRectBoundary(center, pts[1], sourceRect);
  }
  if (targetRect) {
    const center = { x: targetRect.x, y: targetRect.y };
    pts[pts.length - 1] = clipToRectBoundary(
      center,
      pts[pts.length - 2],
      targetRect,
    );
  }

  // Degenerate-polyline guard: if the clipped start and end coincide (or
  // nearly so) for a 2-point edge, fall back to un-clipped points so the
  // arrowhead has somewhere to point and the midpoint doesn't collapse.
  const start = pts[0];
  const end = pts[pts.length - 1];
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (pts.length === 2 && dx * dx + dy * dy < 1) {
    return points.map((p) => ({ ...p }));
  }
  return pts;
}

/** Convert a (clipped) polyline into a smooth SVG path. */
export function buildEdgePath(points: Point[]): string {
  if (points.length < 2) return "";
  const start = points[0];
  const end = points[points.length - 1];

  if (points.length === 2) {
    return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
  }

  let d = `M ${start.x} ${start.y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const ctrl = points[i];
    const next = points[i + 1];
    const mx = (ctrl.x + next.x) / 2;
    const my = (ctrl.y + next.y) / 2;
    d += ` Q ${ctrl.x} ${ctrl.y} ${mx} ${my}`;
  }
  d += ` L ${end.x} ${end.y}`;
  return d;
}

/** Midpoint along a polyline by arc length — used for label/badge placement. */
export function polylineMidpoint(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return { ...points[0] };
  let total = 0;
  const segLens: number[] = [];
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    const l = Math.sqrt(dx * dx + dy * dy);
    segLens.push(l);
    total += l;
  }
  if (total === 0) return { ...points[0] };
  const half = total / 2;
  let acc = 0;
  for (let i = 0; i < segLens.length; i++) {
    if (acc + segLens[i] >= half) {
      const t = (half - acc) / segLens[i];
      const a = points[i];
      const b = points[i + 1];
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    acc += segLens[i];
  }
  return { ...points[points.length - 1] };
}
