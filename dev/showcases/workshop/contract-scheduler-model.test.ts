import { describe, expect, it } from "vitest";
import {
  type Job,
  type Role,
  type SchedulerState,
  backToBack,
  barOf,
  makeAxis,
  cost,
  dragTo,
  estimate,
  flowOnce,
  hourBand,
  layFixed,
  overFlags,
  pack,
  phasesOf,
  schedule,
  setBound,
  setMode,
  setValue,
  toggleLock,
  waitsOfFixed,
  workdays,
} from "./contract-scheduler-model";

// ── fixtures ────────────────────────────────────────────────────────────────

const ROLES: readonly Role[] = [
  { id: "office", label: "Office", hoursPerDay: 8, rate: 25 },
  { id: "roofers", label: "Roofers", hoursPerDay: 16, rate: 125 },
  { id: "seamer", label: "Seamer", hoursPerDay: 8, rate: 140 },
];

const job = (id: number, over: Partial<Job> = {}): Job => ({
  id,
  name: `Job ${id}`,
  status: "TODO",
  on: true,
  locked: false,
  placement: null,
  lines: [
    {
      key: "prep",
      label: "Prep",
      unit: "h",
      role: "roofers",
      maxPerDay: 16,
      min: 8,
      max: 32,
      value: 16,
      prior: 16,
    },
    {
      key: "mat",
      label: "Materials",
      unit: "$",
      min: 1000,
      max: 4000,
      value: 2000,
      prior: 2000,
    },
    {
      key: "inst",
      label: "Install",
      unit: "h",
      role: "roofers",
      maxPerDay: 16,
      min: 16,
      max: 64,
      value: 32,
      prior: 32,
    },
  ],
  ...over,
});

const state = (
  jobs: readonly Job[],
  over: Partial<SchedulerState> = {},
): SchedulerState => ({
  jobs,
  mode: "auto",
  order: jobs.filter((j) => !j.locked).map((j) => j.id),
  horizon: 40,
  ...over,
});

const daysOf = (s: SchedulerState) => {
  const out = schedule(s, ROLES);
  return Object.fromEntries(
    Object.entries(out.byJob).map(([id, r]) => [
      id,
      r.phases.map((p) => p.days),
    ]),
  );
};

// ── money ───────────────────────────────────────────────────────────────────

describe("cost and estimate", () => {
  it("prices an hour line at its role's rate and a dollar line as itself", () => {
    const [prep, mat] = job(1).lines;
    expect(cost(prep, ROLES)).toBe(16 * 125);
    expect(cost(mat, ROLES)).toBe(2000);
  });

  it("sums every line, and the range sums every min and every max", () => {
    const j = job(1);
    expect(estimate(j, ROLES)).toEqual({
      value: 16 * 125 + 2000 + 32 * 125,
      min: 8 * 125 + 1000 + 16 * 125,
      max: 32 * 125 + 4000 + 64 * 125,
    });
  });
});

// ── phases and fixed placement ──────────────────────────────────────────────

describe("phasesOf", () => {
  it("keeps hour lines in order, skips dollar and zero-hour lines, and counts whole crew-days", () => {
    const j = job(1, {
      lines: [
        ...job(1).lines,
        {
          key: "perm",
          label: "Permits",
          unit: "h",
          role: "office",
          maxPerDay: 4,
          min: 0,
          max: 8,
          value: 0,
          prior: 0,
        },
      ],
    });
    expect(phasesOf(j).map((p) => [p.key, p.days])).toEqual([
      ["prep", 1],
      ["inst", 2],
    ]);
  });

  it("rounds a partial last day up", () => {
    const j = setValue(state([job(1)]), 1, "inst", 40).jobs[0];
    expect(phasesOf(j).find((p) => p.key === "inst")?.days).toBe(3);
  });
});

