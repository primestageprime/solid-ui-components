// ============================================
// MutationSliders link math — the headless observation.
//
// `grouping: "link"` moves the selection to the SAME AMOUNT; `"pin"` moves it
// by the same DELTA (`moveTogether`). The two agree until a ceiling splits the
// group — the table below is the case that makes the link mode worth having.
//
//   npx vitest run src/components/MutationSliders/links.test.ts --reporter=verbose
// ============================================
import { describe, expect, it } from "vitest";
import { find, map } from "../../fn";
import type { Entity } from "../MarkedSlider/geometry";
import { applyLinkedMove, resetLinked } from "./links";
import { type PinnedValue, moveTogether, pinTo } from "./rows";

/** The row with `moved` applied — what a consumer's store holds next. */
const apply = (
  entities: readonly Entity[],
  moved: readonly PinnedValue[],
): readonly Entity[] =>
  map(
    (entity: Entity) => ({
      ...entity,
      value:
        find((one: PinnedValue) => one.id === entity.id, moved)?.value ??
        entity.value,
    }),
    entities,
  );

const k = (n: number | null): string => (n === null ? "—" : `${n / 1000}k`);

const PAIR: readonly Entity[] = [
  { id: "A", label: "A (ceiling 115k)", old: 95_000, value: 110_000, range: [70_000, 115_000] },
  { id: "B", label: "B (ceiling 130k)", old: 80_000, value: 100_000, range: [70_000, 130_000] },
];
const IDS = ["A", "B"];

describe("link vs pin — where same-level and same-delta part ways", () => {
  it("a ceiling splits both; only the link re-levels on the way back", () => {
    const snapped = apply(PAIR, pinTo(PAIR, IDS));
    const pinUp = apply(snapped, moveTogether(snapped, IDS, 125_000 - 110_000));
    const pinDown = apply(pinUp, moveTogether(pinUp, IDS, 105_000 - 125_000));
    const linkUp = apply(snapped, applyLinkedMove(snapped, IDS, 125_000));
    const linkDown = apply(linkUp, applyLinkedMove(linkUp, IDS, 105_000));
    const rows = [
      { step: "snap to highest", pinA: k(snapped[0].value), pinB: k(snapped[1].value), linkA: k(snapped[0].value), linkB: k(snapped[1].value) },
      { step: "drag B → 125k", pinA: k(pinUp[0].value), pinB: k(pinUp[1].value), linkA: k(linkUp[0].value), linkB: k(linkUp[1].value) },
      { step: "drag B → 105k", pinA: k(pinDown[0].value), pinB: k(pinDown[1].value), linkA: k(linkDown[0].value), linkB: k(linkDown[1].value) },
    ];
    console.table(rows);
    expect(rows[2]).toEqual({
      step: "drag B → 105k",
      pinA: "95k",
      pinB: "105k",
      linkA: "105k",
      linkB: "105k",
    });
  });
});

describe("applyLinkedMove", () => {
  it("sends every selected dial to the target, each clamped to its own range", () => {
    expect(applyLinkedMove(PAIR, IDS, 125_000)).toEqual([
      { id: "A", value: 115_000 },
      { id: "B", value: 125_000 },
    ]);
  });

  it("skips a removed dial and ignores ids outside the row", () => {
    const row: readonly Entity[] = [
      ...PAIR,
      { id: "C", label: "C", old: 90_000, value: null, range: [70_000, 130_000] },
    ];
    expect(applyLinkedMove(row, ["A", "C", "gone"], 100_000)).toEqual([
      { id: "A", value: 100_000 },
    ]);
  });

  it("reports every member, changed or not, so a commit reaches the whole group", () => {
    expect(applyLinkedMove(PAIR, IDS, 110_000)).toEqual([
      { id: "A", value: 110_000 },
      { id: "B", value: 110_000 },
    ]);
  });
});

describe("resetLinked — a reset is a move to the prior level", () => {
  // Everyone linked at 110k. Resetting P3 sends the group to P3's prior, 95k.
  const ROW: readonly Entity[] = [
    { id: "P1", label: "P1 (70–130k)", old: 80_000, value: 110_000, range: [70_000, 130_000] },
    { id: "P2", label: "P2 (70–130k)", old: 80_000, value: 110_000, range: [70_000, 130_000] },
    { id: "P3", label: "P3 (70–115k)", old: 95_000, value: 110_000, range: [70_000, 115_000] },
    { id: "P4", label: "P4 (100–130k)", old: null, value: 110_000, range: [100_000, 130_000] },
    { id: "P5", label: "P5 (98–130k)", old: 100_000, value: 110_000, range: [98_000, 130_000] },
    { id: "P6", label: "P6 removed", old: 90_000, value: null, range: [70_000, 130_000] },
  ];
  const cases: readonly [string, readonly string[], string][] = [
    ["all can reach", ["P1", "P2", "P3"], "P3"],
    ["P4's floor is above 95k", ["P2", "P3", "P4"], "P3"],
    ["reset dial not linked", ["P1", "P2"], "P3"],
    ["3 linked, 2 can't reach → dissolves", ["P3", "P4", "P5"], "P3"],
    ["removed member unlinks", ["P2", "P3", "P6"], "P3"],
    ["new dial (no prior): nothing", ["P3", "P4"], "P4"],
  ];

  it("prints who moves where and who unlinks", () => {
    const rows = map(([name, selected, id]) => {
      const out = resetLinked(ROW, selected, id);
      return {
        case: name,
        linked: selected.join(","),
        reset: id,
        moves: map((m: PinnedValue) => `${m.id}→${k(m.value)}`, out.moves).join(" "),
        unlink: out.unlink.join(","),
      };
    }, cases);
    console.table(rows);
    expect(map((r) => [r.moves, r.unlink], rows)).toEqual([
      ["P1→95k P2→95k P3→95k", ""],
      ["P2→95k P3→95k", "P4"],
      ["P3→95k", ""],
      ["P3→95k", "P3,P4,P5"],
      ["P2→95k P3→95k", "P6"],
      ["", ""],
    ]);
  });
});
