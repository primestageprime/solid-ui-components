/**
 * Contract Scheduler bench — the pure model.
 *
 * Every number the bench draws comes from here, and nothing here touches the
 * DOM, a signal or a clock. It is the TypeScript sketch of ADR 0028 and its
 * 2026-09-29 addendum (thorcasting-qbo `docs/adr/0028-…`): a job's hour lines
 * are PHASES that run in order, each on one ROLE's crew; a crew works whole
 * days; a phase that has begun keeps its crew until it is done; a LOCKED job is
 * always granted, even when that overbooks a role.
 *
 * TIME IS WORKING-DAY INDICES. Day 0 is the first working day of the window,
 * and the calendar (`workdays`) maps an index to a date. So a weekend or a
 * holiday is simply not an index, and nothing below has to skip it.
 *
 * TWO MODES (the ChartFrame y-axis split-button pattern):
 *   auto    unlocked jobs flow in queue order into free crew time;
 *           dragging an unlocked bar changes the ORDER, never a date.
 *   manual  every placed job sits on the days stored in its placement;
 *           capacity is NOT enforced (overbooking is allowed and flagged);
 *           `flowOnce` packs the unlocked jobs one time and stays manual.
 *
 * A PLACEMENT IS, PER PHASE, THE LIST OF WORKING DAYS IT WORKS — not just a
 * start. A locked job arriving can pause an unlocked phase midway, and a start
 * alone would lose that pause the moment auto is frozen into manual.
 *
 * The laws the tests pin (`contract-scheduler-model.test.ts`):
 *   1. a locked job keeps its days through every mode switch and every flow;
 *   2. `flowOnce` is idempotent;
 *   3. auto → manual → auto with no edits changes nothing;
 *   4. in auto an unlocked job's days are computed, in manual they are stored.
 */

// ── types ───────────────────────────────────────────────────────────────────

export type Status = "DOING" | "TODO" | "PENDING";
export type Mode = "auto" | "manual";

/** A crew the firm has: how many hours a working day it can give, and its billing rate. */
export interface Role {
  readonly id: string;
  readonly label: string;
  readonly hoursPerDay: number;
  readonly rate: number;
}

/**
 * One line of a job. An `h` line is a PHASE of work on `role`'s crew; a `$`
 * line (materials) is money only. `min`/`max` are the line's band, which is
 * also the dial's range; `prior` is where the value was before this session.
 */
export interface Line {
  readonly key: string;
  readonly label: string;
  readonly unit: "h" | "$";
  readonly role?: string;
  /** The most hours of this phase a crew can do in one day (the crew size). */
  readonly maxPerDay?: number;
  readonly min: number;
  readonly max: number;
  readonly value: number;
  readonly prior: number;
}

/** Per phase, in phase order, the working-day indices it works. */
export type Placement = readonly (readonly number[])[];

export interface Job {
  readonly id: number;
  readonly name: string;
  readonly status: Status;
  /** Included in this scenario (the list's switch). */
  readonly on: boolean;
  readonly locked: boolean;
  /** Stored days; `null` = unplaced (TBD in manual). */
  readonly placement: Placement | null;
  readonly lines: readonly Line[];
}

export interface SchedulerState {
  readonly jobs: readonly Job[];
  readonly mode: Mode;
  /** Queue order of the unlocked jobs (full auto). */
  readonly order: readonly number[];
  /** Working days in the window. */
  readonly horizon: number;
}

export interface Phase {
  readonly key: string;
  readonly label: string;
  readonly role: string;
  readonly hours: number;
  readonly perDay: number;
  /** Whole crew-days the phase needs. */
  readonly days: number;
}

export interface LaidPhase extends Omit<Phase, "days"> {
  readonly days: readonly number[];
  readonly s: number;
  readonly e: number;
}

/** A run of days a started job could not work, and which jobs held the role. */
export interface Wait {
  readonly s: number;
  readonly e: number;
  readonly role: string;
  readonly by: readonly number[];
}

