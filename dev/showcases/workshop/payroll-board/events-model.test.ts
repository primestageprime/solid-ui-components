import { describe, expect, it } from "vitest";
import {
  clampMutationTime,
  isoDayOf,
  levelsRailGeometry,
} from "../../../../src/components/LevelsTimeline/geometry";
import { filter, find, map } from "../../../../src/fn";
import {
  PAY_DOMAIN,
  PAY_EVENTS,
  PAY_VALUE_DOMAIN,
  PROJECTION_START,
  addEventAt,
  moveEvent,
  observe,
  removeEvent,
  selectionAfterRemove,
  spanDomain,
  tabsOf,
  toTimeline,
} from "./events-model";

const day = (iso: string): number => Date.parse(`${iso}T00:00:00Z`);

const geometryOf = (events: typeof PAY_EVENTS) =>
  levelsRailGeometry({
    ...toTimeline(events),
    domain: PAY_DOMAIN,
    valueDomain: PAY_VALUE_DOMAIN,
  });

describe("payroll board — events model", () => {
  it("derives levels, flows and numbered-flag details from baseline + events", () => {
    const timeline = toTimeline(PAY_EVENTS);
    expect(map((level) => level.value, timeline.levels)).toEqual([80000, 95000, 110000]);
    expect(timeline.mutations).toHaveLength(5);
    expect(find((m) => m.id === "raise-p2", timeline.mutations)?.details).toEqual([
      "Person 2 $80k → $95k",
    ]);
    // The baseline is on the books at the window's start: no event there.
    expect(filter((t) => Number(t.at) === PROJECTION_START, timeline.transfers)).toHaveLength(0);
    console.log(`\n${observe(PAY_EVENTS)}`);
  });

  it("moves an event's flows WITH its flag — same timestamp, no stray dropline", () => {
    const moved = moveEvent(PAY_EVENTS, "hire-p5", day("2026-12-02"));
    const times = new Set(map((t) => Number(t.at), toTimeline(moved).transfers));
    expect(times.has(day("2026-12-02"))).toBe(true);
    expect(times.has(day("2026-11-15"))).toBe(false);
  });

  it("clamps pin 4 a day short of pin 5 (the close pair)", () => {
    const { mutations } = toTimeline(PAY_EVENTS);
    expect(clampMutationTime(mutations, "raise-p1", day("2027-01-14"), PAY_DOMAIN)).toBe(
      day("2027-01-09"),
    );
  });

  it("labels the tabs in flag order, the year only where it changes", () => {
    expect(map((tab) => tab.label, tabsOf(PAY_EVENTS))).toEqual([
      "2026-09-01",
      "10-03",
      "11-15",
      "2027-01-03",
      "01-10",
    ]);
    expect(map((tab) => tab.id, tabsOf(PAY_EVENTS))).toEqual(
      map((m) => m.id, toTimeline(PAY_EVENTS).mutations),
    );
  });

  it("re-derives the labels after a delete — 01-10 regains its year", () => {
    const after = removeEvent(PAY_EVENTS, "raise-p1");
    expect(map((tab) => tab.label, tabsOf(after))).toEqual([
      "2026-09-01",
      "10-03",
      "11-15",
      "2027-01-10",
    ]);
    expect(toTimeline(after).mutations).toHaveLength(4);
    expect(
      filter((t) => Number(t.at) === day("2027-01-03"), toTimeline(after).transfers),
    ).toHaveLength(0);
  });

  it("deleting the FIRST event moves neither axis, and the rails still start at the window", () => {
    // Peter: "I deleted the first one and the chart shrunk."
    const before = geometryOf(PAY_EVENTS);
    const after = geometryOf(removeEvent(PAY_EVENTS, "hire-p4"));
    expect(after.yDomain).toEqual(before.yDomain);
    expect(after.frame).toEqual(before.frame);
    expect(map((tick) => tick.y, after.yTicks)).toEqual(map((tick) => tick.y, before.yTicks));
    // The baseline rails begin at the window's left edge either way.
    const firstX = (g: typeof before) =>
      Math.min(...map((rail) => rail.spans[0]?.x1 ?? Number.POSITIVE_INFINITY, g.rails));
    expect(firstX(after)).toBe(before.frame.plotLeft);
    expect(firstX(before)).toBe(before.frame.plotLeft);
  });

  it("moves the selection to the neighbour when the selected tab is deleted", () => {
    expect(selectionAfterRemove(PAY_EVENTS, "hire-p5", "hire-p5")).toBe("raise-p1");
    expect(selectionAfterRemove(PAY_EVENTS, "raise-p3", "raise-p3")).toBe("raise-p1");
    expect(selectionAfterRemove(PAY_EVENTS, "hire-p5", "raise-p2")).toBe("raise-p2");
    expect(selectionAfterRemove([PAY_EVENTS[0]], "hire-p4", "hire-p4")).toBeUndefined();
  });

  it("adds a hire at a picked date, in time order, and selects it", () => {
    const { events, id } = addEventAt(PAY_EVENTS, day("2026-12-01"));
    expect(id).toBe("added-2026-12-01");
    expect(map((tab) => tab.label, tabsOf(events))).toEqual([
      "2026-09-01",
      "10-03",
      "11-15",
      "12-01",
      "2027-01-03",
      "01-10",
    ]);
    expect(find((m) => m.id === id, toTimeline(events).mutations)?.details).toEqual([
      "Person 6 joins at $80k",
    ]);
  });

  it("selects the existing event when the pick lands on its date", () => {
    const { events, id } = addEventAt(PAY_EVENTS, day("2026-10-03"));
    expect(events).toBe(PAY_EVENTS);
    expect(id).toBe("raise-p2");
  });

  it("windows the events by span — 3m shows only what falls inside it", () => {
    expect(map((d) => isoDayOf(d), spanDomain("3m"))).toEqual([
      "2026-08-01",
      "2026-11-01",
    ]);
    expect(map((tab) => tab.id, tabsOf(PAY_EVENTS, spanDomain("3m")))).toEqual([
      "hire-p4",
      "raise-p2",
    ]);
    expect(toTimeline(PAY_EVENTS, spanDomain("2y")).mutations).toHaveLength(5);
  });
});
