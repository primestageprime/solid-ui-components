/**
 * Scenario Board bench — Peter's pencil sketch of 2026-09-16, composed.
 *
 * This bench builds NOTHING. Every part of it already exists: the running
 * balance is `CashflowScrubChart`, the stepped people-lines are
 * `LevelsTimeline`, the as-of picker is `SegmentedControl`, the dials are
 * `MutationSliders` and the card on the right is `RateGauge`. What the bench
 * adds is the ARRANGEMENT and the WIRING — which is exactly the thing a
 * component-per-bench prototype cannot tell you: whether the five pieces say
 * the same thing when they are looking at one scenario.
 *
 * There is NO engine here on purpose. Every number the board shows is decided
 * by one of the small pure functions at the top of this file, each named, each
 * takes data and returns data, and the whole set is printed as a table on
 * mount behind `DEBUG` — so the board can be read and argued with from a
 * terminal, before anyone opens a browser (headless observation first).
 *
 * The wiring, stated once:
 *
 *   sliders ──deltaOf──▶ rateOf ──▶ RateGauge.value
 *   sliders ──levelsSeriesOf──▶ LevelsTimeline.series
 *   flag click ──segmentForMutation──▶ SegmentedControl.value
 *   segment click ──mutationForSegment──▶ LevelsTimeline.selectedMutationId
 *
 * The last two are NOT inverses, and that is a finding rather than a bug — see
 * `segmentForMutation` for why the sketch's own two date rows cannot round-trip.
 */
import { createSignal, onMount, type Component } from "solid-js";
import { filter, find, findLast, join, map, pipe, sum } from "../../../src/fn";

import { CashflowScrubChart } from "../../../src/components/CashflowScrubChart";
import type { CashflowCell } from "../../../src/components/CashflowScrubChart";
import { monthlyCells } from "../../../src/components/DateAxis";
import { LevelsTimeline, timeOf } from "../../../src/components/LevelsTimeline";
import type {
  LevelPoint,
  Mutation,
  Series,
  TimeDomain,
  TimeValue,
} from "../../../src/components/LevelsTimeline";
import { MutationSliders } from "../../../src/components/MutationSliders";
import type { Entity } from "../../../src/components/MutationSliders";
import { RateGauge } from "../../../src/components/RateGauge";
import { SegmentedControl } from "../../../src/components/SegmentedControl";
import type { SegmentOption } from "../../../src/components/SegmentedControl";

import { GhostButton } from "../../../src/components/Button";
import {
  ConstrainedBox,
  GrowBox,
  SpacedStack,
  SpreadRow,
  StretchRow,
  TightStack,
} from "../../../src/components/Layout";
import { CardSurface } from "../../../src/components/Surface";
import {
  CaptionLabel,
  MonoMeta,
  MutedBody,
  SectionTitle,
  TextTitle,
} from "../../../src/components/Text";

export const meta = { label: "Scenario Board" };

/** Flip to print every derived table to the console on mount. */
const DEBUG = false;

// ── The fixture, shared by all four regions ──────────────────────────────────
//
// One year, read four ways. Everything below is the CONSUMER's: the span, the
// people, the money-per-level rate, the gauge's domain. No component here
// decides a unit.

/** The span the chart and the timeline are both drawn against. */
const DOMAIN_START = new Date("2025-01-01");
const DOMAIN_END = new Date("2026-01-01");
const TIME_DOMAIN: TimeDomain = [DOMAIN_START, DOMAIN_END];

/**
 * The three numbered events. These Date objects are the ONLY ones used for a
 * mutation moment anywhere on the board: `LevelsTimeline` ties a riser to a
 * flag by exact timestamp equality (`geometry.timeOf`), so a series point
 * built from a differently-constructed Date would draw the step and light no
 * flag.
 */
const MUTATIONS: readonly Mutation[] = [
  { id: "spring", at: new Date("2025-04-01"), label: "1" },
  { id: "summer", at: new Date("2025-07-01"), label: "2" },
  { id: "autumn", at: new Date("2025-10-01"), label: "3" },
];

