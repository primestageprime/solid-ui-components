import { describe, expect, it } from "vitest";
import type { Entity } from "../MarkedSlider/geometry";
import {
  type SliderGroup,
  groupEntity,
  groupRow,
  resetGroup,
  shiftGroup,
  spreadOf,
} from "./groups";

const BAND: readonly [number, number] = [30_000, 80_000];
const roofer = (id: string, value: number | null, old: number | null) =>
  ({ id, label: id, value, old, range: BAND }) satisfies Entity;

const ROOFERS: readonly Entity[] = [
  roofer("ana", 50_000, 50_000),
  roofer("bo", 60_000, 55_000),
  roofer("cy", 78_000, 78_000),
];
const ROOF: SliderGroup = {
  id: "roof",
  label: "Roofer",
  memberIds: ["ana", "bo", "cy"],
};

describe("groupEntity", () => {
  it("is the mean on the step, the union range and the mean old", () => {
    const entity = groupEntity(ROOF, ROOFERS, 1_000);
    expect(entity).toMatchObject({
      id: "group:roof",
      label: "Roofer × 3",
      value: 63_000, // 62,667 on the $1K grid
      old: 61_000, // 61,000
      range: [30_000, 80_000],
      item: "group:roof",
    });
  });

  it("has no × for one member, and no old when every member is new", () => {
    const entity = groupEntity(ROOF, [roofer("ana", 50_000, null)]);
    expect(entity.label).toBe("Roofer");
    expect(entity.old).toBeNull();
  });

  it("averages only the present members", () => {
    const entity = groupEntity(ROOF, [
      roofer("ana", 50_000, 50_000),
      roofer("bo", null, 60_000),
    ]);
    expect(entity.value).toBe(50_000);
  });
});

describe("spreadOf", () => {
  it("is the lowest and highest present amount", () => {
    expect(spreadOf(ROOFERS)).toEqual({ lo: 50_000, hi: 78_000 });
  });
});

describe("shiftGroup", () => {
  it("moves every member by the delta, clamped into its own band", () => {
    expect(shiftGroup(ROOFERS, 63_000, 68_000)).toEqual([
      { id: "ana", value: 55_000 },
      { id: "bo", value: 65_000 },
      { id: "cy", value: 80_000 }, // 83,000 stops at the band top
    ]);
  });

  it("leaves a removed member out", () => {
    expect(
      shiftGroup([roofer("ana", 50_000, 50_000), roofer("bo", null, 1)], 0, 1),
    ).toEqual([{ id: "ana", value: 50_001 }]);
  });
});

describe("resetGroup", () => {
  it("puts back only the members that moved off their old amount", () => {
    expect(resetGroup(ROOFERS)).toEqual([{ id: "bo", value: 55_000 }]);
  });

  it("leaves a new member alone", () => {
    expect(resetGroup([roofer("new", 40_000, null)])).toEqual([]);
  });
});

describe("groupRow", () => {
  const owner = { ...roofer("owner", 70_000, 70_000), label: "Owner" };
  const entities: readonly Entity[] = [owner, ...ROOFERS];
  const ids = (slots: ReturnType<typeof groupRow>) =>
    slots.map((slot) => `${slot.kind}:${slot.entity.id}`);

  it("collapses a group to one slot where its first member stood", () => {
    expect(ids(groupRow(entities, [ROOF], () => false))).toEqual([
      "plain:owner",
      "group:group:roof",
    ]);
  });

  it("adds each member after the group dial when open", () => {
    expect(ids(groupRow(entities, [ROOF], () => true))).toEqual([
      "plain:owner",
      "group:group:roof",
      "member:ana",
      "member:bo",
      "member:cy",
    ]);
  });

  it("passes an entity in no group through untouched", () => {
    const [slot] = groupRow(entities, [ROOF], () => false);
    expect(slot.entity).toBe(owner);
  });

  it("draws a group of one as the member's dial under the group label", () => {
    const [slot] = groupRow(
      [ROOFERS[0]],
      [{ id: "fm", label: "Foreman", memberIds: ["ana"] }],
      () => false,
    );
    expect(slot).toMatchObject({
      kind: "member",
      solo: true,
      name: "ana",
      entity: { id: "ana", label: "Foreman", item: "group:fm" },
    });
  });
});