describe("backToBack and layFixed", () => {
  it("lays phases on consecutive working days", () => {
    expect(backToBack(job(1), 5)).toEqual([[5], [6, 7]]);
  });

  it("keeps a stored day list whose length still fits, including a pause", () => {
    const laid = layFixed(job(1), [[2], [4, 6]]);
    expect(laid.map((p) => p.days)).toEqual([[2], [4, 6]]);
  });

  it("re-lays a phase contiguously from its first day when its length changed", () => {
    const laid = layFixed(job(1), [[2], [4]]);
    expect(laid[1].days).toEqual([4, 5]);
  });

  it("never lets a phase start before its predecessor ends", () => {
    const laid = layFixed(job(1), [[5], [3, 4]]);
    expect(laid[1].days).toEqual([6, 7]);
  });

  it("reports the days between and inside phases as waits", () => {
    const laid = layFixed(job(1), [[2], [4, 6]]);
    expect(waitsOfFixed(laid).map((w) => [w.s, w.e, w.role])).toEqual([
      [3, 3, "roofers"],
      [5, 5, "roofers"],
    ]);
  });
});

// ── the scheduler ───────────────────────────────────────────────────────────

describe("schedule, full auto", () => {
  it("runs unlocked jobs in queue order into free crew time, a whole crew-day at a time", () => {
    // roofers 16 h/day and each job wants 16 h/day: strictly one job at a time
    expect(daysOf(state([job(1), job(2)]))).toEqual({
      1: [[0], [1, 2]],
      2: [[3], [4, 5]],
    });
  });

  it("follows the queue order, not the id", () => {
    expect(daysOf(state([job(1), job(2)], { order: [2, 1] }))[2]).toEqual([
      [0],
      [1, 2],
    ]);
  });

  it("records a wait between phases, naming the jobs that hold the role", () => {
    const office: Job = job(2, {
      lines: [
        {
          key: "perm",
          label: "Permits",
          unit: "h",
          role: "office",
          maxPerDay: 8,
          min: 0,
          max: 8,
          value: 8,
          prior: 8,
        },
        {
          key: "inst",
          label: "Install",
          unit: "h",
          role: "roofers",
          maxPerDay: 16,
          min: 0,
          max: 64,
          value: 16,
          prior: 16,
        },
      ],
    });
    const out = schedule(state([job(1), office]), ROLES);
    // job 2 does permits on day 0, then waits for roofers (busy on job 1 until day 2)
    expect(out.byJob[2].phases.map((p) => p.days)).toEqual([[0], [3]]);
    expect(out.byJob[2].waits).toEqual([
      { s: 1, e: 2, role: "roofers", by: [1] },
    ]);
  });

  it("gives a phase in progress its crew before a higher-queued job waiting to start", () => {
    // job 2 is FIRST in the queue, but spends day 0 on permits; job 1's two-day
    // prep starts on day 0 and still holds the roofers on day 1
    const first: Job = job(2, {
      lines: [
        {
          key: "perm",
          label: "Permits",
          unit: "h",
          role: "office",
          maxPerDay: 8,
          min: 0,
          max: 8,
          value: 8,
          prior: 8,
        },
        {
          key: "inst",
          label: "Install",
          unit: "h",
          role: "roofers",
          maxPerDay: 16,
          min: 0,
          max: 64,
          value: 16,
          prior: 16,
        },
      ],
    });
    const long = setValue(state([job(1)]), 1, "prep", 32).jobs[0];
    const out = schedule(state([long, first], { order: [2, 1] }), ROLES);
    expect(out.byJob[1].phases[0].days).toEqual([0, 1]);
    expect(out.byJob[2].waits).toEqual([
      { s: 1, e: 1, role: "roofers", by: [1] },
    ]);
    // once job 1's prep is done, queue order decides again: job 2 goes first
    expect(out.byJob[2].phases[1].days).toEqual([2]);
    expect(out.byJob[1].phases[1].days).toEqual([3, 4]);
  });

  it("always grants a locked job, even when that overbooks a role", () => {
    const locked = { ...job(1), locked: true, placement: [[0], [1, 2]] };
    const other = { ...job(2), placement: [[0], [1, 2]] };
    const out = schedule(state([locked, other], { mode: "manual" }), ROLES);
    expect(out.load.roofers[0]).toBe(32);
  });

  it("schedules nothing for a job that is switched off", () => {
    const out = schedule(state([job(1, { on: false })]), ROLES);
    expect(out.byJob[1]).toBeUndefined();
    expect(out.load.roofers.every((h) => h === 0)).toBe(true);
  });
});