/** The as-of points from the sketch's split button. The middle one starts selected. */
const SEGMENTS: readonly { value: string; at: Date }[] = [
  { value: "2025-01", at: new Date("2025-01-01") },
  { value: "2025-06", at: new Date("2025-06-01") },
  { value: "2026-01", at: new Date("2026-01-01") },
];

const SEGMENT_OPTIONS: readonly SegmentOption[] = map(
  (segment: { value: string }) => ({ value: segment.value }),
  SEGMENTS,
);

/** The six dials from the sketch. Joe is struck through: he is gone. */
const SKETCH: readonly Entity[] = [
  { id: "peter", label: "Peter", old: 6, value: 7 },
  { id: "adlai", label: "Adlai", old: 5, value: 6 },
  { id: "elaina", label: "Elaina", old: 7, value: 8 },
  { id: "reilly", label: "Reilly", old: 7, value: 2 },
  { id: "flynn", label: "Flynn", old: 8, value: 1 },
  { id: "joe", label: "Joe", old: 5, value: null },
];

/** The dial domain, in the consumer's own levels. */
const LEVEL_DOMAIN: readonly [number, number] = [0, 10];

/** What one level is worth per month. The board's only unit conversion. */
const DOLLARS_PER_LEVEL = 1000;

/**
 * Which mutation each timelined person steps at. Four of the six dials appear
 * on the timeline — the sketch draws four thin lines plus a heavy Total, not
 * six — and each is pinned to a flag so every numbered rule has at least one
 * riser under it to read down to.
 */
const STEPS_AT: readonly { entityId: string; mutationId: string }[] = [
  { entityId: "peter", mutationId: "spring" },
  { entityId: "reilly", mutationId: "spring" },
  { entityId: "adlai", mutationId: "summer" },
  { entityId: "elaina", mutationId: "autumn" },
];

/** The gauge's domain and its fixed reference, both the consumer's. */
const RATE_DOMAIN: readonly [number, number] = [-30000, 30000];
const RATE_BASELINE = 0;

/**
 * The chart fixture: thirteen months of net monthly flow in dollars, opening
 * from a starting balance. Deliberately hand-written rather than derived from
 * the dials — the sketch's top line is the scenario ALREADY committed, and the
 * dials below it are the change being proposed against it.
 */
const OPENING_BALANCE = 42000;
const MONTHLY_NET: readonly number[] = [
  4200, 3800, 5100, 6400, 5900, 7300, 6800, 8200, 7600, 9100, 8400, 9800, 10400,
];

// ── Pure derivations ─────────────────────────────────────────────────────────

/**
 * The level an entity holds in the NEW scenario. A removed entity (`value:
 * null`) reads as level 0 — the sketch strikes Joe's name through, which says
 * his contribution is gone, not that it is unknown. `null − old` would be
 * arithmetic on an absence; this is the consumer stating what removal MEANS.
 */
export const newLevelOf = (entity: Entity): number => entity.value ?? 0;

/** How far one dial moved. Negative for a cut, and fully negative for a removal. */
export const deltaOf = (entity: Entity): number =>
  newLevelOf(entity) - entity.old;

/** The naive rate: every dial's change, priced, added up. $/month. */
export const rateOf = (entities: readonly Entity[]): number =>
  pipe(
    entities,
    map((entity: Entity) => deltaOf(entity) * DOLLARS_PER_LEVEL),
    sum,
  );

/**
 * The as-of segment a mutation falls in: the last segment at or before it.
 *
 * GAP, and worth stating plainly rather than hiding: the sketch's two date
 * rows do not correspond. The flags sit at 2025-04 / 2025-07 / 2025-10 and the
 * split button offers 2025-01 / 2025-06 / 2026-01, so there is no bijection —
 * mutations 2 AND 3 both land in the 2025-06 segment, and the 2026-01 segment
 * contains no mutation at all. Clicking flag 3 therefore selects 2025-06, and
 * clicking 2025-06 selects flag 2: the round trip is LOSSY by construction.
 * Renumbering one row to match the other would make the wiring look tidy and
 * would be an invention; the sketch is what it is.
 */
export const segmentForMutation = (mutationId: string): string | undefined => {
  const mutation = find((m: Mutation) => m.id === mutationId, MUTATIONS);
  if (mutation === undefined) return undefined;
  const landed = findLast(
    (segment: { value: string; at: Date }) =>
      segment.at.getTime() <= timeOf(mutation.at),
    SEGMENTS,
  );
  return landed?.value;
};

