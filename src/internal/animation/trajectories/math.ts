// ─── math helpers ───────────────────────────────────────────────────────────
//
// Scalar + geometry interpolation helpers used throughout the
// trajectory math.

import type { Point, Rect } from "./primitives";

export const lerp = (a: number, b: number, t: number): number =>
  a + (b - a) * t;
export const ease = (t: number): number => 1 - (1 - t) ** 3;
export const windowProgress = (
  t: number,
  start: number,
  end: number,
): number => {
  if (t <= start) return 0;
  if (t >= end) return 1;
  return (t - start) / (end - start);
};
export const lerpRect = (a: Rect, b: Rect, t: number): Rect => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
  width: lerp(a.width, b.width, t),
  height: lerp(a.height, b.height, t),
});
export const lerpPoint = (a: Point, b: Point, t: number): Point => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
});
