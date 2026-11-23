// FixedCard — a fixed-size card for a wrapping row. The summary clips (with
// a fade) instead of growing the card; "More" opens the rest in a modal.
// Three cards side by side show the three outcomes of `moreOf`: a short
// summary (no button), a long summary (button opens it in full) and a card
// with a `detail` slot (button always shows and opens the detail).
import { type Component, createSignal } from "solid-js";
import { FixedCard } from "../../src/components/FixedCard";
import { WrapRow, TightStack } from "../../src/components/Layout/variants";
import {
  MutedBody,
  SectionTitle,
  TextBody,
  TextSublabel,
  TextTitle,
} from "../../src/components/Text";

const LONG =
  "Roofing runs eleven projected jobs this window. Each one books a crew of three for a week, then a two-day inspection, then cleanup. The summary keeps going past what a fixed card can hold, so it clips with a fade and the More button opens all of it.";

export const FixedCardShowcase: Component = () => {
  const [focused, setFocused] = createSignal<string | null>(null);
  const focus = (name: string) => setFocused(focused() === name ? null : name);
  return (
    <div class="component-section component-section--full">
      <div class="example-group">
        <SectionTitle>FixedCard</SectionTitle>
        <MutedBody>
          One size (320 x 240), never grows. A clipped summary fades out and
          offers More; a `detail` slot always offers More. Click a card to focus
          it; More opens the modal without focusing.
        </MutedBody>
        <div class="fixed-card-demo">
          <WrapRow>
            <FixedCard
              title="Painting"
              active={focused() === "Painting"}
              onClick={() => focus("Painting")}
            >
              <TightStack>
                <TextTitle>Painting</TextTitle>
                <TextSublabel>Fits: no More button</TextSublabel>
              </TightStack>
            </FixedCard>
            <FixedCard
              title="Roofing"
              active={focused() === "Roofing"}
              onClick={() => focus("Roofing")}
            >
              <TightStack>
                <TextTitle>Roofing</TextTitle>
                <TextBody>{LONG}</TextBody>
              </TightStack>
            </FixedCard>
            <FixedCard
              title="Excavator"
              active={focused() === "Excavator"}
              onClick={() => focus("Excavator")}
              detail={
                <TightStack>
                  <TextBody>
                    Two groups of units, each paid its own way.
                  </TextBody>
                  <TextBody>Group 1: 2 units, financed from March.</TextBody>
                  <TextBody>Group 2: 1 unit, leased from June.</TextBody>
                </TightStack>
              }
            >
              <TightStack>
                <TextTitle>Excavator</TextTitle>
                <TextSublabel>3 units, $180k each</TextSublabel>
              </TightStack>
            </FixedCard>
          </WrapRow>
        </div>
      </div>
    </div>
  );
};
