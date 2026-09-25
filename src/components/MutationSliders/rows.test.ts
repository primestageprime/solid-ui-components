// ============================================
// MutationSliders row math — the headless observation.
//
// Every fact about the ROW rather than about one dial: how many fit at a
// measured width, which window shows, what the row calls itself, and what a
// move means when more than one dial is pinned. Split out of geometry.test.ts
// when the dial's marks moved to the MarkedSlider Primitive; the assertions
// below are the ones that were there, verbatim.
// ============================================
import { describe, expect, it } from "vitest";
import { map } from "../../fn";
import {
  DELTA_X,
  type Entity,
  PRIOR_LABEL_X,
  VIEW_WIDTH,
} from "../MarkedSlider/geometry";
import {
  ADD_SLOT,
  ARROW_SLOT,
  DIAL_SLOT,
  GUTTERED_DIAL_SLOT,
  GUTTER_GAP,
  ROW_GAP,
  moveTogether,
  pinTo,
  rowLayout,
  visibleWindow,
  windowLabel,
} from "./rows";

describe("visibleWindow", () => {
  const ROOM_FOR_THREE = DIAL_SLOT * 3;

  it("shows as many WHOLE dials as fit", () => {
    expect(visibleWindow(ROOM_FOR_THREE, DIAL_SLOT, 9, 0)).toEqual({
      start: 0,
      end: 3,
    });
  });

  it("never shows a partial dial — the remainder is not a quarter of one", () => {
    expect(visibleWindow(DIAL_SLOT * 3.9, DIAL_SLOT, 9, 0)).toEqual({
      start: 0,
      end: 3,
    });
  });

  it("shows everything when everything fits, and never more", () => {
    expect(visibleWindow(DIAL_SLOT * 50, DIAL_SLOT, 4, 0)).toEqual({
      start: 0,
      end: 4,
    });
  });

  it("shows ONE dial when not even one fits, rather than nothing", () => {
    // Peter, 2026-09-16: "Minimum of 1 slider." A row that renders nothing
    // because its container is narrow looks broken; a clipped dial does not.
    expect(visibleWindow(10, DIAL_SLOT, 9, 0)).toEqual({ start: 0, end: 1 });
    expect(visibleWindow(0, DIAL_SLOT, 9, 0)).toEqual({ start: 0, end: 1 });
    expect(visibleWindow(-500, DIAL_SLOT, 9, 0)).toEqual({ start: 0, end: 1 });
  });

  it("pages by moving the window, keeping its size", () => {
    expect(visibleWindow(ROOM_FOR_THREE, DIAL_SLOT, 9, 4)).toEqual({
      start: 4,
      end: 7,
    });
  });

  it("clamps an offset past the end onto the LAST full window", () => {
    // The caller holds the offset in a signal and entities can be removed
    // underneath it; a stale offset must settle, not empty the row.
    expect(visibleWindow(ROOM_FOR_THREE, DIAL_SLOT, 9, 99)).toEqual({
      start: 6,
      end: 9,
    });
  });

  it("clamps a negative offset to the start", () => {
    expect(visibleWindow(ROOM_FOR_THREE, DIAL_SLOT, 9, -4)).toEqual({
      start: 0,
      end: 3,
    });
  });

  it("is empty for an empty row rather than showing a dial that is not there", () => {
    expect(visibleWindow(ROOM_FOR_THREE, DIAL_SLOT, 0, 0)).toEqual({
      start: 0,
      end: 0,
    });
  });

  it("survives a zero dial width instead of dividing by it", () => {
    expect(visibleWindow(500, 0, 9, 0)).toEqual({ start: 0, end: 1 });
  });
});

