/**
 * Levels Timeline bench — three pay TRACKS over five years (Peter, 2026-09-16).
 *
 * The bench plays the CONSUMER, and this fixture is the clearest statement of
 * where that line falls. Peter's model is PEOPLE: each person has a name, a
 * track, and a history of what they were paid from when. The chart's model is
 * LEVELS: a rail per pay figure, as thick as the headcount holding it, with a
 * flow ribbon wherever somebody moves between two of them.
 *
 * Turning the first into the second is arithmetic, so it happens HERE, in the
 * named pure functions below — `levelsFor` and `transfersFor`. The chart still
 * does none: it is handed finished levels and transfers and paints them.
 *
 * ── Why three charts and not one ──────────────────────────────────────────
 *
 * A track is a role band with its own ladder, and the three ladders OVERLAP in
 * pay: Track A starts at $8k, Track C climbs through $8k in its third year.
 * Sharing one y would stack rails from different tracks at the same height —
 * at $8k exactly, two tracks' rails would be drawn on top of each other and no
 * reader could separate them. Worse, a flow is only ever within a track, so a
 * shared plot would invite exactly the wrong reading of a ribbon that happens
 * to pass another track's rail.
 *
 * So: one `LevelsTimeline` per track, stacked in one card, all three sharing
 * the SAME x-domain and the SAME numbered mutations. The flag columns and the
 * droplines therefore line up vertically down the stack, which is what makes
 * "what happened in year three" readable across all three tracks at once —
 * and each track still gets the full plot height for its own ladder.
 *
 * ── The three tracks ──────────────────────────────────────────────────────
 *
 *   A — five people who all start on the same level, raised at different
 *       rates. The starting rail thins as each one leaves it, at a different
 *       date, and a residual (Eve) stays on it flat to the end.
 *   B — two people taking the SAME raise a year apart: two identical ribbons,
 *       same source, same destination, twelve months of daylight between them.
 *   C — four people who all bump every year but by different amounts, so they
 *       fan out: several flows leaving one rail on one date for different
 *       destinations.
 *
 * Flip `DEBUG` to read the derived model as tables, without a browser.
 */
import { createSignal, type Component } from "solid-js";
import {
  LevelsTimeline,
  timeOf,
} from "../../../src/components/LevelsTimeline";
import type {
  Level,
  Mutation,
  TimeDomain,
  Transfer,
} from "../../../src/components/LevelsTimeline";
import { CardSurface } from "../../../src/components/Surface";
import {
  CaptionLabel,
  MutedBody,
  SectionTitle,
  TextTitle,
} from "../../../src/components/Text";
import { SpacedStack, TightStack } from "../../../src/components/Layout";
import { filter, map, sortBy } from "../../../src/fn";

export const meta = { label: "Levels Timeline" };

/** Flip to true and reload: the derived model prints to the console. */
const DEBUG = false;

/** Five years. Long enough that the axis drops to a tick per year. */
const DOMAIN: TimeDomain = [new Date("2025-01-01"), new Date("2030-01-01")];

type TrackId = "A" | "B" | "C";

/** What somebody was paid, from when. */
interface PayPoint {
  readonly at: Date;
  readonly pay: number;
}

