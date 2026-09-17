/**
 * MutationSliders showcase.
 *
 * DELIBERATELY DOMAIN-FREE. The component's model is entities with a prior
 * amount, a future amount, an allowed range and a presence — present, removed
 * or new — and nothing else. The fixture below is therefore just numbers with
 * names: no money, no staffing, no unit the component could be accused of
 * knowing about. The one card that DOES have a vocabulary curries it, which is
 * the point being demonstrated.
 *
 * Title lines only (Peter, 2026-09-16: "Remove all of the explanatory text").
 * Every card is wired to a working callback, so dragging, removing, restoring,
 * adding and pinning all do something.
 */
import { type Component, createSignal } from "solid-js";
import { map } from "../../src/fn";
import {
  NumberMutationSliders,
  createMutationSliders,
  type MutationEntity,
} from "../../src/components/MutationSliders";
import { GhostButton } from "../../src/components/Button";
import { CardSurface, FillCardSurface } from "../../src/components/Surface";
import {
  ClusterRow,
  ConstrainedBox,
  SpacedStack,
} from "../../src/components/Layout";

/**
 * Three allowed ranges, shared by several entities each.
 *
 * A range is a property of the CLASS an entity belongs to, not of the entity —
 * which is why two entities on the same range draw the same box however far
 * each of them moved.
 */
const LOW: readonly [number, number] = [40, 60];
const MID: readonly [number, number] = [55, 80];
const HIGH: readonly [number, number] = [70, 110];

/**
 * Six entities: three rises, one fall, one REMOVED (`value: null`) and one NEW
 * (`old: null`).
 *
 * `Cal` is deliberately AT the ceiling of its range and `Dot` at its floor, so
 * the clamp is visible the moment you drag either — the thumb stops dead
 * without anyone having to construct a bad value. `Bo` moves by a hair, which
 * is the case only the signed delta label can read apart.
 */
const SIX: readonly MutationEntity[] = [
  { id: "ana", label: "Ana", old: 90, value: 104, range: HIGH },
  { id: "bo", label: "Bo", old: 44, value: 46, range: LOW },
  { id: "cal", label: "Cal", old: 62, value: 80, range: MID },
  { id: "dot", label: "Dot", old: 78, value: 55, range: MID },
  { id: "eli", label: "Eli", old: 48, value: null, range: LOW },
  { id: "fay", label: "Fay", old: null, value: 47, range: LOW },
];

/** Three entities across two ranges — the pinning case. */
const THREE: readonly MutationEntity[] = [
  { id: "gus", label: "Gus", old: 44, value: 46, range: LOW },
  { id: "hal", label: "Hal", old: 90, value: 95, range: HIGH },
  { id: "ivy", label: "Ivy", old: 50, value: 52, range: LOW },
];

/** Replace one entity's future amount, leaving every other row untouched. */
const withValue = (
  entities: readonly MutationEntity[],
  id: string,
  value: number | null,
): MutationEntity[] =>
  map(
    (entity: MutationEntity) =>
      entity.id === id ? { ...entity, value } : entity,
    entities,
  );

/** What the `+` appends: a NEW entity, with no prior amount to point at. */
const appended = (count: number): MutationEntity => ({
  id: `new-${count}`,
  label: `New ${count}`,
  old: null,
  value: 45,
  range: LOW,
});

/**
 * A consumer's own row, curried once: its unit, its verbs and its grid are
 * locked here, and the call site below passes nothing but data and callbacks.
 */
const BudgetMutationSliders = createMutationSliders({
  format: (value: number) => `$${value}k`,
  labels: { remove: "Cancel", restore: "Reinstate", new: "added" },
  snap: 5,
});

export const MutationSlidersShowcase: Component = () => {
  const [rows, setRows] = createSignal<readonly MutationEntity[]>(SIX);
  const [added, setAdded] = createSignal(0);
  const [pinnable, setPinnable] =
    createSignal<readonly MutationEntity[]>(THREE);
  const [tall, setTall] = createSignal<readonly MutationEntity[]>(THREE);
  const [budget, setBudget] = createSignal<readonly MutationEntity[]>(SIX);

  const setValue = (id: string, value: number): void => {
    setRows((current) => withValue(current, id, value));
  };
  const remove = (id: string): void => {
    setRows((current) => withValue(current, id, null));
  };

  /**
   * What RESTORE means is the CONSUMER'S: the component holds no memory of
   * what an entity was before it was removed, and inventing one would put a
   * second, stale copy of the truth inside the widget. The reading here — put
   * it back on the amount it came in at, or its range floor if it never had
   * one.
   */
  const restore = (id: string): void => {
    setRows((current) =>
      map(
        (entity: MutationEntity) =>
          entity.id === id
            ? { ...entity, value: entity.old ?? entity.range[0] }
            : entity,
        current,
      ),
    );
  };

  const add = (): void => {
    setAdded((count) => count + 1);
    setRows((current) => [...current, appended(added() + 1)]);
  };

  const reset = (): void => {
    setAdded(0);
    setRows(SIX);
  };

  return (
    <div class="component-section component-section--full">
      <h2>MutationSliders — Composite (Depth 2)</h2>

      <div class="example-group">
        <h3>Six entities — a rise, a fall, a removal and an arrival</h3>
        <SpacedStack>
          <ClusterRow>
            <GhostButton onClick={reset}>Reset</GhostButton>
          </ClusterRow>
          <CardSurface>
            <NumberMutationSliders
              entities={rows()}
              onChange={setValue}
              onRemove={remove}
              onRestore={restore}
              onAdd={add}
            />
          </CardSurface>
        </SpacedStack>
      </div>

      <div class="example-group">
        <h3>Too narrow — it pages, never below one dial</h3>
        <ConstrainedBox>
          <CardSurface>
            <NumberMutationSliders
              entities={rows()}
              onChange={setValue}
              onRemove={remove}
              onRestore={restore}
              onAdd={add}
            />
          </CardSurface>
        </ConstrainedBox>
      </div>

      <div class="example-group">
        <h3>Click two names — they level up and then drag together</h3>
        <CardSurface>
          <NumberMutationSliders
            entities={pinnable()}
            onChange={(id, value) =>
              setPinnable((current) => withValue(current, id, value))
            }
          />
        </CardSurface>
      </div>

      <div class="example-group">
        <h3>It absorbs its container's height</h3>
        <div class="mutation-sliders-demo__tall-frame">
          <FillCardSurface>
            <NumberMutationSliders
              entities={tall()}
              onChange={(id, value) =>
                setTall((current) => withValue(current, id, value))
              }
            />
          </FillCardSurface>
        </div>
      </div>

      <div class="example-group">
        <h3>Curried — a consumer's own unit, verbs and grid</h3>
        <CardSurface>
          <BudgetMutationSliders
            entities={budget()}
            onChange={(id, value) =>
              setBudget((current) => withValue(current, id, value))
            }
            onRemove={(id) =>
              setBudget((current) => withValue(current, id, null))
            }
            onRestore={(id) =>
              setBudget((current) =>
                map(
                  (entity: MutationEntity) =>
                    entity.id === id
                      ? { ...entity, value: entity.old ?? entity.range[0] }
                      : entity,
                  current,
                ),
              )
            }
          />
        </CardSurface>
      </div>
    </div>
  );
};
