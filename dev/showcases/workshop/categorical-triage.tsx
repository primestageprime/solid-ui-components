// Bench: Categorical Triage — a flow for moving a list of todo items through
// categorical triage, per dside's "Triage Route & Blockage Model" design
// (dside /designs/4102): a triage queue of eligible items that one-by-one get
// Claimed / Blocked / made Dependent / deferred Later.
//
// LAYOUT: ThreePanelLayout — chosen via /design-options (3 always-visible
// regions, no trade-off, embedded view; dside Focus anatomy).
// QUEUE: ActionList, fixed-width rail — via /design-options (multi-status
// items = workflow surface → chips/tones/selection; no filter in triage v1;
// derived shared-priority sort, defer via "Later" not drag; rail fixed —
// titles are previews, detail shows the full title).
//
// Incremental refinement:
//   [x] left  — queue (ActionList, click row to select)
//   [ ] center — card detail (title bar, prompt, DAG)
//   [ ] right — categorical counts
//   [ ] topBar — page title + to-triage badge
import { Component, createMemo, createSignal } from "solid-js";
import { SectionTitle } from "../../../src/components/Text";
import { ThreePanelLayout } from "../../../src/components/ThreePanelLayout";
import { InfoPanel } from "../../../src/components/Panel";
import { ActionList } from "../../../src/components/ActionList";

export const meta = { label: "Categorical Triage" };

// Seed queue — shapes mirror dside's todo projection + the design's Work
// blockage columns. Multi-status is the point: TODO/DOING/DONE plus the
// blockage categories drive the whole triage flow.
type TriageItem = {
  id: string;
  name: string;
  prompt?: string;
  status: "TODO" | "DOING" | "DONE";
  claimedBy?: string;
  blockedBy?: string;
  blockedUntil?: string;
  deps?: string[];
};

const SEED: TriageItem[] = [
  { id: "t1", name: "need category for salaries", prompt: "Salaries land uncategorized in thorcasting. Add a category so the forecast splits them out.", status: "TODO" },
  { id: "t2", name: "need category for payroll", prompt: "Same treatment as salaries — payroll needs its own category.", status: "TODO", deps: ["need category for salaries"] },
  { id: "t3", name: '"typical" derivation should clearly display how we got to these numbers', status: "DOING", claimedBy: "Adlai" },
  { id: "t4", name: "data quality officer view — y-axis alarm chart", status: "TODO", blockedBy: "Waiting for Ryan to grant metric access" },
  { id: "t5", name: "user should be able to filter todos for claimant", status: "TODO" },
  { id: "t6", name: "user can mark items \"won't do\" or \"not needed\"", status: "TODO", blockedUntil: "Jul 16" },
  { id: "t7", name: "change sf6 max threshold for jtf", prompt: "Bump the sf6 ceiling — current max trips false alarms on Vessel Call 12.", status: "TODO" },
  { id: "t8", name: "get Ryan's email and find the range in time for 1-1 Vessel Call", status: "TODO", blockedBy: "Waiting for Ryan's email", blockedUntil: "Jul 15" },
];

const Placeholder: Component<{ label: string; hint: string }> = (props) => (
  <InfoPanel title={props.label}>
    <span class="text-meta">{props.hint}</span>
  </InfoPanel>
);

const CategoricalTriageBench: Component = () => {
  const [items] = createSignal<TriageItem[]>(SEED);
  const [selectedId, setSelectedId] = createSignal<string>(SEED[0].id);
  const selected = createMemo(() => items().find((it) => it.id === selectedId()));

  return (
    <div class="component-section component-section--full">
      <ThreePanelLayout
        height="78vh"
        topBar={<SectionTitle>Categorical Triage — refining: queue done</SectionTitle>}
        leftPanel={
          <ActionList
            label="Triage queue"
            items={items().map((it) => ({ id: it.id, name: it.name, status: it.status }))}
            selectedIds={[selectedId()]}
            onSelectionChange={(_ids, meta) => {
              if (meta?.clickedId) setSelectedId(meta.clickedId);
            }}
          />
        }
        centerPanel={
          <Placeholder
            label="Card detail"
            hint={`selected card goes here — title bar, prompt, workflow DAG, blockages (currently selected: "${selected()?.name ?? "none"}")`}
          />
        }
        rightPanel={
          <Placeholder
            label="Counts"
            hint="categorical counts go here — total / claimed / blocked·person / blocked·snooze / blocked·dependency / eligible"
          />
        }
      />
    </div>
  );
};

export default CategoricalTriageBench;
