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
// every dial in a row is on one scale and two entities are comparable at a
// glance. On it sits the entity's ALLOWED RANGE — the shaded box, spanning
// that entity's min→max — and the two amounts live INSIDE it: a muted PRIOR
// arrow at where it was, an accent FUTURE arrow at where it will be,
// both arrowheads pointing at the track from opposite sides so the eye pairs
// them. Between the two, a wider line coloured by direction.
//
// Conventions, fixed here once so nothing downstream re-decides them:
//
//   • The canvas is one dial: `VIEW_WIDTH` × its HEIGHT, in the SAME px the
//     CSS gives the dial box, so the SVG overlay sits 1:1 on it and no scale
//     factor exists anywhere. `VIEW_HEIGHT` is the default, used when nothing
//     imposes one; every y function takes an optional `height` so a dial can
//     FILL a taller container without the arrows, the labels or the readouts
//     scaling with it. That is the whole reason the height is a parameter
//     rather than a `preserveAspectRatio` stretch: stretching the viewBox
//     would magnify the 11px figures along with the track.
//   • The domain grows UPWARD and the screen's y grows downward. That
//     inversion happens in exactly ONE place, `yFor`.
//   • The Kobalte track is inset by `TRACK_TOP` at both ends, so a thumb at
//     `bottom: 0%` lands on `TRACK_BOTTOM` and a thumb at `bottom: 100%` lands
//     on `TRACK_TOP` — the same two numbers this file maps the domain onto.
//     MutationSliders.css declares that inset, and geometry.test.ts pins the
//     two together rather than trusting a comment.
//   • THE RANGE IS THE CLAMP. Both amounts are pulled onto the allowed range
//     before they are placed, and the clamped figures are what the dial draws
//     AND what it announces. The raw figures are carried through beside them
//     so nothing is silently lost — a value outside its band is usually a fact
//     about the data, not a rounding error, and the caller may want to say so.
//   • The range itself is clamped into the domain, so an entity whose ceiling is
//     off the top of the shared scale draws a box that stops at the top rather
//     than one that runs off the dial.
//   • This file does NO arithmetic on the consumer's values beyond geometry
//     and that clamp. It never formats (`format` is the consumer's).
// ============================================
import { clamp } from "../../internal/math/clamp";
import { filter, find, map } from "../../fn";

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
  /**
   * The amount in the OLD scenario, or `null` for someone who was not in it
   * at all — a NEW entity. A removal still has one; an arrival does not.
   *
   * `null` here is not zero and not "unknown": it means there is no prior
   * amount to point at, so the dial draws no prior arrow and no change line,
   * and the readout says the consumer's `labels.new` rather than inventing a
   * figure that was never true.
   */
  readonly old: number | null;
  /** The amount in the NEW scenario, or `null` when the entity is removed. */
  readonly value: number | null;
  /**
   * The entity's ALLOWED RANGE — the min and max it is permitted, in the same
   * units. The shaded box on the dial is this, and both amounts are clamped
   * into it.
   *
   * REQUIRED, as of phase 3 (2026-09-16). It shipped optional, defaulting to
   * the whole shared domain, so that it could be added without breaking a
   * consumer that had never heard of bands; both consumers now pass it on
   * every entity, so the fallback is gone rather than left alive forever.
   * A range is the thing this dial is FOR — an entity without one was always
   * a caller who had not finished thinking, not a case worth supporting.
   */
  readonly range: Domain;
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
  /** The allowed range, resolved and clamped into the domain. */
  readonly range: Domain;
  /** The prior amount as the caller gave it, or `null` for a new entity. */
  readonly old: number | null;
  /**
   * The prior amount, pulled onto the range, or `null` for a new entity. This is
   * what is drawn and said.
   */
  readonly clampedOld: number | null;
  /** Whether this entity had no prior amount at all. */
  readonly isNew: boolean;
  /** The future amount as the caller gave it, or `null` when removed. */
  readonly value: number | null;
  /** The future amount, pulled onto the range, or `null` when removed. */
  readonly clampedValue: number | null;
  readonly removed: boolean;
  /** y of the PRIOR arrow, or `null` for a new entity. A removal still has one. */
  readonly oldY: number | null;
  /** y of the FUTURE arrow, or `null` when removed. */
  readonly valueY: number | null;
  /** The shaded allowed range. Always drawn — a removed entity still had one. */
  readonly band: Box;
  /** The coloured line between the two arrows, or `null` when nothing moved. */
  readonly changeLine: Box | null;
  /** The SIGNED change, or `null` when there is no change to name. */
  readonly delta: number | null;
  /** y of the delta label — the change line's midpoint. `null` with no delta. */
  readonly deltaY: number | null;
  readonly changeTone: ChangeTone;
  /** `d` for the muted prior arrowhead, or `null` for a new entity. */
  readonly priorArrow: string | null;
  /** `d` for the accent future arrowhead, or `null` when removed. */
  readonly futureArrow: string | null;
}

