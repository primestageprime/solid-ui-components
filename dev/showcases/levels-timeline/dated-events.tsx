/**
 * LevelsTimeline showcase — DATED EVENTS (Peter, 2026-09-24).
 *
 * The chart as a payroll screen drives it: numbered flags in time order, a
 * hover tooltip with the exact day and what changed, flags DRAGGED to move
 * their event (clamped between neighbours), a click on the plot that adds an
 * event on the day under the pointer (`pickDay`, curried), and the change TABS
 * above it — a `MutationToolbar` whose chips are labelled by the chart's own
 * `abbreviateDates`, so tab N is flag N and the tab row and the axis agree on
 * when a year is worth writing.
 *
 * The value axis is HELD (`createAxisWaterMarks` over `levelsValueFit`): it
 * expands the moment a rail climbs past it and never shrinks on its own, so a
 * delete or a drag never rescales the plot under the pointer; the shrink
 * button fits it back to the rails present (Peter, 2026-09-24).
 *
 * The consumer owns the events. Everything the chart draws is DERIVED from
 * them here, in the pure functions below, so a moved or deleted event takes
 * its rails and ribbons with it. The domain is the consumer's fixed window,
 * never derived from the events; the staff already on the books when it
 * starts are a BASELINE, not an event, so deleting the first change never
 * empties the chart.
 */
import { type Component, createMemo, createSignal } from "solid-js";
import { GhostButton, IconOnlyButton } from "../../../src/components/Button";
import { Icon } from "../../../src/components/Icon";
import {
  abbreviateDates,
  createLevelsTimeline,
  levelsValueFit,
  pickDay,
} from "../../../src/components/LevelsTimeline";
import type {
  Level,
  Mutation,
  TimeDomain,
  Transfer,
} from "../../../src/components/LevelsTimeline";
import { createMutationToolbar } from "../../../src/components/MutationToolbar";
import {
  ClusterRow,
  SpreadRow,
  TightStack,
} from "../../../src/components/Layout";
import { createAxisWaterMarks } from "../../../src/hooks";
import { NoteText, TextTitle } from "../../../src/components/Text";
import { filter, find, findIndex, flatMap, map, sortBy } from "../../../src/fn";

const day = (iso: string): number => Date.parse(`${iso}T00:00:00Z`);
const asThousands = (value: number): string => `$${value / 1000}k`;

/**
 * The curried chart. The format is presentation and the pick strategy is
 * behaviour — both are this screen's, fixed at definition, never passed at a
 * call site.
 */
const DatedPayTimeline = createLevelsTimeline({
  formatValue: asThousands,
  pickAt: pickDay,
});
const ChangesToolbar = createMutationToolbar({});

const WINDOW: TimeDomain = [day("2026-08-01"), day("2027-02-01")];

interface PayChange {
  readonly person: string;
  readonly pay: number;
}
interface PayEvent {
  readonly id: string;
  readonly at: number;
  readonly changes: readonly PayChange[];
}

/** On the books when the window opens. Not an event: nobody made it. */
const BASELINE: readonly PayChange[] = [
  { person: "Person 1", pay: 80_000 },
  { person: "Person 2", pay: 80_000 },
  { person: "Person 3", pay: 95_000 },
];

/** An arrival, a raise, another arrival, and two changes a week apart. */
const EVENTS: readonly PayEvent[] = [
  {
    id: "hire-4",
    at: day("2026-09-01"),
    changes: [{ person: "Person 4", pay: 80_000 }],
  },
  {
    id: "raise-2",
    at: day("2026-10-03"),
    changes: [{ person: "Person 2", pay: 95_000 }],
  },
  {
    id: "hire-5",
    at: day("2026-11-15"),
    changes: [{ person: "Person 5", pay: 95_000 }],
  },
  {
    id: "raise-1",
    at: day("2027-01-03"),
    changes: [{ person: "Person 1", pay: 110_000 }],
  },
  {
    id: "raise-3",
    at: day("2027-01-10"),
    changes: [{ person: "Person 3", pay: 110_000 }],
  },
];

const inOrder = (events: readonly PayEvent[]): readonly PayEvent[] =>
  sortBy((event: PayEvent) => event.at, events);

const levelId = (pay: number): string => `pay-${pay}`;