describe("schedule, manual", () => {
  it("puts every placed job on its own days and does not enforce capacity", () => {
    const a = { ...job(1), placement: [[0], [1, 2]] };
    const b = { ...job(2), placement: [[0], [1, 2]] };
    const out = schedule(state([a, b], { mode: "manual" }), ROLES);
    expect(out.byJob[1].phases[0].days).toEqual([0]);
    expect(out.byJob[2].phases[0].days).toEqual([0]);
    expect(out.load.roofers[0]).toBe(32);
  });

  it("leaves an unplaced job out", () => {
    const out = schedule(state([job(1)], { mode: "manual" }), ROLES);
    expect(out.byJob[1]).toBeUndefined();
  });
});

// ── packing and over-capacity ───────────────────────────────────────────────

describe("pack", () => {
  it("uses the fewest rows: a bar shares a row whenever it does not overlap", () => {
    const rows = pack([
      { id: 1, s: 0, e: 3 },
      { id: 2, s: 4, e: 6 },
      { id: 3, s: 2, e: 5 },
      { id: 4, s: 7, e: 9 },
    ]);
    expect(Object.fromEntries(rows.map((r) => [r.id, r.row]))).toEqual({
      1: 0,
      2: 0,
      3: 1,
      4: 0,
    });
  });
});

describe("overFlags", () => {
  it("blames the job that starts latest among those holding an overbooked role", () => {
    const a = { ...job(1), placement: [[0], [1, 2]] };
    const b = { ...job(2), placement: [[1], [2, 3]] };
    const s = state([a, b], { mode: "manual" });
    const flags = overFlags(schedule(s, ROLES), ROLES);
    expect(Object.keys(flags)).toEqual(["2"]);
    expect(flags[2].roofers).toEqual([1, 2]);
  });

  it("flags nothing when every role is within its hours", () => {
    expect(overFlags(schedule(state([job(1), job(2)]), ROLES), ROLES)).toEqual(
      {},
    );
  });
});

// ── state transitions and the laws of ADR 0028's addendum ──────────────────

const seed = (): SchedulerState =>
  state([
    { ...job(1), locked: true, placement: backToBack(job(1), 2) },
    job(2),
    job(3, {
      lines: [
        {
          key: "inst",
          label: "Install",
          unit: "h",
          role: "roofers",
          maxPerDay: 16,
          min: 0,
          max: 96,
          value: 48,
          prior: 48,
        },
      ],
    }),
  ]);

describe("modes and Flow once", () => {
  it("law: full auto → manual → full auto with no edits changes nothing", () => {
    const s0 = seed();
    const s2 = setMode(setMode(s0, "manual", ROLES), "auto", ROLES);
    expect(daysOf(s2)).toEqual(daysOf(s0));
    expect(schedule(s2, ROLES).load).toEqual(schedule(s0, ROLES).load);
  });

  it("law: switching to manual keeps every job exactly where auto put it", () => {
    const s0 = seed();
    expect(daysOf(setMode(s0, "manual", ROLES))).toEqual(daysOf(s0));
  });

  it("law: Flow once is idempotent", () => {
    const m = setMode(seed(), "manual", ROLES);
    const once = flowOnce(m, ROLES);
    expect(flowOnce(once, ROLES)).toEqual(once);
  });

  it("law: a locked job keeps its days through every switch and every flow", () => {
    const s0 = seed();
    const lockedDays = daysOf(s0)[1];
    const after = flowOnce(
      setMode(
        setMode(setMode(s0, "manual", ROLES), "auto", ROLES),
        "manual",
        ROLES,
      ),
      ROLES,
    );
    expect(daysOf(after)[1]).toEqual(lockedDays);
  });

  it("Flow once keeps manual mode, keeps the left-to-right order, and fits within capacity", () => {
    const m = setMode(seed(), "manual", ROLES);
    const flowed = flowOnce(dragTo(m, 2, 20, ROLES), ROLES); // job 2 now starts after job 3
    expect(flowed.mode).toBe("manual");
    const d = daysOf(flowed);
    expect(d[3][0][0]).toBeLessThan(d[2][0][0]);
    expect(d[1]).toEqual(daysOf(m)[1]);
    expect(overFlags(schedule(flowed, ROLES), ROLES)).toEqual({});
  });
});