export interface JobSchedule {
  readonly phases: readonly LaidPhase[];
  readonly waits: readonly Wait[];
}

export interface Schedule {
  readonly byJob: Readonly<Record<number, JobSchedule>>;
  /** Hours booked per role per working day. */
  readonly load: Readonly<Record<string, readonly number[]>>;
  /** Which jobs held each role on each working day. */
  readonly holders: Readonly<Record<string, readonly (readonly number[])[]>>;
}

/** The work calendar: whether the crews work weekends, and the days nobody works. */
export interface WorkCalendar {
  readonly weekends: boolean;
  readonly holidays: readonly string[];
}

// ── calendar ────────────────────────────────────────────────────────────────

const DAY = 86_400_000;
const msOf = (iso: string): number =>
  Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
export const isoOf = (ms: number): string =>
  new Date(ms).toISOString().slice(0, 10);

/** The working days from `from` to `to` inclusive, as UTC midnights. */
export const workdays = (
  from: string,
  to: string,
  cal: WorkCalendar,
): readonly number[] => {
  const off = new Set(cal.holidays);
  const span = Math.round((msOf(to) - msOf(from)) / DAY) + 1;
  return Array.from(
    { length: Math.max(0, span) },
    (_, n) => msOf(from) + n * DAY,
  ).filter((t) => {
    const dow = new Date(t).getUTCDay();
    return !off.has(isoOf(t)) && (cal.weekends || (dow !== 0 && dow !== 6));
  });
};

// ── money ───────────────────────────────────────────────────────────────────

const roleOf = (
  roles: readonly Role[],
  id: string | undefined,
): Role | undefined => roles.find((r) => r.id === id);

export const cost = (
  line: Line,
  roles: readonly Role[],
  v: number = line.value,
): number =>
  line.unit === "$" ? v : v * (roleOf(roles, line.role)?.rate ?? 0);

export const estimate = (
  job: Job,
  roles: readonly Role[],
): { value: number; min: number; max: number } =>
  job.lines.reduce(
    (acc, l) => ({
      value: acc.value + cost(l, roles),
      min: acc.min + cost(l, roles, l.min),
      max: acc.max + cost(l, roles, l.max),
    }),
    { value: 0, min: 0, max: 0 },
  );

// ── phases and fixed placement ──────────────────────────────────────────────

export const phasesOf = (job: Job): readonly Phase[] =>
  job.lines
    .filter(
      (l) => l.unit === "h" && l.value > 0 && l.role && (l.maxPerDay ?? 0) > 0,
    )
    .map((l) => ({
      key: l.key,
      label: l.label,
      role: l.role as string,
      hours: l.value,
      perDay: l.maxPerDay as number,
      days: Math.ceil(l.value / (l.maxPerDay as number)),
    }));

/** Phases on consecutive working days from `w0`. */
export const backToBack = (job: Job, w0: number): Placement =>
  phasesOf(job).reduce<{ next: number; out: number[][] }>(
    (acc, p) => ({
      next: acc.next + p.days,
      out: [...acc.out, Array.from({ length: p.days }, (_, n) => acc.next + n)],
    }),
    { next: w0, out: [] },
  ).out;

/**
 * Lay a job on stored days. A stored list whose length still fits the phase is
 * kept (pauses included); one whose length changed — a dial moved — is re-laid
 * contiguously from its first day. No phase starts before its predecessor ends.
 */
export const layFixed = (job: Job, placed: Placement): readonly LaidPhase[] =>
  phasesOf(job).reduce<{ prevEnd: number; out: LaidPhase[] }>(
    (acc, p, x) => {
      const stored = placed[x];
      const raw =
        stored && stored.length === p.days
          ? stored
          : Array.from(
              { length: p.days },
              (_, n) => (stored?.[0] ?? acc.prevEnd + 1) + n,
            );
      const push = Math.max(0, acc.prevEnd + 1 - raw[0]);
      const days = raw.map((w) => w + push);
      const e = days[days.length - 1];
      return { prevEnd: e, out: [...acc.out, { ...p, days, s: days[0], e }] };
    },
    { prevEnd: -1, out: [] },
  ).out;

