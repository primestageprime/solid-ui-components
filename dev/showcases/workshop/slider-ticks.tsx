// ============================================
// PROTOTYPE — Slider tick marks. THROWAWAY. Delete once `Slider` ships ticks.
//
// THE QUESTION: what should tick marks on SUI's `Slider` track look like?
// THE ANSWER: notches. Short lines ON the track, over the fill, with no text.
//
// A labelled rail under the track and a segmented track both lost. The rail
// prints a value at every tick, which is unreadable once a slider names more
// than about eight stops. The segmented track reads well but says less than
// the notch does. Both live on the `prototype/slider-ticks` branch.
//
// The bench renders the five real sliders from the ticket, then `annual pay`
// with ticks derived from `step` alone. That last case draws 101 notches and
// shows how the treatment degrades at the top of its range.
//
// Nothing here imports `src/components/Slider/Slider.tsx`. The variant owns a
// copy of the Kobalte wiring, so it can change the track markup.
// ============================================
import { type Component, createSignal } from "solid-js";
import { SectionTitle, TextBody } from "../../../src/components/Text";
import type { CaseEntry } from "./slider-ticks/cases";
import { TICK_CASES } from "./slider-ticks/cases";
import { VariantAPanel } from "./slider-ticks/VariantANotches";

export const meta = { label: "Slider Ticks" };

/** One signal per case, built once. */
const buildEntries = (): readonly CaseEntry[] =>
  TICK_CASES.map((tickCase) => {
    const [value, setValue] = createSignal(tickCase.initial);
    return { tickCase, value, setValue };
  });

const SliderTicksBench: Component = () => {
  const entries = buildEntries();

  return (
    <div class="component-section component-section--full">
      <SectionTitle>Slider Ticks</SectionTitle>
      <TextBody>
        Prototype. Notches on the track, drawn on the five real sliders and on
        one stress case that derives its ticks from `step` alone.
      </TextBody>
      <VariantAPanel entries={entries} />
    </div>
  );
};

export default SliderTicksBench;