describe("dragging", () => {
  it("in full auto changes the order, never a date", () => {
    const s = seed();
    const next = dragTo(s, 3, 0, ROLES);
    expect(next.order).toEqual([3, 2]);
    expect(next.jobs.find((j) => j.id === 3)?.placement).toBeNull();
  });

  it("in manual moves the whole job, keeping its shape", () => {
    const m = setMode(seed(), "manual", ROLES);
    const before = m.jobs.find((j) => j.id === 2)?.placement ?? [];
    const next = dragTo(m, 2, (before[0]?.[0] ?? 0) + 5, ROLES);
    const after = next.jobs.find((j) => j.id === 2)?.placement ?? [];
    expect(after).toEqual(before.map((ds) => ds.map((w) => w + 5)));
  });

  it("does nothing to a locked job", () => {
    const m = setMode(seed(), "manual", ROLES);
    expect(dragTo(m, 1, 30, ROLES)).toBe(m);
  });

  it("places an unplaced job in manual where it is dropped", () => {
    const m = state([job(1)], { mode: "manual" });
    expect(dragTo(m, 1, 4, ROLES).jobs[0].placement).toEqual([[4], [5, 6]]);
  });
});

// Peter, 2026-09-30: dragging a bar SUGGESTS its start date. In full auto the
// drop snaps to the nearest range start at or LEFT of it and takes that slot;
// the queue reflows behind it. In manual it lands on the exact day and nothing
// else moves.
describe("dragging suggests a start (Peter's June 1 / Aug 1 example)", () => {
  /** A one-phase job on the seamer (one crew, 8 h a day): `days` long. */
  const seam = (id: number, days: number, over: Partial<Job> = {}): Job => ({
    ...job(id),
    lines: [
      {
        key: "seam",
        label: "Seam",
        unit: "h",
        role: "seamer",
        maxPerDay: 8,
        min: 0,
        max: 8 * days * 3,
        value: 8 * days,
        prior: 8 * days,
      },
    ],
    ...over,
  });
  // One crew, so the queue runs back to back: 1 "June 1" (day 0, 40 days),
  // 2 "Aug 1" (day 40, 10 days), 3 after them (day 50, 5 days).
  const june = (): SchedulerState =>
    state([seam(1, 40), seam(2, 10), seam(3, 5)], { horizon: 80 });
  const startsOf = (s: SchedulerState) =>
    Object.fromEntries(
      Object.entries(daysOf(s)).map(([id, ph]) => [id, ph[0][0]]),
    );

  it("the fixture starts June 1, Aug 1, then after", () => {
    expect(startsOf(june())).toEqual({ 1: 0, 2: 40, 3: 50 });
  });

  it("full auto: a drop on June 5 takes June 1's slot; June 1 and Aug 1 shift right behind it", () => {
    const next = dragTo(june(), 3, 5, ROLES);
    expect(next.order).toEqual([3, 1, 2]);
    // 3 begins on June 1's day; 1 begins after 3 ends; 2 after 1
    expect(startsOf(next)).toEqual({ 3: 0, 1: 5, 2: 45 });
  });

  it("full auto: a drop exactly on a start takes that start's slot", () => {
    const next = dragTo(june(), 3, 40, ROLES);
    expect(next.order).toEqual([1, 3, 2]);
    expect(startsOf(next)).toEqual({ 1: 0, 3: 40, 2: 45 });
  });

  it("full auto: a drop between its own start and the next leaves the queue as it is", () => {
    const s = june();
    expect(dragTo(s, 2, 45, ROLES)).toBe(s);
  });

  it("full auto: a drop left of every start goes to the front; a locked job's start is never a snap target", () => {
    // a locked job holds the seamer on days 0–9, so job 1 starts on day 10
    const s = state(
      [
        seam(9, 10, { locked: true, placement: [range(0, 10)] }),
        seam(1, 20),
        seam(2, 5),
      ],
      { horizon: 80 },
    );
    expect(startsOf(s)).toEqual({ 9: 0, 1: 10, 2: 30 });
    const next = dragTo(s, 2, 3, ROLES);
    expect(next.order).toEqual([2, 1]);
    // the locked job stays put; 2 flows into the first free day
    expect(startsOf(next)).toEqual({ 9: 0, 2: 10, 1: 15 });
  });

  // A queue slot alone is invisible when the dragged job's crew is free (it
  // would still start on day 0), so the drop also sets a NOT-BEFORE floor at
  // the slot's start: ADR 0028's `phase.not_before`.
  const uncontended = (): SchedulerState =>
    state(
      [
        seam(9, 5, { locked: true, placement: [range(0, 5)] }),
        seam(1, 10), // seamer: waits for the locked job, starts day 5
        job(2), // roofers: free, starts day 0
      ],
      { horizon: 80 },
    );

  it("full auto: an uncontended drag right still lands on the slot's date", () => {
    const s = uncontended();
    expect(startsOf(s)).toEqual({ 9: 0, 1: 5, 2: 0 });
    const next = dragTo(s, 2, 7, ROLES);
    expect(next.order).toEqual([2, 1]);
    expect(next.jobs.find((j) => j.id === 2)?.notBefore).toBe(5);
    expect(startsOf(next)).toEqual({ 9: 0, 1: 5, 2: 5 });
  });

  it("full auto: dragging back left of every start clears the floor", () => {
    const moved = dragTo(uncontended(), 2, 7, ROLES);
    const back = dragTo(moved, 2, 1, ROLES);
    expect(back.jobs.find((j) => j.id === 2)?.notBefore ?? null).toBeNull();
    expect(startsOf(back)[2]).toBe(0);
  });

  it("laws hold with a floor: auto → manual → auto, and Flow once is idempotent", () => {
    const s = dragTo(uncontended(), 2, 7, ROLES);
    expect(daysOf(setMode(setMode(s, "manual", ROLES), "auto", ROLES))).toEqual(
      daysOf(s),
    );
    const once = flowOnce(setMode(s, "manual", ROLES), ROLES);
    expect(flowOnce(once, ROLES)).toEqual(once);
  });

  it("manual: a drag clears any floor an auto drag set", () => {
    const m = setMode(dragTo(uncontended(), 2, 7, ROLES), "manual", ROLES);
    const next = dragTo(m, 2, 20, ROLES);
    expect(next.jobs.find((j) => j.id === 2)?.notBefore ?? null).toBeNull();
    expect(startsOf(next)[2]).toBe(20);
  });

  it("manual: the job lands on exactly the dropped day and no other job's dates change", () => {
    const m = setMode(june(), "manual", ROLES);
    const next = dragTo(m, 3, 5, ROLES);
    expect(startsOf(next)).toEqual({ 1: 0, 2: 40, 3: 5 });
    for (const id of [1, 2])
      expect(next.jobs.find((j) => j.id === id)?.placement).toEqual(
        m.jobs.find((j) => j.id === id)?.placement,
      );
  });
});

