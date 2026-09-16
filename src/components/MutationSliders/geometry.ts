// ============================================
// MutationSliders geometry — pure, headless, no SVG node, no Solid.
//
// Lowercase filename ON PURPOSE (same disposition as RateGauge/geometry.ts and
// BandRail/bands.tsx): `isEntryPath` in scripts/render-coverage.mjs matches any
// PascalCase `.tsx` under src/components/, so a `Geometry.tsx` here would
// register as a new component owing its own depth header and its own showcase.
//
// EVERY number the dial paints is decided in this file, so a whole row of
// mutations is readable as a table without a browser (geometry.test.ts prints
// one). The component does nothing but hand these strings and numbers to the
// DOM.
//
// Conventions, fixed here once so nothing downstream re-decides them:
//
//   • The canvas is one dial: `VIEW_WIDTH` × `VIEW_HEIGHT`, in the SAME px the
//     CSS gives the dial box, so the SVG overlay sits 1:1 on it and no scale
//     factor exists anywhere.
//   • The domain grows UPWARD and the screen's y grows downward. That
//     inversion happens in exactly ONE place, `yFor`.
//   • The Kobalte track is inset by `TRACK_TOP` at both ends, so a thumb at
//     `bottom: 0%` lands on `TRACK_BOTTOM` and a thumb at `bottom: 100%` lands
//     on `TRACK_TOP` — the same two numbers this file maps the domain onto.
//     MutationSliders.css declares that inset, and geometry.test.ts pins the
//     two together rather than trusting a comment.
//   • This file does NO arithmetic on the consumer's values beyond geometry.
//     It never formats (`format` is the consumer's) and it never snaps.
// ============================================
import { clamp } from "../../internal/math/clamp";
import { map } from "../../fn";

/** A value domain, `[min, max]`, mapped linearly onto the track. */
export type Domain = readonly [number, number];

/** Which way the level moved. `none` covers "unchanged" AND "removed". */
export type Direction = "up" | "down" | "none";

/**
 * One named entity on the row, in the CONSUMER'S OWN UNITS.
 *
 * `value: null` means REMOVED in the new scenario — not "fell to zero". The
 * distinction is the whole reason the field is nullable: a removal has no new
 * level to draw a thumb at, and reading it as a drop would paint a change that
 * never happened.
 */
export interface Entity {
  readonly id: string;
  readonly label: string;
  /** The level in the OLD scenario. Always present; a removal still had one. */
  readonly old: number;
  /** The level in the NEW scenario, or `null` when the entity is removed. */
  readonly value: number | null;
}

/** The translucent bar spanning old→new, in canvas units. */
export interface Box {
  readonly y: number;
  readonly height: number;
}

/** Everything one dial draws, decided. */
export interface DialGeometry {
  readonly id: string;
  readonly label: string;
  /** The old level, carried through so the table reads as one row. */
  readonly old: number;
  /** The new level, or `null` when removed. */
  readonly value: number | null;
  readonly removed: boolean;
  /** y of the fixed OLD tick. A removed entity still has one. */
  readonly oldY: number;
  /** y of the draggable NEW thumb, or `null` when removed. */
  readonly valueY: number | null;
  /** The old→new bar, or `null` when nothing moved. */
  readonly box: Box | null;
  readonly direction: Direction;
  /** `d` for the arrowhead ahead of the thumb, or `null` when nothing moved. */
  readonly arrow: string | null;
}

// ── the canvas ───────────────────────────────────────────────────────────────
// ONE size, deliberately (SUI: start with one, expand only on demand). These
// are px, and MutationSliders.css gives the dial box exactly these px.

export const VIEW_WIDTH = 28;
export const VIEW_HEIGHT = 160;
/** The centre line. Everything on the dial is symmetric about it. */
export const TRACK_X = VIEW_WIDTH / 2;
/**
 * The track's inset at BOTH ends. It is not decoration: it is the room a
 * raised arrowhead needs above the top of the domain, so an entity pushed to
 * `max` still draws its arrow inside the canvas.
 */
export const TRACK_TOP = 12;
export const TRACK_BOTTOM = VIEW_HEIGHT - TRACK_TOP;

