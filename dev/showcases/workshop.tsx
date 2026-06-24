import { type Component } from "solid-js";
import { SectionTitle, MutedBody } from "../../src/components/Text";

// Workshop bench — the iteration surface for whatever component is currently
// being prototyped. It is intentionally BLANK between projects.
//
// The last occupant was SplitQueueList; its interaction + layout demos have
// graduated to the dedicated showcase (dev/showcases/split-queue-list.tsx).
//
// To prototype: drop a component + scratch controls in here, iterate live, then
// promote the keepers into a real showcase and clear this file again.
export const WorkshopShowcase: Component = () => {
  return (
    <div class="component-section component-section--full">
      <SectionTitle>Workshop</SectionTitle>
      <MutedBody>
        Empty bench. Drop a prototype here when iterating on a new component, then
        promote the keepers into a dedicated showcase and clear it again.
      </MutedBody>
    </div>
  );
};