describe("rowLayout", () => {
  it("does not page, and reserves no arrows, when everything fits", () => {
    const layout = rowLayout(DIAL_SLOT * 9 + ADD_SLOT, 9, 0, true);
    expect(layout.paging).toBe(false);
    expect(layout).toMatchObject({ start: 0, end: 9, capacity: 9 });
  });

  it("pages, and takes the arrows' room, when it does not", () => {
    const layout = rowLayout(
      DIAL_SLOT * 3 + ADD_SLOT + 2 * ARROW_SLOT,
      9,
      0,
      true,
    );
    expect(layout.paging).toBe(true);
    expect(layout.capacity).toBe(3);
  });

  // The two-pass rule, stated as a case: a width that fits every dial EXACTLY
  // must not be spoiled by reserving arrows it then never draws.
  it("does not lose a dial to arrows that never appear", () => {
    const exact = DIAL_SLOT * 5 + ADD_SLOT;
    expect(rowLayout(exact, 5, 0, true)).toMatchObject({
      capacity: 5,
      paging: false,
    });
  });

  // ...and the converse: one dial too many, and the arrows' room comes out of
  // the dials, so the count can drop by more than the one that overflowed.
  it("pays for the arrows out of the dials once it must page", () => {
    const exact = DIAL_SLOT * 5 + ADD_SLOT;
    const layout = rowLayout(exact, 6, 0, true);
    expect(layout.paging).toBe(true);
    expect(layout.capacity).toBeLessThan(5);
  });

  it("reserves the + slot whether or not the row pages", () => {
    const width = DIAL_SLOT * 4;
    expect(rowLayout(width, 4, 0, true).capacity).toBeLessThan(
      rowLayout(width, 4, 0, false).capacity,
    );
  });

  it("still shows one dial in a container far too narrow for any", () => {
    expect(rowLayout(20, 9, 0, true)).toMatchObject({
      start: 0,
      end: 1,
      capacity: 1,
      paging: true,
    });
  });

  // ── the slot parameter (additive, 2026-09-17) ────────────────────────────
  // `PairedMutationSliders` puts TWO dials under one name, so its entity costs
  // the row twice what a single dial does. The layout arithmetic is unchanged;
  // only the number it divides by moves.

  it("defaults to one dial's slot, so the four-argument form is unchanged", () => {
    const width = DIAL_SLOT * 4 + ADD_SLOT;
    expect(rowLayout(width, 9, 0, true)).toEqual(
      rowLayout(width, 9, 0, true, DIAL_SLOT),
    );
  });

  it("fits half as many entities when one entity is two dials wide", () => {
    const width = DIAL_SLOT * 8 + ADD_SLOT;
    expect(rowLayout(width, 9, 0, true, 2 * DIAL_SLOT).capacity).toBe(
      Math.floor(rowLayout(width, 9, 0, true, DIAL_SLOT).capacity / 2),
    );
  });

  it("still floors a wide slot at one entity, and still pages", () => {
    expect(rowLayout(20, 9, 0, true, 2 * DIAL_SLOT)).toMatchObject({
      start: 0,
      end: 1,
      capacity: 1,
      paging: true,
    });
  });

  it("does not page a wide-slot row that fits exactly", () => {
    const exact = 2 * DIAL_SLOT * 3 + ADD_SLOT;
    expect(rowLayout(exact, 3, 0, true, 2 * DIAL_SLOT)).toMatchObject({
      capacity: 3,
      paging: false,
    });
  });
});

describe("windowLabel", () => {
  // ── the noun parameter (additive, 2026-09-17) ────────────────────────────
  it('defaults to "dial", so every existing caller is unchanged', () => {
    expect(windowLabel(2, 5, 7)).toBe(windowLabel(2, 5, 7, "dial"));
  });

  it("takes the window's own noun, singular and plural and empty", () => {
    expect(windowLabel(2, 5, 9, "pair")).toBe("pairs 3\u20135 of 9");
    expect(windowLabel(2, 3, 9, "pair")).toBe("pair 3 of 9");
    expect(windowLabel(0, 0, 0, "pair")).toBe("no pairs");
  });

  it("names the window the way a reader counts, from one", () => {
    expect(windowLabel(2, 5, 7)).toBe("dials 3\u20135 of 7");
  });

  it("says `dial 3 of 7` for a single one, not `dials 3-3`", () => {
    expect(windowLabel(2, 3, 7)).toBe("dial 3 of 7");
  });

  it("has something to say about an empty row", () => {
    expect(windowLabel(0, 0, 0)).toBe("no dials");
  });
});

describe("pinTo — a selection levels up", () => {
  const JUNIOR: readonly [number, number] = [40_000, 60_000];
  const MID: readonly [number, number] = [55_000, 80_000];
  const SENIOR: readonly [number, number] = [70_000, 110_000];
  const PEOPLE: readonly Entity[] = [
    { id: "a", label: "A", old: 44_000, value: 46_000, range: JUNIOR },
    { id: "b", label: "B", old: 60_000, value: 72_000, range: MID },
    { id: "c", label: "C", old: 90_000, value: 95_000, range: SENIOR },
    { id: "d", label: "D", old: 50_000, value: 52_000, range: JUNIOR },
    { id: "gone", label: "Gone", old: 50_000, value: null, range: JUNIOR },
  ];
  const amountOf = (
    moved: readonly { id: string; value: number }[],
    id: string,
  ) => moved.find((m) => m.id === id)?.value;

  it("snaps every selected entity to the HIGHEST among them", () => {
    // b is 72_000, a is 46_000 — a comes UP, b does not move.
    const moved = pinTo(PEOPLE, ["a", "b"]);
    expect(amountOf(moved, "a")).toBe(60_000);
    expect(amountOf(moved, "b")).toBeUndefined();
  });

  it("clamps each one to its OWN band rather than dropping it", () => {
    // Target is c's 95_000. A junior's ceiling is 60_000, so A follows as far
    // as a junior can and stays pinned at the top of their band.
    expect(amountOf(pinTo(PEOPLE, ["a", "c"]), "a")).toBe(60_000);
  });

  it("levels UP, never down — the expensive mistake is a mis-click that cuts", () => {
    const moved = pinTo(PEOPLE, ["b", "d"]);
    // d rises to b's 72_000, clamped to the junior ceiling of 60_000...
    expect(amountOf(moved, "d")).toBe(60_000);
    // ...and b, the highest, is untouched.
    expect(amountOf(moved, "b")).toBeUndefined();
  });

  it("skips a terminated entity entirely, in both directions", () => {
    const moved = pinTo(PEOPLE, ["a", "gone"]);
    // It contributes no maximum and receives no amount.
    expect(amountOf(moved, "gone")).toBeUndefined();
    expect(moved).toHaveLength(0);
  });

  it("leaves unselected entities alone", () => {
    const ids = map((m) => m.id, pinTo(PEOPLE, ["a", "b"]));
    expect(ids).not.toContain("c");
    expect(ids).not.toContain("d");
  });

  it("reports nothing when a lone entity is selected", () => {
    expect(pinTo(PEOPLE, ["a"])).toEqual([]);
    expect(pinTo(PEOPLE, [])).toEqual([]);
  });
});

