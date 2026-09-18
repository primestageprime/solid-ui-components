/**
 * PairedMutationSliders showcase.
 *
 * DELIBERATELY DOMAIN-FREE, the same disposition as the MutationSliders
 * showcase. The component's model is entities with TWO measures, each with a
 * prior amount, a future amount and an allowed range, and nothing else. The
 * fixture below is therefore a COUNT and a RATE with neutral names — no
 * staffing, no billing, no unit the component could be accused of knowing
 * about. The card that does have a vocabulary curries it, which is the point
 * being demonstrated: this component ships the FACTORY and no curried variant,
 * because every pair of axes anybody has asked for so far is a consumer's own
 * domain.
 *
 * Title lines only. Every card is wired to a working callback, so dragging,
 * removing, restoring, adding and pinning all do something.
 */
import { type Component, createSignal } from "solid-js";
import { map } from "../../src/fn";
import { GhostButton } from "../../src/components/Button";
import {
  ClusterRow,
  ConstrainedBox,
  SpacedStack,
} from "../../src/components/Layout";
import {
  type PairedMeasureAxes,
  type PairedMutationEntity,
  PairedMutationSliders,
  createPairedMutationSliders,
} from "../../src/components/PairedMutationSliders";
import { CardSurface, FillCardSurface } from "../../src/components/Surface";

/**
 * The two axes, stated once for the whole row: a COUNT on measure 0 and a RATE
 * on measure 1. They share no domain, no grid and no formatter — which is the
 * entire reason this component exists beside `MutationSliders` rather than as
 * a configuration of it.
 */
const AXES: PairedMeasureAxes = [
  { label: "Count", domain: [0, 40], snap: 1, format: (n) => String(n) },
  { label: "Rate", domain: [80, 200], snap: 5, format: (n) => `${n}/u` },
];

/**
 * Five entities: two rises, one fall, one REMOVED (both measures `null`) and
 * one NEW (both priors `null`).
 *
 * `Cal` is deliberately AT the ceiling of its rate range, so the clamp is
 * visible the moment you drag that dial — the thumb stops dead without anyone
 * having to construct a bad value.
 */
const FIVE: readonly PairedMutationEntity[] = [
  {
    id: "ana",
    label: "Ana",
    measures: [
      { prior: 10, value: 20, range: [0, 40] },
      { prior: 120, value: 150, range: [100, 200] },
    ],
  },
  {
    id: "bo",
    label: "Bo",
    measures: [
      { prior: 30, value: 25, range: [0, 40] },
      { prior: 90, value: 90, range: [80, 130] },
    ],
  },
  {
    id: "cal",
    label: "Cal",
    measures: [
      { prior: 8, value: 12, range: [0, 20] },
      { prior: 110, value: 130, range: [80, 130] },
    ],
  },
  {
    id: "dot",
    label: "Dot",
    measures: [
      { prior: 15, value: null, range: [0, 40] },
      { prior: 100, value: null, range: [80, 130] },
    ],
  },
  {
    id: "eli",
    label: "Eli",
    measures: [
      { prior: null, value: 6, range: [0, 40] },
      { prior: null, value: 95, range: [80, 130] },
    ],
  },
];

/** Three entities across two rate ranges — the pinning case. */
const THREE: readonly PairedMutationEntity[] = [
  {
    id: "gus",
    label: "Gus",
    measures: [
      { prior: 10, value: 12, range: [0, 40] },
      { prior: 100, value: 100, range: [80, 130] },
    ],
  },
  {
    id: "hal",
    label: "Hal",
    measures: [
      { prior: 20, value: 24, range: [0, 40] },
      { prior: 150, value: 160, range: [100, 200] },
    ],
  },
  {
    id: "ivy",
    label: "Ivy",
    measures: [
      { prior: 14, value: 14, range: [0, 40] },
      { prior: 90, value: 95, range: [80, 130] },
    ],
  },
];

/**
 * What a PAIR means together is the consumer's arithmetic, never this
 * component's: the two measures are unrelated units by construction.
 */
const product = (entity: PairedMutationEntity): string => {
  const count = entity.measures[0].value;
  const rate = entity.measures[1].value;
  return count === null || rate === null ? "" : `${count * rate}`;
};

/** Replace ONE measure of one entity, leaving every other number untouched. */
const withMeasure = (
  entities: readonly PairedMutationEntity[],
  id: string,
  index: 0 | 1,
  value: number | null,
): PairedMutationEntity[] =>
  map(
    (entity: PairedMutationEntity) =>
      entity.id === id
        ? {
            ...entity,
            measures:
              index === 0
                ? ([
                    { ...entity.measures[0], value },
                    entity.measures[1],
                  ] as const)
                : ([
                    entity.measures[0],
                    { ...entity.measures[1], value },
                  ] as const),
          }
        : entity,
    entities,
  );

/** Remove: BOTH measures lose their future amount, which is what removed IS. */
const dropped = (
  entities: readonly PairedMutationEntity[],
  id: string,
): PairedMutationEntity[] =>
  map(
    (entity: PairedMutationEntity) =>
      entity.id === id
        ? {
            ...entity,
            measures: [
              { ...entity.measures[0], value: null },
              { ...entity.measures[1], value: null },
            ] as const,
          }
        : entity,
    entities,
  );