/** Group single days into runs of one role, merging who held it. */
const runs = (
  days: readonly { w: number; role: string; by: readonly number[] }[],
): readonly Wait[] => {
  const out: Wait[] = [];
  for (const d of days) {
    const last = out[out.length - 1];
    if (last && last.e === d.w - 1 && last.role === d.role) {
      out[out.length - 1] = {
        ...last,
        e: d.w,
        by: [...new Set([...last.by, ...d.by])],
      };
    } else {
      out.push({ s: d.w, e: d.w, role: d.role, by: [...d.by] });
    }
  }
  return out;
};

/** In a fixed layout, every non-working day between the first and last is a wait, for the phase it delays. */
export const waitsOfFixed = (phases: readonly LaidPhase[]): readonly Wait[] => {
  if (!phases.length) return [];
  const worked = new Set(phases.flatMap((p) => p.days));
  const first = phases[0].s;
  const last = phases[phases.length - 1].e;
  const gaps = Array.from({ length: last - first + 1 }, (_, n) => first + n)
    .filter((w) => !worked.has(w))
    .map((w) => ({
      w,
      role: (phases.find((p) => p.e >= w) ?? phases[phases.length - 1]).role,
      by: [],
    }));
  return runs(gaps);
};

// ── the scheduler ───────────────────────────────────────────────────────────

interface Flow {
  readonly job: Job;
  readonly phases: readonly Phase[];
  i: number;
  rem: number;
  ready: number;
  started: boolean;
  mid: boolean;
  worked: { w: number; i: number }[];
  waited: { w: number; role: string; by: readonly number[] }[];
}

/**
 * The whole schedule. Locked jobs — and in manual every placed job — are laid
 * on their stored days and always granted. In auto the unlocked jobs then flow
 * day by day: phases already under way first, then the queue in order; each
 * gets a whole crew-day `min(perDay, remaining)` or nothing.
 */
export const schedule = (
  state: SchedulerState,
  roles: readonly Role[],
): Schedule => {
  const N = state.horizon;
  const load: Record<string, number[]> = Object.fromEntries(
    roles.map((r) => [r.id, new Array(N).fill(0)]),
  );
  const holders: Record<string, number[][]> = Object.fromEntries(
    roles.map((r) => [r.id, Array.from({ length: N }, () => [] as number[])]),
  );
  const cap = (role: string) => roleOf(roles, role)?.hoursPerDay ?? 0;
  const book = (id: number, role: string, w: number, h: number) => {
    if (w < 0 || w >= N || !load[role]) return;
    load[role][w] += h;
    holders[role][w].push(id);
  };

  const flowing = new Set(state.mode === "auto" ? state.order : []);
  const on = state.jobs.filter((j) => j.on);
  const fixed = on.filter(
    (j) =>
      !flowing.has(j.id) &&
      (j.locked || state.mode === "manual") &&
      j.placement,
  );

  const byJob: Record<number, JobSchedule> = {};
  for (const j of fixed) {
    const phases = layFixed(j, j.placement as Placement);
    for (const p of phases) {
      let left = p.hours;
      for (const w of p.days) {
        const g = Math.min(p.perDay, left);
        left -= g;
        book(j.id, p.role, w, g);
      }
    }
    byJob[j.id] = { phases, waits: waitsOfFixed(phases) };
  }

  const queue: Flow[] = (state.mode === "auto" ? state.order : [])
    .map((id) => on.find((j) => j.id === id))
    .filter((j): j is Job => !!j && !j.locked)
    .map((job) => {
      const phases = phasesOf(job);
      return {
        job,
        phases,
        i: 0,
        rem: phases[0]?.hours ?? 0,
        ready: 0,
        started: false,
        mid: false,
        worked: [],
        waited: [],
      };
    });

  for (let w = 0; w < N; w++) {
    const turn = [
      ...queue.filter((f) => f.mid),
      ...queue.filter((f) => !f.mid),
    ];
    for (const f of turn) {
      if (f.i >= f.phases.length || w < f.ready) continue;
      const p = f.phases[f.i];
      const g = Math.min(p.perDay, f.rem);
      if (cap(p.role) - (load[p.role]?.[w] ?? 0) >= g) {
        book(f.job.id, p.role, w, g);
        f.worked.push({ w, i: f.i });
        f.started = true;
        f.mid = true;
        f.rem -= g;
        if (f.rem <= 0) {
          f.mid = false;
          f.i += 1;
          f.ready = w + 1;
          f.rem = f.phases[f.i]?.hours ?? 0;
        }
      } else if (f.started) {
        f.waited.push({
          w,
          role: p.role,
          by: [...new Set(holders[p.role]?.[w] ?? [])],
        });
      }
    }
  }

  for (const f of queue) {
    const phases = f.phases.flatMap((p, x): LaidPhase[] => {
      const days = f.worked.filter((d) => d.i === x).map((d) => d.w);
      return days.length
        ? [{ ...p, days, s: days[0], e: days[days.length - 1] }]
        : [];
    });
    if (phases.length) byJob[f.job.id] = { phases, waits: runs(f.waited) };
  }

  return { byJob, load, holders };
};

