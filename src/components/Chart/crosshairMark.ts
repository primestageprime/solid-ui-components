// ============================================
// crosshair — pure geometry for a hover crosshair (vertical guide + dots).
//
// A CORE per docs/adr/0010-a-mark-is-a-core-plus-one-adapter-per-context.md:
// it takes explicit pixel geometry and returns the guide segment and the dot
// list to draw. It reads no context, touches no cell, and knows no unit.
//
// Two adapters call this core:
//   - `Chart`'s `Crosshair` (Crosshair.tsx) is VALUE-addressed: it finds each
//     series' nearest point to the hovered x by searching `series.data`, so
//     a dot's own x can differ slightly from the guide's x. It supplies each
//     point's own `x`.
//   - `ScrubChart`'s `ScrubChartCrosshair` is INDEX-addressed: every line
//     shares the same hovered cell index, so every dot sits at the same x as
//     the guide. It omits `x` per point and lets it default.
// Neither fact belongs here. The core does arithmetic on whatever pixel
// space it is given; the adapter is where the addressing difference is
// absorbed.
// ============================================

/** One dot's input: a line identified by `id`, at pixel `y`. */
export interface CrosshairPointInput {
  /** Identifies this dot in the returned list — a line/series id, not a DOM
   *  id. Carried straight through to the matching `CrosshairDot`. */
  id: string;
  /** Dot's pixel y. */
  y: number;
  /** Dot's pixel x. Defaults to the guide's `x` (see `CrosshairInput.x`) —
   *  the common case for an index-addressed chart, where every line's
   *  hovered value sits at the same horizontal position. A value-addressed
   *  chart supplies its own, since a series' nearest point need not sit
   *  exactly under the hovered x. */
  x?: number;
  /** Stroke color, carried straight through to the dot. */
  stroke?: string;
  /** Extra CSS class, carried straight through to the dot. */
  class?: string;
}

/** Explicit geometry a crosshair needs. No scale, no unit, no context. */
export interface CrosshairInput {
  /** Hovered pixel x — the guide line's position, and every dot's default x. */
  x: number;
  /** One entry per line to spot at the hovered position. */
  points: CrosshairPointInput[];
  /** Plot's top edge in px — the guide's `y1`. */
  plotTop: number;
  /** Plot's bottom edge in px — the guide's `y2`. */
  plotBottom: number;
}

/** The vertical guide's two endpoints, ready for an SVG `<line>`. */
export interface CrosshairGuide {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
}

/** One dot's drawable geometry, ready for an SVG `<circle>`. */
export interface CrosshairDot {
  id: string;
  cx: number;
  cy: number;
  stroke?: string;
  class?: string;
}

/** A crosshair's drawable geometry: one guide, one dot per point. */
export interface CrosshairMark {
  guide: CrosshairGuide;
  dots: CrosshairDot[];
}

/**
 * Builds a hover crosshair's geometry from explicit pixel inputs.
 *
 * Pure: the same geometry in always produces the same mark out. The guide
 * runs the full plot height at `x`; each dot sits at its own `x` (or `x`
 * itself, when the point omits one) and its own `y`.
 */
export function buildCrosshair(input: CrosshairInput): CrosshairMark {
  const dots: CrosshairDot[] = [];
  for (const p of input.points) {
    dots.push({
      id: p.id,
      cx: p.x ?? input.x,
      cy: p.y,
      stroke: p.stroke,
      class: p.class,
    });
  }
  return {
    guide: {
      x1: input.x,
      x2: input.x,
      y1: input.plotTop,
      y2: input.plotBottom,
    },
    dots,
  };
}