/** Half-width of the short caps that mark the domain's two ends. */
export const CAP_HALF = 6;
/** Half-width of the fixed OLD tick. */
export const OLD_TICK_HALF = 7;
/**
 * Half-width of the old→new bar. It is the WIDEST mark on the dial, wider than
 * the thumb that rides on it, because a one-unit change is shorter than the
 * thumb is tall — drawn any narrower, the box for a small move is entirely
 * hidden under the thumb and the reader sees no change at all.
 */
export const BOX_HALF = 8;
/** Half-height of the thumb, which the arrowhead sits clear of. */
export const THUMB_HALF = 5;
/** How far the arrowhead's apex runs past the thumb. */
export const ARROW_HEIGHT = 7;
/** Half-width of the arrowhead's base. */
export const ARROW_HALF = 5;

/** `d` for the track: one vertical line with a short cap at each end. */
export const TRACK_PATH = [
  `M ${TRACK_X} ${TRACK_TOP} L ${TRACK_X} ${TRACK_BOTTOM}`,
  `M ${TRACK_X - CAP_HALF} ${TRACK_TOP} L ${TRACK_X + CAP_HALF} ${TRACK_TOP}`,
  `M ${TRACK_X - CAP_HALF} ${TRACK_BOTTOM} L ${TRACK_X + CAP_HALF} ${TRACK_BOTTOM}`,
].join(" ");

/**
 * Where a value sits on the track, in canvas y.
 *
 * `max` is at the TOP and `min` at the bottom, because a level people call
 * "higher" has to be drawn higher. A zero-width domain reads as the middle
 * rather than dividing by zero — one entity at one level is a legitimate
 * scenario, and NaN would take the whole row down with it.
 */
export const yFor = (domain: Domain, value: number): number => {
  const [min, max] = domain;
  const span = max - min;
  if (span === 0) return (TRACK_TOP + TRACK_BOTTOM) / 2;
  const fraction = (clamp(value, min, max) - min) / span;
  return TRACK_BOTTOM - fraction * (TRACK_BOTTOM - TRACK_TOP);
};

/** Which way the level moved. A removal moved nowhere — it stopped existing. */
export const directionOf = (old: number, value: number | null): Direction => {
  if (value === null || value === old) return "none";
  return value > old ? "up" : "down";
};

/**
 * The old→new bar, or `null` when there is nothing to span.
 *
 * It is the EXTENT of the pair, not a signed run from one to the other, so a
 * raise and the drop that undoes it draw the identical box — the size of the
 * change is what the bar is for, and the arrowhead carries the sign.
 */
export const boxFor = (
  domain: Domain,
  old: number,
  value: number | null,
): Box | null => {
  if (value === null || value === old) return null;
  const a = yFor(domain, old);
  const b = yFor(domain, value);
  return { y: Math.min(a, b), height: Math.abs(a - b) };
};

/**
 * The arrowhead ahead of the thumb, apex first.
 *
 * It starts a thumb's half-height clear of the value, so the triangle reads as
 * a pointer leaving the thumb rather than as part of it.
 */
export const arrowPath = (
  domain: Domain,
  value: number,
  direction: Direction,
): string | null => {
  if (direction === "none") return null;
  const sign = direction === "up" ? -1 : 1;
  const base = yFor(domain, value) + sign * THUMB_HALF;
  const apex = base + sign * ARROW_HEIGHT;
  return [
    `M ${TRACK_X} ${apex}`,
    `L ${TRACK_X - ARROW_HALF} ${base}`,
    `L ${TRACK_X + ARROW_HALF} ${base}`,
    "Z",
  ].join(" ");
};

/** Everything one dial draws, from one entity. */
export const dialGeometry = (domain: Domain, entity: Entity): DialGeometry => {
  const direction = directionOf(entity.old, entity.value);
  const value = entity.value;
  return {
    id: entity.id,
    label: entity.label,
    old: entity.old,
    value,
    removed: value === null,
    oldY: yFor(domain, entity.old),
    valueY: value === null ? null : yFor(domain, value),
    box: boxFor(domain, entity.old, value),
    direction,
    arrow: value === null ? null : arrowPath(domain, value, direction),
  };
};

/**
 * The whole row, in the order it was given. The consumer's order is the
 * reading order, so nothing here sorts.
 */
export const mutationGeometry = (
  domain: Domain,
  entities: readonly Entity[],
): readonly DialGeometry[] =>
  map((entity: Entity) => dialGeometry(domain, entity), entities);