// ── the canvas ───────────────────────────────────────────────────────────────
// ONE size, deliberately (SUI: start with one, expand only on demand). These
// are px, and MutationSliders.css gives the dial box exactly these px.

/**
 * The canvas is WIDER than the track it draws, because the signed delta label
 * lives on it, to the right of the change line. The track therefore sits
 * left-of-centre rather than in the middle: the dial's balance point is the
 * track PLUS its label, which is what the reader's eye takes in as one unit.
 */
export const VIEW_WIDTH = 88;
/**
 * Tall, and deliberately so. It was 160 when the domain was ten integer
 * levels; a wide scale puts several ranges on one track and Peter's note of
 * 2026-09-16 was that "the levels are very close". Height is the only thing
 * that separates two arrows a thousandth of the span apart.
 */
export const VIEW_HEIGHT = 260;
/**
 * The centre line of the track, and of the canvas — the two are the same
 * (Peter, 2026-09-16: the name, the dial and the amount should sit on ONE
 * vertical axis).
 *
 * It used to sit left of centre so the delta label had the canvas's right
 * half to itself. That put the track off the column's axis, because the
 * column centres on the dial's BOX: the name and the readout centred at 44
 * while the track stood at 22, and the eye reads the track as the thing the
 * column is about.
 *
 * Centring it costs nothing here. The label now starts at `DELTA_X` and runs
 * PAST the canvas's right edge — the overlay is `overflow: visible` — into
 * the next column's left margin, which is empty precisely BECAUSE the canvas
 * is symmetric: the left half needs only an arrowhead's width and the right
 * half needs a figure. Widening the canvas to fit the label inside it would
 * have added ~32px of blank space to every dial and cost a column of paging
 * at any given width.
 */
export const TRACK_X = VIEW_WIDTH / 2;
/**
 * The track's inset at BOTH ends. It is the room an arrowhead needs beside the
 * domain's own extremes, so an amount sitting on `max` still draws its arrow
 * inside the canvas.
 */
export const TRACK_TOP = 12;
export const TRACK_BOTTOM = VIEW_HEIGHT - TRACK_TOP;

/**
 * The shortest dial worth drawing, in px.
 *
 * MEASURED, not chosen: below roughly this height the two arrowheads for a
 * small change land within a few px of each other and their 11px delta labels
 * overlap. The band, the track and the arrows survive much shorter — it is the
 * FIGURES that go first, and a dial whose numbers cannot be read has lost the
 * thing it exists to show. A consumer who gives the row less height than this
 * gets a dial that stops shrinking and overflows, which is visible and
 * fixable, rather than one that silently becomes illegible.
 */
export const MIN_DIAL_HEIGHT = 180;

/** The bottom of the track on a dial of `height` px. */
export const trackBottomOf = (height: number): number => height - TRACK_TOP;

/**
 * The height to DRAW at, from the height the container actually gave us.
 *
 * `0` means nothing was measured — no ResizeObserver, or not yet — and that
 * falls back to the fixed `VIEW_HEIGHT` the dial had before it could fill.
 * Unknown is not short, exactly as unknown is not narrow in `rowLayout`.
 */
