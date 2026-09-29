/**
 * Seasonal Builder bench — the pure model.
 *
 * Every number and every sentence the bench draws comes from here; nothing here
 * touches the DOM, a signal or a clock. It ports the inline script of Peter's
 * approved sketch (`seasonal-builder.html`, sketch 3) to typed, functional TS.
 *
 * THREE REGIONS, TWO SHAPES.
 *
 *   Calendar — named PERIODS that repeat every year. A Holiday is one date
 *   (`on`); a Range has a `start` and an `end`. Each endpoint is a `When`: a
 *   fixed date, or the nth weekday of a month. A range whose end falls before
 *   its start that year ends the next year ("crosses New Year"), which inside
 *   one calendar year is TWO segments.
 *
 *   Seasonal workers / Seasonal work — one shape: a SEASON is
 *   `{ name, start: Rule, stop: Rule, level, prior, max }`. A start or stop is
 *   a fixed rule (a date, a weekday of a month, a count of days after the
 *   start) or a PROJECTED one that reads context registers inside the fold
 *   (cash reaches an amount; the season's running total reaches an amount;
 *   supplies run out). Projected rules give a date only the fold can settle, so
 *   the bench shows them in amber with a `~`.
 *
 * TIME IS DAY INDICES from 2026-01-01 (day 0) and may run into 2027. That is the
 * sketch's own convention and it keeps every rule a plain integer function of
 * the year.
 *
 * The laws the tests pin (`seasonal-builder-model.test.ts`):
 *   1. a season is active from its start day up to and including its stop day;
 *   2. a stop never lands before the start (a date already past resolves to
 *      next year's);
 *   3. overlapping seasons ADD, and stacking is only for drawing;
 *   4. business days skip weekends and the listed holidays;
 *   5. the calendar rules are pure functions of the year.
 */
import {
  filter,
  find,
  findIndex,
  join,
  map,
  pipe,
  some,
  sortBy,
  sum,
} from "../../../src/fn";

// ── calendar vocabulary ─────────────────────────────────────────────────────

export const YEAR = 2026;
export const NDAYS = 365;
/** How far a business-day count may look for its end. */
export const HORIZON = 730;
const DAY_MS = 86_400_000;
const EPOCH_MS = Date.UTC(YEAR, 0, 1);

export const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;
export const MONTHS_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;
export const WEEKDAYS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;
export const WEEKDAYS_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export type Nth = 1 | 2 | 3 | 4 | -1;
export const NTHS: readonly Nth[] = [1, 2, 3, 4, -1];
const ORDINAL: Readonly<Record<Nth, string>> = {
  1: "1st",
  2: "2nd",
  3: "3rd",
  4: "4th",
  [-1]: "last",
};
/** `1st`..`4th`, `last` — the word for an `n`. */
export const ordinal = (n: Nth): string => ORDINAL[n];
/** The same, capitalised, for a form's option list and a card's caption. */
export const ordinalCap = (n: Nth): string => (n === -1 ? "Last" : ORDINAL[n]);

// ── dates as day indices ────────────────────────────────────────────────────

/** The day index of a calendar date (day 0 is 2026-01-01). */
export const dateDay = (y: number, m: number, d: number): number =>
  Math.round((Date.UTC(y, m - 1, d) - EPOCH_MS) / DAY_MS);
/** The UTC date a day index names. */
export const dayDate = (d: number): Date => new Date(EPOCH_MS + d * DAY_MS);
/** `2026-11-26`. */
export const isoOf = (d: number): string =>
  dayDate(d).toISOString().slice(0, 10);
/** 0 (Sunday) to 6 (Saturday). */
export const weekdayOf = (d: number): number => dayDate(d).getUTCDay();
/** The number of days in month `m` (1-based) of year `y`. */
export const daysInMonth = (y: number, m: number): number =>
  new Date(Date.UTC(y, m, 0)).getUTCDate();
/** `Nov 26`. */
export const shortOf = (d: number): string =>
  `${MONTHS[dayDate(d).getUTCMonth()]} ${dayDate(d).getUTCDate()}`;
