import { describe, expect, it } from "vitest";
import {
  type Ctx,
  type Period,
  type Range,
  type Rule,
  type Season,
  NDAYS,
  TODAY,
  WORKERS_CTX,
  WORK_CTX,
  bands,
  brief,
  compactMoney,
  ctxOf,
  dateDay,
  daysInMonth,
  daysOf,
  displayName,
  endText,
  formatDelta,
  formatLevel,
  holidaysOf,
  isBusiness,
  isFixed,
  isoOf,
  kindLabel,
  kindsFor,
  laneCount,
  lengthText,
  levelStep,
  levels,
  makeRule,
  niceMax,
  nthDay,
  nthWeekday,
  occurrence,
  onDate,
  ordinal,
  ordinalCap,
  packLanes,
  phrase,
  rangesOf,
  resolve,
  resolveStart,
  resolveStop,
  runsOf,
  sampleCash,
  samplePeriods,
  sampleWork,
  sampleWorkers,
  segments,
  segmentsText,
  setLevel,
  setPeriod,
  setRule,
  setRuleField,
  setWhenField,
  shortOf,
  spanDays,
  summaries,
  switchWhen,
  tailSteps,
  topSeasonOn,
  weekdayOf,
  weekdayShortOf,
  whenCaption,
  whenDay,
  whenText,
  windowText,
} from "./seasonal-builder-model";

const iso = (y: number, m: number, d: number) => isoOf(dateDay(y, m, d));
const periods = samplePeriods();
const byId = (id: string): Period => {
  const p = periods.find((q) => q.id === id);
  if (!p) throw new Error(id);
  return p;
};
const season = (over: Partial<Season> = {}): Season => ({
  name: "S",
  start: onDate(4, 1),
  stop: onDate(4, 10),
  level: 2,
  prior: 2,
  max: 10,
  ...over,
});
const ctx: Ctx = WORK_CTX;

describe("dates as day indices", () => {
  it("counts from 2026-01-01", () => {
    expect(dateDay(2026, 1, 1)).toBe(0);
    expect(dateDay(2026, 12, 31)).toBe(364);
    expect(dateDay(2027, 1, 1)).toBe(365);
    expect(iso(2026, 11, 26)).toBe("2026-11-26");
    expect(shortOf(dateDay(2026, 11, 26))).toBe("Nov 26");
    expect(weekdayShortOf(dateDay(2026, 11, 26))).toBe("Thu Nov 26");
    expect(weekdayOf(dateDay(2026, 11, 26))).toBe(4);
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(TODAY).toBe(dateDay(2026, 9, 29));
  });
});

describe("nthDay and whenDay", () => {
  const nth = (n: 1 | 2 | 3 | 4 | -1, wd: string, m: number, y: number) =>
    isoOf(nthDay(y, nthWeekday(n, wd, m)));
  it("pins the known answers", () => {
    expect(nth(4, "Thu", 11, 2026)).toBe("2026-11-26");
    expect(nth(1, "Thu", 11, 2026)).toBe("2026-11-05");
    expect(nth(-1, "Mon", 5, 2026)).toBe("2026-05-25");
    expect(nth(1, "Mon", 6, 2026)).toBe("2026-06-01");
    expect(nth(3, "Mon", 9, 2026)).toBe("2026-09-21");
    expect(nth(4, "Thu", 11, 2027)).toBe("2027-11-25");
  });
  it("finds a weekday that is the 1st of the month", () => {
    // 2026-11-01 is a Sunday.
    expect(nth(1, "Sun", 11, 2026)).toBe("2026-11-01");
    expect(nth(2, "Sun", 11, 2026)).toBe("2026-11-08");
  });
  it("finds the last weekday when the month ends on it", () => {
    // 2026-05-31 is a Sunday.
    expect(nth(-1, "Sun", 5, 2026)).toBe("2026-05-31");
  });
  it("reads a date When, clamping a day past a short month's end", () => {
    expect(isoOf(whenDay(onDate(7, 4), 2026))).toBe("2026-07-04");
    expect(isoOf(whenDay(onDate(2, 29), 2026))).toBe("2026-02-28");
    expect(isoOf(whenDay(onDate(2, 29), 2028))).toBe("2028-02-29");
  });
  it("reads an nth When through whenDay", () => {
    expect(isoOf(whenDay(nthWeekday(4, "Thu", 11), 2027))).toBe("2027-11-25");
  });
});