export const dialHeightFor = (measured: number): number => {
  if (!Number.isFinite(measured) || measured <= 0) return VIEW_HEIGHT;
  return Math.max(Math.round(measured), MIN_DIAL_HEIGHT);
};

/** Half-width of the short caps that mark the shared domain's two ends. */
export const CAP_HALF = 6;
/** Half-width of the shaded allowed range — the widest mark on the dial. */
export const BAND_HALF = 5;
/**
 * Half-width of the coloured change line. Wider than the track line it covers,
 * narrower than the range box it sits inside, so the three read as three marks.
 */
export const CHANGE_HALF = 3;
/** How far an arrow's apex stops short of the centre line. */
export const ARROW_GAP = 4;
/** How far back from its apex an arrow runs. */
export const ARROW_LENGTH = 7;
/** Half-height of an arrowhead's base. */
export const ARROW_HALF = 5;

/**
 * Where the signed delta label starts, just clear of the future arrowhead's
 * base. Everything right of here on the canvas is the label's room.
 */
export const DELTA_X = TRACK_X + ARROW_GAP + ARROW_LENGTH + 5;

/** A REAL minus sign (U+2212), not a hyphen — this is a number, not a dash. */
export const MINUS = "\u2212";

// ── the row, when it does not all fit ────────────────────────────────────────
// Peter, 2026-09-16: "If there isn't enough space to show all of the sliders in
// the mutations, show left/right arrows. Minimum of 1 slider."

/** The gap the row puts between dials — `ClusterRow`'s `sm` step, in px. */
export const ROW_GAP = 8;
/** What one dial costs the row: its own canvas plus the gap after it. */
export const DIAL_SLOT = VIEW_WIDTH + ROW_GAP;
/** What one chevron button costs, including its gap. */
export const ARROW_SLOT = 32;
/** What the `+` costs, including its gap. */
export const ADD_SLOT = 32;

/** `d` for the track: one vertical line with a short cap at each end. */
export const trackPath = (height: number = VIEW_HEIGHT): string => {
  const bottom = trackBottomOf(height);
  return [
    `M ${TRACK_X} ${TRACK_TOP} L ${TRACK_X} ${bottom}`,
    `M ${TRACK_X - CAP_HALF} ${TRACK_TOP} L ${TRACK_X + CAP_HALF} ${TRACK_TOP}`,
    `M ${TRACK_X - CAP_HALF} ${bottom} L ${TRACK_X + CAP_HALF} ${bottom}`,
  ].join(" ");
};

/** The track at the default height, kept so existing callers need no change. */
export const TRACK_PATH = trackPath();

/**
 * Where a value sits on the track, in canvas y.
 *
 * `max` is at the TOP and `min` at the bottom, because an amount a reader
 * calls "higher" has to be drawn higher. A zero-width domain reads as the middle
 * rather than dividing by zero — one entity at one amount is a legitimate
 * scenario, and NaN would take the whole row down with it.
 */
export const yFor = (
  domain: Domain,
  value: number,
  height: number = VIEW_HEIGHT,
): number => {
  const bottom = trackBottomOf(height);
  const [min, max] = domain;
  const span = max - min;
  if (span === 0) return (TRACK_TOP + bottom) / 2;
  const fraction = (clamp(value, min, max) - min) / span;
  return bottom - fraction * (bottom - TRACK_TOP);
};

/**
 * The track every dial shares, derived from the ENTITIES rather than asked of
 * the caller: the lowest range floor to the highest range ceiling.
 *
 * This is what makes the ranges fill the dial. A caller-chosen domain is almost
 * always too generous at one end — a scale asked to start at zero spends its
 * bottom third on values nothing ever takes — and the dial then wastes the
 * only dimension it has. The entities already state the interesting span;
 * nobody should have to restate it.
 *
 * An empty row has no ranges to bracket, so it gets a unit domain rather than
 * `[Infinity, -Infinity]`.
 */
