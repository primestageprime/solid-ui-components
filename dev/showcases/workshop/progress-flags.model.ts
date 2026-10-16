/**
 * progress-flags bench: the pure step-timeline model for one diddit topic.
 *
 * x is wall-clock time (epoch ms). y is CUMULATIVE PLANNED MINUTES EARNED: the
 * sum of the estimates of the steps that are done. Two step lines:
 *
 *   ESTIMATE  steps through every step at its estimated duration, back to back,
 *             starting from the first receipt.
 *   ACTUAL    steps at each real StepDone; at the Milestone it jumps to the
 *             whole topic estimate.
 *
 * The area between them is coloured by performance (`verdictOf`): within
 * tolerance, ahead by more than it, or behind by more than it. Both lines are
 * constant between event times, so the area is built as rectangles that already
 * carry the stair corners; the chart draws them with plain linear areas.
 *
 * TOLERANCE is the one place to tune the colouring: `TOLERANCE_RATIO` of the
 * minutes planned so far, never below `TOLERANCE_FLOOR_MIN`.
 *
 * Pure functions of (trace, as-of). Nothing reads the clock.
 */
import { filter, find, findIndex, flatMap, join, map, sortBy, sum } from "../../../src/fn";
import type { Receipt, ReceiptKind, Step, TopicTrace } from "./progress-flags.fixtures";

export const MIN_MS = 60_000;

/**
 * Tolerance as a share of the minutes planned so far (1 = 100%). TUNE HERE.
 * At 100% or more "behind" can never happen: the deficit is at most the
 * minutes planned so far. Peter's first spec said 100%; 50% is the default so
 * red is reachable.
 */
export const TOLERANCE_RATIO = 0.5;
/** Tolerance never drops below this many minutes. TUNE HERE. */
export const TOLERANCE_FLOOR_MIN = 5;

export const toleranceOf = (
  plannedSoFarMin: number,
  ratio: number = TOLERANCE_RATIO,
): number => Math.max(ratio * plannedSoFarMin, TOLERANCE_FLOOR_MIN);

export type Verdict = "within" | "ahead" | "behind";

/** Actual earned minus estimated earned, judged against the tolerance. */
export const verdictOf = (
  estimateMin: number,
  actualMin: number,
  ratio: number = TOLERANCE_RATIO,
): Verdict => {
  const gap = actualMin - estimateMin;
  const tol = toleranceOf(estimateMin, ratio);
  return gap > tol ? "ahead" : gap < -tol ? "behind" : "within";
};

// ---------------------------------------------------------------- the trace

/** The first receipt: where the estimate clock starts. */
export const startOf = (t: TopicTrace): number =>
  Math.min(...map((r: Receipt) => r.at, t.receipts));

const milestoneOf = (t: TopicTrace): number | undefined =>
  find((r: Receipt) => r.kind === "Milestone", t.receipts)?.at;

/** Where the trace ends: its Milestone, else its last receipt. */
export const endOf = (t: TopicTrace): number =>
  milestoneOf(t) ?? Math.max(...map((r: Receipt) => r.at, t.receipts));

/** The steps in order; a topic with none is one step as long as its estimate. */
export const stepsOf = (t: TopicTrace): readonly Step[] =>
  t.steps.length > 0
    ? t.steps
    : [
        {
          title: "Whole topic",
          estimateMin: t.estimateMin,
          startedAt: undefined,
          doneAt: milestoneOf(t),
        },
      ];

export const totalMin = (t: TopicTrace): number =>
  sum(map((s: Step) => s.estimateMin, stepsOf(t)));

const cumulative = (steps: readonly Step[]): readonly number[] =>
  map(
    (_s: Step, i: number) => sum(map((s: Step) => s.estimateMin, steps.slice(0, i + 1))),
    steps,
  );

// ---------------------------------------------------------------- the lines

export interface LevelPoint {
  readonly x: number;
  readonly y: number;
}

