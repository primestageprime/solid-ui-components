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
// THE DIAL, IN ONE PARAGRAPH. The track runs the whole shared `domain`, so
// every dial in a row is on one scale and two people are comparable at a
// glance. On it sits the entity's ROLE BAND — the shaded box, spanning that
// role's min→max — and the two amounts live INSIDE that band: a muted PRIOR
// arrow at what they were paid, an accent FUTURE arrow at what they will be,
// both arrowheads pointing at the track from opposite sides so the eye pairs
// them. Between the two, a wider line coloured by direction.
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
//   • THE BAND IS THE CLAMP. Both amounts are pulled onto the role's band
//     before they are placed, and the clamped figures are what the dial draws
//     AND what it announces. The raw figures are carried through beside them
//     so nothing is silently lost — a value outside its band is usually a fact
//     about the data, not a rounding error, and the caller may want to say so.
//   • The band itself is clamped into the domain, so a role whose ceiling is
//     off the top of the shared scale draws a box that stops at the top rather
//     than one that runs off the dial.
//   • This file does NO arithmetic on the consumer's values beyond geometry
//     and that clamp. It never formats (`format` is the consumer's).
// ============================================
import { clamp } from "../../internal/math/clamp";
import { map } from "../../fn";

/** A value domain, `[min, max]`, mapped linearly onto the track. */
export type Domain = readonly [number, number];

/**
 * What the line between the two arrows says. `none` covers "did not move",
 * "moved but both ends clamp to the same place", AND "removed".
 */
export type ChangeTone = "raise" | "cut" | "none";

/** Which arrow: the read-only PRIOR amount, or the draggable FUTURE one. */
export type ArrowSide = "prior" | "future";

/**
 * One named entity on the row, in the CONSUMER'S OWN UNITS.
 *
 * `value: null` means REMOVED in the new scenario — not "fell to zero". The
 * distinction is the whole reason the field is nullable: a removal has no
 * future amount to draw an arrow at, and reading it as a cut would paint a
 * change that never happened.
 */
export interface Entity {
  readonly id: string;
  readonly label: string;
  /** The amount in the OLD scenario. Always present; a removal still had one. */
  readonly old: number;
  /** The amount in the NEW scenario, or `null` when the entity is removed. */
  readonly value: number | null;
  /**
   * The entity's ROLE BAND — the min and max its role permits, in the same
   * units. The shaded box on the dial is this, and both amounts are clamped
   * into it.
   *
   * OPTIONAL, and it defaults to the whole shared `domain`. A caller who has
   * no notion of a role band gets exactly the behaviour they had before bands
   * existed: one box covering the track and no clamping beyond the domain's
   * own. That is what makes this an additive field rather than a breaking one.
   */
  readonly range?: Domain;
}

/** A rectangle on the track, in canvas units. */
export interface Box {
  readonly y: number;
  readonly height: number;
}

/** Everything one dial draws, decided. */
export interface DialGeometry {
  readonly id: string;
  readonly label: string;
  /** The role band, resolved and clamped into the domain. */
  readonly range: Domain;
  /** The prior amount as the caller gave it. */
  readonly old: number;
  /** The prior amount, pulled onto the band. This is what is drawn and said. */
  readonly clampedOld: number;
  /** The future amount as the caller gave it, or `null` when removed. */
  readonly value: number | null;
  /** The future amount, pulled onto the band, or `null` when removed. */
  readonly clampedValue: number | null;
  readonly removed: boolean;
  /** y of the PRIOR arrow. A removed entity still has one. */
  readonly oldY: number;
  /** y of the FUTURE arrow, or `null` when removed. */
  readonly valueY: number | null;
  /** The shaded role band. Always drawn — a removed entity still had a role. */
  readonly band: Box;
  /** The coloured line between the two arrows, or `null` when nothing moved. */
  readonly changeLine: Box | null;
  readonly changeTone: ChangeTone;
  /** `d` for the muted prior arrowhead. */
  readonly priorArrow: string;
  /** `d` for the accent future arrowhead, or `null` when removed. */
  readonly futureArrow: string | null;
}

// ── the canvas ───────────────────────────────────────────────────────────────
// ONE size, deliberately (SUI: start with one, expand only on demand). These
// are px, and MutationSliders.css gives the dial box exactly these px.

export const VIEW_WIDTH = 34;
export const VIEW_HEIGHT = 160;
/** The centre line. Everything on the dial is symmetric about it. */
export const TRACK_X = VIEW_WIDTH / 2;
/**
 * The track's inset at BOTH ends. It is the room an arrowhead needs beside the
 * domain's own extremes, so an amount sitting on `max` still draws its arrow
 * inside the canvas.
 */
export const TRACK_TOP = 12;
export const TRACK_BOTTOM = VIEW_HEIGHT - TRACK_TOP;