describe("words for a When", () => {
  it("names ordinals", () => {
    expect(ordinal(1)).toBe("1st");
    expect(ordinal(-1)).toBe("last");
    expect(ordinalCap(-1)).toBe("Last");
    expect(ordinalCap(3)).toBe("3rd");
  });
  it("prints a When", () => {
    expect(whenText(onDate(12, 25))).toBe("Dec 25");
    expect(whenText(nthWeekday(-1, "Mon", 5))).toBe("Last Mon of May");
  });
});

describe("editing a When", () => {
  it("sets a field and holds a date's day inside its month", () => {
    expect(setWhenField(onDate(1, 31), "month", 2)).toEqual(onDate(2, 28));
    expect(setWhenField(onDate(1, 5), "day", 9)).toEqual(onDate(1, 9));
    expect(setWhenField(onDate(1, 5), "day", 0)).toEqual(onDate(1, 1));
  });
  it("sets an nth field untouched", () => {
    expect(setWhenField(nthWeekday(1, "Mon", 3), "n", 4)).toEqual(
      nthWeekday(4, "Mon", 3),
    );
  });
  it("switches nth to date on the same day", () => {
    expect(switchWhen(nthWeekday(4, "Thu", 11), "date")).toEqual(
      onDate(11, 26),
    );
  });
  it("switches date to nth on the same week and weekday", () => {
    expect(switchWhen(onDate(11, 26), "nth")).toEqual(nthWeekday(4, "Thu", 11));
    // Day 31 is the 5th week, capped at 4th.
    expect(switchWhen(onDate(12, 31), "nth")).toEqual(nthWeekday(4, "Thu", 12));
    expect(switchWhen(onDate(12, 1), "nth")).toEqual(nthWeekday(1, "Tue", 12));
  });
  it("does nothing when already that kind", () => {
    const w = onDate(3, 3);
    expect(switchWhen(w, "date")).toBe(w);
  });
});

describe("occurrence", () => {
  it("is one day for a holiday", () => {
    const o = occurrence(byId("tg"), 2026);
    expect(o).toEqual({
      a: dateDay(2026, 11, 26),
      e: dateDay(2026, 11, 26),
      crosses: false,
    });
    expect(spanDays(o)).toBe(1);
    expect(isoOf(occurrence(byId("tg"), 2027).a)).toBe("2027-11-25");
  });
  it("runs start to end when the end is not before the start", () => {
    const o = occurrence(byId("sb"), 2026);
    expect(isoOf(o.a)).toBe("2026-03-09");
    expect(isoOf(o.e)).toBe("2026-03-20");
    expect(o.crosses).toBe(false);
  });
  it("ends the next year when the end falls before the start", () => {
    const o = occurrence(byId("wb"), 2026);
    expect(isoOf(o.a)).toBe("2026-12-20");
    expect(isoOf(o.e)).toBe("2027-01-03");
    expect(o.crosses).toBe(true);
    expect(spanDays(o)).toBe(15);
  });
});

describe("segments", () => {
  it("is one segment for a holiday and a same-year range", () => {
    expect(segments(byId("tg"))).toHaveLength(1);
    expect(segments(byId("sb"))).toEqual([
      { a: dateDay(2026, 3, 9), e: dateDay(2026, 3, 20) },
    ]);
  });
  it("splits a range that crosses New Year into two", () => {
    const [jan, dec] = segments(byId("wb"));
    expect(isoOf(jan.a)).toBe("2026-01-01");
    expect(isoOf(jan.e)).toBe("2026-01-03");
    expect(isoOf(dec.a)).toBe("2026-12-20");
    expect(isoOf(dec.e)).toBe("2026-12-31");
    expect(segmentsText(byId("wb"))).toBe("Jan 1–Jan 3 · Dec 20–Dec 31");
  });
  it("drops a holiday whose only occurrence lies outside the year", () => {
    // New Year's Day 2025 is before the window; 2026's is day 0.
    expect(segments(byId("ny"))).toEqual([{ a: 0, e: 0 }]);
  });
});

