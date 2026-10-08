// ============================================
// signedArea — pure geometry for SignedAreaChart (ADR 0010: the maths is a
// plain function that prints as a table, so it is tested without a DOM).
//
// A running total filled against zero needs one colour per sign. The two
// signs must meet AT the zero crossing, not at the next data point (that
// draws a vertical jump), so a vertex is inserted where a segment crosses
// zero. The same trick splits actual from outlook: a vertex is inserted where
// a segment crosses `now`, so the solid part ends exactly at NOW.
// ============================================
import { filter, flatMap, map } from "../../fn";

export interface Vertex {
  readonly x: number;
  readonly y: number;
}

export interface SignedAreaParts {
  /** Positive side up to `now`, clamped to zero below. */
  readonly pastAbove: readonly Vertex[];
  readonly pastBelow: readonly Vertex[];
  /** Positive side from `now` on. */
  readonly futureAbove: readonly Vertex[];
  readonly futureBelow: readonly Vertex[];
  /** The total's own line: up to `now`, and from `now` on (they share the NOW vertex). */
  readonly actual: readonly Vertex[];
  readonly outlook: readonly Vertex[];
}

const lerp = (a: Vertex, b: Vertex, t: number): Vertex => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

/** Where along a→b (0..1, exclusive) the segment hits y = 0; none if it doesn't strictly cross. */
const zeroAt = (a: Vertex, b: Vertex): readonly number[] =>
  a.y * b.y < 0 ? [a.y / (a.y - b.y)] : [];

/** Where along a→b the segment passes x = now; none unless strictly inside. */
const nowAt = (a: Vertex, b: Vertex, now: number): readonly number[] =>
  a.x < now && now < b.x ? [(now - a.x) / (b.x - a.x)] : [];

/** The vertices a segment contributes AFTER its start: any inserts in order, then its end. */
const segmentTail = (a: Vertex, b: Vertex, now: number): readonly Vertex[] => {
  const [z] = zeroAt(a, b);
  const [n] = nowAt(a, b, now);
  // A crossing is exactly zero; do not carry float noise into the fill.
  const crossing = (t: number): Vertex => ({ x: lerp(a, b, t).x, y: 0 });
  const mark = (t: number): Vertex => lerp(a, b, t);
  if (z !== undefined && n !== undefined) {
    return z <= n ? [crossing(z), mark(n), b] : [mark(n), crossing(z), b];
  }
  if (z !== undefined) return [crossing(z), b];
  if (n !== undefined) return [mark(n), b];
  return [b];
};

/** The data with a vertex added at every zero crossing and at `now`. */
export const traceSigned = (
  points: readonly Vertex[],
  now: number,
): readonly Vertex[] =>
  points.length === 0
    ? []
    : [
        points[0],
        ...flatMap(
          (b: Vertex, k: number) => segmentTail(points[k], b, now),
          points.slice(1),
        ),
      ];

/** One side of zero: values on the other side are flattened onto the baseline. */
const side = (sign: 1 | -1, vs: readonly Vertex[]): readonly Vertex[] =>
  map(
    (v: Vertex): Vertex => ({
      x: v.x,
      y: sign > 0 ? Math.max(0, v.y) : Math.min(0, v.y),
    }),
    vs,
  );

export const signedAreaParts = (
  points: readonly Vertex[],
  now: number,
): SignedAreaParts => {
  const traced = traceSigned(points, now);
  const past = filter((v: Vertex) => v.x <= now, traced);
  const future = filter((v: Vertex) => v.x >= now, traced);
  return {
    pastAbove: side(1, past),
    pastBelow: side(-1, past),
    futureAbove: side(1, future),
    futureBelow: side(-1, future),
    actual: past,
    outlook: future,
  };
};

/** A y extent that holds every value and zero. */
export const signedExtent = (
  points: readonly Vertex[],
): readonly [number, number] => {
  const ys = map((v: Vertex) => v.y, points);
  const lo = Math.min(0, ...ys);
  const hi = Math.max(0, ...ys);
  return hi === lo ? [lo, lo + 1] : [lo, hi];
};