/** Half-width of the short caps that mark the shared domain's two ends. */
export const CAP_HALF = 6;
/** Half-width of the shaded role band — the widest mark on the dial. */
export const BAND_HALF = 5;
/**
 * Half-width of the coloured change line. Wider than the track line it covers,
 * narrower than the band it sits inside, so the three read as three marks.
 */
export const CHANGE_HALF = 3;
/** How far an arrow's apex stops short of the centre line. */
export const ARROW_GAP = 4;
/** How far back from its apex an arrow runs. */
export const ARROW_LENGTH = 7;
/** Half-height of an arrowhead's base. */
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
 * `max` is at the TOP and `min` at the bottom, because an amount people call
 * "higher" has to be drawn higher. A zero-width domain reads as the middle
 * rather than dividing by zero — one entity at one amount is a legitimate
 * scenario, and NaN would take the whole row down with it.
 */
export const yFor = (domain: Domain, value: number): number => {
  const [min, max] = domain;
  const span = max - min;
  if (span === 0) return (TRACK_TOP + TRACK_BOTTOM) / 2;
  const fraction = (clamp(value, min, max) - min) / span;
  return TRACK_BOTTOM - fraction * (TRACK_BOTTOM - TRACK_TOP);
};

/**
 * The entity's role band, resolved: its own if it has one, otherwise the whole
 * shared domain — then ordered, and clamped into the domain so no box can draw
 * off the track.
 */
export const rangeOf = (domain: Domain, entity: Entity): Domain => {
  if (!entity.range) return domain;
  const [a, b] = entity.range;
  const [low, high] = a <= b ? [a, b] : [b, a];
  return [
    clamp(low, domain[0], domain[1]),
    clamp(high, domain[0], domain[1]),
  ] as const;
};

/** Pull an amount onto the role's band. */
export const clampToRange = (range: Domain, value: number): number =>
  clamp(value, range[0], range[1]);

/** The shaded box for a role band: its min→max on the track. */
export const bandFor = (domain: Domain, range: Domain): Box => {
  const top = yFor(domain, range[1]);
  return { y: top, height: yFor(domain, range[0]) - top };
};

/**
 * Which way the amount moved, AFTER both ends are clamped onto the band.
 *
 * Clamped, because two amounts that both sit past the same ceiling have not
 * moved anywhere the dial can draw, and colouring that as a raise would put a
 * green line of zero length on the track.
 */
export const toneOf = (
  clampedOld: number,
  clampedValue: number | null,
): ChangeTone => {
  if (clampedValue === null || clampedValue === clampedOld) return "none";
  return clampedValue > clampedOld ? "raise" : "cut";
};

/**
 * The coloured line between the two arrows, or `null` when there is nothing to
 * span. It is the EXTENT of the pair, not a signed run — the TONE carries the
 * sign, and the two arrows carry it again without using hue.
 */
export const changeLineFor = (
  domain: Domain,
  clampedOld: number,
  clampedValue: number | null,
): Box | null => {
  if (clampedValue === null || clampedValue === clampedOld) return null;
  const a = yFor(domain, clampedOld);
  const b = yFor(domain, clampedValue);
  return { y: Math.min(a, b), height: Math.abs(a - b) };
};

/**
 * One arrowhead, apex first.
 *
 * Both sides are the SAME triangle mirrored about the centre line, and both
 * apexes point AT the track — so a prior and a future arrow at the same amount
 * meet nose to nose, and the pair reads as one reading rather than two marks
 * that happen to be level.
 */
export const arrowPath = (
  domain: Domain,
  value: number,
  side: ArrowSide,
): string => {
  const y = yFor(domain, value);
  const direction = side === "prior" ? -1 : 1;
  const apexX = TRACK_X + direction * ARROW_GAP;
  const baseX = apexX + direction * ARROW_LENGTH;
  return [
    `M ${apexX} ${y}`,
    `L ${baseX} ${y - ARROW_HALF}`,
    `L ${baseX} ${y + ARROW_HALF}`,
    "Z",
  ].join(" ");
};

/** Everything one dial draws, from one entity. */
export const dialGeometry = (domain: Domain, entity: Entity): DialGeometry => {
  const range = rangeOf(domain, entity);
  const clampedOld = clampToRange(range, entity.old);
  const clampedValue =
    entity.value === null ? null : clampToRange(range, entity.value);
  return {
    id: entity.id,
    label: entity.label,
    range,
    old: entity.old,
    clampedOld,
    value: entity.value,
    clampedValue,
    removed: entity.value === null,
    oldY: yFor(domain, clampedOld),
    valueY: clampedValue === null ? null : yFor(domain, clampedValue),
    band: bandFor(domain, range),
    changeLine: changeLineFor(domain, clampedOld, clampedValue),
    changeTone: toneOf(clampedOld, clampedValue),
    priorArrow: arrowPath(domain, clampedOld, "prior"),
    futureArrow:
      clampedValue === null ? null : arrowPath(domain, clampedValue, "future"),
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