/** The estimate line: every step at its estimated duration from the start. */
export const estimateLine = (t: TopicTrace): readonly LevelPoint[] => {
  const steps = stepsOf(t);
  const t0 = startOf(t);
  return [
    { x: t0, y: 0 },
    ...map((y: number) => ({ x: t0 + y * MIN_MS, y }), cumulative(steps)),
  ];
};

/** Steps whose doneAt is on or before `asOf`, in the order they finished. */
const doneBy = (t: TopicTrace, asOf: number): readonly Step[] =>
  sortBy(
    (s: Step) => s.doneAt ?? 0,
    filter((s: Step) => s.doneAt !== undefined && s.doneAt <= asOf, stepsOf(t)),
  );

/**
 * The actual line up to `asOf`: a point at each StepDone (cumulative planned
 * minutes of the steps done by then), the whole topic estimate at the
 * Milestone, and a closing point at `asOf` holding the last level.
 */
export const actualLine = (
  t: TopicTrace,
  asOf: number = endOf(t),
): readonly LevelPoint[] => {
  const done = doneBy(t, asOf);
  const moves = map(
    (s: Step, i: number) => ({
      x: s.doneAt ?? 0,
      y: sum(map((d: Step) => d.estimateMin, done.slice(0, i + 1))),
    }),
    done,
  );
  const m = milestoneOf(t);
  const milestone = m !== undefined && m <= asOf ? [{ x: m, y: totalMin(t) }] : [];
  const all = [{ x: startOf(t), y: 0 }, ...moves, ...milestone];
  const last = all[all.length - 1] ?? { x: startOf(t), y: 0 };
  return last.x < asOf ? [...all, { x: asOf, y: last.y }] : all;
};

/** The level of a step line at `x`: its last point at or before it. */
export const levelAt = (line: readonly LevelPoint[], x: number): number =>
  sum(
    map(
      (p: LevelPoint) => p.y,
      filter(
        (p: LevelPoint, i: number) =>
          p.x <= x && (line[i + 1] === undefined || (line[i + 1] as LevelPoint).x > x),
        line,
      ),
    ),
  );

// ---------------------------------------------------------------- the area

/** One vertex of a band: the area runs from `bottom` (estimate) to `top` (actual). */
export interface BandVertex {
  readonly x: number;
  readonly top: number;
  readonly bottom: number;
}

export interface Interval {
  readonly from: number;
  readonly to: number;
  readonly estimate: number;
  readonly actual: number;
  readonly verdict: Verdict;
}

const GAP: BandVertex = { x: Number.NaN, top: Number.NaN, bottom: Number.NaN };

/** The stretches between event times, up to `asOf`, each with its verdict. */
export const intervalsOf = (
  t: TopicTrace,
  asOf: number = endOf(t),
  ratio: number = TOLERANCE_RATIO,
): readonly Interval[] => {
  const est = estimateLine(t);
  const act = actualLine(t, asOf);
  const xs = sortBy(
    (x: number) => x,
    filter(
      (x: number) => x <= asOf,
      [...new Set([...map((p: LevelPoint) => p.x, est), ...map((p: LevelPoint) => p.x, act)])],
    ),
  );
  return flatMap((from: number, i: number): Interval[] => {
    const to = xs[i + 1];
    if (to === undefined) return [];
    const estimate = levelAt(est, from);
    const actual = levelAt(act, from);
    return [{ from, to, estimate, actual, verdict: verdictOf(estimate, actual, ratio) }];
  }, xs);
};

/**
 * The band for one verdict: rectangles with their stair corners, a NaN vertex
 * between runs that do not touch (AreaSeries breaks the fill there).
 */
export const bandFor = (
  intervals: readonly Interval[],
  verdict: Verdict,
): readonly BandVertex[] =>
  flatMap((iv: Interval, i: number): BandVertex[] => {
    if (iv.verdict !== verdict) return [];
    const edge = (x: number): BandVertex => ({ x, top: iv.actual, bottom: iv.estimate });
    const next = intervals[i + 1];
    return [edge(iv.from), edge(iv.to), ...(next?.verdict === verdict ? [] : [GAP])];
  }, intervals);