/** The first mutation at or after a segment. `undefined` where none follows. */
export const mutationForSegment = (
  segmentValue: string,
): string | undefined => {
  const segment = find(
    (s: { value: string }) => s.value === segmentValue,
    SEGMENTS,
  );
  if (segment === undefined) return undefined;
  const next = find(
    (m: Mutation) => timeOf(m.at) >= segment.at.getTime(),
    MUTATIONS,
  );
  return next?.id;
};

/** The mutation moment an entity steps at, or `undefined` if it is not timelined. */
const stepMomentOf = (entityId: string): Mutation | undefined => {
  const pinned = find(
    (row: { entityId: string }) => row.entityId === entityId,
    STEPS_AT,
  );
  if (pinned === undefined) return undefined;
  return find((m: Mutation) => m.id === pinned.mutationId, MUTATIONS);
};

/** The entities that appear on the timeline, in sketch order. */
const timelinedEntities = (entities: readonly Entity[]): Entity[] =>
  filter(
    (entity: Entity) => stepMomentOf(entity.id) !== undefined,
    entities,
  );

/**
 * One person's stepped line, in $/month: they hold their OLD level from the
 * domain's left edge, then step to their NEW level at their own mutation and
 * hold it. Two points is the whole story — the chart draws the riser.
 */
export const pointsFor = (entity: Entity): LevelPoint[] => {
  const moment = stepMomentOf(entity.id);
  const opening: LevelPoint = {
    at: DOMAIN_START,
    level: entity.old * DOLLARS_PER_LEVEL,
  };
  if (moment === undefined) return [opening];
  return [
    opening,
    { at: moment.at, level: newLevelOf(entity) * DOLLARS_PER_LEVEL },
  ];
};

/** What an entity is worth at a moment: its new level once it has stepped. */
const levelAt = (entity: Entity, at: TimeValue): number => {
  const moment = stepMomentOf(entity.id);
  const stepped = moment !== undefined && timeOf(moment.at) <= timeOf(at);
  const level = stepped ? newLevelOf(entity) : entity.old;
  return level * DOLLARS_PER_LEVEL;
};

/** The Total line — the consumer's own arithmetic, done once, here. */
export const totalPoints = (entities: readonly Entity[]): LevelPoint[] => {
  const people = timelinedEntities(entities);
  const totalAt = (at: TimeValue): LevelPoint => ({
    at,
    level: pipe(
      people,
      map((entity: Entity) => levelAt(entity, at)),
      sum,
    ),
  });
  const moments = map((mutation: Mutation) => totalAt(mutation.at), MUTATIONS);
  return [totalAt(DOMAIN_START), ...moments];
};

/** Four people plus the heavier Total, as `LevelsTimeline` wants them. */
export const levelsSeriesOf = (entities: readonly Entity[]): Series[] => {
  const people = map(
    (entity: Entity) => ({
      id: entity.id,
      label: entity.label,
      points: pointsFor(entity),
    }),
    timelinedEntities(entities),
  );
  return [
    ...people,
    { id: "total", label: "Total", primary: true, points: totalPoints(entities) },
  ];
};

/** Running balance, month by month, in dollars. */
export const runningBalances = (
  flows: readonly number[],
  opening: number,
): number[] => {
  const balances: number[] = [];
  let carried = opening;
  for (const flow of flows) {
    carried += flow;
    balances.push(carried);
  }
  return balances;
};

const BALANCES = runningBalances(MONTHLY_NET, OPENING_BALANCE);

/** The chart's thirteen monthly cells. Cents, because the chart's y IS cents. */
export const balanceCells = (): CashflowCell[] =>
  map(
    (cell: { start: Date; end: Date }, index: number) => ({
      ...cell,
      cashflowCents: (MONTHLY_NET[index] ?? 0) * 100,
      balanceCents: (BALANCES[index] ?? 0) * 100,
    }),
    monthlyCells(DOMAIN_START, DOMAIN_END),
  );

/**
 * One faint alternative in the fan: the same line, pulled away from the
 * committed balance by a spread that widens with the months, because a
 * forecast is surer about next month than about next year.
 */