/** `Thu Nov 26`. */
export const weekdayShortOf = (d: number): string =>
  `${WEEKDAYS[weekdayOf(d)]} ${shortOf(d)}`;
/** The day index the bench treats as today. */
export const TODAY = dateDay(2026, 9, 29);
/** The first day of each month of 2026, for the strips' axes. */
export const MONTH_STARTS: readonly number[] = map(
  (m: number) => dateDay(YEAR, m, 1),
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
);

// ── When: one endpoint of a period ──────────────────────────────────────────

export interface DateWhen {
  readonly kind: "date";
  readonly month: number;
  readonly day: number;
}
export interface NthWhen {
  readonly kind: "nth";
  readonly n: Nth;
  /** 0 (Sunday) to 6 (Saturday). */
  readonly weekday: number;
  readonly month: number;
}
export type When = DateWhen | NthWhen;

export const onDate = (month: number, day: number): DateWhen => ({
  kind: "date",
  month,
  day,
});
export const nthWeekday = (
  n: Nth,
  weekday: string,
  month: number,
): NthWhen => ({
  kind: "nth",
  n,
  weekday: WEEKDAYS.indexOf(weekday as (typeof WEEKDAYS)[number]),
  month,
});

/** The day the nth (or last) weekday of a month falls on, in year `y`. */
export const nthDay = (y: number, r: NthWhen): number => {
  if (r.n > 0) {
    const firstDow = weekdayOf(dateDay(y, r.month, 1));
    return dateDay(
      y,
      r.month,
      1 + ((r.weekday - firstDow + 7) % 7) + 7 * (r.n - 1),
    );
  }
  const last = daysInMonth(y, r.month);
  const lastDow = weekdayOf(dateDay(y, r.month, last));
  return dateDay(y, r.month, last - ((lastDow - r.weekday + 7) % 7));
};

/** The day a When names in year `y` (a date past a short month's end clamps to it). */
export const whenDay = (w: When, y: number): number =>
  w.kind === "date"
    ? dateDay(y, w.month, Math.min(w.day, daysInMonth(y, w.month)))
    : nthDay(y, w);

/** `Nov 26`, or `4th Thu of Nov`. */
export const whenText = (w: When): string =>
  w.kind === "date"
    ? `${MONTHS[w.month - 1]} ${w.day}`
    : `${ordinalCap(w.n)} ${WEEKDAYS[w.weekday]} of ${MONTHS[w.month - 1]}`;

/** Change one field of a When; a date's day is held inside its month. */
export const setWhenField = (w: When, field: string, value: number): When => {
  const next = { ...w, [field]: value } as When;
  return next.kind === "date"
    ? { ...next, day: clampDay(next.month, next.day) }
    : next;
};
const clampDay = (month: number, day: number): number =>
  Math.max(1, Math.min(day, daysInMonth(YEAR, month)));

/**
 * Switch an endpoint between "Fixed date" and "Weekday of month". It keeps the
 * month and lands on the same week of it, so the day the reader was looking at
 * does not jump.
 */
export const switchWhen = (w: When, to: When["kind"]): When => {
  if (w.kind === to) return w;
  const day = whenDay(w, YEAR);
  if (to === "date") return onDate(w.month, dayDate(day).getUTCDate());
  const dom = w.kind === "date" ? w.day : 1;
  return {
    kind: "nth",
    n: Math.min(4, Math.ceil(dom / 7)) as Nth,
    weekday: weekdayOf(day),
    month: w.month,
  };
};

// ── periods: holidays and ranges ────────────────────────────────────────────

export interface Holiday {
  readonly id: string;
  readonly type: "holiday";
  readonly name: string;
  readonly on: When;
}
export interface Range {
  readonly id: string;
  readonly type: "range";
  readonly name: string;
  readonly start: When;
  readonly end: When;
}
export type Period = Holiday | Range;

/** A resolved occurrence: first day, last day (inclusive), and whether it ran into the next year. */
export interface Occurrence {
  readonly a: number;
  readonly e: number;
  readonly crosses: boolean;
}