// ── reading a schedule ──────────────────────────────────────────────────────

export const startOf = (sch: Schedule, id: number): number | undefined =>
  sch.byJob[id]?.phases[0]?.s;
export const endOf = (sch: Schedule, id: number): number | undefined => {
  const ps = sch.byJob[id]?.phases;
  return ps?.length ? ps[ps.length - 1].e : undefined;
};

/** Fewest rows: each bar takes the first row whose last bar ends before it starts. */
export const pack = <T extends { s: number; e: number }>(
  spans: readonly T[],
): readonly (T & { row: number })[] =>
  [...spans]
    .sort((a, b) => a.s - b.s || a.e - b.e)
    .reduce<{ ends: number[]; out: (T & { row: number })[] }>(
      (acc, x) => {
        const free = acc.ends.findIndex((e) => e < x.s);
        const row = free < 0 ? acc.ends.length : free;
        const ends = [...acc.ends];
        ends[row] = x.e;
        return { ends, out: [...acc.out, { ...x, row }] };
      },
      { ends: [], out: [] },
    ).out;

/**
 * On every day a role is over its hours, the job holding it that STARTS LATEST
 * (the lowest priority) carries the flag. Result: job id → role → days.
 */
export const overFlags = (
  sch: Schedule,
  roles: readonly Role[],
): Readonly<Record<number, Readonly<Record<string, readonly number[]>>>> => {
  const flags: Record<number, Record<string, number[]>> = {};
  for (const r of roles) {
    (sch.load[r.id] ?? []).forEach((h, w) => {
      if (h <= r.hoursPerDay) return;
      const who = [...new Set(sch.holders[r.id][w])].sort(
        (a, b) => (startOf(sch, b) ?? 0) - (startOf(sch, a) ?? 0) || b - a,
      )[0];
      if (who === undefined) return;
      flags[who] = flags[who] ?? {};
      flags[who][r.id] = [...(flags[who][r.id] ?? []), w];
    });
  }
  return flags;
};

// ── state transitions ───────────────────────────────────────────────────────

const replaceJob = (
  state: SchedulerState,
  id: number,
  f: (j: Job) => Job,
): SchedulerState => ({
  ...state,
  jobs: state.jobs.map((j) => (j.id === id ? f(j) : j)),
});

