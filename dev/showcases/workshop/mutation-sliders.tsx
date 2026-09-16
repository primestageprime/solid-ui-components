/**
 * Mutation Sliders bench — Peter's pencil sketch of 2026-09-16, reworked after
 * his review the same day.
 *
 * Six people on one pay scale. Each carries their ROLE's band — Junior 40–60k,
 * Mid 55–80k, Senior 70–110k — and the shaded box on each dial is that band,
 * not the size of the change. The muted arrowhead is what they were paid, the
 * accent one is what they will be, and the coloured line between them is green
 * for a raise and red for a cut.
 *
 * The bench plays the CONSUMER: it owns the people, decides what "hire" and
 * "let go" mean, and supplies the unit through `format`. The component holds
 * no state and invents no unit.
 */
import { type Component, createSignal } from "solid-js";
import { map } from "../../../src/fn";
import { MutationSliders } from "../../../src/components/MutationSliders";
import type { Entity } from "../../../src/components/MutationSliders";
import { GhostButton } from "../../../src/components/Button";
import { CardSurface } from "../../../src/components/Surface";
import {
  ClusterRow,
  ConstrainedBox,
  SpacedStack,
  SpreadRow,
} from "../../../src/components/Layout";
import { SectionTitle } from "../../../src/components/Text";

// NO `domain` here ON PURPOSE. The component derives the track from the
// entities' own bands — lowest floor to highest ceiling — so the bands fill
// the full height. This bench used to hand it `[30_000, 130_000]`, chosen by
// eye; the derived span is [$40k, $110k] and every guess in between was wasted
// track. A consumer passes one only to hold the scale STILL.

/** The role bands. A band is a property of the ROLE, not of the person. */
const JUNIOR: readonly [number, number] = [40_000, 60_000];
const MID: readonly [number, number] = [55_000, 80_000];
const SENIOR: readonly [number, number] = [70_000, 110_000];

/**
 * The sketch, as data. Three raises, two cuts, Joe gone.
 *
 * Elaina is deliberately AT her ceiling and Flynn AT his floor, so the bench
 * shows a thumb that will not move further the moment you drag it — the clamp
 * is visible without having to construct a bad value.
 */
const SKETCH: readonly Entity[] = [
  { id: "peter", label: "Peter", old: 90_000, value: 104_000, range: SENIOR },
  // A deliberately SMALL move: two arrows this close are exactly the case
  // Peter flagged, and the only thing that reads them apart is the figure.
  { id: "adlai", label: "Adlai", old: 44_000, value: 46_500, range: JUNIOR },
  { id: "elaina", label: "Elaina", old: 62_000, value: 80_000, range: MID },
  { id: "reilly", label: "Reilly", old: 105_000, value: 74_000, range: SENIOR },
  { id: "flynn", label: "Flynn", old: 78_000, value: 55_000, range: MID },
  { id: "joe", label: "Joe", old: 48_000, value: null, range: JUNIOR },
  // Three more, so the row has more dials than a gallery width can hold and
  // the chevrons have something to page through.
  { id: "nadia", label: "Nadia", old: 58_000, value: 66_000, range: MID },
  { id: "omar", label: "Omar", old: 96_000, value: 88_000, range: SENIOR },
  { id: "priya", label: "Priya", old: null, value: 47_000, range: JUNIOR },
];

/**
 * The consumer's unit. The component never invents one.
 *
 * One decimal, dropped when it is zero, so a small delta reads as `+$2.5k`
 * rather than being rounded into `+$3k` — which is the whole reason the delta
 * label exists.
 */
const formatPay = (value: number): string => {
  const thousands = Math.round(value / 100) / 10;
  return `$${thousands}k`;
};

/**
 * The person the `+` appends: a new hire on the junior band.
 *
 * `old: null` — they were not in the old scenario at all, so there is no prior
 * amount to point at. Their dial draws the band and the future arrow, nothing
 * is coloured, and the readout says `new`. It is the exact mirror of Joe, who
 * has a prior amount and no future one.
 */
const newHire = (count: number): Entity => ({
  id: `flynn-${count + 1}`,
  label: `Flynn ${count + 1}`,
  old: null,
  value: 45_000,
  range: JUNIOR,
});

/** Replace one person's future amount, leaving every other row untouched. */
const withValue = (
  entities: readonly Entity[],
  id: string,
  value: number | null,
): Entity[] =>
  map(
    (entity: Entity) => (entity.id === id ? { ...entity, value } : entity),
    entities,
  );

export const meta = { label: "Mutation Sliders" };

const MutationSlidersBench: Component = () => {
  const [entities, setEntities] = createSignal<readonly Entity[]>(SKETCH);
  const [hired, setHired] = createSignal(0);

  const setPay = (id: string, value: number): void => {
    setEntities((current) => withValue(current, id, value));
  };

  const letGo = (id: string): void => {
    setEntities((current) => withValue(current, id, null));
  };

  const hire = (): void => {
    setHired((count) => count + 1);
    setEntities((current) => [...current, newHire(hired())]);
  };

  const reset = (): void => {
    setHired(0);
    setEntities(SKETCH);
  };

  /** The headless reading of the row, printed beside the drawing. */

  return (
    <div class="component-section component-section--full">
      <SectionTitle>Mutation Sliders</SectionTitle>
      <SpacedStack>
        <SpreadRow>
          <ClusterRow>
            <GhostButton onClick={reset}>Reset</GhostButton>
          </ClusterRow>
        </SpreadRow>
        <CardSurface>
          <MutationSliders
            entities={entities()}
            onChange={setPay}
            onRemove={letGo}
            onAdd={hire}
            format={formatPay}
          />
        </CardSurface>
        {/* The same row, in a card too narrow for a single whole dial. It
            carries no caption on purpose (Peter, 2026-09-16: "Remove all of
            the explanatory text") — a 400px card beside a full-width one is
            self-evident, and the point is to SEE the paging rather than read
            about it. */}
        <ConstrainedBox>
          <CardSurface>
            <MutationSliders
              entities={entities()}
              onChange={setPay}
              onRemove={letGo}
              onAdd={hire}
              format={formatPay}
            />
          </CardSurface>
        </ConstrainedBox>
      </SpacedStack>
    </div>
  );
};

export default MutationSlidersBench;