/** The occurrence of a period that starts in year `y`. */
export const occurrence = (p: Period, y: number): Occurrence => {
  if (p.type === "holiday") {
    const d = whenDay(p.on, y);
    return { a: d, e: d, crosses: false };
  }
  const a = whenDay(p.start, y);
  const sameYear = whenDay(p.end, y);
  return sameYear >= a
    ? { a, e: sameYear, crosses: false }
    : { a, e: whenDay(p.end, y + 1), crosses: true };
};

export interface Segment {
  readonly a: number;
  readonly e: number;
}

/**
 * The pieces of a period inside calendar year 2026. Last year's occurrence may
 * still be running on Jan 1, which is why both 2025's and 2026's are read; a
 * range that crosses New Year therefore has two segments.
 */
export const segments = (p: Period): readonly Segment[] =>
  pipe(
    [YEAR - 1, YEAR],
    map((y: number) => occurrence(p, y)),
    map(
      (o: Occurrence): Segment => ({
        a: Math.max(0, o.a),
        e: Math.min(NDAYS - 1, o.e),
      }),
    ),
    filter((s: Segment) => s.a <= s.e),
  );

/** True when the two segment lists share no day. */
const apart = (xs: readonly Segment[], ys: readonly Segment[]): boolean =>
  !some(
    (x: Segment) => some((y: Segment) => !(x.e < y.a || x.a > y.e), ys),
    xs,
  );

export interface Lane {
  readonly id: string;
  readonly lane: number;
}

/**
 * Pack ranges into the fewest lanes, in the order given: a range takes the first
 * lane none of whose ranges shares a day with ANY of its segments, so every
 * segment of one range sits in the same lane.
 */
export const packLanes = (ranges: readonly Range[]): readonly Lane[] => {
  const lanes: Segment[][] = [];
  return map((p: Range): Lane => {
    const segs = segments(p);
    const free = findIndex((taken: Segment[]) => apart(taken, segs), lanes);
    const lane = free < 0 ? lanes.length : free;
    lanes[lane] = [...(lanes[lane] ?? []), ...segs];
    return { id: p.id, lane };
  }, ranges);
};

/** How many lanes a packing uses (at least one). */
export const laneCount = (lanes: readonly Lane[]): number =>
  Math.max(1, ...map((l: Lane) => l.lane + 1, lanes));

/** How many days an occurrence lasts. */
export const spanDays = (o: Occurrence): number => o.e - o.a + 1;

/** A period's name as the strip and the picker show it: an emptied field reads "Untitled". */
export const displayName = (p: Period): string => p.name.trim() || "Untitled";

/** The list with the period of `next`'s id replaced by it. */
export const setPeriod = (
  ps: readonly Period[],
  next: Period,
): readonly Period[] =>
  map((p: Period): Period => (p.id === next.id ? next : p), ps);

export const holidaysOf = (ps: readonly Period[]): readonly Holiday[] =>
  filter((p: Period): p is Holiday => p.type === "holiday", ps);
export const rangesOf = (ps: readonly Period[]): readonly Range[] =>
  filter((p: Period): p is Range => p.type === "range", ps);

// ── seasons ─────────────────────────────────────────────────────────────────

export interface AfterRule {
  readonly kind: "after";
  readonly n: number;
  readonly count: "business" | "calendar";
}
export interface CashRule {
  readonly kind: "cash";
  readonly amount: number;
}
export interface AccumRule {
  readonly kind: "accum";
  readonly amount: number;
}
export interface SuppliesRule {
  readonly kind: "supplies";
  readonly stock: number;
  readonly unit: string;
  readonly perDay: number;
}
export type Rule =
  | DateWhen
  | NthWhen
  | AfterRule
  | CashRule
  | AccumRule
  | SuppliesRule;
export type RuleKind = Rule["kind"];
export type Side = "start" | "stop";

export interface Season {
  readonly name: string;
  readonly start: Rule;
  readonly stop: Rule;
  readonly level: number;
  readonly prior: number;
  readonly max: number;
}

