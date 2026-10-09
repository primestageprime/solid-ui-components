// Generated Variants — a waiting room for curried variants created via
// `npm run new:variant`, so each one has a dev/ reference the moment it is
// born (componentsWithoutShowcase is ratcheted at 0). Promote a variant into
// its Primitive's own showcase by hand once its API has settled — this file
// is not a destination.
import { type Component } from "solid-js";
import { Sparkline } from "../../src/components/Sparkline";
import { TightStack } from "../../src/components/Layout";
import { SectionTitle, MutedBody, TextLabel, TextValue } from "../../src/components/Text";
// GENERATED IMPORTS — npm run new:variant appends below this line.
import { SplitCard } from "../../src/components/Surface";

export const GeneratedVariantsShowcase: Component = () => (
  <div class="component-section component-section--full">
    <SectionTitle>SplitCard — Surface variant</SectionTitle>
    <MutedBody>
      A card whose body and aside sit side by side, centred: a scenario's words
      on the left, its picture on the right.
    </MutedBody>
    {/* GENERATED DEMOS — npm run new:variant appends below this line. */}
    <SplitCard>
      <TightStack>
        <TextLabel>Baseline</TextLabel>
        <TextValue>Oct 8, 2027 · $379,305</TextValue>
        <MutedBody>lowest $121k on Oct 16, 2026</MutedBody>
      </TightStack>
      <Sparkline values={[125, 140, 160, 175, 200, 230, 260, 300, 340, 379]} floor={0} goal={300} endDot width={200} height={56} />
    </SplitCard>
  </div>
);
