// Payroll board — the EVENTS section's model. Pure; no Solid, no DOM.
//
// Peter's 2026-09-24 sketch as data: a BASELINE payroll already on the books
// when the projection starts, and five pay events after it, each a list of
// per-person pay changes. Everything the chart draws — the levels, the flows
// between them, the numbered flags and their tooltip lines — is DERIVED from
// those, so moving an event (a flag drag) moves its count points and its
// transfers to the SAME new moment in one step. `LevelsTimeline` ties a flow
// to a flag by exact timestamp; a fixture that kept them separately would
// leave droplines at the old dates.
//
// THE BASELINE IS NOT AN EVENT. It was, at first — "Payroll 1 starts" as flag
// 1 — and deleting that flag emptied the chart before the next event, which
// read as the chart shrinking (Peter, 2026-09-24). Staff already on the books
// are a fact of the projection, like thorcasting's committed pay lines, not a
// change anybody made; only changes are tabs.
//
// THE SPAN IS THE CONSUMER'S. The domain is a fixed projection window picked
// by the span switcher, never derived from the events, and the value axis is
// pinned — so neither a delete nor a drag can move either axis.
import type {
  Level,
  Mutation,
  TimeDomain,
  Transfer,
} from "../../../../src/components/LevelsTimeline";
import {
  abbreviateDates,
  isoDayOf,
  levelsRailGeometry,
  monthDayOf,
} from "../../../../src/components/LevelsTimeline/geometry";
import { filter, find, findIndex, flatMap, join, map, sortBy } from "../../../../src/fn";

/** One person's pay from this event on. `null` = they leave. */
export interface PayChange {
  readonly person: string;
  readonly pay: number | null;
}

export interface PayEvent {
  readonly id: string;
  /** ms, UTC midnight. */
  readonly at: number;
  readonly changes: readonly PayChange[];
}

const day = (iso: string): number => Date.parse(`${iso}T00:00:00Z`);

/** The projection starts here, whatever its length. */
export const PROJECTION_START = day("2026-08-01");

/** The span switcher's choices — one per tick cadence Peter named. */
export const SPANS = [
  { id: "3m", label: "3m", months: 3 },
  { id: "6m", label: "6m", months: 6 },
  { id: "1y", label: "1y", months: 12 },
  { id: "2y", label: "2y", months: 24 },
] as const;
export type SpanId = (typeof SPANS)[number]["id"];

/** The fixed projection window for a span: start, plus that many months. */
export const spanDomain = (id: SpanId): TimeDomain => {
  const months = find((span) => span.id === id, SPANS)?.months ?? 6;
  const start = new Date(PROJECTION_START);
  return [
    PROJECTION_START,
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + months, 1),
  ];
};

export const DEFAULT_SPAN: SpanId = "6m";
export const PAY_DOMAIN: TimeDomain = spanDomain(DEFAULT_SPAN);

/** The value axis, pinned: a delete must never re-scale the rails. */
export const PAY_VALUE_DOMAIN: readonly [number, number] = [70_000, 120_000];

/** Who is on the books when the projection starts. */
export const BASELINE: readonly PayChange[] = [
  { person: "Person 1", pay: 80_000 },
  { person: "Person 2", pay: 80_000 },
  { person: "Person 3", pay: 95_000 },
];

/** The sketch: an arrival, a raise, another arrival, and two close events. */
export const PAY_EVENTS: readonly PayEvent[] = [
  {
    id: "hire-p4",
    at: day("2026-09-01"),
    changes: [{ person: "Person 4", pay: 80_000 }],
  },
  {
    id: "raise-p2",
    at: day("2026-10-03"),
    changes: [{ person: "Person 2", pay: 95_000 }],
  },
  {
    id: "hire-p5",
    at: day("2026-11-15"),
    changes: [{ person: "Person 5", pay: 95_000 }],
  },
  {
    id: "raise-p1",
    at: day("2027-01-03"),
    changes: [{ person: "Person 1", pay: 110_000 }],
  },
  {
    id: "raise-p3",
    at: day("2027-01-10"),
    changes: [{ person: "Person 3", pay: 110_000 }],
  },
];

export const asThousands = (value: number): string => `$${value / 1000}k`;