/** What each builder says and computes that the other does not. */
export interface Ctx {
  /** ISO dates business days skip, besides weekends. */
  readonly holidays: ReadonlySet<string>;
  /** The projected cash balance the fold carries on a day. */
  readonly cashOn: (day: number) => number;
  /** What a season adds per day at its level (the running total's rate). */
  readonly perDay: (s: Season) => number;
  readonly accum: {
    /** The kind pill and the field's leading word: "After we've paid". */
    readonly label: string;
    /** In a sentence: "after we've paid $14k". */
    readonly verb: string;
    /** In a caption: "paid $14k". */
    readonly short: string;
  };
}

/** Which ends a kind may sit on, and whether its date is known without the fold. */
interface KindInfo {
  readonly sides: readonly Side[];
  readonly fixed: boolean;
  readonly make: () => Rule;
}
const KINDS: Readonly<Record<RuleKind, KindInfo>> = {
  date: {
    sides: ["start", "stop"],
    fixed: true,
    make: () => onDate(12, 25),
  },
  nth: {
    sides: ["start", "stop"],
    fixed: true,
    make: () => ({ kind: "nth", n: 1, weekday: 4, month: 11 }),
  },
  after: {
    sides: ["stop"],
    fixed: true,
    make: () => ({ kind: "after", n: 10, count: "business" }),
  },
  cash: {
    sides: ["start"],
    fixed: false,
    make: () => ({ kind: "cash", amount: 60000 }),
  },
  accum: {
    sides: ["stop"],
    fixed: false,
    make: () => ({ kind: "accum", amount: 10000 }),
  },
  supplies: {
    sides: ["stop"],
    fixed: false,
    make: () => ({ kind: "supplies", stock: 300, unit: "kits", perDay: 20 }),
  },
};
export const RULE_KINDS = Object.keys(KINDS) as readonly RuleKind[];

/** `date`, `nth` and `after` are fixed; the rest are projected. */
export const isFixed = (r: Rule): boolean => KINDS[r.kind].fixed;
/** The kinds a start or a stop may use, in pill order. */
export const kindsFor = (side: Side): readonly RuleKind[] =>
  filter((k: RuleKind) => KINDS[k].sides.includes(side), RULE_KINDS);
/** A fresh rule of a kind, with the sketch's starting values. */
export const makeRule = (kind: RuleKind): Rule => KINDS[kind].make();
/** The pill's words. */
export const kindLabel = (kind: RuleKind, ctx: Ctx): string =>
  ({
    date: "On a date",
    nth: "Weekday of month",
    after: "After some days",
    cash: "When cash reaches",
    accum: ctx.accum.label,
    supplies: "While supplies last",
  })[kind];

/** Change one field of a rule; a date's day is held inside its month. */
export const setRuleField = (
  r: Rule,
  field: string,
  value: number | string,
): Rule => {
  const next = { ...r, [field]: value } as Rule;
  return next.kind === "date"
    ? { ...next, day: clampDay(next.month, next.day) }
    : next;
};

// ── the work calendar ───────────────────────────────────────────────────────

/** A day that is neither a weekend nor one of the listed holidays. */
export const isBusiness = (
  d: number,
  holidays: ReadonlySet<string>,
): boolean => {
  const w = weekdayOf(d);
  return w !== 0 && w !== 6 && !holidays.has(isoOf(d));
};

/** The sketch's example holidays (2026's, and the two that a year-end stop can reach in 2027). */
export const SAMPLE_HOLIDAYS: ReadonlySet<string> = new Set([
  "2026-01-01",
  "2026-05-25",
  "2026-07-03",
  "2026-09-07",
  "2026-11-26",
  "2026-12-25",
  "2027-01-01",
  "2027-05-31",
]);

/** The sketch's example cash projection: it climbs through the year. */
export const sampleCash = (d: number): number => 42000 + 95 * d;

// ── resolving a season ──────────────────────────────────────────────────────

const calendarDay = (y: number, r: DateWhen | NthWhen): number => whenDay(r, y);

/** The day a start rule names in 2026, or `null` when it never starts (or is not a start). */
export const resolveStart = (r: Rule, ctx: Ctx): number | null => {
  if (r.kind === "date" || r.kind === "nth") return calendarDay(YEAR, r);
  if (r.kind === "cash") {
    for (let d = 0; d < NDAYS; d++) if (ctx.cashOn(d) >= r.amount) return d;
    return null;
  }
  return null;
};