describe("packLanes", () => {
  const ranges = rangesOf(periods);
  it("keeps every segment of a range in one lane", () => {
    const lanes = packLanes(ranges);
    expect(lanes).toHaveLength(4);
    expect(lanes.map((l) => l.id)).toEqual(ranges.map((r) => r.id));
  });
  it("uses the fewest lanes for the sample", () => {
    const lanes = packLanes(ranges);
    const byRange = Object.fromEntries(lanes.map((l) => [l.id, l.lane]));
    // Spring break (Mar 9-20) goes first; rainy season (Jan-Mar 31 + Nov-Dec)
    // overlaps it; holiday shopping (Nov 27-Dec 24) fits beside spring break;
    // winter break (Jan 1-3 + Dec 20-31) overlaps both lanes.
    expect(byRange.sb).toBe(0);
    expect(byRange.rs).toBe(1);
    expect(byRange.hs).toBe(0);
    expect(byRange.wb).toBe(2);
    expect(laneCount(lanes)).toBe(3);
  });
  it("shares a lane between ranges that never touch", () => {
    const r = (id: string, s: number, e: number): Range => ({
      id,
      type: "range",
      name: id,
      start: onDate(s, 1),
      end: onDate(e, 28),
    });
    const lanes = packLanes([r("a", 1, 2), r("b", 4, 5), r("c", 2, 4)]);
    expect(lanes.map((l) => l.lane)).toEqual([0, 0, 1]);
    expect(laneCount(lanes)).toBe(2);
  });
  it("has one lane for nothing", () => {
    expect(laneCount(packLanes([]))).toBe(1);
  });
});

describe("editing periods", () => {
  it("names an emptied period Untitled", () => {
    expect(displayName(byId("tg"))).toBe("Thanksgiving");
    expect(displayName({ ...byId("tg"), name: "  " })).toBe("Untitled");
  });
  it("replaces a period by id and leaves the rest", () => {
    const next = { ...byId("tg"), name: "Turkey day" };
    const ps = setPeriod(periods, next);
    expect(ps).toHaveLength(periods.length);
    expect(ps.find((p) => p.id === "tg")?.name).toBe("Turkey day");
    expect(ps.find((p) => p.id === "xm")).toBe(byId("xm"));
  });
});

describe("period filters", () => {
  it("splits holidays and ranges", () => {
    expect(holidaysOf(periods)).toHaveLength(6);
    expect(rangesOf(periods)).toHaveLength(4);
  });
});

describe("business days", () => {
  it("skips weekends and the listed holidays", () => {
    const h = new Set(["2026-11-26"]);
    expect(isBusiness(dateDay(2026, 11, 25), h)).toBe(true); // Wed
    expect(isBusiness(dateDay(2026, 11, 26), h)).toBe(false); // holiday
    expect(isBusiness(dateDay(2026, 11, 28), h)).toBe(false); // Sat
    expect(isBusiness(dateDay(2026, 11, 29), h)).toBe(false); // Sun
    expect(isBusiness(dateDay(2026, 11, 30), h)).toBe(true); // Mon
  });
});

describe("rule kinds", () => {
  it("allows date and nth on both ends", () => {
    expect(kindsFor("start")).toEqual(["date", "nth", "cash"]);
    expect(kindsFor("stop")).toEqual([
      "date",
      "nth",
      "after",
      "accum",
      "supplies",
    ]);
  });
  it("marks date, nth and after as fixed and the rest projected", () => {
    expect(isFixed(onDate(1, 1))).toBe(true);
    expect(isFixed(nthWeekday(1, "Mon", 1))).toBe(true);
    expect(isFixed({ kind: "after", n: 1, count: "calendar" })).toBe(true);
    expect(isFixed({ kind: "cash", amount: 1 })).toBe(false);
    expect(isFixed({ kind: "accum", amount: 1 })).toBe(false);
    expect(isFixed({ kind: "supplies", stock: 1, unit: "u", perDay: 1 })).toBe(
      false,
    );
  });
  it("makes a fresh rule of every kind", () => {
    expect(makeRule("date")).toEqual(onDate(12, 25));
    expect(makeRule("nth")).toEqual(nthWeekday(1, "Thu", 11));
    expect(makeRule("after")).toEqual({
      kind: "after",
      n: 10,
      count: "business",
    });
    expect(makeRule("cash")).toEqual({ kind: "cash", amount: 60000 });
    expect(makeRule("accum")).toEqual({ kind: "accum", amount: 10000 });
    expect(makeRule("supplies")).toEqual({
      kind: "supplies",
      stock: 300,
      unit: "kits",
      perDay: 20,
    });
  });
  it("words the pills, the accumulated one per builder", () => {
    expect(kindLabel("date", ctx)).toBe("On a date");
    expect(kindLabel("nth", ctx)).toBe("Weekday of month");
    expect(kindLabel("after", ctx)).toBe("After some days");
    expect(kindLabel("cash", ctx)).toBe("When cash reaches");
    expect(kindLabel("supplies", ctx)).toBe("While supplies last");
    expect(kindLabel("accum", WORKERS_CTX)).toBe("After we've paid");
    expect(kindLabel("accum", WORK_CTX)).toBe("After we earn");
  });
  it("sets a rule field, clamping a date's day and passing strings through", () => {
    expect(setRuleField(onDate(1, 31), "month", 2)).toEqual(onDate(2, 28));
    expect(
      setRuleField(
        { kind: "supplies", stock: 1, unit: "kits", perDay: 1 },
        "unit",
        "bags",
      ),
    ).toMatchObject({ unit: "bags" });
    expect(setRuleField({ kind: "cash", amount: 1 }, "amount", 9)).toEqual({
      kind: "cash",
      amount: 9,
    });
  });
});