/** Minutes spent in each verdict, by interval length. */
export const verdictMinutes = (
  intervals: readonly Interval[],
): Readonly<Record<Verdict, number>> => {
  const of = (v: Verdict): number =>
    Math.round(
      sum(
        map(
          (iv: Interval) => (iv.to - iv.from) / MIN_MS,
          filter((iv: Interval) => iv.verdict === v, intervals),
        ),
      ) * 10,
    ) / 10;
  return { within: of("within"), ahead: of("ahead"), behind: of("behind") };
};

// ---------------------------------------------------------------- the flags

export type FlagState = "past" | "current" | "planned";

export interface Flag {
  readonly index: number;
  readonly x: number;
  readonly y: number;
  readonly state: FlagState;
  readonly title: string;
  readonly stepTitle: string;
  readonly estimateMin: number;
  /** Started to done, in minutes; undefined until the step is done. */
  readonly actualMin: number | undefined;
}

/**
 * One flag per step, at the top of its rise. A done step sits on the ACTUAL
 * line where it finished; the first started-but-unfinished step is the current
 * one; both it and every unstarted step sit on the ESTIMATE line.
 */
export const flagsOf = (t: TopicTrace, asOf: number = endOf(t)): readonly Flag[] => {
  const steps = stepsOf(t);
  const t0 = startOf(t);
  const levels = cumulative(steps);
  const currentIndex = findIndex(
    (s: Step) => s.startedAt !== undefined && s.startedAt <= asOf && (s.doneAt === undefined || s.doneAt > asOf),
    steps,
  );
  return map((s: Step, i: number): Flag => {
    const y = levels[i] ?? 0;
    const done = s.doneAt !== undefined && s.doneAt <= asOf;
    const state: FlagState = done ? "past" : i === currentIndex ? "current" : "planned";
    return {
      index: i + 1,
      x: done ? (s.doneAt ?? t0) : t0 + y * MIN_MS,
      y,
      state,
      title: `${i + 1}. ${s.title} (${s.estimateMin}m, ${state})`,
      stepTitle: s.title,
      estimateMin: s.estimateMin,
      actualMin:
        done && s.startedAt !== undefined && s.doneAt !== undefined
          ? Math.round(((s.doneAt - s.startedAt) / MIN_MS) * 10) / 10
          : undefined,
    };
  }, steps);
};

/** The tooltip lines of a flag: step, estimate, actual if any, state. */
export const flagTip = (f: Flag): readonly string[] => [
  `Step ${f.index}: ${f.stepTitle}`,
  `Estimated ${f.estimateMin}m`,
  ...(f.actualMin === undefined ? [] : [`Actual ${f.actualMin}m`]),
  f.state === "past" ? "Done" : f.state === "current" ? "In progress" : "Planned",
];

// ---------------------------------------------------------------- the axis

/** Wall-clock ticks on every `everyMin` minutes, from `from` to `to`. */
export const timeTicks = (from: number, to: number, everyMin: number): readonly number[] => {
  const step = everyMin * MIN_MS;
  const first = Math.ceil(from / step) * step;
  return map((i: number) => first + i * step, [...Array(Math.max(0, Math.floor((to - first) / step) + 1)).keys()]);
};

/** "14:30" in the viewer's zone. */
export const clock = (x: number): string =>
  new Date(x).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

// ---------------------------------------------------------------- the receipts table

export interface ReceiptRow {
  readonly elapsed: string;
  readonly kind: ReceiptKind;
  readonly detail: string;
  /** Planned duration of the step, or of the topic at its Milestone; "" otherwise. */
  readonly estimate: string;
  /** Started-to-done of the step, or claim-to-Milestone; "" otherwise. */
  readonly actual: string;
  /** The 1-based step this receipt is about, for linking to its flag. */
  readonly step: number | undefined;
}

const minutesSince = (t0: number, x: number): string => `+${((x - t0) / MIN_MS).toFixed(1)}m`;

const spanMin = (from: number, to: number): string => `${((to - from) / MIN_MS).toFixed(1)}m`;

