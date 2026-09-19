/**
 * Grouped Mutation Sliders bench — `GroupedMutationSliders` on its own, before
 * a board is built on it.
 *
 * The component is the answer to Peter's licence sketch of 2026-09-18 (four
 * dials per product in two captioned groups), and this bench is the place it
 * gets argued with: four cards, each one a claim the component has to hold.
 *
 *   1. TWO MEASURES, UNGROUPED — the paired shape, expressed here. It should
 *      draw exactly what `PairedMutationSliders` draws and cost no caption
 *      line, which is what "N generalises the pair" has to mean if it means
 *      anything.
 *   2. THREE MEASURES, ONE GROUP OF TWO AND ONE ALONE — the odd count, and
 *      the case that proves a caption is per-RUN rather than per-row.
 *   3. FOUR MEASURES IN TWO GROUPS — Peter's own sketch: `mo` (#, $) and `yr`
 *      (#, %). Both `#` dials carry the SAME label, so the caption is the only
 *      thing telling them apart, which is the whole reason it exists.
 *   4. PAGING AND PINNING — nine products at four dials each, in a card that
 *      cannot hold them, with the selection wired so a pin can be watched
 *      fanning out across ONE measure and no other.
 *
 * Every card is LIVE: the dials write back through `onChange`, so the readouts,
 * the summary lines and the pin all move. A bench of static props would prove
 * the component renders and nothing about whether it works.
 *
 * ZERO NEW COMPONENTS AND ZERO CSS. The frame is `Column` / `CardSurface` /
 * `SpreadRow` / `ClusterRow` and the words are `SectionTitle` / `TextTitle` /
 * `NoteText` — the component under test is the only thing here that is not
 * already in the gallery.
 *
 * WHAT THE CARDS MEASURED: a grouped column needs ≈325px of height — name,
 * caption, the `MarkedSlider`'s own 180px floor, two readouts, the summary and
 * the footer. The row absorbs its container in both directions, so a card
 * bounded BELOW that hands the dials row a box shorter than the floor the
 * slider keeps drawing at, and the summary prints on top of the readouts. The
 * cards therefore take their content height, and 325px is the figure a consumer
 * budgets for. (The License Board learnt the same number the expensive way.)
 */
import { type Component, createSignal } from "solid-js";
import { map } from "../../../src/fn";

import {
  type GroupedMeasureAxes,
  type GroupedMutationEntity,
  createGroupedMutationSliders,
} from "../../../src/components/GroupedMutationSliders";
import { ClusterRow, Column, SpreadRow } from "../../../src/components/Layout";
import { CardSurface } from "../../../src/components/Surface";
import {
  NoteText,
  SectionTitle,
  TextTitle,
} from "../../../src/components/Text";

export const meta = { label: "Grouped Mutation Sliders" };

// ── The words the bench's three fixtures share ──────────────────────────────

const money = (amount: number): string =>
  `$${Math.round(amount).toLocaleString("en-US")}`;
const percent = (value: number): string => `${Math.round(value)}%`;
const count = (value: number): string => String(Math.round(value));

// ── Card 1: two measures, ungrouped ────────────────────────────────────────

/**
 * The paired shape. No axis names a group, so no caption line is drawn at all —
 * a row of unrelated measures should not pay a blank line for a feature it is
 * not using.
 */
const PAIR_AXES: GroupedMeasureAxes = [
  { label: "Hrs/wk", domain: [0, 80], snap: 1, format: (n) => `${n}h` },
  { label: "$/hr", domain: [0, 300], snap: 5, format: money },
];

const PAIR_FIXTURE: readonly GroupedMutationEntity[] = [
  {
    id: "design",
    label: "Design",
    measures: [
      { prior: 10, value: 20, range: [0, 40] },
      { prior: 120, value: 150, range: [100, 200] },
    ],
  },
  {
    id: "build",
    label: "Build",
    measures: [
      { prior: 30, value: 25, range: [0, 40] },
      { prior: 90, value: 90, range: [80, 130] },
    ],
  },
];

