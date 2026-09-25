/**
 * LevelsTimeline showcase — three tracks over five years.
 *
 * The showcase plays the CONSUMER, and this fixture is the clearest statement
 * of where that line falls. The chart's model is LEVELS: a rail per numeric
 * `value`, as thick as the COUNT holding it, with a flow ribbon wherever a
 * count moves between two of them. It knows nothing about what those counts
 * are counts of.
 *
 * This file's model is PEOPLE and PAY, because that is what the first consumer
 * had: each person has a name, a track and a history of what they were paid
 * from when. Turning the first into the second is arithmetic, so it happens
 * HERE, in the named pure functions below — `levelsFor` and `transfersFor`.
 * The chart still does none: it is handed finished levels and transfers.
 *
 * ── Why three charts and not one ──────────────────────────────────────────
 *
 * A track is a band with its own ladder, and the three ladders OVERLAP: Track
 * A starts at 8k, Track C climbs through 8k in its third year. Sharing one y
 * would stack rails from different tracks at the same height, and a flow is
 * only ever within a track — so a shared plot would invite exactly the wrong
 * reading of a ribbon that happens to pass another track's rail.
 *
 * So: one timeline per track, stacked in one card, all three sharing the SAME
 * x-domain and the SAME numbered mutations. The flag columns and droplines
 * line up vertically down the stack, which is what makes "what happened in
 * year three" readable across all three tracks at once.
 */
import { For, createSignal, type Component } from "solid-js";
import {
  LevelsRailChart,
  createLevelsTimeline,
  timeOf,
} from "../../src/components/LevelsTimeline";
import type {
  Level,
  Mutation,
  TimeDomain,
  TimeValue,
  Transfer,
} from "../../src/components/LevelsTimeline";
import { CardSurface } from "../../src/components/Surface";
import { SectionTitle, TextTitle } from "../../src/components/Text";
import { SpacedStack, TightStack, createBox } from "../../src/components/Layout";
import { filter, map, sortBy } from "../../src/fn";
import { DatedEvents } from "./levels-timeline/dated-events";

/**
 * The curried variant this showcase draws with. `formatValue` is the one
 * presentational prop, and money is THIS consumer's knowledge, not the
 * chart's — so it is baked once here and never repeated at a call site.
 */
const MoneyLevelsTimeline = createLevelsTimeline({
  formatValue: (value: number) => `$${value / 1000}k`,
});

/** Five years. Long enough that the axis drops to a tick per year. */
const DOMAIN: TimeDomain = [new Date("2025-01-01"), new Date("2030-01-01")];

type TrackId = "A" | "B" | "C";

/** What somebody was paid, from when. */
interface PayPoint {
  readonly at: Date;
  readonly pay: number;
}

/**
 * A person, a track, and a pay history. `until` is when they LEFT. A person
 * whose history starts after the domain begins arrived; a person with an
 * `until` departed. Both become one-ended transfers below, which is what keeps
 * the total CONSERVED — every change in a rail's thickness has a matching
 * flow, so no rail ever thins silently.
 */
interface Person {
  readonly name: string;
  readonly track: TrackId;
  readonly history: readonly PayPoint[];
  readonly until?: Date;
}

const on = (iso: string): Date => new Date(iso);

/**
 * Track A raises land on July anniversaries and Track C bumps on April ones,
 * so the three tracks' events fall on distinct dates and the droplines do not
 * all collapse into the same columns.
 */