const range = (from: number, n: number): number[] =>
  Array.from({ length: n }, (_, i) => from + i);

// Peter, 2026-09-30: "in manual mode, if I drag one job, no other job's
// timestamps ever change." Every other job's laid phases (days, start, end)
// and waits are snapshotted before and after a manual drag.
describe("a manual drag never changes another job's days", () => {
  const others = (s: SchedulerState, id: number) => {
    const sch = schedule(s, ROLES);
    return Object.fromEntries(
      Object.entries(sch.byJob)
        .filter(([k]) => Number(k) !== id)
        .map(([k, js]) => [
          k,
          {
            phases: js.phases.map((p) => [p.s, p.e, [...p.days]]),
            waits: js.waits,
          },
        ]),
    );
  };
  const manual = () => setMode(seed(), "manual", ROLES);
  const cases: readonly (readonly [string, number])[] = [
    ["later, clear of everything", 30],
    ["onto another job's days (overbooking)", 0],
    ["onto the locked job's days", 2],
    ["past the horizon's edge", 39],
  ];
  for (const [what, w0] of cases)
    it(`dragging job 2 ${what}`, () => {
      const m = manual();
      expect(others(dragTo(m, 2, w0, ROLES), 2)).toEqual(others(m, 2));
    });

  // Holidays and weekends are not indices (the calendar maps index → date and
  // a drag never touches the calendar), so "across a holiday" is any drag
  // over the others' indices: pinned here for job 3 as well.
  it("dragging job 3 across the other jobs' days", () => {
    const m = manual();
    expect(others(dragTo(m, 3, 12, ROLES), 3)).toEqual(others(m, 3));
  });

  it("a chain of drags leaves the undragged jobs exactly where they began", () => {
    const m = manual();
    const after = [5, 20, 1, 33].reduce((s, w) => dragTo(s, 3, w, ROLES), m);
    expect(others(after, 3)).toEqual(others(m, 3));
  });
});