describe("resolveStart", () => {
  it("reads a date and an nth", () => {
    expect(isoOf(resolveStart(onDate(4, 1), ctx) as number)).toBe("2026-04-01");
    expect(isoOf(resolveStart(nthWeekday(1, "Mon", 6), ctx) as number)).toBe(
      "2026-06-01",
    );
  });
  it("finds the first day the projected cash reaches the amount", () => {
    const d = resolveStart({ kind: "cash", amount: 58000 }, ctx) as number;
    expect(sampleCash(d)).toBeGreaterThanOrEqual(58000);
    expect(sampleCash(d - 1)).toBeLessThan(58000);
    expect(d).toBe(Math.ceil((58000 - 42000) / 95));
  });
  it("starts on day 0 when cash is already there, and never when it never gets there", () => {
    expect(resolveStart({ kind: "cash", amount: 1 }, ctx)).toBe(0);
    expect(resolveStart({ kind: "cash", amount: 9e9 }, ctx)).toBeNull();
  });
  it("has no start for a stop-only kind", () => {
    expect(
      resolveStart({ kind: "after", n: 1, count: "calendar" }, ctx),
    ).toBeNull();
    expect(resolveStart({ kind: "accum", amount: 1 }, ctx)).toBeNull();
    expect(
      resolveStart({ kind: "supplies", stock: 1, unit: "u", perDay: 1 }, ctx),
    ).toBeNull();
  });
});

describe("resolveStop", () => {
  const a = dateDay(2026, 6, 1);
  const stop = (r: Rule, start = a, perDay = 0) =>
    resolveStop(r, start, perDay, ctx);
  it("takes a date on or after the start", () => {
    expect(isoOf(stop(onDate(9, 7)))).toBe("2026-09-07");
    expect(stop(onDate(6, 1))).toBe(a);
  });
  it("takes next year's date when this year's has passed", () => {
    expect(isoOf(stop(onDate(3, 1)))).toBe("2027-03-01");
    expect(isoOf(stop(nthWeekday(4, "Thu", 11), dateDay(2026, 12, 1)))).toBe(
      "2027-11-25",
    );
  });
  it("counts calendar days, the start included, and at least one", () => {
    expect(stop({ kind: "after", n: 8, count: "calendar" })).toBe(a + 7);
    expect(stop({ kind: "after", n: 1, count: "calendar" })).toBe(a);
    expect(stop({ kind: "after", n: 0, count: "calendar" })).toBe(a);
  });
  it("counts business days, the start included when it is one", () => {
    // 2026-06-01 is a Monday.
    expect(isoOf(stop({ kind: "after", n: 5, count: "business" }))).toBe(
      "2026-06-05",
    );
    expect(isoOf(stop({ kind: "after", n: 6, count: "business" }))).toBe(
      "2026-06-08",
    );
  });
  it("skips the listed holidays when counting business days", () => {
    const start = dateDay(2026, 11, 25); // Wed
    // Wed, (Thu holiday), Fri, (weekend), Mon
    expect(isoOf(stop({ kind: "after", n: 3, count: "business" }, start))).toBe(
      "2026-11-30",
    );
  });
  it("stops at the horizon when a business-day count never arrives", () => {
    expect(stop({ kind: "after", n: 9999, count: "business" })).toBe(a + 729);
  });
  it("stops an accumulated season once its total is reached", () => {
    expect(stop({ kind: "accum", amount: 1000 }, a, 300)).toBe(a + 3); // ceil(1000/300)=4 days
    expect(stop({ kind: "accum", amount: 1000 }, a, 0)).toBe(a + NDAYS - 1);
  });
  it("stops when supplies run out", () => {
    expect(
      stop({ kind: "supplies", stock: 300, unit: "kits", perDay: 20 }),
    ).toBe(a + 14);
    expect(
      stop({ kind: "supplies", stock: 301, unit: "kits", perDay: 20 }),
    ).toBe(a + 15);
    expect(stop({ kind: "supplies", stock: 5, unit: "kits", perDay: 0 })).toBe(
      a + NDAYS - 1,
    );
  });
  it("returns the start for a start-only kind", () => {
    expect(stop({ kind: "cash", amount: 1 })).toBe(a);
  });
});

