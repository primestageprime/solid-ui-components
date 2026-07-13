// Bench: Categorical Triage — a flow for moving a list of todo items through
// categorical triage, per dside's "Triage Route & Blockage Model" design
// (dside /designs/4102): a triage queue of eligible items that one-by-one get
// Claimed / Blocked / made Dependent / deferred Later.
//
// STAGE 1 (current): just the queue — todo items as an ordered task list, with
// a count of tasks to the right of the heading. Existing SUI components only.
import { Component, createSignal } from "solid-js";
import { SectionTitle } from "../../../src/components/Text";
import { SpreadRow } from "../../../src/components/Layout";
import { ActionList } from "../../../src/components/ActionList";
import { CountChip } from "../../../src/components/Badge";

export const meta = { label: "Categorical Triage" };

// Seed queue — triage-eligible items (unclaimed, unblocked, non-terminal),
// in shared priority order. Shapes mirror dside's todo projection.
const SEED = [
  { id: "t1", name: "need category for salaries", tags: [{ key: "primestage", value: "thorcasting" }] },
  { id: "t2", name: "need category for payroll", tags: [{ key: "primestage", value: "thorcasting" }] },
  { id: "t3", name: '"typical" derivation should clearly display how we got to these numbers', tags: [{ key: "primestage", value: "thorcasting" }] },
  { id: "t4", name: "data quality officer view — y-axis alarm chart", tags: [{ key: "stax", value: "amygdala - mobile" }] },
  { id: "t5", name: "user should be able to filter todos for claimant", tags: [{ key: "primestage", value: "dside" }] },
  { id: "t6", name: "user can mark items \"won't do\" or \"not needed\"", tags: [{ key: "primestage", value: "dside" }] },
  { id: "t7", name: "change sf6 max threshold for jtf", tags: [{ key: "stax", value: "jtf" }] },
  { id: "t8", name: "get Ryan's email and find the range in time for 1-1 Vessel Call", tags: [{ key: "stax", value: "jtf" }] },
];

const CategoricalTriageBench: Component = () => {
  const [items] = createSignal(SEED);
  return (
    <div class="component-section component-section--full">
      <SpreadRow>
        <SectionTitle>Triage queue</SectionTitle>
        <CountChip count={items().length} label="tasks" />
      </SpreadRow>
      <ActionList items={items()} label="Triage queue" />
    </div>
  );
};

export default CategoricalTriageBench;
