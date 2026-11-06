// LevelsTimeline under a plot lock (thorcasting #4395): a date sits at the x
// ScrubChart draws it at (the day-cell rule), and the axis is the lead chart's.
import { describe, expect, it } from "vitest";
import { dayCellX, dayCount } from "../Chart/plotLock";
import { hoverAt, levelsRailGeometry, pickDay, timeAtX, timeOf } from "./geometry";
import type { Level, Mutation, TimeDomain, Transfer } from "./geometry";

const utc = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);
const DOMAIN: TimeDomain = [utc("2026-11-06"), utc("2027-11-05")];
const LEVELS: readonly Level[] = [
  {
    id: "a",
    label: "A",
    value: 100,
    points: [{ at: utc("2026-11-06"), count: 3 }],
  },
];
const MUTATIONS: readonly Mutation[] = [
  { id: "m1", at: utc("2027-01-29"), label: "1" },
  { id: "m2", at: utc("2027-04-06"), label: "2" },
];
const TRANSFERS: readonly Transfer[] = [];
const BOX = { width: 1400, height: 200 };

const geometry = (locked?: Parameters<typeof levelsRailGeometry>[0]["locked"]) =>
  levelsRailGeometry({
    levels: LEVELS,
    transfers: TRANSFERS,
    mutations: MUTATIONS,
    domain: DOMAIN,
    box: BOX,
    locked,
  });

describe("LevelsTimeline geometry under a plot lock", () => {
  const LEFT = 88;
  const RIGHT = 140;
  const first = timeOf(DOMAIN[0]);
  const last = timeOf(DOMAIN[1]);
  const days = dayCount(first, last);
  const locked = geometry({
    left: LEFT,
    right: RIGHT,
    ticks: [
      { at: Date.UTC(2026, 10, 6), label: "Nov" },
      { at: Date.UTC(2027, 0, 29), label: "Jan" },
    ],
  });

  it("puts the plot at the lock's insets", () => {
    expect(locked.frame.plotLeft).toBe(LEFT);
    expect(locked.frame.plotRight).toBe(BOX.width - RIGHT);
  });

  it("reports its natural insets from before the lock", () => {
    const own = geometry();
    expect(locked.naturalInsets).toEqual(own.naturalInsets);
    expect(own.naturalInsets.right).toBeGreaterThan(0);
  });

  it("maps every flag and both ends to the x ScrubChart uses", () => {
    const rows = [
      ["m1", Date.UTC(2027, 0, 29)],
      ["m2", Date.UTC(2027, 3, 6)],
    ] as const;
    expect(locked.flags.length).toBe(2);
    for (const [name, at] of rows) {
      const want = dayCellX(
        at,
        first,
        days,
        locked.frame.plotLeft,
        locked.frame.plotRight,
      );
      const tick = locked.ticks.find((t) => t.at === at);
      const flag = locked.flags.find((f) => f.id === name);
      expect(tick).toBeDefined();
      expect(flag).toBeDefined();
      expect(Math.abs(tick!.x - want)).toBeLessThan(0.5);
      expect(Math.abs(flag!.x - want)).toBeLessThan(0.5);
    }
    // The two ticks the lead published land where its cells put them.
    for (const tick of locked.ticks.filter((t) => t.showLabel))
      expect(
        Math.abs(
          tick.x -
            dayCellX(
              tick.at,
              first,
              days,
              locked.frame.plotLeft,
              locked.frame.plotRight,
            ),
        ),
      ).toBeLessThan(0.5);
  });

  it("draws the lead's labels, and flag dates as long bare ticks", () => {
    const labelled = locked.ticks.filter((t) => t.showLabel);
    expect(labelled.map((t) => t.label)).toEqual(["Nov", "Jan"]);
    const flagTick = locked.ticks.find((t) => t.at === Date.UTC(2027, 3, 6));
    expect(flagTick?.event).toBe(true);
    expect(flagTick?.showLabel).toBe(false);
    // The flag on a lead tick keeps its label and its length.
    const shared = locked.ticks.find((t) => t.at === Date.UTC(2027, 0, 29));
    expect(shared?.event).toBe(true);
    expect(shared?.showLabel).toBe(true);
  });

  it("reads a pointer back by the same rule it draws by (pick, hover, drag)", () => {
    // A click on a day's drawn x must report THAT day, and the crosshair must
    // sit on it — the inverse reads the frame's day-cell ends too.
    for (const iso of ["2026-11-06", "2027-01-29", "2027-04-06", "2027-11-05"]) {
      const at = Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
      const x = dayCellX(at, first, days, locked.frame.plotLeft, locked.frame.plotRight);
      expect(Math.abs(timeAtX(DOMAIN, x, locked.frame) - at)).toBeLessThan(60_000);
      const hover = hoverAt(LEVELS, DOMAIN, x, locked.frame, pickDay);
      expect(hover.at).toBe(at);
      expect(Math.abs(hover.x - x)).toBeLessThan(0.5);
    }
  });

  it("without a lock the dated axis is unchanged", () => {
    const own = geometry();
    expect(own.frame.plotRight).toBe(BOX.width - 14);
    expect(own.ticks.some((t) => /^\d{4}-/.test(t.label))).toBe(true);
  });
});