describe("resolve", () => {
  it("resolves a fixed season", () => {
    const w = resolve(season(), ctx);
    expect(w).toMatchObject({
      days: 10,
      projected: false,
      stopProjected: false,
    });
    expect(isoOf(w.a as number)).toBe("2026-04-01");
    expect(isoOf(w.e as number)).toBe("2026-04-10");
  });
  it("marks a projected start or stop", () => {
    expect(
      resolve(season({ start: { kind: "cash", amount: 50000 } }), ctx),
    ).toMatchObject({ projected: true, stopProjected: false });
    expect(
      resolve(season({ stop: { kind: "accum", amount: 500 } }), ctx),
    ).toMatchObject({ projected: true, stopProjected: true });
  });
  it("does not start when cash never gets there", () => {
    expect(
      resolve(season({ start: { kind: "cash", amount: 9e9 } }), ctx),
    ).toEqual({
      a: null,
      e: null,
      days: 0,
      projected: true,
      stopProjected: false,
    });
  });
  it("caps a season at a year", () => {
    const w = resolve(
      season({ stop: { kind: "after", n: 900, count: "calendar" } }),
      ctx,
    );
    expect(w.days).toBe(NDAYS);
  });
  it("runs into next year past a passed date", () => {
    const w = resolve(
      season({ start: onDate(12, 20), stop: onDate(1, 3) }),
      ctx,
    );
    expect(w.days).toBe(15);
    expect(isoOf(w.e as number)).toBe("2027-01-03");
  });
});

describe("daysOf", () => {
  it("lists each active day in order", () => {
    const ds = daysOf(season(), ctx);
    expect(ds).toHaveLength(10);
    expect(ds[0]).toBe(dateDay(2026, 4, 1));
    expect(ds[9]).toBe(dateDay(2026, 4, 10));
  });
  it("wraps a New Year crossing into January", () => {
    const ds = daysOf(
      season({ start: onDate(12, 20), stop: onDate(1, 3) }),
      ctx,
    );
    expect(ds).toHaveLength(15);
    expect(ds.slice(0, 3)).toEqual([0, 1, 2]);
    expect(ds[3]).toBe(dateDay(2026, 12, 20));
    expect(ds[14]).toBe(364);
  });
  it("is empty when the season does not start", () => {
    expect(
      daysOf(season({ start: { kind: "cash", amount: 9e9 } }), ctx),
    ).toEqual([]);
  });
});

describe("levels", () => {
  it("adds overlapping seasons", () => {
    const ss = [
      season({ start: onDate(4, 1), stop: onDate(4, 10), level: 2 }),
      season({ start: onDate(4, 5), stop: onDate(4, 20), level: 3 }),
    ];
    const l = levels(ss, ctx);
    expect(l[dateDay(2026, 3, 31)]).toBe(0);
    expect(l[dateDay(2026, 4, 1)]).toBe(2);
    expect(l[dateDay(2026, 4, 5)]).toBe(5);
    expect(l[dateDay(2026, 4, 10)]).toBe(5);
    expect(l[dateDay(2026, 4, 11)]).toBe(3);
    expect(l).toHaveLength(NDAYS);
  });
});