const SPREAD_PER_MONTH_SQUARED = 220;

export const fanAt = (index: number, sign: number): number =>
  sign * SPREAD_PER_MONTH_SQUARED * index * index;

const fanSeries = (id: string, sign: number) => ({
  id,
  class: "scenario-board-demo__fan",
  balanceCents: (cell: CashflowCell, index: number): number =>
    cell.balanceCents + fanAt(index, sign) * 100,
});

/** The consumer's money formatter — a real minus sign, as the gauge bench uses. */
const perMonth = (delta: number): string =>
  `${delta < 0 ? "−" : "+"}$${Math.abs(delta).toLocaleString("en-US")}/mo`;

/** One dial's reading, as a line of text. */
const describeEntity = (entity: Entity): string =>
  entity.value === null
    ? `${entity.label} removed (was L${entity.old})`
    : `${entity.label} L${entity.old}→L${entity.value}`;

/** Replace one dial's new level, leaving every other row untouched. */
const withValue = (
  entities: readonly Entity[],
  id: string,
  value: number | null,
): Entity[] =>
  map(
    (entity: Entity) => (entity.id === id ? { ...entity, value } : entity),
    entities,
  );

/** The board, read as tables, with no browser in the room. */
const printTables = (entities: readonly Entity[]): void => {
  /* eslint-disable no-console */
  console.table(
    map(
      (entity: Entity) => ({
        entity: entity.label,
        old: entity.old,
        new: newLevelOf(entity),
        delta: deltaOf(entity),
        dollars: deltaOf(entity) * DOLLARS_PER_LEVEL,
      }),
      entities,
    ),
  );
  console.table(
    map(
      (mutation: Mutation) => ({
        flag: mutation.label,
        at: new Date(timeOf(mutation.at)).toISOString().slice(0, 10),
        segment: segmentForMutation(mutation.id) ?? "—",
      }),
      MUTATIONS,
    ),
  );
  console.table(
    map(
      (segment: { value: string }) => ({
        segment: segment.value,
        flag: mutationForSegment(segment.value) ?? "—",
      }),
      SEGMENTS,
    ),
  );
  console.table(
    map(
      (series: Series) => ({
        series: series.label,
        points: pipe(
          series.points,
          map(
            (point: LevelPoint) =>
              `${new Date(timeOf(point.at)).toISOString().slice(0, 10)}=${point.level}`,
          ),
          join(" "),
        ),
      }),
      levelsSeriesOf(entities),
    ),
  );
  console.log("rate", perMonth(rateOf(entities)));
  /* eslint-enable no-console */
};

// ── The board ────────────────────────────────────────────────────────────────

