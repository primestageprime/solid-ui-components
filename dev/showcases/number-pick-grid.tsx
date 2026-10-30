// NumberPickGrid — pick one number from a run and see the run to the next
// stop. The showcase plays a reading tracker: 32 chapters, the next stop at
// chapter 14, the last saved chapter dashed. Tap (or arrow + Enter) to log.
import { createSignal, type Component } from "solid-js";
import { NumberPickGrid } from "../../src/components/NumberPickGrid";
import { SectionTitle, MutedBody } from "../../src/components/Text";

export const NumberPickGridShowcase: Component = () => {
  const [value, setValue] = createSignal(6);
  const saved = 6;
  return (
    <div class="component-section component-section--full">
      <div class="example-group">
        <SectionTitle>NumberPickGrid</SectionTitle>
        <MutedBody>
          Picked: ch. {value()} · next stop ch. 14 (heavy outline) · last saved
          ch. {saved} (dashed). Arrows move, Enter picks.
        </MutedBody>
        <div class="number-pick-grid-demo">
          <NumberPickGrid
            from={1}
            to={32}
            value={value()}
            target={14}
            marker={saved}
            muteBelow={saved}
            onPick={setValue}
            label="Tap the last chapter you finished"
            cellLabel={(n) =>
              `Finished chapter ${n}${n === 14 ? ", end of this assignment" : ""}`
            }
          />
        </div>
      </div>
    </div>
  );
};
