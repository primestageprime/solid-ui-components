// ============================================
// PairedMutationSliders — the headless observation.
//
// The PROJECTION, printed as a table: a paired entity seen one measure at a
// time is the single-measure `Entity` every existing row helper is written
// against, and the two projections are disjoint. That disjointness is the
// whole mechanism behind "a pin only moves the same measure", so it is proved
// here, without a browser, rather than only through the DOM.
// ============================================
import { describe, expect, it } from "vitest";
import { map } from "../../fn";
import { DIAL_SLOT, moveTogether, pinTo } from "../MutationSliders/rows";
import {
  MEASURE_INDICES,
  PAIR_SLOT,
  type PairedMutationEntity,
  isRemoved,
  measureEntities,
  measureEntity,
} from "./pairs";

/** Two services: hours a week on measure 0, dollars an hour on measure 1. */
const TWO: readonly PairedMutationEntity[] = [
  {
    id: "design",
    label: "Design",
    measures: [
      { prior: 10, value: 20, range: [0, 40] },
      { prior: 120, value: 150, range: [100, 200] },
    ],
  },
  {
    id: "build",
    label: "Build",
    measures: [
      { prior: 30, value: 25, range: [0, 40] },
      { prior: 90, value: 90, range: [80, 130] },
    ],
  },
];

describe("PAIR_SLOT", () => {
  it("is exactly two dial slots — the pair's own gap is the row's gap", () => {
    expect(PAIR_SLOT).toBe(2 * DIAL_SLOT);
  });
});

describe("measureEntity", () => {
  it("keeps the ENTITY's id, so an emission keys straight back", () => {
    expect(measureEntity(TWO[0], 1).id).toBe("design");
  });

  it("reads measure 0 as old/value/range", () => {
    expect(measureEntity(TWO[0], 0)).toEqual({
      id: "design",
      label: "Design",
      old: 10,
      value: 20,
      range: [0, 40],
    });
  });

  it("reads measure 1 off the SAME entity, and shares nothing with measure 0", () => {
    expect(measureEntity(TWO[0], 1)).toEqual({
      id: "design",
      label: "Design",
      old: 120,
      value: 150,
      range: [100, 200],
    });
  });
});

describe("measureEntities", () => {
  it("projects the whole row, in order", () => {
    expect(
      map((e: { value: number | null }) => e.value, measureEntities(TWO, 0)),
    ).toEqual([20, 25]);
    expect(
      map((e: { value: number | null }) => e.value, measureEntities(TWO, 1)),
    ).toEqual([150, 90]);
  });

  it("names both positions once — MEASURE_INDICES is the only [0, 1]", () => {
    expect(MEASURE_INDICES).toEqual([0, 1]);
  });
});

describe("the projection is what makes a pin measure-local", () => {
  const ids = ["design", "build"];

  it("levels measure 0 to the highest HOURS, untouched by the rates", () => {
    // 20 vs 25 → both to 25, and 150/90 play no part in it.
    expect(pinTo(measureEntities(TWO, 0), ids)).toEqual([
      { id: "design", value: 25 },
    ]);
  });

  it("levels measure 1 to the highest RATE, clamped to each own range", () => {
    // 150 vs 90 → Build wants 150 and its ceiling is 130, so it stops there.
    expect(pinTo(measureEntities(TWO, 1), ids)).toEqual([
      { id: "build", value: 130 },
    ]);
  });

  it("moves a group on ONE measure and leaves the other's numbers alone", () => {
    const hours = moveTogether(measureEntities(TWO, 0), ids, 5);
    expect(hours).toEqual([
      { id: "design", value: 25 },
      { id: "build", value: 30 },
    ]);
    // The same delta on the rate projection is a different set of numbers
    // entirely — the two can never be confused for one another.
    expect(moveTogether(measureEntities(TWO, 1), ids, 5)).toEqual([
      { id: "design", value: 155 },
      { id: "build", value: 95 },
    ]);
  });
});

describe("isRemoved", () => {
  const dropped = (entity: PairedMutationEntity): PairedMutationEntity => ({
    ...entity,
    measures: [
      { ...entity.measures[0], value: null },
      { ...entity.measures[1], value: null },
    ],
  });

  it("is false while either measure still has a future amount", () => {
    expect(isRemoved(TWO[0])).toBe(false);
    expect(
      isRemoved({
        ...TWO[0],
        measures: [{ ...TWO[0].measures[0], value: null }, TWO[0].measures[1]],
      }),
    ).toBe(false);
  });

  it("is true only when BOTH measures have lost theirs", () => {
    expect(isRemoved(dropped(TWO[0]))).toBe(true);
  });
});
