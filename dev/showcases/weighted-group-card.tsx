// WeightedGroupCard — Peter's role-card sketch, 2026-11-20. The page plays the
// consumer: it owns the group (Carpenters: Gerald ×2 and Jen ×1, both moved up
// from $48K) and hands every edit back into it, so the card's read-only group
// dial can be watched following its members.
//
// Two cards: one closed, as a role first appears, and one open, so the
// alignment the sketch asks for (every track on the same pixel rows, on the
// same scale) is on screen without a click.
import { type Component, createSignal } from "solid-js";
import {
  CompactCurrencyWeightedGroupCard,
  type WeightedGroup,
} from "../../src/components/WeightedGroupCard";
import { SpacedStack } from "../../src/components/Layout";
import { CardSurface } from "../../src/components/Surface";
import { MutedBody, SectionTitle, SubsectionTitle } from "../../src/components/Text";

const CARPENTERS: WeightedGroup = {
  id: "carpenters",
  label: "Carpenters",
  range: [40_000, 90_000],
  members: [
    { id: "gerald", label: "Gerald", count: 2, old: 48_000, value: 64_000 },
    { id: "jen", label: "Jen", count: 1, old: 48_000, value: 60_000 },
  ],
};

const ROOFERS: WeightedGroup = {
  id: "roofers",
  label: "Roofers",
  range: [35_000, 80_000],
  members: [
    { id: "ana", label: "Ana Lucia Ferreira", count: 3, old: 52_000, value: 52_000 },
    { id: "bo", label: "Bo", count: 1, old: 58_000, value: 61_000 },
    { id: "cy", label: "Cy", count: 2, old: null, value: 45_000 },
  ],
};

/** One card holding its own group, so every edit shows. */
const Held: Component<{ start: WeightedGroup; open?: boolean }> = (props) => {
  const [group, setGroup] = createSignal(props.start);
  return (
    <CompactCurrencyWeightedGroupCard
      group={group()}
      onChange={setGroup}
      defaultOpen={props.open}
    />
  );
};

export const WeightedGroupCardShowcase: Component = () => (
  <div class="component-section component-section--full">
    <div class="example-group">
      <SectionTitle>WeightedGroupCard</SectionTitle>
      <MutedBody>
        A role and its counted members. The role's dial is read-only: it sits at
        the members' count-weighted average, and its count is theirs summed.
        Press the count to show each member; press it again, or the corner
        button, to close. The role's name opens its min/max range.
      </MutedBody>
      <SpacedStack>
        <SubsectionTitle>Closed, as a role first appears</SubsectionTitle>
        <div class="weighted-group-card-demo">
          <CardSurface>
            <Held start={CARPENTERS} />
          </CardSurface>
        </div>
        <SubsectionTitle>Open: three members, one new, one long name</SubsectionTitle>
        <div class="weighted-group-card-demo">
          <CardSurface>
            <Held start={ROOFERS} open />
          </CardSurface>
        </div>
      </SpacedStack>
    </div>
  </div>
);
