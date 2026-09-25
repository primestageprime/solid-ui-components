// ============================================
// MutationSliders item runs — pure, headless, no Solid, no DOM.
//
// ONE ITEM, SEVERAL DIALS (Peter, 2026-09-24): a person holding two positions
// is one thing on screen with two dials, and the row says so with a subtle
// background behind that item's dials. This file decides WHICH dials belong
// together and how the row PAGES when it cannot show them all — by whole
// items, so a page never shows one of a person's dials without the other.
//
// Grouping means "same item"; LINKING (the selection) means "move together".
// The two are independent: nothing here reads the selection.
//
// The run rule is GroupedMutationSliders' `groupRuns`, reused rather than
// restated: CONSECUTIVE dials sharing an item key form one run, a key that
// comes back after an interruption opens a second run (the row draws what it
// was given, in the order given), and a dial with no key stands alone.
//
// Everything here prints as a table (items.test.ts).
// ============================================
import { type GroupRun, groupRuns } from "../GroupedMutationSliders/groups";
import { map, sum } from "../../fn";
import { ADD_SLOT, ARROW_SLOT, ROW_GAP } from "./rows";

export type { GroupRun as ItemRun } from "../GroupedMutationSliders/groups";

/** The runs a row's item keys break into. */
export const itemRuns = (
  items: readonly (string | undefined)[],
): readonly GroupRun[] => groupRuns(items);

/** A window over whole RUNS, and the dial indices it covers: `[start, end)`. */
export interface ItemWindow {
  readonly firstRun: number;
  readonly lastRun: number;
  readonly start: number;
  readonly end: number;
  readonly paging: boolean;
}

const widthOf = (run: GroupRun, slot: number): number =>
  run.indices.length * slot;

/**
 * The whole runs that fit from `offset` (a RUN index), minimum ONE — a single
 * item wider than the room is shown alone and clipped rather than split, the
 * same "minimum one" rule the plain row keeps for a single dial.
 *
 * The offset is clamped so the window never runs off the end with room to
 * spare: a stale offset settles onto the last window that is full.
 */
const fitRuns = (
  available: number,
  slot: number,
  runs: readonly GroupRun[],
  offset: number,
): { first: number; last: number } => {
  const count = runs.length;
  let first = Math.min(Math.max(offset, 0), count - 1);
  let last = first;
  let used = widthOf(runs[first], slot);
  while (last + 1 < count && used + widthOf(runs[last + 1], slot) <= available) {
    last += 1;
    used += widthOf(runs[last], slot);
  }
  // Pull the start back while the runs before it still fit — no ragged end.
  while (first > 0 && used + widthOf(runs[first - 1], slot) <= available) {
    first -= 1;
    used += widthOf(runs[first], slot);
  }
  return { first, last };
};

/**
 * The row's layout by whole items: everything if it fits, otherwise the runs
 * that fit between the two chevrons. The chevrons and the `+` pay the row's
 * own `gap`, exactly as `rowLayout` charges them.
 */
export const itemLayout = (
  width: number,
  runs: readonly GroupRun[],
  offset: number,
  adding: boolean,
  slot: number,
  gap: number = ROW_GAP,
): ItemWindow => {
  const total = sum(map((run: GroupRun) => run.indices.length, runs));
  if (runs.length === 0) {
    return { firstRun: 0, lastRun: -1, start: 0, end: 0, paging: false };
  }
  const extra = gap - ROW_GAP;
  const forAdd = adding ? ADD_SLOT + extra : 0;
  if (total * slot <= width - forAdd) {
    return {
      firstRun: 0,
      lastRun: runs.length - 1,
      start: 0,
      end: total,
      paging: false,
    };
  }
  const { first, last } = fitRuns(
    width - forAdd - 2 * (ARROW_SLOT + extra),
    slot,
    runs,
    offset,
  );
  return {
    firstRun: first,
    lastRun: last,
    start: runs[first].indices[0],
    end: runs[last].indices[runs[last].indices.length - 1] + 1,
    paging: true,
  };
};