const PairSliders = createGroupedMutationSliders({ axes: PAIR_AXES });

// ── Card 2: three measures, one group of two and one alone ─────────────────

/**
 * The odd count. `seats` captions the first two; the third names no group and
 * stands in a run of its own, with the caption line RESERVED above it rather
 * than absent — so the three dials still sit at one height.
 */
const THREE_AXES: GroupedMeasureAxes = [
  { label: "#", group: "seats", domain: [0, 100], snap: 1, format: count },
  { label: "$", group: "seats", domain: [0, 200], snap: 5, format: money },
  { label: "SLA", domain: [0, 10], snap: 1, format: count },
];

const THREE_FIXTURE: readonly GroupedMutationEntity[] = [
  {
    id: "basic",
    label: "Basic",
    measures: [
      { prior: 30, value: 40, range: [0, 80] },
      { prior: 20, value: 25, range: [10, 60] },
      { prior: 2, value: 2, range: [0, 5] },
    ],
  },
  {
    id: "plus",
    label: "Plus",
    measures: [
      { prior: 12, value: 12, range: [0, 40] },
      { prior: 80, value: 95, range: [60, 150] },
      { prior: 4, value: 6, range: [2, 9] },
    ],
  },
];

const ThreeSliders = createGroupedMutationSliders({
  axes: THREE_AXES,
  labels: { remove: "Retire", restore: "Revive", new: "new tier" },
});

// ── Cards 3 and 4: Peter's four ────────────────────────────────────────────

/**
 * THE SKETCH. `mo` is a monthly seat count and its fee; `yr` is an annual seat
 * count and the percentage the annual price is of twelve monthly ones.
 *
 * BOTH COUNT DIALS ARE LABELLED `#`, deliberately: on the board this is heading
 * for, the reader is comparing monthly seats with annual ones and two long
 * labels would cost the column its width. The CAPTION is what tells them apart,
 * in the drawing and in each dial's accessible name (`Starter yr #`), which is
 * exactly the load this component was added to carry.
 */
const LICENCE_AXES: GroupedMeasureAxes = [
  { label: "#", group: "mo", domain: [0, 500], snap: 1, format: count },
  { label: "$", group: "mo", domain: [0, 600], snap: 1, format: money },
  { label: "#", group: "yr", domain: [0, 500], snap: 1, format: count },
  { label: "%", group: "yr", domain: [50, 100], snap: 1, format: percent },
];

/** The measure positions, named once so nothing below counts on its fingers. */
const MONTHLY = 0;
const FEE = 1;
const ANNUAL = 2;
const PCT = 3;

/**
 * What a product bills a month, in the board's own arithmetic: the monthly
 * seats at the fee, plus the annual seats at the SAME fee discounted by the
 * percentage. The annual price is `fee × 12 × pct`, so its monthly equivalent
 * is `fee × pct` — and that is the line under every column.
 *
 * It lives HERE and not in the component because the component runs no
 * arithmetic across its measures and could not: a seat count, a fee and a
 * percentage have no common unit, so what they mean together is knowledge only
 * a consumer has. `summary` is how it says so.
 */
const monthlyEquivalent = (entity: GroupedMutationEntity): number => {
  const at = (index: number): number => entity.measures[index]?.value ?? 0;
  if (entity.measures[FEE]?.value === null) return 0;
  return at(MONTHLY) * at(FEE) + at(ANNUAL) * at(FEE) * (at(PCT) / 100);
};

const summaryOf = (entity: GroupedMutationEntity): string =>
  entity.measures[MONTHLY]?.value === null
    ? ""
    : `${money(monthlyEquivalent(entity))}/mo`;

const LicenceSliders = createGroupedMutationSliders({
  axes: LICENCE_AXES,
  labels: { remove: "Discontinue", restore: "Relaunch", new: "new product" },
});

