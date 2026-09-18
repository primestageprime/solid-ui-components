/**
 * Board Kit — the ONE piece of `BoardView` that is not composition.
 *
 * Everything else the view does is handing an existing SUI component data from
 * the config. The dial row is not: `PairedMutationSliders.measures` is a strict
 * 2-tuple and its `MeasureIndex` is `0 | 1`, so a four-axis board draws TWO
 * paired rows and each one calls back with an index inside its own pair. The
 * view has to map that back to the global measure before it writes anything.
 *
 * A mistake here writes a value into the wrong measure — `$/hr` set from an
 * hours drag, a yearly fee set from a monthly count — and it would show up as
 * a number that moves when a different dial is dragged, which is about the
 * hardest kind of bug to see in a picture. So it is pinned here, for all three
 * shapes the three boards take, before the fourth board finds it.
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

  it("gives the LICENSE Board's four axes TWO paired rows, mo then yr", () => {
    // Its four dials: monthly count and fee, yearly count and percentage.
    const groups = groupsOf([
      axis("Seats /mo", "mo"),
      axis("$ /mo", "mo"),
      axis("Seats /yr", "yr"),
      axis("% /yr", "yr"),
    ]);
    expect(map((g) => g.key, groups)).toEqual(["mo", "yr"]);
    expect(map((g) => g.indices, groups)).toEqual([
      [0, 1],
      [2, 3],
    ]);
  });

  it("MAPS the second row's local index back to the global measure", () => {
    // THE BUG THIS EXISTS TO PREVENT. The second row reports 0 and 1 for its
    // own two dials; without the map, dragging the yearly count would write
    // the MONTHLY count, and dragging the percentage would write the monthly
    // fee. Two of the four dials would silently edit the wrong measure.
    const groups = groupsOf([
      axis("Seats /mo", "mo"),
      axis("$ /mo", "mo"),
      axis("Seats /yr", "yr"),
      axis("% /yr", "yr"),
    ]);
    const [monthly, yearly] = groups as [
      ReturnType<typeof groupsOf>[number],
      ReturnType<typeof groupsOf>[number],
    ];
    expect(globalIndex(monthly, 0)).toBe(0);
    expect(globalIndex(monthly, 1)).toBe(1);
    expect(globalIndex(yearly, 0)).toBe(2);
    expect(globalIndex(yearly, 1)).toBe(3);
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