describe("toggleLock", () => {
  it("locks a job where it currently sits and takes it out of the queue", () => {
    const s = seed();
    const next = toggleLock(s, 2, ROLES);
    const j = next.jobs.find((x) => x.id === 2);
    expect(j?.locked).toBe(true);
    expect(j?.placement).toEqual(daysOf(s)[2]);
    expect(next.order).not.toContain(2);
  });

  it("will not lock a job that has no dates yet", () => {
    const m = state([job(1)], { mode: "manual" });
    expect(toggleLock(m, 1, ROLES)).toBe(m);
  });

  it("unlocking puts the job back in the queue", () => {
    const next = toggleLock(seed(), 1, ROLES);
    expect(next.jobs[0].locked).toBe(false);
    expect(next.order).toContain(1);
  });
});

describe("setValue and setBound", () => {
  it("clamps a value into its line's range", () => {
    expect(setValue(seed(), 2, "prep", 999).jobs[1].lines[0].value).toBe(32);
  });

  it("moves a bound only when it stays on the right side of the other, and drags the value along", () => {
    const s = seed();
    expect(setBound(s, 2, "prep", "max", 4)).toBe(s);
    expect(setBound(s, 2, "prep", "max", 12).jobs[1].lines[0]).toMatchObject({
      max: 12,
      value: 12,
    });
  });
});

describe("workdays", () => {
  const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

  it("skips weekends by default", () => {
    // 2026-10-01 is a Thursday: Thu, Fri, Mon
    expect(
      workdays("2026-10-01", "2026-10-05", {
        weekends: false,
        holidays: [],
      }).map(iso),
    ).toEqual(["2026-10-01", "2026-10-02", "2026-10-05"]);
  });

  it("works weekends when the calendar says so", () => {
    expect(
      workdays("2026-10-01", "2026-10-05", { weekends: true, holidays: [] }),
    ).toHaveLength(5);
  });

  it("never works a holiday, weekend or not", () => {
    const cal = { weekends: true, holidays: ["2026-10-03", "2026-10-05"] };
    expect(workdays("2026-10-01", "2026-10-05", cal).map(iso)).toEqual([
      "2026-10-01",
      "2026-10-02",
      "2026-10-04",
    ]);
  });
});

describe("timeline geometry", () => {
  // Thu 1, Fri 2, (weekend), Mon 5, Tue 6, Wed 7: five working days in a 7-day window
  const days = workdays("2026-10-01", "2026-10-07", {
    weekends: false,
    holidays: [],
  });
  const axis = makeAxis("2026-10-01", "2026-10-07", days);

  it("places a working day at its calendar position", () => {
    expect(axis.left(0)).toBeCloseTo(0);
    expect(axis.left(2)).toBeCloseTo((4 / 7) * 100); // Mon is 4 days in
  });

  it("runs a segment to the next working day, so a weekend inside a job is not a gap", () => {
    expect(axis.edge(1)).toBeCloseTo(axis.left(2));
  });

  it("ends the last working day at the end of its own day", () => {
    expect(axis.edge(days.length - 1)).toBeCloseTo(100);
  });

  it("maps a drop position to the first working day at or after it", () => {
    expect(axis.dayAt((2.2 / 7) * 100)).toBe(2); // Saturday → Monday
    expect(axis.dayAt(0)).toBe(0);
    expect(axis.dayAt(100)).toBe(days.length - 1);
  });

  it("lays a job's phases and waits as segments relative to its bar", () => {
    const laid = layFixed(job(1), [[0], [2, 3]]);
    const bar = barOf(laid, waitsOfFixed(laid), axis);
    expect(bar.left).toBeCloseTo(0);
    expect(bar.width).toBeCloseTo(axis.edge(3) - 0);
    expect(bar.segments.map((s) => s.kind)).toEqual(["work", "work", "wait"]);
    const wait = bar.segments[2];
    expect(wait.left).toBeCloseTo((axis.left(1) / bar.width) * 100);
  });
});

describe("hourBand", () => {
  it("runs from 0 to three times the current hours", () => {
    expect(hourBand(72)).toEqual([0, 216]);
  });

  it("never tops out below 8 hours", () => {
    expect(hourBand(2)).toEqual([0, 8]);
    expect(hourBand(0)).toEqual([0, 8]);
  });
});