/** The step a StepStarted/StepDone receipt names: "step 3 ..." is the third. */
const stepNumberOf = (r: Receipt): number | undefined => {
  const n = Number(/^step (\d+)/i.exec(r.detail)?.[1]);
  return Number.isNaN(n) ? undefined : n;
};

const stepOf = (t: TopicTrace, r: Receipt): Step | undefined => {
  const n = stepNumberOf(r);
  return n === undefined ? undefined : stepsOf(t)[n - 1];
};

const durationsOf = (
  t: TopicTrace,
  r: Receipt,
): { readonly estimate: string; readonly actual: string } => {
  if (r.kind === "Milestone")
    return { estimate: `${t.estimateMin}m`, actual: spanMin(startOf(t), r.at) };
  const step = r.kind === "StepStarted" || r.kind === "StepDone" ? stepOf(t, r) : undefined;
  if (step === undefined) return { estimate: "", actual: "" };
  const done = r.kind === "StepDone" && step.startedAt !== undefined;
  return {
    estimate: `${step.estimateMin}m`,
    actual: done ? spanMin(step.startedAt ?? r.at, r.at) : "",
  };
};

/** The topic's receipts as rows: elapsed since the first receipt, kind, detail, durations. */
export const receiptRows = (t: TopicTrace): readonly ReceiptRow[] => {
  const t0 = startOf(t);
  return map(
    (r: Receipt): ReceiptRow => ({
      elapsed: minutesSince(t0, r.at),
      kind: r.kind,
      detail: r.detail,
      ...durationsOf(t, r),
      step: stepNumberOf(r),
    }),
    sortBy((r: Receipt) => r.at, t.receipts),
  );
};

// ---------------------------------------------------------------- headless observation

const padR = (s: string, n: number): string => s.padEnd(n);
const padL = (s: string, n: number): string => s.padStart(n);

const lineTable = (t0: number, label: string, line: readonly LevelPoint[]): string =>
  join("\n", [
    `${label}: elapsed, earned minutes`,
    ...map((p: LevelPoint) => `  ${padL(minutesSince(t0, p.x), 9)} ${padL(String(p.y), 5)}`, line),
  ]);

export const intervalTable = (t: TopicTrace, ivs: readonly Interval[]): string => {
  const t0 = startOf(t);
  return join("\n", [
    `${padR("from", 9)}${padR("to", 9)}${padL("est", 6)}${padL("act", 6)}${padL("tol", 6)}  verdict`,
    ...map(
      (iv: Interval) =>
        `${padR(minutesSince(t0, iv.from), 9)}${padR(minutesSince(t0, iv.to), 9)}${padL(String(iv.estimate), 6)}${padL(String(iv.actual), 6)}${padL(String(toleranceOf(iv.estimate)), 6)}  ${iv.verdict}`,
      ivs,
    ),
  ]);
};

export const flagTable = (t: TopicTrace, flags: readonly Flag[]): string => {
  const t0 = startOf(t);
  return join("\n", [
    "flag  state     at        earned",
    ...map(
      (f: Flag) => `${padL(String(f.index), 4)}  ${padR(f.state, 8)}  ${padR(minutesSince(t0, f.x), 9)} ${padL(String(f.y), 5)}`,
      flags,
    ),
  ]);
};

/** The whole observation of one topic: both lines, the area, the flags. */
export const observe = (t: TopicTrace, asOf: number = endOf(t)): string => {
  const t0 = startOf(t);
  const ivs = intervalsOf(t, asOf);
  return join("\n\n", [
    `topic ${t.id}: ${t.title} (estimate ${t.estimateMin}m, tolerance ${TOLERANCE_RATIO * 100}% of planned, floor ${TOLERANCE_FLOOR_MIN}m)`,
    lineTable(t0, "ESTIMATE", estimateLine(t)),
    lineTable(t0, "ACTUAL", actualLine(t, asOf)),
    intervalTable(t, ivs),
    `minutes by verdict: ${JSON.stringify(verdictMinutes(ivs))}`,
    flagTable(t, flagsOf(t, asOf)),
  ]);
};
