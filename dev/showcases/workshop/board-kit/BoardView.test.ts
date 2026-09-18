/**
 * Board Kit — WHICH DIAL ROW a config asks for.
 *
 * `BoardView` picks its row by arity: one axis is `MutationSliders`, two is
 * `PairedMutationSliders`, three or more is `GroupedMutationSliders`. The first
 * two draw ONE group each; the third takes every measure at once.
 *
 * Why this is worth a test of its own: until `GroupedMutationSliders` landed
 * (2026-09-18, #161) a four-axis board had to be drawn as TWO paired rows,
 * because `PairedMutationSliders.measures` is a strict 2-tuple and its
 * `MeasureIndex` is `0 | 1` — so each row reported an index inside its own
 * pair and something had to map it back to the global measure. A mistake there
 * writes a value into the wrong measure (a yearly fee set from a monthly seat
 * count), which shows up as a number that moves when a DIFFERENT dial is
 * dragged — about the hardest kind of bug to see in a picture.
 *
 * The grouped component reports a GLOBAL index, so that mapping is gone rather
 * than merely correct. `globalIndex` is kept and pinned for the narrow rows,
 * and the four-axis case below asserts the thing that replaced it: that such a
 * board is ONE row over every measure, not two rows over halves of it.
 */
import { describe, expect, it } from "vitest";
import { map } from "../../../../src/fn";
import type { MeasureAxis } from "./config";
import { globalIndex, groupsOf } from "./BoardView";

const axis = (label: string, group?: string): MeasureAxis => ({
  label,
  domain: [0, 100],
  snap: 1,
  format: String,
  ...(group === undefined ? {} : { group }),
});

describe("the axes, split into the rows they draw as", () => {
  it("gives the SCENARIO Board's one axis a single row", () => {
    const groups = groupsOf([axis("Pay")]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.indices).toEqual([0]);
    expect(globalIndex(groups[0]!, 0)).toBe(0);
  });

  it("gives the HOURLY Board's two axes ONE paired row", () => {
    const groups = groupsOf([axis("Hrs/wk"), axis("$/hr")]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.indices).toEqual([0, 1]);
    // With one row the local index IS the global one, which is why the two
    // existing boards never needed this mapping.
    expect(globalIndex(groups[0]!, 0)).toBe(0);
    expect(globalIndex(groups[0]!, 1)).toBe(1);
  });

  it("reads the LICENSE Board's captioned groups off the axes", () => {
    // Its dials: monthly count and fee, yearly count and percentage. The
    // grouped row draws all four at once under two captions, so what `groupsOf`
    // is answering here is what the CAPTIONS are and in what order — the row
    // itself is not split.
    const groups = groupsOf([
      axis("#", "mo"),
      axis("$", "mo"),
      axis("#", "yr"),
      axis("%", "yr"),
    ]);
    expect(map((g) => g.key, groups)).toEqual(["mo", "yr"]);
    expect(map((g) => g.indices, groups)).toEqual([
      [0, 1],
      [2, 3],
    ]);
  });

  it("holds SIX measures in two groups — Peter's redefined License board", () => {
    // 2026-09-18: monthly (#, growth delta, fee) and annual (#, delta, fee).
    // Six is only a bigger number to the grouped row; nothing about it is a
    // special case, which is the property this asserts.
    const groups = groupsOf([
      axis("#", "mo"),
      axis("\u0394", "mo"),
      axis("$", "mo"),
      axis("#", "yr"),
      axis("\u0394", "yr"),
      axis("$", "yr"),
    ]);
    expect(map((g) => g.key, groups)).toEqual(["mo", "yr"]);
    expect(map((g) => g.indices, groups)).toEqual([
      [0, 1, 2],
      [3, 4, 5],
    ]);
    // Positions stay GLOBAL throughout — the grouped component reports them
    // that way, so nothing downstream ever remaps.
    expect(globalIndex(groups[1]!, 2)).toBe(5);
  });

  it("keeps the config's reading order as the rows' reading order", () => {
    // FIRST APPEARANCE, not alphabetical: a board that lists its yearly dials
    // first draws them first, whatever the groups are called.
    const groups = groupsOf([
      axis("Seats /yr", "yr"),
      axis("% /yr", "yr"),
      axis("Seats /mo", "mo"),
      axis("$ /mo", "mo"),
    ]);
    expect(map((g) => g.key, groups)).toEqual(["yr", "mo"]);
    expect(globalIndex(groups[1]!, 0)).toBe(2);
  });

  it("gives an UNGROUPED axis beside grouped ones its own row", () => {
    // Not a shape any board takes today. It is asserted because the fallback
    // has to be a row rather than a crash, and because a board part-way through
    // adding a group would otherwise draw nothing for the axis it forgot.
    const groups = groupsOf([
      axis("A", "pair"),
      axis("B", "pair"),
      axis("C"),
    ]);
    expect(map((g) => g.indices, groups)).toEqual([[0, 1], [2]]);
    expect(globalIndex(groups[1]!, 0)).toBe(2);
  });
});
