/**
 * GroupedMutationSliders showcase.
 *
 * DELIBERATELY DOMAIN-FREE, the same disposition as the MutationSliders and
 * PairedMutationSliders showcases. The component's model is entities with N
 * measures, each with a prior amount, a future amount and an allowed range in
 * its own units, plus an optional captioned GROUP over consecutive measures —
 * and nothing else. The fixtures below are therefore counts, rates, levels and
 * shares with neutral names: no money, no licences, no calendar, no unit the
 * component could be accused of knowing about. The card that DOES have a
 * vocabulary curries it, which is the point being demonstrated: this component
 * ships the FACTORY and no curried variant, because `axes` fixes the measure
 * COUNT and so a curried name would dictate every consumer's data shape.
 *
 * Title lines only. Every card is wired to a working callback, so dragging,
 * removing, restoring, adding, paging and pinning all do something.
 */
import { type Component, createSignal } from "solid-js";
import { map } from "../../src/fn";
import { GhostButton } from "../../src/components/Button";
import {
  type GroupedMeasureAxes,
  type GroupedMutationEntity,
  GroupedMutationSliders,
  createGroupedMutationSliders,
} from "../../src/components/GroupedMutationSliders";
import {
  ClusterRow,
  ConstrainedBox,
  SpacedStack,
} from "../../src/components/Layout";
import { CardSurface, FillCardSurface } from "../../src/components/Surface";

// ── The axes, one set per claim the component has to hold ──────────────────

/**
 * TWO MEASURES, UNGROUPED — the paired shape, expressed here. No axis names a
 * group, so no caption line is drawn at all: a row of unrelated measures should
 * not pay a blank line for a feature it is not using.
 */
const TWO_AXES: GroupedMeasureAxes = [
  { label: "Count", domain: [0, 40], snap: 1, format: (n) => String(n) },
  { label: "Rate", domain: [80, 200], snap: 5, format: (n) => `${n}/u` },
];

/**
 * THREE MEASURES, ONE CAPTIONED PAIR AND ONE ALONE — the odd count, and the
 * case that proves a caption is per-RUN rather than per-row. The third axis
 * names no group and stands in a run of its own, with the caption line
 * RESERVED above it rather than absent, so all three dials sit at one height.
 */
const THREE_AXES: GroupedMeasureAxes = [
  {
    label: "Count",
    group: "alpha",
    domain: [0, 100],
    snap: 1,
    format: (n) => String(n),
  },
  {
    label: "Rate",
    group: "alpha",
    domain: [0, 200],
    snap: 5,
    format: (n) => `${n}/u`,
  },
  { label: "Level", domain: [0, 10], snap: 1, format: (n) => String(n) },
];

/**
 * FOUR MEASURES IN TWO CAPTIONED GROUPS — the shape the component was added
 * for. BOTH count dials are labelled `#`, deliberately: the caption is the only
 * thing telling them apart, in the drawing and in each dial's accessible name
 * (`Ana beta #`), which is exactly the load the grouping exists to carry.
 */
const FOUR_AXES: GroupedMeasureAxes = [
  {
    label: "#",
    group: "alpha",
    domain: [0, 500],
    snap: 1,
    format: (n) => String(n),
  },
  {
    label: "u",
    group: "alpha",
    domain: [0, 600],
    snap: 1,
    format: (n) => `${n}u`,
  },
  {
    label: "#",
    group: "beta",
    domain: [0, 500],
    snap: 1,
    format: (n) => String(n),
  },
  {
    label: "%",
    group: "beta",
    domain: [50, 100],
    snap: 1,
    format: (n) => `${n}%`,
  },
];

// ── The fixtures ───────────────────────────────────────────────────────────

/** Two entities on the ungrouped pair. */
const TWO: readonly GroupedMutationEntity[] = [
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
];

/** Two entities on the odd count. */
const THREE: readonly GroupedMutationEntity[] = [
  {
    id: "cal",
    label: "Cal",
    measures: [
      { prior: 30, value: 40, range: [0, 80] },
      { prior: 20, value: 25, range: [10, 60] },
      { prior: 2, value: 2, range: [0, 5] },
    ],
  },
  {
    id: "dot",
    label: "Dot",
    measures: [
      { prior: 12, value: 12, range: [0, 40] },
      { prior: 80, value: 95, range: [60, 150] },
      { prior: 4, value: 6, range: [2, 9] },
    ],
  },
];

/**
 * Four entities on the four-measure shape: one at the ceiling of its own range
 * (`Gus`'s `%`, so the clamp is visible the moment it is dragged), one NEW —
 * every prior `null`, which is what an arrival IS — and two that moved.
 *
 * THE TWO INTERESTING ONES COME FIRST, and that is not arbitrary. A row four
 * grouped entities wide is 4 × 4 dials, which pages in any card narrower than
 * ~1550px, so whatever is at position 3 and 4 is off screen on first render.
 * A fixture nobody sees demonstrates nothing.
 */