export const trackDomainOf = (entities: readonly Entity[]): Domain => {
  if (entities.length === 0) return [0, 1];
  const lows = map((entity: Entity) => entity.range[0], entities);
  const highs = map((entity: Entity) => entity.range[1], entities);
  return [Math.min(...lows), Math.max(...highs)];
};

/**
 * The entity's allowed range, ordered and clamped into the domain so no box
 * can draw off the track.
 *
 * There is no longer a fallback for a missing range: `range` is required, and
 * the domain-wide default that stood in for it during the migration is gone.
 */
export const rangeOf = (domain: Domain, entity: Entity): Domain => {
  const [a, b] = entity.range;
  const [low, high] = a <= b ? [a, b] : [b, a];
  return [
    clamp(low, domain[0], domain[1]),
    clamp(high, domain[0], domain[1]),
  ] as const;
};

/** Pull an amount onto the entity's allowed range. */
export const clampToRange = (range: Domain, value: number): number =>
  clamp(value, range[0], range[1]);

/**
 * Round a value onto a grid of `snap`. A non-positive or non-finite `snap`
 * means no grid, and the value passes through.
 */
export const snapTo = (value: number, snap: number | undefined): number =>
  snap !== undefined && snap > 0 && Number.isFinite(snap)
    ? Math.round(value / snap) * snap
    : value;

/**
 * Where a dragged value actually lands: on the grid, then on the band.
 *
 * THE ORDER MATTERS AND THE CLAMP WINS. A range whose edges are not multiples
 * of `snap` — a ceiling of 110,500 against a 1,000 grid — would otherwise snap
 * to 111,000 and be emitted ABOVE a limit the component promises never to
 * cross. Snapping first and clamping second means the edge is emitted exactly
 * as it stands: a value the range permits beats a value the grid prefers,
 * because the range is a rule about what is allowed and the grid is only a
 * convenience about what is tidy.
 */
export const settle = (range: Domain, value: number, snap?: number): number =>
  clampToRange(range, snapTo(value, snap));

/** The shaded box for an allowed range: its min→max on the track. */
export const bandFor = (
  domain: Domain,
  range: Domain,
  height: number = VIEW_HEIGHT,
): Box => {
  const top = yFor(domain, range[1], height);
  return { y: top, height: yFor(domain, range[0], height) - top };
};

/**
 * Which way the amount moved, AFTER both ends are clamped onto the range.
 *
 * Clamped, because two amounts that both sit past the same ceiling have not
 * moved anywhere the dial can draw, and colouring that as a raise would put a
 * green line of zero length on the track.
 */
export const toneOf = (
  clampedOld: number | null,
  clampedValue: number | null,
): ChangeTone => {
  if (clampedOld === null || clampedValue === null) return "none";
  if (clampedValue === clampedOld) return "none";
  return clampedValue > clampedOld ? "raise" : "cut";
};

/**
 * The coloured line between the two arrows, or `null` when there is nothing to
 * span. It is the EXTENT of the pair, not a signed run — the TONE carries the
 * sign, and the two arrows carry it again without using hue.
 */
