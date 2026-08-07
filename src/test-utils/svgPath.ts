// ============================================
// SVG path `d` parsing, for tests that assert on routed geometry.
//
// The edge routers in `src/internal/dag-svg` return a `d` string and nothing
// else, so a test either asserts on that string or asserts on nothing. Exact
// string equality is the wrong tool: `orthogonalAvoidingObstacles` composes its
// output from three clamped x positions and a corridor y, so a literal
// expectation pins six coordinates at once and fails on any tuning change,
// while saying nothing about the property that actually matters — does the path
// clear the obstacle. Parsing lets a test assert the property.
//
// Deliberately NOT a general SVG parser. It handles the space-separated,
// absolute, comma-optional subset these routers emit (`M`, `L`, `C`, `Q`) and
// nothing else — no relative commands, no arcs, no implicit repeats, no
// omitted separators like `M0 0L5 5`. A router that starts emitting any of
// those should extend this and its tests together, rather than have a silent
// misparse read as a geometry change.
// ============================================

import { map, filter, join, sum } from "../fn";

export interface PathPoint {
  x: number;
  y: number;
}

/** One command, with its operator and its raw coordinate list. `coords` is
 *  flat — a cubic carries six numbers, not three points. */
export interface PathCommand {
  op: "M" | "L" | "C" | "Q";
  coords: number[];
}

const OPS = "MLCQ";

/**
 * Parse a `d` string into its commands.
 *
 * Throws on anything outside the supported subset. Throwing rather than
 * skipping is the point: a test whose parser silently dropped an unrecognised
 * command would assert on a path shorter than the one the router drew, and
 * pass.
 */
export function parsePath(d: string): PathCommand[] {
  const tokens = filter(
    (t: string) => t.length > 0,
    d.replace(/,/g, " ").trim().split(/\s+/),
  );
  const commands: PathCommand[] = [];
  let at = 0;
  while (at < tokens.length) {
    const op = tokens[at];
    if (op.length !== 1 || OPS.indexOf(op) < 0) {
      throw new Error(
        `parsePath: unsupported or misplaced token "${op}" at position ${at} in "${d}"`,
      );
    }
    const arity = op === "C" ? 6 : op === "Q" ? 4 : 2;
    const coords = map(
      (t: string) => {
        const n = Number(t);
        if (!Number.isFinite(n)) {
          throw new Error(`parsePath: non-numeric coordinate "${t}" in "${d}"`);
        }
        return n;
      },
      tokens.slice(at + 1, at + 1 + arity),
    );
    if (coords.length !== arity) {
      throw new Error(
        `parsePath: "${op}" wants ${arity} coordinates, got ${coords.length} in "${d}"`,
      );
    }
    commands.push({ op: op as PathCommand["op"], coords });
    at += 1 + arity;
  }
  return commands;
}

/**
 * The ON-CURVE points, in order: every command's endpoint. A cubic contributes
 * its landing point only — its two control points are off-curve and are NOT
 * positions the stroke passes through, so including them would let a test
 * "prove" a bezier clears an obstacle it actually cuts straight through.
 * Reach for `controlPoints` when the control net is the subject.
 */
export function pathVertices(d: string): PathPoint[] {
  return map(
    (c: PathCommand) => ({
      x: c.coords[c.coords.length - 2],
      y: c.coords[c.coords.length - 1],
    }),
    parsePath(d),
  );
}

/** The OFF-curve control points of every cubic and quadratic, in order. */
export function controlPoints(d: string): PathPoint[] {
  const out: PathPoint[] = [];
  for (const c of parsePath(d)) {
    if (c.op === "C") {
      out.push({ x: c.coords[0], y: c.coords[1] });
      out.push({ x: c.coords[2], y: c.coords[3] });
    } else if (c.op === "Q") {
      out.push({ x: c.coords[0], y: c.coords[1] });
    }
  }
  return out;
}

/** The operator sequence, e.g. `"MLL"` — enough to assert a path's SHAPE
 *  (straight line vs. Z vs. rounded step) without pinning its coordinates. */
export function pathShape(d: string): string {
  return join(
    "",
    map((c: PathCommand) => c.op, parsePath(d)),
  );
}

/**
 * Sample `count` evenly-spaced points along the polyline through `points`,
 * by arc length. Used to ask whether a route passes through a rect without
 * re-implementing the router's own segment/rect intersection test — a check
 * that shared an implementation with its subject would agree with a bug.
 *
 * Polyline only. A cubic's samples would need de Casteljau, and no test needs
 * that yet; `bezierAvoidingObstacles` is asserted through its control net.
 */
export function samplePolyline(
  points: PathPoint[],
  count: number,
): PathPoint[] {
  if (points.length < 2 || count < 2) return points.slice();
  const spans = map(
    (i: number) =>
      Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y),
    Array.from({ length: points.length - 1 }, (_, i) => i),
  );
  const total = sum(spans);
  if (total === 0) return points.slice();
  return map(
    (k: number) => {
      let remaining = (total * k) / (count - 1);
      for (let i = 0; i < spans.length; i += 1) {
        if (remaining <= spans[i] || i === spans.length - 1) {
          const t = spans[i] === 0 ? 0 : remaining / spans[i];
          return {
            x: points[i].x + (points[i + 1].x - points[i].x) * t,
            y: points[i].y + (points[i + 1].y - points[i].y) * t,
          };
        }
        remaining -= spans[i];
      }
      return points[points.length - 1];
    },
    Array.from({ length: count }, (_, k) => k),
  );
}
