/**
 * MarkedSlider showcase.
 *
 * DELIBERATELY DOMAIN-FREE, because the Primitive is: there is a DOMAIN the
 * track runs, an allowed RANGE on it, a VALUE, a PRIOR value to compare
 * against, and a `deltaLabel` the CALLER formatted. What any of those mean is
 * the consumer's business — `MutationSliders` is the Composite that gives them
 * names, readouts and a row.
 *
 * Every card is wired to a working signal, so dragging and the arrow keys both
 * do something.
 */
import { type Component, createSignal } from "solid-js";
import {
  ContinuousMarkedSlider,
  createMarkedSlider,
} from "../../src/components/MarkedSlider";
import { CardSurface, FillCardSurface } from "../../src/components/Surface";
import { ClusterRow, SpacedStack } from "../../src/components/Layout";
import { MonoMeta } from "../../src/components/Text";

/** The whole scale the track runs. */
const DOMAIN: readonly [number, number] = [0, 200];
/** Three allowed ranges on it. */
const LOW: readonly [number, number] = [40, 60];
const MID: readonly [number, number] = [55, 80];
const HIGH: readonly [number, number] = [70, 110];

/** The signed delta, as a caller formats one: the sign, then the magnitude. */
const deltaLabel = (prior: number, value: number): string | null =>
  value === prior
    ? null
    : `${value > prior ? "+" : "−"}${Math.abs(value - prior)}`;

/** A consumer whose quantities come in fives, curried once. */
const FivesMarkedSlider = createMarkedSlider({ snap: 5 });

export const MarkedSliderShowcase: Component = () => {
  const [rise, setRise] = createSignal(52);
  const [fall, setFall] = createSignal(62);
  const [fives, setFives] = createSignal(80);
  const [tall, setTall] = createSignal(95);

  return (
    <div class="component-section">
      <h2>MarkedSlider — Atomic Primitive (Depth 1)</h2>

      <div class="example-group">
        <h3>A rise, a fall, and a value with no prior to compare</h3>
        <CardSurface>
          <ClusterRow>
            <ContinuousMarkedSlider
              domain={DOMAIN}
              range={LOW}
              prior={44}
              value={rise()}
              label="Rise"
              valueText={String(rise())}
              deltaLabel={deltaLabel(44, rise())}
              onChange={setRise}
            />
            <ContinuousMarkedSlider
              domain={DOMAIN}
              range={MID}
              prior={78}
              value={fall()}
              label="Fall"
              valueText={String(fall())}
              deltaLabel={deltaLabel(78, fall())}
              onChange={setFall}
            />
            <ContinuousMarkedSlider
              domain={DOMAIN}
              range={LOW}
              prior={null}
              value={47}
              label="No prior"
              valueText="47"
            />
            <ContinuousMarkedSlider
              domain={DOMAIN}
              range={HIGH}
              prior={90}
              value={null}
              label="No value"
            />
          </ClusterRow>
        </CardSurface>
      </div>

      <div class="example-group">
        <h3>Selected, and a grid of fives that a drag cannot land between</h3>
        <SpacedStack>
          <CardSurface>
            <ClusterRow>
              <ContinuousMarkedSlider
                domain={DOMAIN}
                range={MID}
                prior={62}
                value={fives()}
                label="Selected"
                valueText={String(fives())}
                deltaLabel={deltaLabel(62, fives())}
                active
                onChange={setFives}
              />
              <FivesMarkedSlider
                domain={DOMAIN}
                range={MID}
                prior={62}
                value={fives()}
                label="Fives"
                valueText={String(fives())}
                deltaLabel={deltaLabel(62, fives())}
                onChange={setFives}
              />
            </ClusterRow>
          </CardSurface>
          <MonoMeta>value {fives()}</MonoMeta>
        </SpacedStack>
      </div>

      <div class="example-group">
        <h3>It absorbs its container's height</h3>
        <div class="marked-slider-demo__tall-frame">
          <FillCardSurface>
            <ContinuousMarkedSlider
              domain={DOMAIN}
              range={HIGH}
              prior={90}
              value={tall()}
              label="Tall"
              valueText={String(tall())}
              deltaLabel={deltaLabel(90, tall())}
              onChange={setTall}
            />
          </FillCardSurface>
        </div>
      </div>

      <div class="example-group">
        <h3>Atoms / Variants</h3>
        <ul>
          <li>
            <code>ContinuousMarkedSlider</code> — the drop-in: no grid, so the
            thumb tracks the pointer to the finest unit the domain can express.
          </li>
          <li>
            <code>createMarkedSlider({"{ snap }"})</code> — the factory, for a
            consumer whose quantities come in round units.
          </li>
          <li>
            Composed by <code>MutationSliders</code>, which adds the name
            toggle, the readouts, the footer slot and the row.
          </li>
        </ul>
      </div>
    </div>
  );
};