describe("moveTogether — a pinned group drags as one", () => {
  const JUNIOR: readonly [number, number] = [40_000, 60_000];
  const SENIOR: readonly [number, number] = [70_000, 110_000];
  const PEOPLE: readonly Entity[] = [
    { id: "a", label: "A", old: 44_000, value: 50_000, range: JUNIOR },
    { id: "b", label: "B", old: 90_000, value: 90_000, range: SENIOR },
    { id: "gone", label: "Gone", old: 50_000, value: null, range: JUNIOR },
  ];
  const amountOf = (
    moved: readonly { id: string; value: number }[],
    id: string,
  ) => moved.find((m) => m.id === id)?.value;

  it("applies the SAME delta to every selected entity", () => {
    const moved = moveTogether(PEOPLE, ["a", "b"], 5_000);
    expect(amountOf(moved, "a")).toBe(55_000);
    expect(amountOf(moved, "b")).toBe(95_000);
  });

  it("clamps each to its own band, so one hitting a ceiling stops there", () => {
    const moved = moveTogether(PEOPLE, ["a", "b"], 30_000);
    expect(amountOf(moved, "a")).toBe(60_000); // junior ceiling
    expect(amountOf(moved, "b")).toBe(110_000); // senior ceiling
  });

  it("moves downward just as well", () => {
    expect(amountOf(moveTogether(PEOPLE, ["a", "b"], -5_000), "a")).toBe(
      45_000,
    );
  });

  it("applies the delta to each OWN value, so a split group keeps its shape", () => {
    // If it applied the delta to a shared figure, these two would collapse
    // onto one another the moment the group was nudged.
    const moved = moveTogether(PEOPLE, ["a", "b"], 1_000);
    expect(
      (amountOf(moved, "b") as number) - (amountOf(moved, "a") as number),
    ).toBe(40_000);
  });

  it("never moves a terminated entity or an unselected one", () => {
    const moved = moveTogether(PEOPLE, ["a", "gone"], 1_000);
    expect(map((m) => m.id, moved)).toEqual(["a"]);
  });
});

describe("the guttered row — the beside readout's 24px gap", () => {
  it("pages by the guttered slot and charges the chevrons and + the wider gap", () => {
    const width = GUTTERED_DIAL_SLOT * 4;
    const rows = [
      { row: "plain, 4 fit", ...rowLayout(DIAL_SLOT * 4, 4, 0, false) },
      { row: "guttered, 4 fit", ...rowLayout(width, 4, 0, false, GUTTERED_DIAL_SLOT, GUTTER_GAP) },
      { row: "guttered, 6 in room for 4", ...rowLayout(width, 6, 0, false, GUTTERED_DIAL_SLOT, GUTTER_GAP) },
      { row: "guttered + add, 4 in room for 4", ...rowLayout(width, 4, 0, true, GUTTERED_DIAL_SLOT, GUTTER_GAP) },
    ];
    console.table(rows);
    expect(map((r) => [r.end - r.start, r.paging], rows)).toEqual([
      [4, false],
      [4, false],
      // 448 − 2×(32+16) = 352 → 3 slots of 112.
      [3, true],
      // 448 − (32+16) = 400 → 3 whole slots, so it pages: 400 − 96 → 2.
      [2, true],
    ]);
  });

  it("the worst two-line figure clears the next dial's prior label", () => {
    // 11px mono ≈ 6.6px a glyph. The figure starts at DELTA_X; the next
    // dial's prior label is right-anchored at PRIOR_LABEL_X of ITS canvas.
    const GLYPH = 6.6;
    const figure = Math.max("−$100K".length, "(100%)".length) * GLYPH;
    const prior = "$110K".length * GLYPH;
    const intoGapRight = DELTA_X + figure - VIEW_WIDTH;
    const intoGapLeft = prior - PRIOR_LABEL_X;
    const clear = GUTTER_GAP - intoGapRight - intoGapLeft;
    console.table([
      { figure, prior, intoGapRight, intoGapLeft, gap: GUTTER_GAP, clear },
      { figure, prior, intoGapRight, intoGapLeft, gap: ROW_GAP, clear: ROW_GAP - intoGapRight - intoGapLeft },
    ]);
    expect(clear).toBeGreaterThan(0);
    expect(ROW_GAP - intoGapRight - intoGapLeft).toBeLessThan(0);
  });
});