const FOUR: readonly GroupedMutationEntity[] = [
  {
    id: "gus",
    label: "Gus",
    measures: [
      { prior: 2, value: 2, range: [0, 20] },
      { prior: 400, value: 400, range: [250, 600] },
      { prior: 6, value: 6, range: [0, 20] },
      { prior: 95, value: 100, range: [80, 100] },
    ],
  },
  {
    id: "hal",
    label: "Hal",
    measures: [
      { prior: null, value: 18, range: [0, 100] },
      { prior: null, value: 99, range: [50, 200] },
      { prior: null, value: 7, range: [0, 50] },
      { prior: null, value: 75, range: [50, 100] },
    ],
  },
  {
    id: "eli",
    label: "Eli",
    measures: [
      { prior: 100, value: 120, range: [0, 300] },
      { prior: 15, value: 15, range: [9, 25] },
      { prior: 50, value: 60, range: [0, 200] },
      { prior: 85, value: 85, range: [50, 100] },
    ],
  },
  {
    id: "fay",
    label: "Fay",
    measures: [
      { prior: 40, value: 40, range: [0, 120] },
      { prior: 49, value: 49, range: [29, 80] },
      { prior: 25, value: 25, range: [0, 80] },
      { prior: 90, value: 90, range: [50, 100] },
    ],
  },
];

/** Nine entities, for the box that cannot hold them. */
const MANY: readonly GroupedMutationEntity[] = map(
  (index: number): GroupedMutationEntity => {
    const seed = FOUR[index % FOUR.length] as GroupedMutationEntity;
    return { ...seed, id: `${seed.id}-${index}`, label: `${seed.label}${index}` };
  },
  [0, 1, 2, 3, 4, 5, 6, 7, 8],
);

// ── The transforms every card shares ───────────────────────────────────────

/** Replace ONE measure of one entity, leaving every other number untouched. */
const withMeasure = (
  entities: readonly GroupedMutationEntity[],
  id: string,
  index: number,
  value: number | null,
): GroupedMutationEntity[] =>
  map(
    (entity: GroupedMutationEntity) =>
      entity.id === id
        ? {
            ...entity,
            measures: map(
              (one, at: number) => (at === index ? { ...one, value } : one),
              entity.measures,
            ),
          }
        : entity,
    entities,
  );

/** Remove: EVERY measure loses its future amount, which is what removed IS. */
const dropped = (
  entities: readonly GroupedMutationEntity[],
  id: string,
): GroupedMutationEntity[] =>
  map(
    (entity: GroupedMutationEntity) =>
      entity.id === id
        ? {
            ...entity,
            measures: map((one) => ({ ...one, value: null }), entity.measures),
          }
        : entity,
    entities,
  );

/**
 * What RESTORE means is the CONSUMER'S: the component holds no memory of what
 * an entity was before it was removed, and inventing one would put a second,
 * stale copy of the truth inside the widget. The reading here — put each
 * measure back on the amount it came in at, or its range floor if it never had
 * one.
 */
const restored = (
  entities: readonly GroupedMutationEntity[],
  id: string,
): GroupedMutationEntity[] =>
  map(
    (entity: GroupedMutationEntity) =>
      entity.id === id
        ? {
            ...entity,
            measures: map(
              (one) => ({ ...one, value: one.prior ?? one.range[0] }),
              entity.measures,
            ),
          }
        : entity,
    entities,
  );

/** What the `+` appends: a NEW entity, with no prior amount on any measure. */
const appended = (
  count: number,
  shape: GroupedMutationEntity,
): GroupedMutationEntity => ({
  id: `new-${count}`,
  label: `New ${count}`,
  measures: map(
    (one) => ({ ...one, prior: null, value: one.range[0] }),
    shape.measures,
  ),
});

/**
 * What a GROUP of measures means together is the consumer's arithmetic, never
 * this component's: the measures are unrelated units by construction, so a
 * count times a rate is knowledge only the caller has. That is what `summary`
 * is for.
 */
const product = (entity: GroupedMutationEntity): string => {
  const first = entity.measures[0]?.value;
  const second = entity.measures[1]?.value;
  return first === null || first === undefined || second === null
    ? ""
    : `${first * (second ?? 0)}`;
};

/**
 * A consumer's own grouped row, curried once: every axis — name, unit, grid,
 * scale and caption — and the verbs are locked here, and the call site below
 * passes nothing but data and callbacks. This is the shape every client uses;
 * the library ships no curried variant, because `axes` fixes how many dials an
 * entity carries and SUI does not guess a consumer's measure count.
 */
const TieredGroupedSliders = createGroupedMutationSliders({
  axes: FOUR_AXES,
  labels: { remove: "Retire", restore: "Revive", new: "added" },
});