const PEOPLE: readonly Person[] = [
  // ── Track A: one starting level, five different rates of escape ──────────
  {
    name: "Ana",
    track: "A",
    history: [
      { at: on("2025-01-01"), pay: 8000 },
      { at: on("2025-07-01"), pay: 9000 },
      { at: on("2026-07-01"), pay: 10000 },
      { at: on("2027-07-01"), pay: 11000 },
      { at: on("2028-07-01"), pay: 12000 },
    ],
  },
  {
    name: "Ben",
    track: "A",
    history: [
      { at: on("2025-01-01"), pay: 8000 },
      { at: on("2025-07-01"), pay: 9000 },
      { at: on("2027-07-01"), pay: 10000 },
    ],
  },
  {
    name: "Cal",
    track: "A",
    history: [
      { at: on("2025-01-01"), pay: 8000 },
      { at: on("2026-07-01"), pay: 9000 },
      { at: on("2028-07-01"), pay: 10000 },
    ],
  },
  // Dee takes one raise and then leaves — a DEPARTURE, drawn as a flow out of
  // the 9k rail with no destination, so the rail thins and something visibly
  // goes.
  {
    name: "Dee",
    track: "A",
    history: [
      { at: on("2025-01-01"), pay: 8000 },
      { at: on("2025-07-01"), pay: 9000 },
    ],
    until: on("2028-01-01"),
  },
  // Fin joins two years in — an ARRIVAL, drawn as a flow INTO the 8k rail from
  // outside, so the rail Eve is holding alone thickens back to two.
  {
    name: "Fin",
    track: "A",
    history: [{ at: on("2027-01-01"), pay: 8000 }],
  },
  // Eve never moves. Her rail is the residual the starting level thins to.
  {
    name: "Eve",
    track: "A",
    history: [{ at: on("2025-01-01"), pay: 8000 }],
  },

  // ── Track B: the same raise, a year apart ────────────────────────────────
  {
    name: "Fay",
    track: "B",
    history: [
      { at: on("2025-01-01"), pay: 7000 },
      { at: on("2026-01-01"), pay: 9500 },
    ],
  },
  {
    name: "Gus",
    track: "B",
    history: [
      { at: on("2025-01-01"), pay: 7000 },
      { at: on("2027-01-01"), pay: 9500 },
    ],
  },

  // ── Track C: four fanning out by different amounts each year ─────────────
  //
  // Each person's four bumps are a PERMUTATION of +500/+1000/+1500/+2000, so
  // nobody repeats an amount. The permutations share their intermediate
  // figures, which keeps the track to eight distinct levels — few enough that
  // the bands stay readable — while still fanning to four destinations out of
  // one rail on the very first bump.
  {
    name: "Hal",
    track: "C",
    history: [
      { at: on("2025-01-01"), pay: 6000 },
      { at: on("2026-04-01"), pay: 6500 },
      { at: on("2027-04-01"), pay: 7500 },
      { at: on("2028-04-01"), pay: 9000 },
      { at: on("2029-04-01"), pay: 11000 },
    ],
  },
  {
    name: "Ivy",
    track: "C",
    history: [
      { at: on("2025-01-01"), pay: 6000 },
      { at: on("2026-04-01"), pay: 7000 },
      { at: on("2027-04-01"), pay: 7500 },
      { at: on("2028-04-01"), pay: 9000 },
      { at: on("2029-04-01"), pay: 11000 },
    ],
  },
  {
    name: "Joe",
    track: "C",
    history: [
      { at: on("2025-01-01"), pay: 6000 },
      { at: on("2026-04-01"), pay: 7500 },
      { at: on("2027-04-01"), pay: 8000 },
      { at: on("2028-04-01"), pay: 9000 },
      { at: on("2029-04-01"), pay: 11000 },
    ],
  },
  {
    name: "Kay",
    track: "C",
    history: [
      { at: on("2025-01-01"), pay: 6000 },
      { at: on("2026-04-01"), pay: 8000 },
      { at: on("2027-04-01"), pay: 9000 },
      { at: on("2028-04-01"), pay: 9500 },
      { at: on("2029-04-01"), pay: 11000 },
    ],
  },
];

/**
 * Three named moments. Everything else that happens gets a dropline instead,
 * which is the point of having both channels — the year-three Track C fan is
 * worth numbering, Gus's raise two months earlier is not.
 */
const MUTATIONS: readonly Mutation[] = [
  { id: "a-first", at: on("2025-07-01"), label: "1" },
  { id: "b-first", at: on("2026-01-01"), label: "2" },
  { id: "c-third", at: on("2027-04-01"), label: "3" },
];

// ── consumer-side derivation: people → levels + transfers ───────────────────

/** A level's id is its track and its figure — levels are keyed per track. */
const levelIdFor = (track: TrackId, pay: number): string => `${track}-${pay}`;

/** `$9.5k`. Short by construction, which is what lets a legend paint it. */
const payLabel = (pay: number): string => `$${pay / 1000}k`;

const peopleIn = (track: TrackId): readonly Person[] =>
  filter((person: Person) => person.track === track, PEOPLE);

/** A person's history, oldest first. Nothing downstream re-sorts it. */
const historyOf = (person: Person): readonly PayPoint[] =>
  sortBy((point: PayPoint) => point.at.getTime(), person.history);

/**
 * What this person was paid at `time` — undefined before they arrived and
 * undefined again once they have left, so a level's count falls of its own
 * accord at both ends.
 */
const payAt = (person: Person, time: number): number | undefined => {
  if (person.until !== undefined && time >= person.until.getTime()) {
    return undefined;
  }
  let current: number | undefined;
  for (const point of historyOf(person)) {
    if (point.at.getTime() > time) break;
    current = point.pay;
  }
  return current;
};