/**
 * Peter's model: a person, a track, and a pay history.
 *
 * `until` is when they LEFT. A person whose history starts after the domain
 * begins was hired; a person with an `until` departed. Both become one-ended
 * transfers below, which is what keeps headcount conserved — every change in a
 * rail's thickness has a matching flow, so no rail ever thins silently.
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
  // Dee takes one raise and then leaves — a departure, drawn as a flow out of
  // $9k with no destination, so the rail thins and something visibly goes.
  {
    name: "Dee",
    track: "A",
    history: [
      { at: on("2025-01-01"), pay: 8000 },
      { at: on("2025-07-01"), pay: 9000 },
    ],
    until: on("2028-01-01"),
  },
  // Fin joins two years in — a hire, drawn as a flow INTO $8k from outside, so
  // the rail Eve is holding alone thickens back to two.
  {
    name: "Fin",
    track: "A",
    history: [{ at: on("2027-01-01"), pay: 8000 }],
  },
  // Eve never moves. Her rail is the residual the starting level thins down to.
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

  // ── Track C: four people fanning out by different amounts each year ──────
  {
    name: "Hal",
    track: "C",
    history: [
      { at: on("2025-01-01"), pay: 6000 },
      { at: on("2026-04-01"), pay: 6500 },
      { at: on("2027-04-01"), pay: 7500 },
      { at: on("2028-04-01"), pay: 8000 },
      { at: on("2029-04-01"), pay: 9000 },
    ],
  },
  {
    name: "Ivy",
    track: "C",
    history: [
      { at: on("2025-01-01"), pay: 6000 },
      { at: on("2026-04-01"), pay: 7000 },
      { at: on("2027-04-01"), pay: 7500 },
      { at: on("2028-04-01"), pay: 8500 },
      { at: on("2029-04-01"), pay: 9000 },
    ],
  },
  {
    name: "Joe",
    track: "C",
    history: [
      { at: on("2025-01-01"), pay: 6000 },
      { at: on("2026-04-01"), pay: 6500 },
      { at: on("2027-04-01"), pay: 8000 },
      { at: on("2028-04-01"), pay: 8500 },
      { at: on("2029-04-01"), pay: 9500 },
    ],
  },
  {
    name: "Kay",
    track: "C",
    history: [
      { at: on("2025-01-01"), pay: 6000 },
      { at: on("2026-04-01"), pay: 7500 },
      { at: on("2027-04-01"), pay: 8000 },
      { at: on("2028-04-01"), pay: 9000 },
      { at: on("2029-04-01"), pay: 9500 },
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

// ── consumer-side derivation: people → levels + transfers ────────────────────

/** A level's id is its track and its pay — levels are keyed by pay, per track. */
const levelIdFor = (track: TrackId, pay: number): string => `${track}-${pay}`;

/** `$9.5k`. Short by construction, which is what lets the chart paint it. */
const payLabel = (pay: number): string => `$${pay / 1000}k`;

const peopleIn = (track: TrackId): readonly Person[] =>
  filter((person: Person) => person.track === track, PEOPLE);

/** A person's history, oldest first. Nothing downstream re-sorts it. */
const historyOf = (person: Person): readonly PayPoint[] =>
  sortBy((point: PayPoint) => point.at.getTime(), person.history);

/**
 * What this person was paid at `time` — undefined before they were hired and
 * undefined again once they have left, so a level's headcount falls of its own
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

/** Every distinct pay figure in a track, low to high. One rail each. */
const paysIn = (people: readonly Person[]): readonly number[] => {
  const pays = new Set<number>();
  for (const person of people) {
    for (const point of person.history) pays.add(point.pay);
  }
  return sortBy((pay: number) => pay, [...pays]);
};

/** Every moment anybody in the track moved, joined or left. */
const momentsIn = (people: readonly Person[]): readonly number[] => {
  const times = new Set<number>();
  for (const person of people) {
    for (const point of person.history) times.add(point.at.getTime());
    if (person.until !== undefined) times.add(person.until.getTime());
  }
  return sortBy((time: number) => time, [...times]);
};