const ScenarioBoardBench: Component = () => {
  const [entities, setEntities] = createSignal<readonly Entity[]>(SKETCH);
  const [asOf, setAsOf] = createSignal("2025-06");
  const [selectedMutation, setSelectedMutation] = createSignal<
    string | undefined
  >(mutationForSegment("2025-06"));

  onMount(() => {
    if (DEBUG) printTables(entities());
  });

  /** A flag click moves the as-of segment with it. */
  const selectMutation = (id: string): void => {
    setSelectedMutation(id);
    const segment = segmentForMutation(id);
    if (segment !== undefined) setAsOf(segment);
  };

  /** A segment click moves the lit flag with it — where a mapping exists. */
  const selectSegment = (value: string): void => {
    setAsOf(value);
    setSelectedMutation(mutationForSegment(value));
  };

  const setLevel = (id: string, value: number): void => {
    setEntities((current) => withValue(current, id, value));
  };

  const removeEntity = (id: string): void => {
    setEntities((current) => withValue(current, id, null));
  };

  const addEntity = (): void => {
    setEntities((current) => [
      ...current,
      {
        id: `flynn-${current.length}`,
        label: `Flynn ${current.length}`,
        old: LEVEL_DOMAIN[0],
        value: 5,
      },
    ]);
  };

  const reset = (): void => {
    setEntities(SKETCH);
  };

  const rate = () => rateOf(entities());
  const summary = () =>
    pipe(entities(), map(describeEntity), join("  ·  "));

  return (
    <div class="component-section component-section--full">
      <SpacedStack>
        <TightStack>
          <SectionTitle>Scenario Board</SectionTitle>
          <MutedBody>
            Four existing tools on one scenario, arranged as Peter's sketch of
            2026-09-16 arranges them. Nothing is built here and no engine runs:
            drag a dial and the timeline's risers, the Total and the gauge all
            move off the same pure functions at the top of this file. Click a
            numbered flag and the split button follows it; click the split
            button and the flag follows back, as far as the sketch's two date
            rows allow.
          </MutedBody>
        </TightStack>

        <CardSurface>
          <TightStack>
            <TextTitle>Running balance</TextTitle>
            <CashflowScrubChart
              cells={balanceCells()}
              scrub={false}
              chartHeight={220}
              showGridlines
              lineLabel="Committed"
              balanceSeries={[
                fanSeries("optimistic", 1),
                fanSeries("pessimistic", -1),
              ]}
            />
            <CaptionLabel>
              Thirteen months of monthly balance, the committed line solid and
              two faint alternatives fanning away from it — the spread widens
              with the square of the month, because a forecast is surer about
              next month than about next year.
            </CaptionLabel>
          </TightStack>
        </CardSurface>

        <CardSurface>
          <TightStack>
            <TextTitle>Levels through the year</TextTitle>
            <LevelsTimeline
              series={levelsSeriesOf(entities())}
              mutations={MUTATIONS}
              domain={TIME_DOMAIN}
              selectedMutationId={selectedMutation()}
              onSelectMutation={selectMutation}
            />
            <CaptionLabel>
              Four of the dials below, each holding its old level until its own
              numbered mutation, plus the heavier Total this bench adds up
              itself. Click a flag to light its rule — the split button below
              moves to the matching as-of point.
            </CaptionLabel>
          </TightStack>
        </CardSurface>

        <CardSurface>
          <TightStack>
            <TextTitle>As of</TextTitle>
            <SegmentedControl
              options={[...SEGMENT_OPTIONS]}
              value={asOf()}
              onValueChange={selectSegment}
              aria-label="As-of point"
            />
            <CaptionLabel>
              Showing flag{" "}
              {selectedMutation() === undefined
                ? "—"
                : (find(
                    (m: Mutation) => m.id === selectedMutation(),
                    MUTATIONS,
                  )?.label ?? "—")}
              . 2026-01 has no mutation at or after it, so it lights no flag;
              flags 2 and 3 both fall in 2025-06, so the round trip is lossy.
            </CaptionLabel>
          </TightStack>
        </CardSurface>

        <StretchRow>
          <GrowBox>
            <CardSurface>
              <TightStack>
                <SpreadRow>
                  <TextTitle>Mutations</TextTitle>
                  <GhostButton onClick={reset}>Reset</GhostButton>
                </SpreadRow>
                <MutationSliders
                  entities={entities()}
                  domain={LEVEL_DOMAIN}
                  onChange={setLevel}
                  onRemove={removeEntity}
                  onAdd={addEntity}
                  format={(value) => `L${value}`}
                />
                <MonoMeta>{summary()}</MonoMeta>
              </TightStack>
            </CardSurface>
          </GrowBox>

          {/* The narrow column. ConstrainedBox caps the CARD at 400px rather
              than only the dial inside it: a NoShrinkColumn took its width
              from the caption's max-content and swallowed the row, which is
              the opposite of the sketch's wide-left / narrow-right split. */}
          <ConstrainedBox>
            <CardSurface>
              <TightStack>
                <TextTitle>Rate, right now</TextTitle>
                <RateGauge
                  domain={RATE_DOMAIN}
                  baseline={RATE_BASELINE}
                  value={rate()}
                  label="Scenario"
                  format={perMonth}
                />
                <CaptionLabel>
                  Every dial's change, priced at ${DOLLARS_PER_LEVEL} a level a
                  month and added up: {perMonth(rate())} against a fixed
                  baseline of {perMonth(RATE_BASELINE)}. A removed entity reads
                  as level 0, so striking a name through is a full cut.
                </CaptionLabel>
              </TightStack>
            </CardSurface>
          </ConstrainedBox>
        </StretchRow>
      </SpacedStack>
    </div>
  );
};

export default ScenarioBoardBench;
