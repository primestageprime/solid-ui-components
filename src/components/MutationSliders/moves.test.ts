// @vitest-environment node
// ============================================
// What a move means — the row's fan-out rules as a table. These used to be
// proven only by mounting the row and pressing keys (MutationSliders.test.tsx,
// "pinning"); the ONE mounting test left there proves the wiring, and the
// rules live here where a case costs microseconds.
// ============================================
import { describe, expect, it } from "vitest";
import type { Entity } from "../MarkedSlider/geometry";
import { isPinned, resolveMove, resolveReset, type MoveContext } from "./moves";

const JUNIOR: readonly [number, number] = [40_000, 60_000];
const SENIOR: readonly [number, number] = [70_000, 110_000];
const ANA: Entity = {
  id: "a",
  label: "Ana",
  old: 44_000,
  value: 50_000,
  range: JUNIOR,
};
const BO: Entity = {
  id: "b",
  label: "Bo",
  old: 90_000,
  value: 90_000,
  range: SENIOR,
};
const CAL: Entity = {
  id: "c",
  label: "Cal",
  old: 50_000,
  value: 52_000,
  range: JUNIOR,
};
const GONE: Entity = {
  id: "g",
  label: "Gone",
  old: 48_000,
  value: null,
  range: JUNIOR,
};
const ROW: readonly Entity[] = [ANA, BO, CAL, GONE];

const ctx = (
  selection: readonly string[],
  grouping?: "pin" | "link",
  entities: readonly Entity[] = ROW,
): MoveContext => ({ entities, selection, grouping });

/** The row with Ana at a different amount. */
const withAna = (ana: Entity): readonly Entity[] => [ana, BO, CAL, GONE];

describe("isPinned — two or more selected, and this one among them", () => {
  it.each([
    [[], "a", false],
    [["a"], "a", false],
    [["a", "b"], "a", true],
    [["a", "b"], "c", false],
  ] as const)("selection %j, id %s → %s", (selection, id, pinned) => {
    expect(isPinned(ctx(selection), id)).toBe(pinned);
  });
});

describe("resolveMove — an unpinned dial moves itself", () => {
  it.each([
    ["one selected, intermediate", ["a"], false, "change"],
    ["one selected, committed", ["a"], true, "commit"],
    ["others selected, not this one", ["b", "c"], false, "change"],
  ] as const)("%s", (_, selection, commit, how) => {
    expect(resolveMove(ctx(selection), ANA, 50_000, 51_000, commit)).toEqual({
      moved: [{ id: "a", value: 51_000 }],
      how,
    });
  });
});