export const changeLineFor = (
  domain: Domain,
  clampedOld: number | null,
  clampedValue: number | null,
  height: number = VIEW_HEIGHT,
): Box | null => {
  if (clampedOld === null || clampedValue === null) return null;
  if (clampedValue === clampedOld) return null;
  const a = yFor(domain, clampedOld, height);
  const b = yFor(domain, clampedValue, height);
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
  height: number = VIEW_HEIGHT,
): string => {
  const y = yFor(domain, value, height);
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

/**
 * The SIGNED change, or `null` when there is no change to name.
 *
 * `null` covers all three silences deliberately: an amount that did not move,
 * an arrival with no prior to measure from, and a removal with no future one.
 * The readout row under the dial already names both of those in words,
 * and a delta label beside them would be a second voice saying less.
 */
export const deltaOf = (
  clampedOld: number | null,
  clampedValue: number | null,
): number | null => {
  if (clampedOld === null || clampedValue === null) return null;
  const delta = clampedValue - clampedOld;
  return delta === 0 ? null : delta;
};

/**
 * The delta as the reader sees it: the CONSUMER'S `format` applied to the
 * magnitude, with the sign put in front by this component.
 *
 * The sign is prefixed here rather than passed through `format` because a
 * consumer's formatter is written for an AMOUNT ("$104k"), and asking it to
 * also render a signed difference would make every caller reimplement the same
 * two characters — and get the minus wrong.
 */
export const deltaLabelOf = (
  format: (value: number) => string,
  delta: number | null,
): string | null =>
  delta === null
    ? null
    : `${delta > 0 ? "+" : MINUS}${format(Math.abs(delta))}`;

/** A half-open range of entity indices: `[start, end)`. */
export interface Window {
  readonly start: number;
  readonly end: number;
}

/**
 * Which entities fit, given the room left for dials.
 *
 * MINIMUM ONE, always. A row too narrow for a whole dial shows one anyway and
 * lets it be clipped: a component that renders nothing because the container
 * is small is a component that looks broken, and the reader can still page to
 * whichever dial they want.
 *
 * `offset` is CLAMPED rather than trusted. The caller holds it in a signal, and
 * entities can be removed underneath it — an offset pointing past the end must
 * settle onto the last full window, not render an empty row.
 */
export const visibleWindow = (
  available: number,
  dialWidth: number,
  count: number,
  offset: number,
): Window => {
  if (count <= 0) return { start: 0, end: 0 };
  const fits = dialWidth > 0 ? Math.floor(available / dialWidth) : 0;
  const capacity = Math.min(Math.max(fits, 1), count);
  const start = clamp(Math.trunc(offset), 0, count - capacity);
  return { start, end: start + capacity };
};

/** A resolved row: which dials show, how many fit, and whether it pages. */
export interface RowLayout extends Window {
  /** How many dials the row can show at this width. Never below 1. */
  readonly capacity: number;
  /** Whether the chevrons are needed at all. */
  readonly paging: boolean;
}

/**
 * The whole row decision, from the measured width.
 *
 * TWO PASSES, and the second one is the point: the chevrons only exist when
 * the row pages, but they also TAKE room, which can be what makes it page. So
 * the first pass asks whether everything fits with no chevrons; only if it
 * does not are their slots subtracted and the window recomputed. One pass
 * either reserves space for arrows that never appear — losing a dial that
 * would have fitted — or forgets them and overflows by exactly two buttons.
 *
 * The `+` is different: it is visible at every offset, including after the
 * last page, so its slot is reserved whether or not the row pages.
 */
export const rowLayout = (
  width: number,
  count: number,
  offset: number,
  adding: boolean,
): RowLayout => {
  const forAdd = adding ? ADD_SLOT : 0;
  const whole = visibleWindow(width - forAdd, DIAL_SLOT, count, offset);
  if (whole.end - whole.start >= count) {
    return { ...whole, capacity: count, paging: false };
  }
  const paged = visibleWindow(
    width - forAdd - 2 * ARROW_SLOT,
    DIAL_SLOT,
    count,
    offset,
  );
  return { ...paged, capacity: paged.end - paged.start, paging: true };
};

/**
 * What the row calls itself: "dials 3–5 of 7", in ONE-based human counting
 * rather than the half-open indices above.
 *
 * A single visible dial reads "dial 3 of 7" — an en-dash range with the same
 * number on both sides is a thing a screen reader says twice for no reason.
 */
export const windowLabel = (
  start: number,
  end: number,
  count: number,
): string => {
  if (count === 0) return "no dials";
  const first = start + 1;
  return first === end
    ? `dial ${first} of ${count}`
    : `dials ${first}\u2013${end} of ${count}`;
};

/** The mantissas a "nice" step is allowed to take, smallest first. */
const NICE_MANTISSAS = [1, 2, 5, 10] as const;

/**
 * The step a dial moves by, DERIVED from the domain rather than configured.
 *
 * There is no `step` prop, because nobody was configuring one: the old
 * hardcoded `1` was right for a domain of levels 0–10 and absurd for a domain
 * of six-figure amounts, where it meant a hundred thousand arrow presses to
 * cross the track. A step is a property of the SCALE, and the scale is already here.
 *
 * This governs the KEYBOARD only. A pointer drag is continuous — see
 * `dragStep` above for why the two cannot be the same number.
 *
 * It is a hundredth of the span, rounded UP to 1, 2 or 5 times a power of ten
 * — so `[30_000, 130_000]` steps by 1,000 and a reader crosses the dial in a
 * hundred presses. Up rather than to-nearest, so the step is never FINER than
 * a hundredth and the press count has a ceiling. Kobalte derives its own `pageSize` as a TENTH
 * of the span snapped to this step, so Shift+Arrow and PageUp move ten steps
 * without anything here asking for it.
 *
 * ONE FLOOR, and it is not arbitrary: a domain whose two ends are whole
 * numbers is counted in whole numbers, so its step never goes below 1. Without
 * it a `[0, 10]` domain of integer LEVELS would step by 0.1 and start emitting
 * level 6.3 to a caller whose levels are integers. A fractional domain (a
 * ratio in `[0, 1]`) keeps its fractional step, because its ends say so.
 */
/**
 * The finest movement a DRAG may produce — deliberately NOT `niceStep`.
 *
 * Peter, 2026-09-16: "the sliders ... no longer slide freely along the axis.
 * They appear to snap to things." They did: `niceStep` was handed to Kobalte
 * as its `step`, and Kobalte's step governs the POINTER as well as the
 * keyboard. A step sized for "how far should one arrow press move" is far too
 * coarse for a thumb that should track the pointer.
 *
 * So the two are separated. A drag moves by the smallest unit the domain can
 * meaningfully express — one whole unit where the domain's ends are whole
 * numbers (a counted quantity moves by one, not by the thousand), and a
 * thousandth of the span where they are fractional, which is finer than any
 * display could distinguish. `niceStep` now applies to arrow keys ONLY.
 *
 * The value that comes out is not rounded for display: the consumer's
 * `format` already decides how a figure reads.
 */
export const dragStep = (domain: Domain): number => {
  const span = Math.abs(domain[1] - domain[0]);
  if (span === 0 || !Number.isFinite(span)) return 1;
  const whole = Number.isInteger(domain[0]) && Number.isInteger(domain[1]);
  return whole ? 1 : span / 1000;
};

export const niceStep = (domain: Domain): number => {
  const span = Math.abs(domain[1] - domain[0]);
  if (span === 0 || !Number.isFinite(span)) return 1;
  const raw = span / 100;
  const exponent = Math.floor(Math.log10(raw));
  const power = 10 ** exponent;
  const mantissa = raw / power;
  const nice =
    (find((candidate: number) => mantissa <= candidate, NICE_MANTISSAS) ?? 10) *
    power;
  const wholeDomain =
    Number.isInteger(domain[0]) && Number.isInteger(domain[1]);
  return wholeDomain ? Math.max(nice, 1) : nice;
};

/** One entity's new amount, as a pin or a group move computes it. */
export interface PinnedValue {
  readonly id: string;
  readonly value: number;
}

/** An entity's own range, ordered — the only limit a pinned move respects. */
const ownBand = (entity: Entity): Domain =>
  entity.range[0] <= entity.range[1]
    ? entity.range
    : [entity.range[1], entity.range[0]];

/** The selected entities that actually have an amount to move. */
const movable = (
  entities: readonly Entity[],
  ids: readonly string[],
): readonly Entity[] =>
  filter(
    (entity: Entity) => ids.includes(entity.id) && entity.value !== null,
    entities,
  );

/** Only the entities whose amount would actually change. */
const changedOnly = (
  moved: readonly PinnedValue[],
  from: readonly Entity[],
): readonly PinnedValue[] =>
  filter(
    (pinned: PinnedValue) =>
      pinned.value !== find((e: Entity) => e.id === pinned.id, from)?.value,
    moved,
  );

/**
 * The amounts a SELECTION takes when it forms: every selected entity snaps to
 * the HIGHEST amount currently among them (Peter, 2026-09-16).
 *
 * Highest, not lowest and not the one you clicked. Pinning entities together
 * is something you do to LEVEL THEM UP, and levelling one DOWN by accident is
 * the expensive mistake — a mis-click that cuts a value is much worse than one
 * that raises it, and the raise is visible in the readout before anything is
 * committed.
 *
 * Each lands on its OWN range, so one whose ceiling cannot reach the target
 * stops there and is pinned as far as it can go rather than being dropped from
 * the group. A REMOVED entity is skipped entirely: it has no amount to raise
 * and none to contribute to the maximum.
 *
 * Returns only what MOVES, so a caller emits one change per entity that
 * changed and none for the rest.
 */
export const pinTo = (
  entities: readonly Entity[],
  ids: readonly string[],
): readonly PinnedValue[] => {
  const chosen = movable(entities, ids);
  if (chosen.length === 0) return [];
  const highest = Math.max(
    ...map((entity: Entity) => entity.value as number, chosen),
  );
  return changedOnly(
    map(
      (entity: Entity) => ({
        id: entity.id,
        value: clampToRange(ownBand(entity), highest),
      }),
      chosen,
    ),
    chosen,
  );
};

/**
 * The amounts a selection takes when ONE of them is dragged by `delta`: every
 * selected entity moves by the same amount, each clamped to its own range.
 *
 * The delta is applied to each entity's OWN current value rather than to a
 * shared figure, so a group that has already been split by different ceilings
 * keeps its shape instead of collapsing back together on the first nudge.
 */
export const moveTogether = (
  entities: readonly Entity[],
  ids: readonly string[],
  delta: number,
): readonly PinnedValue[] =>
  map(
    (entity: Entity) => ({
      id: entity.id,
      value: clampToRange(ownBand(entity), (entity.value as number) + delta),
    }),
    movable(entities, ids),
  );

/** Everything one dial draws, from one entity. */
export const dialGeometry = (
  domain: Domain,
  entity: Entity,
  height: number = VIEW_HEIGHT,
): DialGeometry => {
  const range = rangeOf(domain, entity);
  const clampedOld =
    entity.old === null ? null : clampToRange(range, entity.old);
  const clampedValue =
    entity.value === null ? null : clampToRange(range, entity.value);
  const line = changeLineFor(domain, clampedOld, clampedValue, height);
  const delta = deltaOf(clampedOld, clampedValue);
  return {
    id: entity.id,
    label: entity.label,
    range,
    old: entity.old,
    clampedOld,
    isNew: entity.old === null,
    value: entity.value,
    clampedValue,
    removed: entity.value === null,
    oldY: clampedOld === null ? null : yFor(domain, clampedOld, height),
    valueY: clampedValue === null ? null : yFor(domain, clampedValue, height),
    band: bandFor(domain, range, height),
    changeLine: line,
    delta,
    deltaY: line === null ? null : line.y + line.height / 2,
    changeTone: toneOf(clampedOld, clampedValue),
    priorArrow:
      clampedOld === null
        ? null
        : arrowPath(domain, clampedOld, "prior", height),
    futureArrow:
      clampedValue === null
        ? null
        : arrowPath(domain, clampedValue, "future", height),
  };
};

/**
 * The whole row, in the order it was given. The consumer's order is the
 * reading order, so nothing here sorts.
 */
export const mutationGeometry = (
  domain: Domain,
  entities: readonly Entity[],
  height: number = VIEW_HEIGHT,
): readonly DialGeometry[] =>
  map((entity: Entity) => dialGeometry(domain, entity, height), entities);