/**
 * The headcount on one pay figure over time, as count points.
 *
 * Only CHANGES are emitted — a point saying "still four people" would put a
 * dropline on the chart at a moment nothing happened to this level. Dropping
 * to zero IS a change and is emitted, which is what ends a rail's span.
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
        // Somebody whose first pay point is after the span began was HIRED.
        // Somebody already there when it began simply was there.
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
  readonly note: string;
  readonly levels: readonly Level[];
  readonly transfers: readonly Transfer[];
}

const trackOf = (id: TrackId, title: string, note: string): Track => ({
  id,
  title,
  note,
  levels: levelsFor(id),
  transfers: transfersFor(id, DOMAIN),
});

const TRACKS: readonly Track[] = [
  trackOf(
    "A",
    "Track A — one starting level, five rates",
    "Five people all start on $8k. Three are raised off it at mutation 1 (one thick ribbon, not three thin ones) and Cal a year later, leaving Eve alone on it. Fin is HIRED onto $8k in 2027 — a ribbon arriving from above with no source — and Dee DEPARTS from $9k in 2028, a ribbon leaving downward with no destination. Every change in a rail's thickness has a flow to account for it.",
  ),
  trackOf(
    "B",
    "Track B — the same raise, a year apart",
    "Two people, one ladder step. Fay takes it at mutation 2 and Gus takes exactly the same step twelve months later — two identical ribbons with a year of daylight, and Gus's has no flag, so it shows as a dropline.",
  ),
  trackOf(
    "C",
    "Track C — four people fanning out",
    "Everyone bumps every April, but by different amounts, so one rail sheds flows to several destinations on the same date. By 2029 the four have spread across the top of the ladder.",
  ),
];

/** `2027-04-01`, whichever way the moment happens to be spelt. */
const isoDay = (at: Date | number): string =>
  new Date(timeOf(at)).toISOString().slice(0, 10);

/** The headless observation of the CONSUMER's own arithmetic. */
const logModel = (): void => {
  if (!DEBUG) return;
  for (const track of TRACKS) {
    console.table(
      track.levels.flatMap((level) =>
        level.points.map((point) => ({
          track: track.id,
          level: level.label,
          value: level.value,
          at: isoDay(point.at),
          count: point.count,
        })),
      ),
    );
    console.table(
      track.transfers.map((transfer) => ({
        track: track.id,
        at: isoDay(transfer.at),
        from: transfer.from ?? "(hired)",
        to: transfer.to ?? "(left)",
        count: transfer.count,
      })),
    );
  }
};

logModel();

/** One track's chart, with the shared flags and the shared span. */
const TrackChart: Component<{
  track: Track;
  selected: string | undefined;
  onSelect: (id: string) => void;
}> = (props) => (
  <TightStack>
    <TextTitle>{props.track.title}</TextTitle>
    <LevelsTimeline
      levels={props.track.levels}
      transfers={props.track.transfers}
      mutations={MUTATIONS}
      domain={DOMAIN}
      selectedMutationId={props.selected}
      onSelectMutation={props.onSelect}
    />
    <CaptionLabel>{props.track.note}</CaptionLabel>
  </TightStack>
);

const LevelsTimelineBench: Component = () => {
  const [selected, setSelected] = createSignal<string | undefined>("a-first");
  return (
    <div class="component-section component-section--full">
      <SpacedStack>
        <TightStack>
          <SectionTitle>Levels Timeline</SectionTitle>
          <MutedBody>
            Three pay tracks over five years. A line is a pay LEVEL, not a
            person: its thickness is the headcount holding it, and a raise is a
            flow ribbon from one level to another, so the lower rail thins as
            the upper one thickens. Numbered flags mark the events the consumer
            named; every other change gets a thin dropline. The three charts
            share one x-domain and one set of flags, so a column reads straight
            down the stack. Every number is decided in geometry.ts and printed
            as a table by its tests — run{" "}
            <code>npx vitest run src/components/LevelsTimeline</code> to read
            the shape without a browser, or flip <code>DEBUG</code> in this file
            to print the consumer-side model.
          </MutedBody>
        </TightStack>
        <CardSurface>
          <SpacedStack>
            {TRACKS.map((track) => (
              <TrackChart
                track={track}
                selected={selected()}
                onSelect={setSelected}
              />
            ))}
          </SpacedStack>
        </CardSurface>
      </SpacedStack>
    </div>
  );
};

export default LevelsTimelineBench;