/** Three products, and a fourth with no prior anywhere — a LAUNCH. */
const LICENCE_FIXTURE: readonly GroupedMutationEntity[] = [
  {
    id: "starter",
    label: "Starter",
    measures: [
      { prior: 100, value: 120, range: [0, 300] },
      { prior: 15, value: 15, range: [9, 25] },
      { prior: 50, value: 60, range: [0, 200] },
      { prior: 85, value: 85, range: [50, 100] },
    ],
  },
  {
    id: "team",
    label: "Team",
    measures: [
      { prior: 40, value: 40, range: [0, 120] },
      { prior: 49, value: 49, range: [29, 80] },
      { prior: 25, value: 25, range: [0, 80] },
      { prior: 90, value: 90, range: [50, 100] },
    ],
  },
  {
    id: "enterprise",
    label: "Enterprise",
    measures: [
      { prior: 2, value: 2, range: [0, 20] },
      { prior: 400, value: 400, range: [250, 600] },
      { prior: 6, value: 6, range: [0, 20] },
      { prior: 80, value: 80, range: [50, 100] },
    ],
  },
  {
    id: "pro",
    label: "Pro",
    measures: [
      { prior: null, value: 18, range: [0, 100] },
      { prior: null, value: 99, range: [50, 200] },
      { prior: null, value: 7, range: [0, 50] },
      { prior: null, value: 75, range: [50, 100] },
    ],
  },
];

/** Nine products, for the card that cannot hold them. */
const MANY: readonly GroupedMutationEntity[] = map(
  (index: number): GroupedMutationEntity => {
    const seed = LICENCE_FIXTURE[index % LICENCE_FIXTURE.length];
    return {
      ...(seed as GroupedMutationEntity),
      id: `${seed?.id}-${index}`,
      label: `${seed?.label} ${index + 1}`,
    };
  },
  [0, 1, 2, 3, 4, 5, 6, 7, 8],
);

// ── The bench ───────────────────────────────────────────────────────────────

/**
 * One live card. The state is the ENTITIES, and a change writes one measure of
 * one entity — which is the smallest thing a consumer of this component has to
 * be able to do, so the bench does exactly it and nothing more helpful.
 */
const LiveCard: Component<{
  title: string;
  note: string;
  initial: readonly GroupedMutationEntity[];
  render: (props: {
    entities: readonly GroupedMutationEntity[];
    onChange: (id: string, measure: number, value: number) => void;
    onRemove: (id: string) => void;
    onRestore: (id: string) => void;
    selected?: readonly string[];
    onSelectionChange?: (ids: readonly string[]) => void;
  }) => ReturnType<Component>;
  pinning?: boolean;
}> = (props) => {
  const [entities, setEntities] = createSignal(props.initial);
  const [selected, setSelected] = createSignal<readonly string[]>([]);
  /** Every measure this entity carried, remembered so Restore has somewhere to
   *  go. The COMPONENT holds no such memory on purpose — what "restore" means
   *  is the consumer's — so the bench is the smallest demonstration of paying
   *  for it. */
  const [shelf, setShelf] = createSignal<
    Record<string, GroupedMutationEntity["measures"]>
  >({});

  const change = (id: string, measure: number, value: number): void => {
    setEntities((current) =>
      map((entity: GroupedMutationEntity) => {
        if (entity.id !== id) return entity;
        return {
          ...entity,
          measures: map(
            (one, index: number) =>
              index === measure ? { ...one, value } : one,
            entity.measures,
          ),
        };
      }, current),
    );
  };

  const remove = (id: string): void => {
    const found = entities().find((entity) => entity.id === id);
    if (found !== undefined) setShelf((s) => ({ ...s, [id]: found.measures }));
    setEntities((current) =>
      map(
        (entity: GroupedMutationEntity) =>
          entity.id === id
            ? {
                ...entity,
                measures: map(
                  (one) => ({ ...one, value: null }),
                  entity.measures,
                ),
              }
            : entity,
        current,
      ),
    );
  };

  const restore = (id: string): void => {
    const kept = shelf()[id];
    if (kept === undefined) return;
    setEntities((current) =>
      map(
        (entity: GroupedMutationEntity) =>
          entity.id === id ? { ...entity, measures: kept } : entity,
        current,
      ),
    );
  };

  return (
    <CardSurface>
      <SpreadRow>
        <TextTitle>{props.title}</TextTitle>
        <ClusterRow>
          <NoteText>{props.note}</NoteText>
        </ClusterRow>
      </SpreadRow>
      {/* NO HEIGHT BOX, and that is a MEASUREMENT rather than a shrug.
          A grouped column's content is name(18) + caption(15) + dial(180, the
          `MarkedSlider` floor) + value(30) + meta(15) + summary(30) +
          footer(24) ≈ 325px, and the row absorbs its container in BOTH
          directions — so a card bounded below that (the library's 200px
          `FixedHeightBox` was the first try) hands the dials row a box shorter
          than its own floor, the slider keeps drawing at 180, and the summary
          line prints ON TOP of the readouts.

          At content height the row is unmeasured, every dial draws at that same
          floor, and the column stands at its natural 325px. That is the honest
          demonstration for a bench: the number a consumer has to budget for. */}
      {props.render({
        entities: entities(),
        onChange: change,
        onRemove: remove,
        onRestore: restore,
        selected: props.pinning === true ? selected() : undefined,
        onSelectionChange:
          props.pinning === true ? (ids) => setSelected(ids) : undefined,
      })}
    </CardSurface>
  );
};