/** The events inside the window, in time order. The rest are off the chart. */
export const visibleEvents = (
  events: readonly PayEvent[],
  domain: TimeDomain,
): readonly PayEvent[] =>
  sortBy(
    (event: PayEvent) => event.at,
    filter(
      (event: PayEvent) =>
        event.at >= Number(domain[0]) && event.at <= Number(domain[1]),
      events,
    ),
  );

/** The event with `id` moved to `at`. Its changes travel with it. */
export const moveEvent = (
  events: readonly PayEvent[],
  id: string,
  at: number,
): readonly PayEvent[] =>
  map((event: PayEvent) => (event.id === id ? { ...event, at } : event), events);

/** The events without `id` — its changes go with it, so rails and flows re-derive. */
export const removeEvent = (
  events: readonly PayEvent[],
  id: string,
): readonly PayEvent[] => filter((event: PayEvent) => event.id !== id, events);

/**
 * A click on the plot at `at` (Peter: "clicking on the pay levels chart should
 * still insert a new value into that position"), already resolved to a whole
 * day by the chart's curried `pickDay`: a new hire at the lowest
 * level on that date, as a fresh event. A date that already has an event is
 * not a second event — the click selects the one there. Returns the events
 * and the id to select.
 */
export const addEventAt = (
  events: readonly PayEvent[],
  at: number,
): { readonly events: readonly PayEvent[]; readonly id: string } => {
  const existing = find((event: PayEvent) => event.at === at, events);
  if (existing !== undefined) return { events, id: existing.id };
  const people = new Set([
    ...map((change: PayChange) => change.person, BASELINE),
    ...map(
      (change: PayChange) => change.person,
      flatMap((event: PayEvent) => event.changes, events),
    ),
  ]);
  const person = `Person ${people.size + 1}`;
  const id = `added-${isoDayOf(at)}`;
  return {
    events: [...events, { id, at, changes: [{ person, pay: 80_000 }] }],
    id,
  };
};

/**
 * The change TABS, one per VISIBLE event in time order — the same order the
 * chart numbers its flags, so tab N is flag N. Labelled by the chart's own
 * `abbreviateDates`, so a tab row and the axis agree on when a year is worth
 * writing, and a delete re-derives the row.
 */
export const tabsOf = (
  events: readonly PayEvent[],
  domain: TimeDomain = PAY_DOMAIN,
): readonly { readonly id: string; readonly label: string }[] => {
  const ordered = visibleEvents(events, domain);
  const labels = abbreviateDates(map((event: PayEvent) => event.at, ordered));
  return map(
    (event: PayEvent, index: number) => ({ id: event.id, label: labels[index] }),
    ordered,
  );
};

/**
 * Who is selected after `removed` goes: the tab that slides into its place,
 * else the one before it, else nobody. Unchanged when something else went.
 */
export const selectionAfterRemove = (
  events: readonly PayEvent[],
  removed: string,
  selected: string | undefined,
  domain: TimeDomain = PAY_DOMAIN,
): string | undefined => {
  if (selected !== removed) return selected;
  const tabs = tabsOf(events, domain);
  const index = findIndex((tab: { id: string }) => tab.id === removed, tabs);
  return (tabs[index + 1] ?? tabs[index - 1])?.id;
};

const levelIdOf = (pay: number): string => `pay-${pay}`;

const describeChange = (
  change: PayChange,
  before: number | undefined,
): string => {
  if (change.pay === null) return `${change.person} leaves`;
  if (before === undefined)
    return `${change.person} joins at ${asThousands(change.pay)}`;
  return `${change.person} ${asThousands(before)} → ${asThousands(change.pay)}`;
};

/** One event, replayed: who held what just before, and the moves it made. */
interface Replayed {
  readonly at: number;
  readonly event?: PayEvent;
  /** Everyone's pay AFTER this step. */
  readonly after: ReadonlyMap<string, number>;
  readonly moves: readonly {
    readonly from?: number;
    readonly to?: number;
  }[];
  readonly details: readonly string[];
}

/** The baseline at the window's start, then each visible event in order. */
const replay = (
  events: readonly PayEvent[],
  domain: TimeDomain,
): readonly Replayed[] => {
  const pay = new Map<string, number>();
  for (const change of BASELINE) {
    if (change.pay !== null) pay.set(change.person, change.pay);
  }
  const out: Replayed[] = [
    { at: Number(domain[0]), after: new Map(pay), moves: [], details: [] },
  ];
  for (const event of visibleEvents(events, domain)) {
    const moves: { from?: number; to?: number }[] = [];
    const details: string[] = [];
    for (const change of event.changes) {
      const before = pay.get(change.person);
      details.push(describeChange(change, before));
      moves.push({
        ...(before === undefined ? {} : { from: before }),
        ...(change.pay === null ? {} : { to: change.pay }),
      });
      if (change.pay === null) pay.delete(change.person);
      else pay.set(change.person, change.pay);
    }
    out.push({ at: event.at, event, after: new Map(pay), moves, details });
  }
  return out;
};