/** Store each unlocked job's scheduled days as its placement. */
const freeze = (state: SchedulerState, sch: Schedule): SchedulerState => ({
  ...state,
  jobs: state.jobs.map((j) =>
    j.locked || !sch.byJob[j.id]
      ? j
      : { ...j, placement: sch.byJob[j.id].phases.map((p) => [...p.days]) },
  ),
});

/** Queue order from where the unlocked jobs currently start; unplaced keep their relative order at the end. */
const orderFromStarts = (state: SchedulerState): readonly number[] => {
  const unlocked = state.jobs.filter((j) => !j.locked);
  const placed = unlocked
    .filter((j) => j.placement?.[0]?.length)
    .sort(
      (a, b) =>
        (a.placement as Placement)[0][0] - (b.placement as Placement)[0][0] ||
        a.id - b.id,
    );
  const rest = [
    ...state.order.filter((id) =>
      unlocked.some((j) => j.id === id && !j.placement?.[0]?.length),
    ),
    ...unlocked
      .filter((j) => !j.placement?.[0]?.length && !state.order.includes(j.id))
      .map((j) => j.id),
  ];
  return [...placed.map((j) => j.id), ...rest];
};

/** Auto → manual freezes what auto computed; manual → auto takes the order from the current starts. */
export const setMode = (
  state: SchedulerState,
  mode: Mode,
  roles: readonly Role[],
): SchedulerState => {
  if (mode === state.mode) return state;
  return mode === "manual"
    ? { ...freeze(state, schedule(state, roles)), mode }
    : { ...state, mode, order: orderFromStarts(state) };
};

/** Manual only: pack the unlocked jobs once in their left-to-right order, and stay manual. */
export const flowOnce = (
  state: SchedulerState,
  roles: readonly Role[],
): SchedulerState => {
  const order = orderFromStarts(state);
  const auto = { ...state, mode: "auto" as const, order };
  return { ...freeze(state, schedule(auto, roles)), order };
};

/**
 * A drop at working day `w0`. Auto: the unlocked job moves in the QUEUE to sit
 * before the first job starting at or after `w0`. Manual: the whole job moves
 * so its first day is `w0`, keeping its shape. A locked job does not move.
 */
export const dragTo = (
  state: SchedulerState,
  id: number,
  w0: number,
  roles: readonly Role[],
): SchedulerState => {
  const job = state.jobs.find((j) => j.id === id);
  if (!job || job.locked) return state;
  if (state.mode === "manual") {
    const cur = job.placement?.[0]?.length
      ? job.placement
      : backToBack(job, w0);
    const d = w0 - cur[0][0];
    return replaceJob(state, id, (j) => ({
      ...j,
      placement: cur.map((ds) => ds.map((w) => Math.max(0, w + d))),
    }));
  }
  const sch = schedule(state, roles);
  const others = state.order.filter((x) => x !== id);
  const at = others.findIndex(
    (x) => (startOf(sch, x) ?? Number.POSITIVE_INFINITY) >= w0,
  );
  return {
    ...state,
    order:
      at < 0
        ? [...others, id]
        : [...others.slice(0, at), id, ...others.slice(at)],
  };
};

/** Lock a job where it sits now (it must have days), or unlock it back into the queue. */
export const toggleLock = (
  state: SchedulerState,
  id: number,
  roles: readonly Role[],
): SchedulerState => {
  const job = state.jobs.find((j) => j.id === id);
  if (!job) return state;
  if (job.locked) {
    const next = replaceJob(state, id, (j) => ({ ...j, locked: false }));
    return {
      ...next,
      order:
        next.mode === "auto" ? orderFromStarts(next) : [...state.order, id],
    };
  }
  const here = schedule(state, roles).byJob[id];
  if (!here) return state;
  const next = replaceJob(state, id, (j) => ({
    ...j,
    locked: true,
    placement: here.phases.map((p) => [...p.days]),
  }));
  return { ...next, order: state.order.filter((x) => x !== id) };
};