/** The day the nth business day at or after `a` falls on, or the horizon's edge. */
const businessDayFrom = (
  a: number,
  n: number,
  holidays: ReadonlySet<string>,
): number => {
  let seen = 0;
  for (let d = a; d < a + HORIZON; d++) {
    if (isBusiness(d, holidays)) {
      seen++;
      if (seen >= n) return d;
    }
  }
  return a + HORIZON - 1;
};

/**
 * The stop day, inclusive: the first day on or after the start that the rule
 * names. `perDay` is the season's own rate, which an "accumulated" stop needs.
 */
export const resolveStop = (
  r: Rule,
  a: number,
  perDay: number,
  ctx: Pick<Ctx, "holidays">,
): number => {
  switch (r.kind) {
    case "date":
    case "nth": {
      const d = calendarDay(YEAR, r);
      return d >= a ? d : calendarDay(YEAR + 1, r);
    }
    case "after":
      return r.count === "calendar"
        ? a + Math.max(1, r.n) - 1
        : businessDayFrom(a, r.n, ctx.holidays);
    case "accum":
      return perDay > 0 ? a + Math.ceil(r.amount / perDay) - 1 : a + NDAYS - 1;
    case "supplies":
      return r.perDay > 0
        ? a + Math.ceil(r.stock / r.perDay) - 1
        : a + NDAYS - 1;
    default:
      return a;
  }
};

export interface Window {
  /** First day, or `null` when the season does not start in 2026. */
  readonly a: number | null;
  /** Last day (may run past 364 into next year), or `null`. */
  readonly e: number | null;
  readonly days: number;
  /** Either end is projected. */
  readonly projected: boolean;
  /** The stop is projected: its edge moves with the fold. */
  readonly stopProjected: boolean;
}

/** A season's window in 2026, and whether the fold has to settle it. */
export const resolve = (s: Season, ctx: Ctx): Window => {
  const a = resolveStart(s.start, ctx);
  const stopProjected = !isFixed(s.stop);
  if (a === null) {
    return { a: null, e: null, days: 0, projected: true, stopProjected };
  }
  const e = Math.min(resolveStop(s.stop, a, ctx.perDay(s), ctx), a + NDAYS - 1);
  return {
    a,
    e,
    days: e - a + 1,
    projected: !isFixed(s.start) || stopProjected,
    stopProjected,
  };
};

/** This year's active days, ascending; a New Year crossing wraps back into January. */
export const daysOf = (s: Season, ctx: Ctx): readonly number[] => {
  const w = resolve(s, ctx);
  if (w.a === null) return [];
  const a = w.a;
  const wrapped = new Set(
    Array.from({ length: w.days }, (_, i) => (a + i) % NDAYS),
  );
  return sortBy((d: number) => d, [...wrapped]);
};

/** The total level on every day of 2026. Overlaps add. */
export const levels = (ss: readonly Season[], ctx: Ctx): readonly number[] => {
  const out: number[] = new Array(NDAYS).fill(0);
  for (const s of ss) for (const d of daysOf(s, ctx)) out[d] += s.level;
  return out;
};

export interface Step {
  readonly d: number;
  readonly lo: number;
  readonly hi: number;
}
export interface Band {
  /** The season's index in the list it came from. */
  readonly i: number;
  /** Stacking order, lowest first. */
  readonly rank: number;
  readonly season: Season;
  /** One per active day: where its slab sits in that day's stack. */
  readonly steps: readonly Step[];
}

/**
 * The stepped stack: each season is a band laid on the ones under it on each
 * day, the longest season lowest (ties: the earlier start). Stacking is only
 * for drawing; the outline of the whole stack is the day's total.
 */
export const bands = (ss: readonly Season[], ctx: Ctx): readonly Band[] => {
  const lens = map((s: Season) => daysOf(s, ctx).length, ss);
  const indices = Array.from({ length: ss.length }, (_, i) => i);
  // Two stable passes: earliest start first, then longest first, so a tie on
  // length keeps the earlier start lower.
  const stable = sortBy(
    (i: number) => -lens[i],
    sortBy((i: number) => resolveStart(ss[i].start, ctx) ?? 0, indices),
  );
  const floor: number[] = new Array(NDAYS).fill(0);
  return map((i: number, rank: number): Band => {
    const s = ss[i];
    const steps = map(
      (d: number): Step => {
        const lo = floor[d];
        floor[d] += s.level;
        return { d, lo, hi: floor[d] };
      },
      daysOf(s, ctx),
    );
    return { i, rank, season: s, steps };
  }, stable);
};

