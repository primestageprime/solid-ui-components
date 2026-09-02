// ============================================
// PROTOTYPE — Slider tick marks. THROWAWAY. Delete after the decision.
//
// THE QUESTION: what should tick marks on SUI's `Slider` track look like?
//
// Three structurally different answers, switchable at the bottom of the page
// or with ArrowLeft / ArrowRight:
//   A — Notches.         Short lines ON the track, over the fill. No text.
//   B — Labelled rail.   A rail UNDER the track. Every tick prints its value.
//   C — Segmented track. A gap and a cap at every tick. The ticks ARE the bar.
//
// Every variant renders the same six cases: the five real sliders from the
// ticket, then `annual pay` with ticks derived from `step` alone. That last
// case is the evidence that a boolean `ticks` prop cannot work.
//
// Nothing here imports `src/components/Slider/Slider.tsx`. Each variant owns a
// copy of the Kobalte wiring, so a variant can change the track markup.
// ============================================
import { type Component, createSignal, Match, Switch } from "solid-js";
import { SectionTitle, TextBody } from "../../../src/components/Text";
import type { CaseEntry } from "./slider-ticks/cases";
import { TICK_CASES } from "./slider-ticks/cases";
import { VariantAPanel } from "./slider-ticks/VariantANotches";
import { VariantBPanel } from "./slider-ticks/VariantBRail";
import { VariantCPanel } from "./slider-ticks/VariantCSegments";
import {
  readVariant,
  type VariantId,
  VariantSwitcher,
} from "./slider-ticks/VariantSwitcher";

export const meta = { label: "Slider Ticks" };

/** One signal per case, built once. The values survive a variant switch. */
const buildEntries = (): readonly CaseEntry[] =>
  TICK_CASES.map((tickCase) => {
    const [value, setValue] = createSignal(tickCase.initial);
    return { tickCase, value, setValue };
  });

const SliderTicksBench: Component = () => {
  const entries = buildEntries();
  const [variant, setVariant] = createSignal<VariantId>(readVariant());

  return (
    <div class="component-section component-section--full">
      <SectionTitle>Slider Ticks</SectionTitle>
      <TextBody>
        Prototype. Compare three tick treatments on the five real sliders and on
        one stress case. Use the arrows at the bottom, or ArrowLeft and
        ArrowRight.
      </TextBody>
      <Switch>
        <Match when={variant() === "A"}>
          <VariantAPanel entries={entries} />
        </Match>
        <Match when={variant() === "B"}>
          <VariantBPanel entries={entries} />
        </Match>
        <Match when={variant() === "C"}>
          <VariantCPanel entries={entries} />
        </Match>
      </Switch>
      <VariantSwitcher variant={variant()} onSelect={setVariant} />
    </div>
  );
};

export default SliderTicksBench;