export const toggleOn = (state: SchedulerState, id: number): SchedulerState =>
  replaceJob(state, id, (j) => ({ ...j, on: !j.on }));

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

export const setValue = (
  state: SchedulerState,
  id: number,
  key: string,
  v: number,
): SchedulerState =>
  replaceJob(state, id, (j) => ({
    ...j,
    lines: j.lines.map((l) =>
      l.key === key ? { ...l, value: clamp(v, l.min, l.max) } : l,
    ),
  }));

/** Move a line's min or max. Refused (same state back) when it would cross the other bound. */
export const setBound = (
  state: SchedulerState,
  id: number,
  key: string,
  which: "min" | "max",
  n: number,
): SchedulerState => {
  const line = state.jobs
    .find((j) => j.id === id)
    ?.lines.find((l) => l.key === key);
  if (
    !line ||
    !Number.isFinite(n) ||
    (which === "max" ? n <= line.min : n >= line.max)
  )
    return state;
  return replaceJob(state, id, (j) => ({
    ...j,
    lines: j.lines.map((l) => {
      if (l.key !== key) return l;
      const b = { ...l, [which]: n };
      return {
        ...b,
        value: clamp(b.value, b.min, b.max),
        prior: clamp(b.prior, b.min, b.max),
      };
    }),
  }));
};

// ── the sample firm ─────────────────────────────────────────────────────────

/** Ridgeline Roofing's crews. */
export const DEFAULT_ROLES: readonly Role[] = [
  { id: "office", label: "Office", hoursPerDay: 8, rate: 25 },
  { id: "roofers", label: "Roofers", hoursPerDay: 32, rate: 125 },
  { id: "seamer", label: "Seamer", hoursPerDay: 8, rate: 140 },
];

type Bands = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];
const roofLines = (
  perm: number,
  prep: number,
  mat: number,
  clear: number,
  inst: number,
  b: Bands,
  installRole: "roofers" | "seamer" = "roofers",
): readonly Line[] => [
  {
    key: "perm",
    label: "Permits",
    unit: "h",
    role: "office",
    maxPerDay: 4,
    min: b[0],
    max: b[1],
    value: perm,
    prior: perm,
  },
  {
    key: "prep",
    label: "Prep",
    unit: "h",
    role: "roofers",
    maxPerDay: 16,
    min: b[2],
    max: b[3],
    value: prep,
    prior: prep,
  },
  {
    key: "clear",
    label: "Clearing",
    unit: "h",
    role: "roofers",
    maxPerDay: 16,
    min: b[6],
    max: b[7],
    value: clear,
    prior: clear,
  },
  {
    key: "inst",
    label: "Install",
    unit: "h",
    role: installRole,
    maxPerDay: installRole === "seamer" ? 8 : 16,
    min: b[8],
    max: b[9],
    value: inst,
    prior: inst,
  },
  {
    key: "mat",
    label: "Materials",
    unit: "$",
    min: b[4],
    max: b[5],
    value: mat,
    prior: mat,
  },
];