/** Runs of consecutive days: `[[3,4,5],[9]]`. */
export const runsOf = <T extends { readonly d: number }>(
  steps: readonly T[],
): readonly (readonly T[])[] => {
  const runs: T[][] = [];
  for (const p of steps) {
    const run = runs[runs.length - 1];
    if (run && run[run.length - 1].d === p.d - 1) run.push(p);
    else runs.push([p]);
  }
  return runs;
};

/** The steps of a projected stop's last week — the edge that moves with the fold. */
export const tailSteps = (
  s: Season,
  steps: readonly Step[],
  ctx: Ctx,
): readonly Step[] => {
  const w = resolve(s, ctx);
  if (w.e === null || !w.stopProjected) return [];
  const end = w.e % NDAYS;
  const span = Math.min(7, w.days);
  return filter((p: Step) => (end - p.d + NDAYS) % NDAYS < span, steps);
};

/** The y-axis top for a strip: a round number a little over the largest value. */
export const niceMax = (v: number): number => {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  return (
    find(
      (m: number) => m >= v * 1.1,
      map((m: number) => m * p, [1, 2, 2.5, 5, 10]),
    ) ?? 10 * p
  );
};

/** The season on top of the stack on a day, for a click on the strip. */
export const topSeasonOn = (
  bs: readonly Band[],
  day: number,
): number | null => {
  const hit = filter((b: Band) => some((p: Step) => p.d === day, b.steps), bs);
  return hit.length ? hit[hit.length - 1].i : null;
};

// ── money and words ─────────────────────────────────────────────────────────

/** `$14.0k`, `$580`, `$120k`. */
export const compactMoney = (n: number): string =>
  Math.abs(n) >= 1000
    ? `$${(n / 1000).toFixed(n >= 1e5 ? 0 : 1)}k`
    : `$${Math.round(n)}`;

/** The sentence's phrase for a rule: `on the 4th Thursday of November`. */
export const phrase = (r: Rule, ctx: Ctx): string => {
  switch (r.kind) {
    case "date":
      return `on ${MONTHS[r.month - 1]} ${r.day}`;
    case "nth":
      return `on the ${ordinal(r.n)} ${WEEKDAYS_FULL[r.weekday]} of ${MONTHS_FULL[r.month - 1]}`;
    case "after":
      return `after ${r.n} ${r.count === "business" ? "business " : ""}day${r.n === 1 ? "" : "s"}`;
    case "cash":
      return `when cash reaches ${compactMoney(r.amount)}`;
    case "accum":
      return `${ctx.accum.verb} ${compactMoney(r.amount)}`;
    case "supplies":
      return `when ${r.stock} ${r.unit} run out at ${r.perDay} a day`;
  }
};

/** The dial caption's short form for a rule: `4th Thu of Nov`, `cash ≥ $58.0k`. */
export const brief = (r: Rule, ctx: Ctx): string => {
  switch (r.kind) {
    case "date":
      return `${MONTHS[r.month - 1]} ${r.day}`;
    case "nth":
      return `${ordinal(r.n)} ${WEEKDAYS[r.weekday]} of ${MONTHS[r.month - 1]}`;
    case "after":
      return `+${r.n} ${r.count === "business" ? "bus. " : ""}day${r.n === 1 ? "" : "s"}`;
    case "cash":
      return `cash ≥ ${compactMoney(r.amount)}`;
    case "accum":
      return `${ctx.accum.short} ${compactMoney(r.amount)}`;
    case "supplies":
      return `${r.stock} ${r.unit}`;
  }
};

/** The second caption line: `Nov 26 · ~8d`, or `not this year`. */
export const whenCaption = (s: Season, ctx: Ctx): string => {
  const w = resolve(s, ctx);
  return w.a === null
    ? "not this year"
    : `${shortOf(w.a)} · ${w.stopProjected ? "~" : ""}${w.days}d`;
};

