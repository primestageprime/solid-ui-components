import { type Component, createSignal } from "solid-js";
import { RangeAmountGroup } from "../../src/components/RangeAmountGroup";
import { NarrowStack } from "../../src/components/Layout";

/**
 * RangeAmountGroup showcase — closes the showcase gap so the layout-purity
 * migration (the "holy-albatross" responsive trio → the `AutoStackRow` /
 * `AutoStackItem` primitives) is visually verifiable. Drag the container
 * narrower than `breakWidth` and the trio flips from one-line to one-per-line
 * (never the awkward 2+1 wrap).
 */
export const RangeAmountGroupShowcase: Component = () => {
  const [min, setMin] = createSignal<number | undefined>(2000);
  const [typical, setTypical] = createSignal<number | undefined>(5000);
  const [max, setMax] = createSignal<number | undefined>(40000);

  const slots = () => [
    { label: "Min", value: min(), onChange: setMin },
    { label: "p95", value: typical(), onChange: setTypical },
    { label: "Max", value: max(), onChange: setMax },
  ];

  return (
    <div class="component-section">
      <h2>RangeAmountGroup — Atomic (Depth 2)</h2>
      <p class="text-meta">
        A responsive trio of labeled amount inputs. All three on one line when
        there is room; otherwise each on its own line — never 2+1.
      </p>

      <div class="example-group">
        <h3>Wide (all on one line)</h3>
        <div style={{ width: "560px", "max-width": "100%" }}>
          <RangeAmountGroup slots={slots()} name="wide" />
        </div>
      </div>

      <div class="example-group">
        <h3>Narrow (stacks one-per-line, below breakWidth)</h3>
        <NarrowStack style={{ width: "260px" }}>
          <RangeAmountGroup slots={slots()} name="narrow" />
        </NarrowStack>
      </div>
    </div>
  );
};