/** Every distinct figure in a track, low to high. One rail each. */
const paysIn = (people: readonly Person[]): readonly number[] => {
  const pays = new Set<number>();
  for (const person of people) {
    for (const point of person.history) pays.add(point.pay);
  }
  return sortBy((pay: number) => pay, [...pays]);
};

/** Every moment anybody in the track moved, arrived or left. */
const momentsIn = (people: readonly Person[]): readonly number[] => {
  const times = new Set<number>();
  for (const person of people) {
    for (const point of person.history) times.add(point.at.getTime());
    if (person.until !== undefined) times.add(person.until.getTime());
  }
  return sortBy((time: number) => time, [...times]);
};

/**
 * The count on one figure over time, as count points.
 *
 * Only CHANGES are emitted — a point saying "still four" would put a dropline
 * on the chart at a moment nothing happened to this level. Dropping to zero IS
 * a change and is emitted, which is what ends a rail's span.
 */
const countPointsFor = (
  people: readonly Person[],
  pay: number,
  moments: readonly number[],
): { at: Date; count: number }[] => {
  const points: { at: Date; count: number }[] = [];
  let previous = 0;
  for (const time of moments) {
    const holders = filter(
      (person: Person) => payAt(person, time) === pay,
      people,
    );
    if (holders.length === previous) continue;
    points.push({ at: new Date(time), count: holders.length });
    previous = holders.length;
  }
  return points;
};

/** One track's rails. */
const levelsFor = (track: TrackId): Level[] => {
  const people = peopleIn(track);
  const moments = momentsIn(people);
  return map(
    (pay: number) => ({
      id: levelIdFor(track, pay),
      label: payLabel(pay),
      value: pay,
      points: countPointsFor(people, pay, moments),
    }),
    paysIn(people),
  );
};

/**
 * One track's flows. Two people taking the same raise on the same day are ONE
 * ribbon of width two, not two ribbons drawn over each other — so Track B's
 * pair, a year apart, stays visibly two events while Track A's simultaneous
 * three reads as a single thicker departure.
 */
const transfersFor = (track: TrackId, domain: TimeDomain): Transfer[] => {
  const merged = new Map<string, Transfer>();
  const add = (
    at: Date,
    from: string | undefined,
    to: string | undefined,
  ): void => {
    const key = `${at.getTime()}|${from ?? "out"}|${to ?? "out"}`;
    const existing = merged.get(key);
    merged.set(key, { at, from, to, count: (existing?.count ?? 0) + 1 });
  };
  const start = timeOf(domain[0]);
  for (const person of peopleIn(track)) {
    const history = historyOf(person);
    for (const [index, point] of history.entries()) {
      const previous = history[index - 1];
      if (previous === undefined) {
        // A first point after the span began is an ARRIVAL. Somebody already
        // there when it began simply was there.
        if (point.at.getTime() > start) {
          add(point.at, undefined, levelIdFor(track, point.pay));
        }
        continue;
      }
      if (previous.pay === point.pay) continue;
      add(
        point.at,
        levelIdFor(track, previous.pay),
        levelIdFor(track, point.pay),
      );
    }
    if (person.until !== undefined) {
      const last = history[history.length - 1];
      if (last !== undefined) {
        add(person.until, levelIdFor(track, last.pay), undefined);
      }
    }
  }
  return sortBy((transfer: Transfer) => timeOf(transfer.at), [
    ...merged.values(),
  ]);
};

interface Track {
  readonly id: TrackId;
  readonly title: string;
  readonly levels: readonly Level[];
  readonly transfers: readonly Transfer[];
}

const trackOf = (id: TrackId, title: string): Track => ({
  id,
  title,
  levels: levelsFor(id),
  transfers: transfersFor(id, DOMAIN),
});

const TRACKS: readonly Track[] = [
  trackOf("A", "Track A — one starting level, five rates"),
  trackOf("B", "Track B — the same raise, a year apart"),
  trackOf("C", "Track C — four fanning out"),
];

const TRACK_A = TRACKS[0];
const TRACK_C = TRACKS[2];

/**
 * A SHORT box, so the chart's compact chrome is visible: the axis collapses to
 * one thinned tick row, the flags overlay the top of the plot, and the plot
 * keeps the rest. The chart fills whatever box it is given, so a height here
 * is all it takes.
 */
const ShortBox = createBox({ style: { height: "110px" } });

