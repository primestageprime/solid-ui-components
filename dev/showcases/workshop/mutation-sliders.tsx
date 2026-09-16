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
import { join, map, pipe } from "../../../src/fn";
import { MutationSliders } from "../../../src/components/MutationSliders";
import type { Entity } from "../../../src/components/MutationSliders";
import { GhostButton } from "../../../src/components/Button";
import { CardSurface } from "../../../src/components/Surface";
import {
  ClusterRow,
  SpacedStack,
  SpreadRow,
} from "../../../src/components/Layout";
import {
  MonoMeta,
  MutedBody,
  SectionTitle,
} from "../../../src/components/Text";

/**
 * The shared scale every dial's track runs.
 *
 * NOT `[0, 200_000]`, which was the first guess: with bands of 20–40k it
 * squeezed every box into the lower fifth of the track and the row read as
 * marks huddled near the floor. The scale a pay comparison wants is one that
 * brackets the bands in play with a little air, not one that starts at zero
 * because money does.
 */
const DOMAIN: readonly [number, number] = [30_000, 130_000];

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
  { id: "adlai", label: "Adlai", old: 44_000, value: 52_000, range: JUNIOR },
  { id: "elaina", label: "Elaina", old: 62_000, value: 80_000, range: MID },
  { id: "reilly", label: "Reilly", old: 105_000, value: 74_000, range: SENIOR },
  { id: "flynn", label: "Flynn", old: 78_000, value: 55_000, range: MID },
  { id: "joe", label: "Joe", old: 48_000, value: null, range: JUNIOR },
];

/** The consumer's unit. The component never invents one. */
const formatPay = (value: number): string => `$${Math.round(value / 1000)}k`;

/**
 * The person the `+` appends: a new hire on the junior band.
 *
 * Note what the bench has to decide here and the component does not: a new
 * hire has no PRIOR amount, and `Entity.old` is required — so the bench pins
 * them to their band's floor, which draws a prior arrow at a salary they were
 * never paid. Whether `old: null` should join `value: null` in the type is an
 * open question for Peter.
 */
const newHire = (count: number): Entity => ({
  id: `flynn-${count + 1}`,
  label: `Flynn ${count + 1}`,
  old: JUNIOR[0],
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

/** One person, as the row reads out loud — bands included. */
const describeEntity = (entity: Entity): string => {
  const band = entity.range
    ? ` [${formatPay(entity.range[0])}–${formatPay(entity.range[1])}]`
    : "";
  return entity.value === null
    ? `${entity.label} let go${band}`
    : `${entity.label} ${formatPay(entity.old)}→${formatPay(entity.value)}${band}`;
};

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
  const summary = (): string =>
    pipe(entities(), map(describeEntity), join("  ·  "));

  return (
    <div class="component-section component-section--full">
      <SectionTitle>Mutation Sliders</SectionTitle>
      <MutedBody>
        One dial per person, all on one pay scale. The shaded box is that
        person's ROLE BAND — Junior $40–60k, Mid $55–80k, Senior $70–110k — so
        two people on the same role draw the same box however far each of them
        moved. The muted arrowhead is what they were paid and the accent one is
        what they will be; the line between them is green for a raise and red
        for a cut. Drag a thumb past a band edge and it stops: the band is the
        clamp, and the readout follows. A struck-through name is someone who is
        gone in the new scenario — their band and their prior arrow stay.
      </MutedBody>
      <SpacedStack>
        <SpreadRow>
          <MonoMeta>
            scale $30k–$130k · drag, or arrow keys on a focused dial
          </MonoMeta>
          <ClusterRow>
            <GhostButton onClick={reset}>Reset</GhostButton>
          </ClusterRow>
        </SpreadRow>
        <CardSurface>
          <MutationSliders
            entities={entities()}
            domain={DOMAIN}
            onChange={setPay}
            onRemove={letGo}
            onAdd={hire}
            format={formatPay}
          />
        </CardSurface>
        <MonoMeta>{summary()}</MonoMeta>
      </SpacedStack>
    </div>
  );
};

export default MutationSlidersBench;