/** The Timing panel's window: `Nov 26 → ~Dec 31`. */
export const windowText = (s: Season, ctx: Ctx): string => {
  const w = resolve(s, ctx);
  return w.a === null || w.e === null
    ? "Doesn't start in 2026"
    : `${shortOf(w.a)} → ${w.stopProjected ? "~" : ""}${shortOf(w.e)}`;
};

/** `8 days in 2026`, or `` when it does not start. */
export const lengthText = (s: Season, ctx: Ctx): string => {
  const w = resolve(s, ctx);
  return w.a === null ? "" : `${w.days} day${w.days === 1 ? "" : "s"} in 2026`;
};

/** A card's date: `~2026-11-26` (projected ends carry the `~`), `—`, or `not reached in 2026`. */
export const endText = (s: Season, side: Side, ctx: Ctx): string => {
  const w = resolve(s, ctx);
  const day = side === "start" ? w.a : w.e;
  if (day === null) return side === "start" ? "not reached in 2026" : "—";
  return `${isFixed(s[side]) ? "" : "~"}${isoOf(day)}`;
};

/** `In 2026: Jan 1–Jan 3 · Dec 20–Dec 31`. */
export const segmentsText = (p: Period): string =>
  pipe(
    segments(p),
    map((s: Segment) => `${shortOf(s.a)}–${shortOf(s.e)}`),
    join(" · "),
  );

// ── the two builders ────────────────────────────────────────────────────────

export type BuilderKey = "workers" | "work";

const WORKER_HOURS = 40;
const WORKER_RATE = 24;

/** Seasonal workers: a level is a crew count; a day costs the crew's week ÷ 7. */
export const WORKERS_CTX: Ctx = {
  holidays: SAMPLE_HOLIDAYS,
  cashOn: sampleCash,
  perDay: (s) => (s.level * WORKER_HOURS * WORKER_RATE) / 7,
  accum: { label: "After we've paid", verb: "after we've paid", short: "paid" },
};
/** Seasonal work: a level is dollars a day, so it is its own per-day rate. */
export const WORK_CTX: Ctx = {
  holidays: SAMPLE_HOLIDAYS,
  cashOn: sampleCash,
  perDay: (s) => s.level,
  accum: { label: "After we earn", verb: "after we earn", short: "earned" },
};
export const ctxOf = (key: BuilderKey): Ctx =>
  key === "workers" ? WORKERS_CTX : WORK_CTX;

/** The dial's amount: a crew count, or dollars a day. */
export const formatLevel = (key: BuilderKey, v: number): string =>
  key === "workers" ? `${v}` : compactMoney(v);
/** The dial's signed change. */
export const formatDelta = (key: BuilderKey, d: number): string =>
  `${d > 0 ? "+" : "−"}${key === "workers" ? Math.abs(d) : compactMoney(Math.abs(d))}`;
/** The step a dial moves by. */
export const levelStep = (key: BuilderKey): number =>
  key === "workers" ? 1 : 100;

export interface Summary {
  readonly label: string;
  readonly value: string;
  readonly sub: string;
  /** Green: the figure rose against where it was. */
  readonly up: boolean;
}

/** The two totals at a builder's top right. */
export const summaries = (
  key: BuilderKey,
  ss: readonly Season[],
  ctx: Ctx,
): readonly Summary[] => {
  const peak = Math.max(0, ...levels(ss, ctx));
  const total = (rate: (s: Season) => number): number =>
    sum(map((s: Season) => rate(s) * daysOf(s, ctx).length, ss));
  if (key === "workers") {
    const pay = total(ctx.perDay);
    const was = total((s) => ctx.perDay({ ...s, level: s.prior }));
    return [
      { label: "Peak crew", value: `${peak}`, sub: "on one day", up: false },
      {
        label: "Seasonal pay",
        value: compactMoney(pay),
        sub: `was ${compactMoney(was)}`,
        up: false,
      },
    ];
  }
  const rev = total((s) => s.level);
  const was = total((s) => s.prior);
  return [
    {
      label: "Busiest day",
      value: compactMoney(peak),
      sub: "stacked",
      up: false,
    },
    {
      label: "Seasonal revenue",
      value: compactMoney(rev),
      sub: `was ${compactMoney(was)}`,
      up: rev > was,
    },
  ];
};