/**
 * What RESTORE means is the CONSUMER'S: the component holds no memory of what
 * an entity was before it was removed. The reading here — put each measure
 * back on the amount it came in at, or its range floor if it never had one.
 */
const restored = (
  entities: readonly PairedMutationEntity[],
  id: string,
): PairedMutationEntity[] =>
  map(
    (entity: PairedMutationEntity) =>
      entity.id === id
        ? {
            ...entity,
            measures: [
              {
                ...entity.measures[0],
                value: entity.measures[0].prior ?? entity.measures[0].range[0],
              },
              {
                ...entity.measures[1],
                value: entity.measures[1].prior ?? entity.measures[1].range[0],
              },
            ] as const,
          }
        : entity,
    entities,
  );

/** What the `+` appends: a NEW entity, with no prior amount on either measure. */
const appended = (count: number): PairedMutationEntity => ({
  id: `new-${count}`,
  label: `New ${count}`,
  measures: [
    { prior: null, value: 8, range: [0, 40] },
    { prior: null, value: 100, range: [80, 130] },
  ],
});

/**
 * A consumer's own paired row, curried once: both axes and its verbs are
 * locked here, and the call site below passes nothing but data and callbacks.
 * This is the shape every client uses — the library ships no curried variant,
 * because an "Hrs/wk × $/hr" pair is a consumer's domain and not SUI's.
 */
const BookingMutationSliders = createPairedMutationSliders({
  axes: [
    { label: "Hrs/wk", domain: [0, 40], snap: 1, format: (n) => `${n}h` },
    { label: "$/hr", domain: [80, 200], snap: 5, format: (n) => `$${n}` },
  ],
  labels: { remove: "Drop", restore: "Reinstate", new: "added" },
});

export const PairedMutationSlidersShowcase: Component = () => {
  const [rows, setRows] = createSignal<readonly PairedMutationEntity[]>(FIVE);
  const [added, setAdded] = createSignal(0);
  const [pinnable, setPinnable] =
    createSignal<readonly PairedMutationEntity[]>(THREE);
  const [tall, setTall] = createSignal<readonly PairedMutationEntity[]>(THREE);
  const [booking, setBooking] =
    createSignal<readonly PairedMutationEntity[]>(FIVE);

  const reset = (): void => {
    setAdded(0);
    setRows(FIVE);
  };

  return (
    <div class="component-section component-section--full">
      <h2>PairedMutationSliders — Composite (Depth 3)</h2>

      <div class="example-group">
        <h3>Five entities — two measures each, a removal and an arrival</h3>
        <SpacedStack>
          <ClusterRow>
            <GhostButton onClick={reset}>Reset</GhostButton>
          </ClusterRow>
          <CardSurface>
            <PairedMutationSliders
              entities={rows()}
              axes={AXES}
              summary={product}
              onChange={(id, measure, value) =>
                setRows((current) => withMeasure(current, id, measure, value))
              }
              onRemove={(id) => setRows((current) => dropped(current, id))}
              onRestore={(id) => setRows((current) => restored(current, id))}
              onAdd={() => {
                setAdded((count) => count + 1);
                setRows((current) => [...current, appended(added() + 1)]);
              }}
            />
          </CardSurface>
        </SpacedStack>
      </div>

      <div class="example-group">
        <h3>Too narrow — it pages by whole PAIRS, never below one</h3>
        <ConstrainedBox>
          <CardSurface>
            <PairedMutationSliders
              entities={rows()}
              axes={AXES}
              summary={product}
              onChange={(id, measure, value) =>
                setRows((current) => withMeasure(current, id, measure, value))
              }
              onRemove={(id) => setRows((current) => dropped(current, id))}
              onRestore={(id) => setRows((current) => restored(current, id))}
              onAdd={() => {
                setAdded((count) => count + 1);
                setRows((current) => [...current, appended(added() + 1)]);
              }}
            />
          </CardSurface>
        </ConstrainedBox>
      </div>

      <div class="example-group">
        <h3>
          Click two names — each measure levels against its OWN peers, then
          drags with them
        </h3>
        <CardSurface>
          <PairedMutationSliders
            entities={pinnable()}
            axes={AXES}
            summary={product}
            onChange={(id, measure, value) =>
              setPinnable((current) => withMeasure(current, id, measure, value))
            }
          />
        </CardSurface>
      </div>

      <div class="example-group">
        <h3>It absorbs its container's height</h3>
        <div class="mutation-sliders-demo__tall-frame">
          <FillCardSurface>
            <PairedMutationSliders
              entities={tall()}
              axes={AXES}
              summary={product}
              onChange={(id, measure, value) =>
                setTall((current) => withMeasure(current, id, measure, value))
              }
            />
          </FillCardSurface>
        </div>
      </div>

      <div class="example-group">
        <h3>Curried — a consumer's own two units, names, grids and verbs</h3>
        <CardSurface>
          <BookingMutationSliders
            entities={booking()}
            summary={(entity) => {
              const value = product(entity);
              return value === "" ? "" : `$${value}/wk`;
            }}
            onChange={(id, measure, value) =>
              setBooking((current) => withMeasure(current, id, measure, value))
            }
            onRemove={(id) => setBooking((current) => dropped(current, id))}
            onRestore={(id) => setBooking((current) => restored(current, id))}
          />
        </CardSurface>
      </div>
    </div>
  );
};
