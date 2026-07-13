// Bench: Categorical Triage — a flow for moving a list of todo items through
// categorical triage, per dside's "Triage Route & Blockage Model" design
// (dside /designs/4102): a triage queue of eligible items that one-by-one get
// Claimed / Blocked / made Dependent / deferred Later.
//
// LAYOUT: ThreePanelLayout — chosen via /design-options (over ResizableContainer
// split, Page+Stack single-column, TabbedSidePanel).
//
// SKELETON stage (incremental refinement): the chosen layout with placeholder
// text per region. Each region gets filled by its own /design-options round:
//   [ ] left  — the queue (cards)
//   [ ] center — card detail (title bar, prompt, DAG)
//   [ ] right — categorical counts
//   [ ] topBar — page title + to-triage badge
// Earlier full draft lives in git history (56c743d) for reference.
import { Component } from "solid-js";
import { SectionTitle } from "../../../src/components/Text";
import { ThreePanelLayout } from "../../../src/components/ThreePanelLayout";
import { InfoPanel } from "../../../src/components/Panel";

export const meta = { label: "Categorical Triage" };

const Placeholder: Component<{ label: string; hint: string }> = (props) => (
  <InfoPanel title={props.label}>
    <span class="text-meta">{props.hint}</span>
  </InfoPanel>
);

const CategoricalTriageBench: Component = () => (
  <div class="component-section component-section--full">
    <ThreePanelLayout
      height="78vh"
      topBar={<SectionTitle>Categorical Triage — skeleton</SectionTitle>}
      leftPanel={<Placeholder label="Queue" hint="cards go here — one row per todo item" />}
      centerPanel={
        <Placeholder
          label="Card detail"
          hint="selected card goes here — title bar, prompt, workflow DAG, blockages"
        />
      }
      rightPanel={<Placeholder label="Counts" hint="categorical counts go here — total / claimed / blocked·person / blocked·snooze / blocked·dependency / eligible" />}
    />
  </div>
);

export default CategoricalTriageBench;