const countAt = (after: ReadonlyMap<string, number>, level: number): number =>
  filter((pay: number) => pay === level, [...after.values()]).length;

/** Everything the chart needs, derived from the baseline and the events. */
export const toTimeline = (
  events: readonly PayEvent[],
  domain: TimeDomain = PAY_DOMAIN,
): {
  readonly levels: readonly Level[];
  readonly transfers: readonly Transfer[];
  readonly mutations: readonly Mutation[];
} => {
  const replayed = replay(events, domain);
  const pays = sortBy(
    (pay: number) => pay,
    [
      ...new Set(
        filter(
          (pay: number | null): pay is number => pay !== null,
          map(
            (change: PayChange) => change.pay,
            [...BASELINE, ...flatMap((event: PayEvent) => event.changes, events)],
          ),
        ),
      ),
    ],
  );

  const levels = map((pay: number): Level => {
    const points: { at: number; count: number }[] = [];
    let last = 0;
    for (const step of replayed) {
      const count = countAt(step.after, pay);
      if (count === last) continue;
      points.push({ at: step.at, count });
      last = count;
    }
    return { id: levelIdOf(pay), label: asThousands(pay), value: pay, points };
  }, pays);

  // An event ON the window's left edge draws no ribbon: it would run in from
  // off the plot. Its counts still land, as the rails' first width.
  const start = Number(domain[0]);
  const merged = new Map<string, Transfer>();
  for (const step of replayed) {
    if (step.at === start) continue;
    for (const move of step.moves) {
      const from = move.from === undefined ? undefined : levelIdOf(move.from);
      const to = move.to === undefined ? undefined : levelIdOf(move.to);
      const key = `${step.at}|${from ?? "out"}|${to ?? "out"}`;
      merged.set(key, {
        at: step.at,
        ...(from === undefined ? {} : { from }),
        ...(to === undefined ? {} : { to }),
        count: (merged.get(key)?.count ?? 0) + 1,
      });
    }
  }

  const mutations = map(
    (step: Replayed): Mutation => ({
      id: step.event?.id ?? "",
      at: step.at,
      // thorcasting's shape: a date as the label. The chart numbers the flag
      // itself and only announces this.
      label: monthDayOf(step.at),
      details: step.details,
    }),
    filter((step: Replayed) => step.event !== undefined, replayed),
  );

  return { levels, transfers: [...merged.values()], mutations };
};

/**
 * THE HEADLESS OBSERVATION: the flags and the dated axis, as the chart lays
 * them out on its default 640-wide frame, printed as text columns. The bench
 * shows it under the chart; a test asserts on it.
 */
export const observe = (
  events: readonly PayEvent[],
  domain: TimeDomain = PAY_DOMAIN,
): string => {
  const timeline = toTimeline(events, domain);
  const geometry = levelsRailGeometry({
    ...timeline,
    domain,
    valueDomain: PAY_VALUE_DOMAIN,
    formatValue: asThousands,
  });
  const round = (n: number): string => (Math.round(n * 10) / 10).toFixed(1);
  const flagRows = map(
    (flag) =>
      join("  ", [
        flag.label.padStart(2),
        isoDayOf(flag.at),
        round(flag.x).padStart(6),
        join("; ", flag.details),
      ]),
    geometry.flags,
  );
  const tickRows = map(
    (tick) =>
      join("  ", [
        isoDayOf(tick.at),
        round(tick.x).padStart(6),
        tick.event ? "event " : "filler",
        tick.showLabel ? tick.label : "(dropped)",
      ]),
    geometry.ticks,
  );
  return join("\n", [
    `domain ${isoDayOf(domain[0])} … ${isoDayOf(domain[1])}, value ${asThousands(PAY_VALUE_DOMAIN[0])} … ${asThousands(PAY_VALUE_DOMAIN[1])}`,
    "",
    " #  date             x  changes",
    ...flagRows,
    "",
    "tick date         x  kind    label",
    ...tickRows,
  ]);
};