describe("bands", () => {
  it("stacks the longest season lowest", () => {
    const long = season({
      name: "long",
      start: onDate(4, 1),
      stop: onDate(4, 20),
      level: 2,
    });
    const short = season({
      name: "short",
      start: onDate(4, 5),
      stop: onDate(4, 10),
      level: 3,
    });
    const bs = bands([short, long], ctx);
    expect(bs.map((b) => b.season.name)).toEqual(["long", "short"]);
    expect(bs.map((b) => b.rank)).toEqual([0, 1]);
    expect(bs[0].i).toBe(1);
    const on5 = (b: (typeof bs)[number]) =>
      b.steps.find((p) => p.d === dateDay(2026, 4, 5));
    expect(on5(bs[0])).toMatchObject({ lo: 0, hi: 2 });
    expect(on5(bs[1])).toMatchObject({ lo: 2, hi: 5 });
  });
  it("breaks a tie on length by the earlier start", () => {
    const late = season({
      name: "late",
      start: onDate(6, 1),
      stop: onDate(6, 5),
    });
    const early = season({
      name: "early",
      start: onDate(5, 1),
      stop: onDate(5, 5),
    });
    expect(bands([late, early], ctx).map((b) => b.season.name)).toEqual([
      "early",
      "late",
    ]);
  });
  it("gives an unstarted season no steps", () => {
    const [b] = bands([season({ start: { kind: "cash", amount: 9e9 } })], ctx);
    expect(b.steps).toEqual([]);
  });
  it("tops out at the day's total", () => {
    const ss = sampleWork();
    const l = levels(ss, WORK_CTX);
    const tops = new Array(NDAYS).fill(0);
    for (const b of bands(ss, WORK_CTX))
      for (const p of b.steps) tops[p.d] = Math.max(tops[p.d], p.hi);
    expect(tops).toEqual(l);
  });
});

describe("runsOf", () => {
  it("groups consecutive days", () => {
    const runs = runsOf([
      { d: 1 },
      { d: 2 },
      { d: 4 },
      { d: 5 },
      { d: 6 },
      { d: 9 },
    ]);
    expect(runs.map((r) => r.map((p) => p.d))).toEqual([
      [1, 2],
      [4, 5, 6],
      [9],
    ]);
    expect(runsOf([])).toEqual([]);
  });
});

describe("tailSteps", () => {
  it("hatches the last week of a projected stop", () => {
    const s = season({ stop: { kind: "accum", amount: 6000 } });
    const [b] = bands([s], WORK_CTX);
    // level 2 a day → 3000 days? perDay = level = 2, so 3000 days capped to a year
    const tail = tailSteps(s, b.steps, WORK_CTX);
    expect(tail).toHaveLength(7);
    const w = resolve(s, WORK_CTX);
    expect(tail[tail.length - 1].d).toBe((w.e as number) % NDAYS);
  });
  it("is the whole season when it is shorter than a week", () => {
    const s = season({
      stop: { kind: "supplies", stock: 40, unit: "kits", perDay: 20 },
    });
    const [b] = bands([s], ctx);
    expect(tailSteps(s, b.steps, ctx)).toHaveLength(2);
  });
  it("is empty for a fixed stop or an unstarted season", () => {
    const [b] = bands([season()], ctx);
    expect(tailSteps(season(), b.steps, ctx)).toEqual([]);
    expect(
      tailSteps(
        season({
          start: { kind: "cash", amount: 9e9 },
          stop: { kind: "accum", amount: 1 },
        }),
        [],
        ctx,
      ),
    ).toEqual([]);
  });
  it("finds the tail of a season that wraps New Year", () => {
    const s = season({
      start: onDate(12, 20),
      stop: { kind: "supplies", stock: 300, unit: "kits", perDay: 20 },
    });
    const [b] = bands([s], ctx);
    // 15 days: Dec 20 → Jan 3; the last week is Dec 28..Dec 31 and Jan 1..3
    expect(
      tailSteps(s, b.steps, ctx)
        .map((p) => p.d)
        .sort((x, y) => x - y),
    ).toEqual([0, 1, 2, 361, 362, 363, 364]);
  });
});

describe("niceMax", () => {
  it("rounds up to a nice number with headroom", () => {
    expect(niceMax(0)).toBe(1);
    expect(niceMax(-3)).toBe(1);
    expect(niceMax(4)).toBe(5);
    expect(niceMax(9)).toBe(10);
    expect(niceMax(2000)).toBe(2500);
    expect(niceMax(2300)).toBe(5000);
    expect(niceMax(10)).toBe(20);
  });
});

describe("topSeasonOn", () => {
  it("finds the top of the stack on a day", () => {
    const ss = [
      season({ name: "a", start: onDate(4, 1), stop: onDate(4, 20) }),
      season({ name: "b", start: onDate(4, 5), stop: onDate(4, 10) }),
    ];
    const bs = bands(ss, ctx);
    expect(topSeasonOn(bs, dateDay(2026, 4, 7))).toBe(1);
    expect(topSeasonOn(bs, dateDay(2026, 4, 15))).toBe(0);
    expect(topSeasonOn(bs, dateDay(2026, 8, 1))).toBeNull();
  });
});