describe("resolveMove — a pinned group follows the delta", () => {
  const pinned = ctx(["a", "b"]);

  it("applies the delta this dial travelled to every pinned peer", () => {
    const out = resolveMove(pinned, ANA, 50_000, 51_000, false);
    expect(out).toEqual({
      moved: [
        { id: "a", value: 51_000 },
        { id: "b", value: 91_000 },
      ],
      how: "change",
    });
  });

  it("measures the delta from the CLAMPED amount the dial showed", () => {
    // Ana's raw value sits above her band and the dial showed the ceiling.
    // A 1k cut from the ceiling is a 1k cut for Bo — not a 91k one measured
    // from the raw 150k. Ana herself is clamped from her RAW amount by
    // `moveTogether`, so she stays on the ceiling until the cut exceeds the
    // overshoot (rows.test.ts owns that rule).
    const over = { ...ANA, value: 150_000 };
    const out = resolveMove(
      ctx(["a", "b"], undefined, withAna(over)),
      over,
      60_000,
      59_000,
      false,
    );
    expect(out?.moved).toContainEqual({ id: "b", value: 89_000 });
    expect(out?.moved).toContainEqual({ id: "a", value: 60_000 });
  });

  it("clamps each peer to its OWN band, so one at a ceiling stops there", () => {
    const out = resolveMove(pinned, ANA, 50_000, 60_000, false);
    expect(out).toEqual({
      moved: [
        { id: "a", value: 60_000 },
        { id: "b", value: 100_000 },
      ],
      how: "change",
    });
    // +10k again from the ceiling: Ana holds at 60k, Bo climbs to his own.
    const atCeiling = { ...ANA, value: 60_000 };
    const again = resolveMove(
      ctx(["a", "b"], undefined, withAna(atCeiling)),
      atCeiling,
      60_000,
      70_000,
      false,
    );
    expect(again?.moved).toEqual([
      { id: "a", value: 60_000 },
      { id: "b", value: 100_000 },
    ]);
  });

  it("leaves unselected and removed entities alone", () => {
    const out = resolveMove(pinned, ANA, 50_000, 51_000, true);
    const ids = out?.moved.map((m) => m.id);
    expect(ids).not.toContain("c");
    expect(ids).not.toContain("g");
  });

  it("says nothing for an intermediate zero delta", () => {
    expect(resolveMove(pinned, ANA, 50_000, 50_000, false)).toBeNull();
  });

  it("still commits the whole group on a zero-delta release", () => {
    // A release after a drag that ended where it began: the peers already
    // moved through `onChange` during the drag and must be committed too.
    const out = resolveMove(pinned, ANA, 50_000, 50_000, true);
    expect(out?.how).toBe("commit");
    expect(out?.moved.map((m) => m.id)).toEqual(["a", "b"]);
  });

  it("falls back to the raw value when the dial showed nothing", () => {
    const out = resolveMove(pinned, ANA, null, 51_000, false);
    // delta 0 → nothing intermediate.
    expect(out).toBeNull();
  });
});

describe("resolveMove — a linked group levels to the same amount", () => {
  const linked = ctx(["a", "b"], "link");

  it("sends every selected dial to the target, clamped to its own range", () => {
    const out = resolveMove(linked, ANA, 50_000, 55_000, false);
    expect(out).toEqual({
      moved: [
        { id: "a", value: 55_000 },
        { id: "b", value: 70_000 },
      ],
      how: "change",
    });
  });

  it("reports the whole group on a commit, changed or not", () => {
    const out = resolveMove(linked, BO, 90_000, 90_000, true);
    expect(out?.how).toBe("commit");
    expect(out?.moved.map((m) => m.id)).toEqual(["a", "b"]);
  });

  it("is just a move when the link group has not formed", () => {
    expect(resolveMove(ctx(["a"], "link"), ANA, 50_000, 51_000, false)).toEqual(
      {
        moved: [{ id: "a", value: 51_000 }],
        how: "change",
      },
    );
  });
});

describe("resolveReset — the plan, as a table", () => {
  const DOMAIN: readonly [number, number] = [0, 200_000];
  it.each([
    [
      "no prior amount → the consumer's own onReset",
      { ...ANA, old: null },
      [],
      undefined,
      { kind: "consumer" },
    ],
    [
      "alone → move to the prior amount",
      ANA,
      [],
      undefined,
      { kind: "move", target: 44_000 },
    ],
    [
      "pinned → still a plain move to the prior amount",
      ANA,
      ["a", "b"],
      "pin",
      { kind: "move", target: 44_000 },
    ],
    [
      "prior amount outside the band → clamped onto it",
      { ...ANA, old: 10_000 },
      [],
      undefined,
      { kind: "move", target: 40_000 },
    ],
  ] as const)("%s", (_, entity, selection, grouping, plan) => {
    expect(resolveReset(ctx(selection, grouping), DOMAIN, entity)).toEqual(
      plan,
    );
  });

  it("linked → resetLinked's moves and unlinks", () => {
    // Bo cannot reach Ana's prior 44k (his floor is 70k), so he unlinks.
    const plan = resolveReset(ctx(["a", "b"], "link"), DOMAIN, ANA);
    expect(plan.kind).toBe("linked");
    if (plan.kind !== "linked") return;
    expect(plan.moved).toContainEqual({ id: "a", value: 44_000 });
    expect(plan.unlink).toContain("b");
  });
});