/** The sample: working-day index of a date in the default calendar is resolved by the bench. */
export const sampleJobs = (
  placeAt: (iso: string) => number,
): readonly Job[] => {
  const henderson: Job = {
    id: 1,
    name: "Henderson",
    status: "DOING",
    on: true,
    locked: true,
    placement: null,
    lines: roofLines(
      10,
      8,
      3000,
      16,
      72,
      [6, 16, 4, 16, 2500, 4000, 12, 24, 56, 96],
    ).map((l) => (l.key === "prep" ? { ...l, prior: 4 } : l)),
  };
  const jobs: readonly Job[] = [
    henderson,
    {
      id: 2,
      name: "Johnson",
      status: "TODO",
      on: true,
      locked: false,
      placement: null,
      lines: roofLines(
        8,
        6,
        2800,
        16,
        72,
        [4, 12, 4, 12, 2200, 3600, 10, 24, 56, 88],
      ),
    },
    {
      id: 3,
      name: "Harold",
      status: "PENDING",
      on: true,
      locked: false,
      placement: null,
      lines: roofLines(
        16,
        16,
        12000,
        48,
        96,
        [8, 24, 8, 24, 10000, 15000, 32, 64, 72, 128],
        "seamer",
      ),
    },
    {
      id: 4,
      name: "Blough",
      status: "PENDING",
      on: true,
      locked: false,
      placement: null,
      lines: roofLines(
        12,
        16,
        11000,
        40,
        80,
        [6, 18, 8, 24, 9000, 14000, 24, 56, 64, 112],
        "seamer",
      ),
    },
    {
      id: 5,
      name: "Okafor",
      status: "TODO",
      on: true,
      locked: false,
      placement: null,
      lines: roofLines(0, 4, 400, 0, 12, [0, 4, 2, 8, 200, 800, 0, 8, 8, 16]),
    },
  ];
  const starts: Readonly<Record<number, string>> = {
    1: "2026-10-07",
    2: "2026-10-12",
    5: "2026-10-05",
  };
  return jobs.map((j) =>
    starts[j.id]
      ? { ...j, placement: backToBack(j, placeAt(starts[j.id])) }
      : j,
  );
};

// ── timeline geometry ───────────────────────────────────────────────────────

/** Maps working-day indices to percentages of a calendar window, and back. */
export interface Axis {
  /** Where working day `w` starts. */
  readonly left: (w: number) => number;
  /** Where a run ending on working day `w` stops: the next working day's start, or the end of the window's last day. */
  readonly edge: (w: number) => number;
  /** The first working day at or after a position. */
  readonly dayAt: (pct: number) => number;
  /** A calendar date's position (for ticks). */
  readonly at: (iso: string) => number;
  readonly days: readonly number[];
}

export const makeAxis = (
  from: string,
  to: string,
  days: readonly number[],
): Axis => {
  const t0 = msOf(from);
  const span = msOf(to) + DAY - t0;
  const pct = (t: number) => ((t - t0) / span) * 100;
  const last = days.length - 1;
  return {
    days,
    left: (w) => pct(days[Math.max(0, Math.min(last, w))]),
    edge: (w) => (w + 1 <= last ? pct(days[w + 1]) : pct(days[last] + DAY)),
    dayAt: (p) => {
      const t = t0 + (p / 100) * span;
      const i = days.findIndex((d) => d >= t - 1);
      return i < 0 ? last : i;
    },
    at: (iso) => pct(msOf(iso)),
  };
};

export interface Segment {
  readonly kind: "work" | "wait";
  /** Percent of the bar's width. */
  readonly left: number;
  readonly width: number;
  readonly title: string;
  readonly role: string;
  readonly days: number;
  readonly by: readonly number[];
}

export interface Bar {
  /** Percent of the window. */
  readonly left: number;
  readonly width: number;
  readonly segments: readonly Segment[];
}

/** One job's bar: first working day to the end of its last, with phases then waits (waits draw over a paused phase). */
export const barOf = (
  phases: readonly LaidPhase[],
  waits: readonly Wait[],
  axis: Axis,
): Bar => {
  const left = axis.left(phases[0].s);
  const width = Math.max(0.01, axis.edge(phases[phases.length - 1].e) - left);
  const rel = (s: number, e: number) => ({
    left: ((axis.left(s) - left) / width) * 100,
    width: ((axis.edge(e) - axis.left(s)) / width) * 100,
  });
  return {
    left,
    width,
    segments: [
      ...phases.map((p) => ({
        kind: "work" as const,
        ...rel(p.s, p.e),
        title: p.label,
        role: p.role,
        days: p.days.length,
        by: [],
      })),
      ...waits.map((w) => ({
        kind: "wait" as const,
        ...rel(w.s, w.e),
        title: "Waiting",
        role: w.role,
        days: w.e - w.s + 1,
        by: w.by,
      })),
    ],
  };
};