describe("words", () => {
  it("formats compact money", () => {
    expect(compactMoney(580)).toBe("$580");
    expect(compactMoney(14000)).toBe("$14.0k");
    expect(compactMoney(120000)).toBe("$120k");
    expect(compactMoney(-2400)).toBe("$-2.4k");
  });
  it("phrases every kind", () => {
    expect(phrase(onDate(4, 1), ctx)).toBe("on Apr 1");
    expect(phrase(nthWeekday(4, "Thu", 11), ctx)).toBe(
      "on the 4th Thursday of November",
    );
    expect(phrase({ kind: "after", n: 1, count: "calendar" }, ctx)).toBe(
      "after 1 day",
    );
    expect(phrase({ kind: "after", n: 40, count: "business" }, ctx)).toBe(
      "after 40 business days",
    );
    expect(phrase({ kind: "cash", amount: 58000 }, ctx)).toBe(
      "when cash reaches $58.0k",
    );
    expect(phrase({ kind: "accum", amount: 14000 }, WORKERS_CTX)).toBe(
      "after we've paid $14.0k",
    );
    expect(phrase({ kind: "accum", amount: 14000 }, WORK_CTX)).toBe(
      "after we earn $14.0k",
    );
    expect(
      phrase({ kind: "supplies", stock: 300, unit: "kits", perDay: 20 }, ctx),
    ).toBe("when 300 kits run out at 20 a day");
  });
  it("briefs every kind", () => {
    expect(brief(onDate(4, 1), ctx)).toBe("Apr 1");
    expect(brief(nthWeekday(4, "Thu", 11), ctx)).toBe("4th Thu of Nov");
    expect(brief({ kind: "after", n: 1, count: "calendar" }, ctx)).toBe(
      "+1 day",
    );
    expect(brief({ kind: "after", n: 40, count: "business" }, ctx)).toBe(
      "+40 bus. days",
    );
    expect(brief({ kind: "cash", amount: 58000 }, ctx)).toBe("cash ≥ $58.0k");
    expect(brief({ kind: "accum", amount: 14000 }, WORKERS_CTX)).toBe(
      "paid $14.0k",
    );
    expect(brief({ kind: "accum", amount: 14000 }, WORK_CTX)).toBe(
      "earned $14.0k",
    );
    expect(
      brief({ kind: "supplies", stock: 300, unit: "kits", perDay: 20 }, ctx),
    ).toBe("300 kits");
  });
  it("captions a season's window", () => {
    expect(whenCaption(season(), ctx)).toBe("Apr 1 · 10d");
    expect(
      whenCaption(season({ stop: { kind: "accum", amount: 40 } }), ctx),
    ).toBe("Apr 1 · ~20d");
    expect(
      whenCaption(season({ start: { kind: "cash", amount: 9e9 } }), ctx),
    ).toBe("not this year");
    expect(windowText(season(), ctx)).toBe("Apr 1 → Apr 10");
    expect(
      windowText(season({ stop: { kind: "accum", amount: 40 } }), ctx),
    ).toBe("Apr 1 → ~Apr 20");
    expect(
      windowText(season({ start: { kind: "cash", amount: 9e9 } }), ctx),
    ).toBe("Doesn't start in 2026");
    expect(lengthText(season(), ctx)).toBe("10 days in 2026");
    expect(lengthText(season({ stop: onDate(4, 1) }), ctx)).toBe(
      "1 day in 2026",
    );
    expect(
      lengthText(season({ start: { kind: "cash", amount: 9e9 } }), ctx),
    ).toBe("");
  });
  it("prints a card's dates with a ~ on projected ends", () => {
    const s = season({ stop: { kind: "accum", amount: 40 } });
    expect(endText(s, "start", ctx)).toBe("2026-04-01");
    expect(endText(s, "stop", ctx)).toBe("~2026-04-20");
    const never = season({ start: { kind: "cash", amount: 9e9 } });
    expect(endText(never, "start", ctx)).toBe("not reached in 2026");
    expect(endText(never, "stop", ctx)).toBe("—");
    expect(
      endText(season({ start: { kind: "cash", amount: 60000 } }), "start", ctx),
    ).toMatch(/^~2026-/);
  });
});