export const GroupedMutationSlidersShowcase: Component = () => {
  const [two, setTwo] = createSignal<readonly GroupedMutationEntity[]>(TWO);
  const [three, setThree] =
    createSignal<readonly GroupedMutationEntity[]>(THREE);
  const [four, setFour] = createSignal<readonly GroupedMutationEntity[]>(FOUR);
  const [added, setAdded] = createSignal(0);
  const [narrow, setNarrow] = createSignal<readonly GroupedMutationEntity[]>(
    MANY,
  );
  const [pinnable, setPinnable] =
    createSignal<readonly GroupedMutationEntity[]>(FOUR);
  const [selected, setSelected] = createSignal<readonly string[]>([]);
  const [tall, setTall] = createSignal<readonly GroupedMutationEntity[]>(THREE);
  const [curried, setCurried] =
    createSignal<readonly GroupedMutationEntity[]>(FOUR);

  const reset = (): void => {
    setAdded(0);
    setFour(FOUR);
  };

  const add = (): void => {
    setAdded((count) => count + 1);
    setFour((current) => [
      ...current,
      appended(added() + 1, FOUR[0] as GroupedMutationEntity),
    ]);
  };

  return (
    <div class="component-section component-section--full">
      <h2>GroupedMutationSliders — Composite (Depth 3)</h2>

      <div class="example-group">
        <h3>Two measures, ungrouped — no caption line is drawn at all</h3>
        <CardSurface>
          <GroupedMutationSliders
            entities={two()}
            axes={TWO_AXES}
            summary={product}
            onChange={(id, measure, value) =>
              setTwo((current) => withMeasure(current, id, measure, value))
            }
            onRemove={(id) => setTwo((current) => dropped(current, id))}
            onRestore={(id) => setTwo((current) => restored(current, id))}
          />
        </CardSurface>
      </div>

      <div class="example-group">
        <h3>Three measures — one captioned pair, one alone</h3>
        <CardSurface>
          <GroupedMutationSliders
            entities={three()}
            axes={THREE_AXES}
            summary={product}
            onChange={(id, measure, value) =>
              setThree((current) => withMeasure(current, id, measure, value))
            }
            onRemove={(id) => setThree((current) => dropped(current, id))}
            onRestore={(id) => setThree((current) => restored(current, id))}
          />
        </CardSurface>
      </div>

      <div class="example-group">
        <h3>Four measures in two groups — only the caption tells the # dials apart</h3>
        <SpacedStack>
          <ClusterRow>
            <GhostButton onClick={reset}>Reset</GhostButton>
          </ClusterRow>
          <CardSurface>
            <GroupedMutationSliders
              entities={four()}
              axes={FOUR_AXES}
              summary={product}
              onChange={(id, measure, value) =>
                setFour((current) => withMeasure(current, id, measure, value))
              }
              onRemove={(id) => setFour((current) => dropped(current, id))}
              onRestore={(id) => setFour((current) => restored(current, id))}
              onAdd={add}
            />
          </CardSurface>
        </SpacedStack>
      </div>

      <div class="example-group">
        <h3>Too narrow — it pages by whole ENTITIES, never below one</h3>
        <ConstrainedBox>
          <CardSurface>
            <GroupedMutationSliders
              entities={narrow()}
              axes={FOUR_AXES}
              summary={product}
              onChange={(id, measure, value) =>
                setNarrow((current) => withMeasure(current, id, measure, value))
              }
              onRemove={(id) => setNarrow((current) => dropped(current, id))}
              onRestore={(id) => setNarrow((current) => restored(current, id))}
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
          <GroupedMutationSliders
            entities={pinnable()}
            axes={FOUR_AXES}
            summary={product}
            selected={selected()}
            onSelectionChange={(ids) => setSelected(ids)}
            onChange={(id, measure, value) =>
              setPinnable((current) => withMeasure(current, id, measure, value))
            }
          />
        </CardSurface>
      </div>

      <div class="example-group">
        <h3>It absorbs its container's height</h3>
        <div class="grouped-mutation-sliders-demo">
          <FillCardSurface>
            <GroupedMutationSliders
              entities={tall()}
              axes={THREE_AXES}
              summary={product}
              onChange={(id, measure, value) =>
                setTall((current) => withMeasure(current, id, measure, value))
              }
            />
          </FillCardSurface>
        </div>
      </div>

      <div class="example-group">
        <h3>Curried — a consumer's own axes, captions and verbs</h3>
        <CardSurface>
          <TieredGroupedSliders
            entities={curried()}
            summary={(entity) => {
              const value = product(entity);
              return value === "" ? "" : `${value} total`;
            }}
            onChange={(id, measure, value) =>
              setCurried((current) => withMeasure(current, id, measure, value))
            }
            onRemove={(id) => setCurried((current) => dropped(current, id))}
            onRestore={(id) => setCurried((current) => restored(current, id))}
          />
        </CardSurface>
      </div>
    </div>
  );
};
