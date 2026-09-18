// ============================================
// MutationSliders row math — pure, headless, no Solid, no DOM.
//
// Lowercase filename ON PURPOSE (the same disposition as MarkedSlider's
// geometry.ts): `isEntryPath` in scripts/render-coverage.mjs matches any
// PascalCase `.tsx` under src/components/, so a PascalCase module here would
// register as a published component owing a showcase it does not have.
//
// WHAT THIS OWNS: everything that is a fact about the OTHER dials — how many
// fit at a measured width, which window shows, what the row calls itself, and
// what a move means when more than one dial is pinned. None of it can be
// decided by a dial, because none of it can be seen from inside one.
//
// WHAT IT DOES NOT OWN: the marks on a dial. Those live in
// `MarkedSlider/geometry.ts`, beside the Primitive that paints them — this
// file imports the two shapes it has to agree with (`Entity`, `Domain`), the
// canvas width one dial costs the row, and the clamp a pinned move respects.
// The split is the axiom's: a Composite may know about its children's
// arrangement, and a Primitive may not know about its siblings.
//
// Everything here prints as a table (rows.test.ts).
// ============================================
import { clamp } from "../../internal/math/clamp";
import { filter, find, map } from "../../fn";
import {
  type Domain,
  type Entity,
  VIEW_WIDTH,
  clampToRange,
} from "../MarkedSlider/geometry";

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
