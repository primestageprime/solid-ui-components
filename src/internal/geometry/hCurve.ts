// ============================================
// A cubic with HORIZONTAL tangents at both ends: both control points sit at
// their own endpoint's y, half the span apart in x. That is the whole of the
// Sankey look — a band leaves flat and arrives flat, so it blends into a
// horizontal rail instead of meeting it at an angle.
//
// Because the construction is symmetric, the same two points traversed the
// other way give the mirror-image curve — which is what lets a band's bottom
// edge be walked backwards to close the shape.
//
// Lives in `src/internal/` because it has TWO call sites and the Primitive
// rule forbids cross-Primitive component imports: `LevelsTimeline/geometry.ts`
// (which re-exports it, so its own tests and readers are unmoved) and
// `Chart/stackedArea.ts`. Pure string arithmetic — no SVG node, no Solid, no
// unit, no context.
// ============================================

/** Round to 3dp — a path string is read by humans in tests, not just parsers. */
const round3 = (n: number): number => Math.round(n * 1000) / 1000;

export const hCurve = (
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): string => {
  const mid = (x0 + x1) / 2;
  return `C ${round3(mid)} ${round3(y0)}, ${round3(mid)} ${round3(y1)}, ${round3(x1)} ${round3(y1)}`;
};