const GroupedMutationSlidersBench: Component = () => (
  <div class="component-section component-section--full">
    <Column>
      <SectionTitle>Grouped Mutation Sliders</SectionTitle>

      <LiveCard
        title="Two measures, ungrouped"
        note="No axis names a group, so no caption line is drawn at all."
        initial={PAIR_FIXTURE}
        render={(bound) => (
          <PairSliders
            entities={bound.entities}
            onChange={bound.onChange}
            onRemove={bound.onRemove}
            onRestore={bound.onRestore}
            summary={(entity) =>
              entity.measures[0]?.value === null
                ? ""
                : `${money(
                    (entity.measures[0]?.value ?? 0) *
                      (entity.measures[1]?.value ?? 0),
                  )}/wk`
            }
          />
        )}
      />

      <LiveCard
        title="Three measures — one captioned pair, one alone"
        note="The SLA dial names no group; its caption line is reserved, not absent."
        initial={THREE_FIXTURE}
        render={(bound) => (
          <ThreeSliders
            entities={bound.entities}
            onChange={bound.onChange}
            onRemove={bound.onRemove}
            onRestore={bound.onRestore}
            summary={(entity) =>
              entity.measures[0]?.value === null
                ? ""
                : `${count(entity.measures[0]?.value ?? 0)} seats`
            }
          />
        )}
      />

      <LiveCard
        title="Four measures in two groups — Peter's licence sketch"
        note="Both count dials read '#'; only the caption tells them apart."
        initial={LICENCE_FIXTURE}
        render={(bound) => (
          <LicenceSliders
            entities={bound.entities}
            onChange={bound.onChange}
            onRemove={bound.onRemove}
            onRestore={bound.onRestore}
            summary={summaryOf}
          />
        )}
      />

      <LiveCard
        title="Paging and pinning — nine products, four dials each"
        note="Click two names to pin, then drag one dial: only that measure fans out."
        initial={MANY}
        pinning
        render={(bound) => (
          <LicenceSliders
            entities={bound.entities}
            onChange={bound.onChange}
            onRemove={bound.onRemove}
            onRestore={bound.onRestore}
            selected={bound.selected}
            onSelectionChange={bound.onSelectionChange}
            summary={summaryOf}
            onAdd={() => {}}
          />
        )}
      />
    </Column>
  </div>
);

export default GroupedMutationSlidersBench;