describe("the two builders", () => {
  it("picks a context by key", () => {
    expect(ctxOf("workers")).toBe(WORKERS_CTX);
    expect(ctxOf("work")).toBe(WORK_CTX);
  });
  it("prices a worker season from its crew", () => {
    // 4 crew × 40 h × $24 ÷ 7 a day
    expect(WORKERS_CTX.perDay(season({ level: 4 }))).toBeCloseTo(
      (4 * 40 * 24) / 7,
    );
    expect(WORK_CTX.perDay(season({ level: 800 }))).toBe(800);
  });
  it("formats levels, deltas and steps", () => {
    expect(formatLevel("workers", 6)).toBe("6");
    expect(formatLevel("work", 2400)).toBe("$2.4k");
    expect(formatDelta("workers", 2)).toBe("+2");
    expect(formatDelta("workers", -1)).toBe("−1");
    expect(formatDelta("work", 600)).toBe("+$600");
    expect(formatDelta("work", -1500)).toBe("−$1.5k");
    expect(levelStep("workers")).toBe(1);
    expect(levelStep("work")).toBe(100);
  });
  it("sums the workers", () => {
    const ss = sampleWorkers();
    const [peak, pay] = summaries("workers", ss, WORKERS_CTX);
    expect(peak.label).toBe("Peak crew");
    expect(peak.value).toBe(`${Math.max(...levels(ss, WORKERS_CTX))}`);
    expect(pay.label).toBe("Seasonal pay");
    const total = ss.reduce(
      (a, s) => a + WORKERS_CTX.perDay(s) * daysOf(s, WORKERS_CTX).length,
      0,
    );
    expect(pay.value).toBe(compactMoney(total));
    expect(pay.sub).toMatch(/^was \$/);
  });
  it("sums the work and flags a rise", () => {
    const ss = sampleWork();
    const [busiest, revenue] = summaries("work", ss, WORK_CTX);
    expect(busiest).toMatchObject({
      label: "Busiest day",
      sub: "stacked",
      up: false,
    });
    expect(revenue.label).toBe("Seasonal revenue");
    // Winter Holiday rose 1800 → 2400 and Clearance fell; on net revenue rose.
    expect(revenue.up).toBe(true);
    const flat = sampleWork().map((s) => ({ ...s, prior: s.level }));
    expect(summaries("work", flat, WORK_CTX)[1].up).toBe(false);
  });
  it("has a peak of zero for no seasons", () => {
    expect(summaries("workers", [], WORKERS_CTX)[0].value).toBe("0");
  });
});

describe("editing seasons", () => {
  it("sets a level inside 0..max and leaves the others", () => {
    const ss = [season(), season({ name: "T" })];
    expect(setLevel(ss, 0, 7)[0].level).toBe(7);
    expect(setLevel(ss, 0, 7)[1]).toBe(ss[1]);
    expect(setLevel(ss, 0, 99)[0].level).toBe(10);
    expect(setLevel(ss, 0, -3)[0].level).toBe(0);
  });
  it("replaces one end of one season", () => {
    const ss = [season(), season({ name: "T" })];
    const next = setRule(ss, 1, "stop", onDate(5, 5));
    expect(next[1].stop).toEqual(onDate(5, 5));
    expect(next[0]).toBe(ss[0]);
    expect(ss[1].stop).toEqual(onDate(4, 10));
  });
});

describe("the example data", () => {
  it("shows the four workers' windows the sketch does", () => {
    const ss = sampleWorkers();
    const w = ss.map((s) => resolve(s, WORKERS_CTX));
    expect(iso(2026, 4, 1)).toBe(isoOf(w[0].a as number));
    expect(w[0].days).toBe(61);
    expect(isoOf(w[1].a as number)).toBe("2026-06-01");
    expect(isoOf(w[1].e as number)).toBe("2026-09-07");
    expect(w[2].projected).toBe(true);
    expect(w[3].stopProjected).toBe(true);
  });
  it("shows the four work seasons", () => {
    const ss = sampleWork();
    const w = ss.map((s) => resolve(s, WORK_CTX));
    expect(isoOf(w[0].a as number)).toBe("2026-11-05");
    expect(isoOf(w[1].a as number)).toBe("2026-11-26");
    expect(w[1].days).toBe(1);
    expect(isoOf(w[2].e as number)).toBe("2027-01-01");
    expect(w[3].days).toBe(15);
  });
  it("has Winter break crossing New Year for 15 days with two 2026 segments", () => {
    const wb = byId("wb");
    const o = occurrence(wb, 2026);
    expect(o.crosses).toBe(true);
    expect(spanDays(o)).toBe(15);
    expect(segments(wb).map((s) => `${isoOf(s.a)}..${isoOf(s.e)}`)).toEqual([
      "2026-01-01..2026-01-03",
      "2026-12-20..2026-12-31",
    ]);
  });
});