/** Replay the baseline and the events into levels, flows and flags. */
const chartOf = (
  events: readonly PayEvent[],
): {
  readonly levels: readonly Level[];
  readonly transfers: readonly Transfer[];
  readonly mutations: readonly Mutation[];
} => {
  const pay = new Map(
    map((change: PayChange) => [change.person, change.pay] as const, BASELINE),
  );
  const snapshots: { at: number; pays: readonly number[] }[] = [
    { at: Number(WINDOW[0]), pays: [...pay.values()] },
  ];
  const transfers: Transfer[] = [];
  const mutations: Mutation[] = [];
  for (const event of inOrder(events)) {
    const details: string[] = [];
    for (const change of event.changes) {
      const before = pay.get(change.person);
      transfers.push({
        at: event.at,
        ...(before === undefined ? {} : { from: levelId(before) }),
        to: levelId(change.pay),
        count: 1,
      });
      details.push(
        before === undefined
          ? `${change.person} joins at ${asThousands(change.pay)}`
          : `${change.person} ${asThousands(before)} → ${asThousands(change.pay)}`,
      );
      pay.set(change.person, change.pay);
    }
    snapshots.push({ at: event.at, pays: [...pay.values()] });
    mutations.push({ id: event.id, at: event.at, label: event.id, details });
  }
  const values = sortBy(
    (value: number) => value,
    [
      ...new Set([
        ...map((change: PayChange) => change.pay, BASELINE),
        ...map(
          (change: PayChange) => change.pay,
          flatMap((event: PayEvent) => event.changes, events),
        ),
      ]),
    ],
  );
  const levels = map((value: number): Level => {
    const points: { at: number; count: number }[] = [];
    let last = 0;
    for (const snapshot of snapshots) {
      const count = filter(
        (one: number) => one === value,
        snapshot.pays,
      ).length;
      if (count === last) continue;
      points.push({ at: snapshot.at, count });
      last = count;
    }
    return { id: levelId(value), label: asThousands(value), value, points };
  }, values);
  return { levels, transfers, mutations };
};

/** The tabs: one per event in flag order, labelled by the axis's own rule. */
const tabsOf = (events: readonly PayEvent[]) => {
  const ordered = inOrder(events);
  const labels = abbreviateDates(map((event: PayEvent) => event.at, ordered));
  return map(
    (event: PayEvent, index: number) => ({
      id: event.id,
      label: labels[index],
    }),
    ordered,
  );
};

export const DatedEvents: Component = () => {
  const [events, setEvents] = createSignal(EVENTS);
  const [selected, setSelected] = createSignal<string>();
  const chart = createMemo(() => chartOf(events()));
  /** Expands with the rails at once; shrinks only when the reader asks. */
  const payAxis = createAxisWaterMarks(() => levelsValueFit(chart().levels));

  /** Give the LATEST change another $10k — a rail climbs, the axis follows. */
  const raiseLatest = (): void => {
    const latest = inOrder(events())[events().length - 1];
    if (latest === undefined) return;
    setEvents((before) =>
      map(
        (event: PayEvent) =>
          event.id === latest.id
            ? {
                ...event,
                changes: map(
                  (change: PayChange) => ({
                    ...change,
                    pay: change.pay + 10_000,
                  }),
                  event.changes,
                ),
              }
            : event,
        before,
      ),
    );
  };

  const remove = (id: string): void => {
    const tabs = tabsOf(events());
    const index = findIndex((tab: { id: string }) => tab.id === id, tabs);
    if (selected() === id)
      setSelected((tabs[index + 1] ?? tabs[index - 1])?.id);
    setEvents((before) => filter((event: PayEvent) => event.id !== id, before));
  };

  const add = (at: number): void => {
    const existing = find((event: PayEvent) => event.at === at, events());
    if (existing !== undefined) {
      setSelected(existing.id);
      return;
    }
    const id = `added-${at}`;
    const person = `Person ${events().length + BASELINE.length + 1}`;
    setEvents((before) => [
      ...before,
      { id, at, changes: [{ person, pay: 80_000 }] },
    ]);
    setSelected(id);
  };

  const move = (id: string, at: number): void => {
    setEvents((before) =>
      map(
        (event: PayEvent) => (event.id === id ? { ...event, at } : event),
        before,
      ),
    );
  };

  return (
    <TightStack>
      <ChangesToolbar
        title="Changes"
        changes={tabsOf(events())}
        selected={selected() ?? null}
        onSelect={setSelected}
        onRemove={remove}
        emptyNote="No changes — click the chart to add one."
      />
      <SpreadRow>
        <TextTitle>
          Dated events — drag a flag, hover it, click a day to add one
        </TextTitle>
        <ClusterRow>
          <GhostButton onClick={raiseLatest}>
            +$10k to the latest change
          </GhostButton>
          <IconOnlyButton
            onClick={payAxis.reset}
            aria-label="Fit y-axis to current values"
            title="Fit y-axis to current values"
          >
            <Icon name="shrink" size="sm" />
          </IconOnlyButton>
        </ClusterRow>
      </SpreadRow>
      <DatedPayTimeline
        levels={chart().levels}
        transfers={chart().transfers}
        mutations={chart().mutations}
        domain={WINDOW}
        valueDomain={payAxis.domain() ?? undefined}
        selectedMutationId={selected()}
        onSelectMutation={(id) =>
          setSelected((before) => (before === id ? undefined : id))
        }
        onMoveMutation={(id, at) => move(id, Number(at))}
        onPick={(at) => add(Number(at))}
      />
      <NoteText>
        Flags are numbered by time and nudge apart when close; each keeps a tick
        at its exact day on the axis. A flag cannot be dragged past a neighbour.
        Raise a rail and the value axis grows; delete the 2027 changes and it
        holds until you press shrink.
      </NoteText>
    </TightStack>
  );
};
