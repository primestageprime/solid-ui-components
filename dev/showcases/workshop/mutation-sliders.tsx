/**
 * Mutation Sliders bench — Peter's pencil sketch of 2026-09-16.
 *
 * Six named entities on one domain: three raised a little, two lowered a lot,
 * and Joe struck through because he is gone in the new scenario. The bench
 * plays the CONSUMER — it owns the entity list, decides what "add" and
 * "remove" mean, and supplies the unit through `format`. The component holds
 * no state at all.
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

/** Levels 0–10, the consumer's own units. */
const DOMAIN: readonly [number, number] = [0, 10];

/** The sketch, as data. Three raised a little, two lowered a lot, Joe gone. */
const SKETCH: readonly Entity[] = [
  { id: "peter", label: "Peter", old: 6, value: 7 },
  { id: "adlai", label: "Adlai", old: 5, value: 6 },
  { id: "elaina", label: "Elaina", old: 7, value: 8 },
  { id: "reilly", label: "Reilly", old: 7, value: 2 },
  { id: "flynn", label: "Flynn", old: 8, value: 1 },
  { id: "joe", label: "Joe", old: 5, value: null },
];

/** The consumer's unit. The component never invents one. */
const formatLevel = (value: number): string => `L${value}`;

/**
 * The entity the `+` appends.
 *
 * Note what the bench has to decide here and the component does not: an ADDED
 * entity has no OLD level, and `Entity.old` is required — so the bench pins it
 * to the domain floor, which draws the newcomer as a rise from nothing. That
 * reads acceptably but it is a consumer's invention, not a fact. Whether
 * `old: null` should join `value: null` in the type is an open question.
 */
const addedEntity = (count: number): Entity => ({
  id: `flynn-${count + 1}`,
  label: `Flynn ${count + 1}`,
  old: DOMAIN[0],
  value: 5,
});

/** Replace one entity's new level, leaving every other row untouched. */
const withValue = (
  entities: readonly Entity[],
  id: string,
  value: number | null,
): Entity[] =>
  map(
    (entity: Entity) => (entity.id === id ? { ...entity, value } : entity),
    entities,
  );

/** One entity, as the row reads out loud. */
const describeEntity = (entity: Entity): string =>
  entity.value === null
    ? `${entity.label} removed`
    : `${entity.label} ${entity.old}→${entity.value}`;

export const meta = { label: "Mutation Sliders" };

const MutationSlidersBench: Component = () => {
  const [entities, setEntities] = createSignal<readonly Entity[]>(SKETCH);
  const [added, setAdded] = createSignal(0);

  const setLevel = (id: string, value: number): void => {
    setEntities((current) => withValue(current, id, value));
  };

  const remove = (id: string): void => {
    setEntities((current) => withValue(current, id, null));
  };

  const append = (): void => {
    setAdded((count) => count + 1);
    setEntities((current) => [...current, addedEntity(added())]);
  };

  const reset = (): void => {
    setAdded(0);
    setEntities(SKETCH);
  };

  /** The headless reading of the row, printed beside the drawing. */
  const summary = (): string =>
    pipe(entities(), map(describeEntity), join("  ·  "));

  return (
    <div class="component-section component-section--full">
      <SectionTitle>Mutation Sliders</SectionTitle>
      <MutedBody>
        One vertical dial per entity. The fixed tick is where they WERE, the
        thumb is where they are now, and the translucent box between the two is
        the size of the change — drag a thumb and watch the box and the
        arrowhead follow. A struck-through name is an entity that is gone in the
        new scenario: it keeps its old tick and loses its thumb.
      </MutedBody>
      <SpacedStack>
        <SpreadRow>
          <MonoMeta>domain L0–L10 · arrow keys move a focused thumb</MonoMeta>
          <ClusterRow>
            <GhostButton onClick={reset}>Reset</GhostButton>
          </ClusterRow>
        </SpreadRow>
        <CardSurface>
          <MutationSliders
            entities={entities()}
            domain={DOMAIN}
            onChange={setLevel}
            onRemove={remove}
            onAdd={append}
            format={formatLevel}
          />
        </CardSurface>
        <MonoMeta>{summary()}</MonoMeta>
      </SpacedStack>
    </div>
  );
};

export default MutationSlidersBench;