/** A level set from a dial, held inside 0..max. */
export const setLevel = (
  ss: readonly Season[],
  i: number,
  v: number,
): readonly Season[] =>
  map(
    (s: Season, j: number): Season =>
      j === i ? { ...s, level: Math.max(0, Math.min(s.max, v)) } : s,
    ss,
  );

/** One end of one season replaced by a rule. */
export const setRule = (
  ss: readonly Season[],
  i: number,
  side: Side,
  rule: Rule,
): readonly Season[] =>
  map(
    (s: Season, j: number): Season => (j === i ? { ...s, [side]: rule } : s),
    ss,
  );

// ── the example data (the sketch's) ─────────────────────────────────────────

export const samplePeriods = (): readonly Period[] => [
  { id: "ny", type: "holiday", name: "New Year's Day", on: onDate(1, 1) },
  {
    id: "mem",
    type: "holiday",
    name: "Memorial Day",
    on: nthWeekday(-1, "Mon", 5),
  },
  { id: "ind", type: "holiday", name: "Independence Day", on: onDate(7, 4) },
  {
    id: "lab",
    type: "holiday",
    name: "Labor Day",
    on: nthWeekday(1, "Mon", 9),
  },
  {
    id: "tg",
    type: "holiday",
    name: "Thanksgiving",
    on: nthWeekday(4, "Thu", 11),
  },
  { id: "xm", type: "holiday", name: "Christmas Day", on: onDate(12, 25) },
  {
    id: "sb",
    type: "range",
    name: "Spring break",
    start: nthWeekday(2, "Mon", 3),
    end: nthWeekday(3, "Fri", 3),
  },
  {
    id: "rs",
    type: "range",
    name: "Rainy season",
    start: onDate(11, 1),
    end: onDate(3, 31),
  },
  {
    id: "hs",
    type: "range",
    name: "Holiday shopping",
    start: nthWeekday(4, "Fri", 11),
    end: onDate(12, 24),
  },
  {
    id: "wb",
    type: "range",
    name: "Winter break",
    start: onDate(12, 20),
    end: onDate(1, 3),
  },
];

export const sampleWorkers = (): readonly Season[] => [
  {
    name: "Spring rush",
    start: onDate(4, 1),
    stop: onDate(5, 31),
    level: 4,
    prior: 3,
    max: 12,
  },
  {
    name: "Summer peak",
    start: nthWeekday(1, "Mon", 6),
    stop: nthWeekday(1, "Mon", 9),
    level: 6,
    prior: 6,
    max: 18,
  },
  {
    name: "Storm season",
    start: { kind: "cash", amount: 58000 },
    stop: { kind: "after", n: 40, count: "business" },
    level: 2,
    prior: 0,
    max: 8,
  },
  {
    name: "Fall close",
    start: nthWeekday(3, "Mon", 9),
    stop: { kind: "accum", amount: 14000 },
    level: 3,
    prior: 4,
    max: 12,
  },
];

export const sampleWork = (): readonly Season[] => [
  {
    name: "Holiday season",
    start: nthWeekday(1, "Thu", 11),
    stop: onDate(12, 31),
    level: 800,
    prior: 800,
    max: 3000,
  },
  {
    name: "Thanksgiving",
    start: nthWeekday(4, "Thu", 11),
    stop: { kind: "after", n: 1, count: "calendar" },
    level: 1500,
    prior: 1500,
    max: 5000,
  },
  {
    name: "Winter Holiday",
    start: onDate(12, 25),
    stop: { kind: "after", n: 8, count: "calendar" },
    level: 2400,
    prior: 1800,
    max: 6000,
  },
  {
    name: "Clearance sale",
    start: onDate(12, 26),
    stop: { kind: "supplies", stock: 300, unit: "kits", perDay: 20 },
    level: 500,
    prior: 600,
    max: 2000,
  },
];