/** One track's chart, as a readout: no selection, no pick. */
const TrackReadout: Component<{ track: Track }> = (props) => (
  <TightStack>
    <TextTitle>{props.track.title}</TextTitle>
    <MoneyLevelsTimeline
      levels={props.track.levels}
      transfers={props.track.transfers}
      mutations={MUTATIONS}
      domain={DOMAIN}
    />
  </TightStack>
);

/** The flags are buttons exactly when a consumer wires selection. */
const SelectableFlags: Component = () => {
  const [selected, setSelected] = createSignal<string | undefined>("a-first");
  return (
    <TightStack>
      <TextTitle>Selectable flags — click a number, or tab to it</TextTitle>
      <MoneyLevelsTimeline
        levels={TRACK_A.levels}
        transfers={TRACK_A.transfers}
        mutations={MUTATIONS}
        domain={DOMAIN}
        selectedMutationId={selected()}
        onSelectMutation={setSelected}
      />
    </TightStack>
  );
};

/**
 * Hover reads the stack out; a click reports a date. Turning that date into a
 * numbered flag is the CONSUMER's decision, and this is the smallest honest
 * version of it — numbering continues from the three named mutations.
 */
const HoverAndPick: Component = () => {
  const [picked, setPicked] = createSignal<readonly Mutation[]>([]);
  const mutations = (): readonly Mutation[] => [...MUTATIONS, ...picked()];
  const pick = (at: TimeValue): void => {
    const time = timeOf(at);
    const already = filter(
      (one: Mutation) => timeOf(one.at) === time,
      mutations(),
    );
    // One flag per date: clicking the same month twice is not two events.
    if (already.length > 0) return;
    setPicked((before) => [
      ...before,
      {
        id: `picked-${time}`,
        at,
        label: String(MUTATIONS.length + before.length + 1),
      },
    ]);
  };
  return (
    <TightStack>
      <TextTitle>Hover for the stack, click to pick a month</TextTitle>
      <MoneyLevelsTimeline
        levels={TRACK_C.levels}
        transfers={TRACK_C.transfers}
        mutations={mutations()}
        domain={DOMAIN}
        onPick={pick}
      />
    </TightStack>
  );
};

/**
 * A PINNED value axis, which is how the board uses the chart: the range comes
 * from the roster's role bands rather than from the rails present, so a rail
 * moves against an axis that holds still. A level outside the pin clamps to
 * the edge rather than widening it.
 */
const PinnedAxis: Component = () => (
  <TightStack>
    <TextTitle>A pinned axis — $0k to $20k, whatever the rails do</TextTitle>
    <MoneyLevelsTimeline
      levels={TRACK_C.levels}
      transfers={TRACK_C.transfers}
      mutations={MUTATIONS}
      domain={DOMAIN}
      valueDomain={[0, 20000]}
    />
  </TightStack>
);

/**
 * The ZERO-CONFIG curried variant, exactly as the package ships it: plain
 * numbers on the axis and in the readout, nothing curried, nothing
 * configured. This is the form to reach for before units are decided — and
 * the comparison that shows what `formatValue` is for.
 */
const PlainNumbers: Component = () => (
  <TightStack>
    <TextTitle>`LevelsRailChart` — no format baked, plain numbers</TextTitle>
    <LevelsRailChart
      levels={TRACK_C.levels}
      transfers={TRACK_C.transfers}
      mutations={MUTATIONS}
      domain={DOMAIN}
    />
  </TightStack>
);

export const LevelsTimelineShowcase: Component = () => (
  <div class="component-section component-section--full">
    <SpacedStack>
      <SectionTitle>Levels Timeline</SectionTitle>

      <CardSurface>
        <SpacedStack>
          <For each={TRACKS}>{(track) => <TrackReadout track={track} />}</For>
        </SpacedStack>
      </CardSurface>

      <CardSurface>
        <DatedEvents />
      </CardSurface>

      <CardSurface>
        <SelectableFlags />
      </CardSurface>

      <CardSurface>
        <HoverAndPick />
      </CardSurface>

      <CardSurface>
        <PinnedAxis />
      </CardSurface>

      <CardSurface>
        <PlainNumbers />
      </CardSurface>

      <CardSurface>
        <TightStack>
          <TextTitle>A short box — the chrome gives way, the plot stays</TextTitle>
          <ShortBox>
            <MoneyLevelsTimeline
              levels={TRACK_A.levels}
              transfers={TRACK_A.transfers}
              mutations={MUTATIONS}
              domain={DOMAIN}
            />
          </ShortBox>
        </TightStack>
      </CardSurface>
    </SpacedStack>
  </div>
);
