// Bench: Categorical Triage — a flow for moving a list of todo items through
// categorical triage, per dside's "Triage Route & Blockage Model" design
// (dside /designs/4102): a triage queue of eligible items that one-by-one get
// Claimed / Blocked / made Dependent / deferred Later.
//
// LAYOUT: ThreePanelLayout — chosen via /design-options (3 always-visible
// regions, no trade-off, embedded view; dside Focus anatomy).
// QUEUE: one-line cards (title left — the focus; status trailing right,
// shown per-row because the queue is priority-sorted, NOT status-grouped),
// per the card canon in docs/agents/design-decision-tree.md. Composed from
// InteractiveCard + SpreadRow + StatusChip. Rail width per the sizing rule:
// typical 5–8-word title untruncated + status pill + 1rem spacer.
//
// Incremental refinement:
//   [x] left  — queue (ActionList, click row to select)
//   [ ] center — card detail (title bar, prompt, DAG)
//   [ ] right — categorical counts
//   [ ] topBar — page title + to-triage badge
import { Component, For, Show, createMemo, createSignal } from "solid-js";
import { SectionTitle } from "../../../src/components/Text";
import { SpreadRow, TightStack } from "../../../src/components/Layout";
import { ThreePanelLayout } from "../../../src/components/ThreePanelLayout";
import { InfoPanel } from "../../../src/components/Panel";
import { InteractiveCard } from "../../../src/components/Surface";
import { CountChip, StatusChip } from "../../../src/components/Badge";

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

  // Categorized counts column: each category = label + count, and EITHER
  // one-line children (click to select) OR count-only, per category.
  const categories = createMemo(() => {
    const all = items();
    const isBlocked = (it: TriageItem) => !!it.blockedBy || !!it.blockedUntil || !!(it.deps && it.deps.length);
    void isBlocked;
    // Ordered by ACTIONABILITY — how much you can do about them (Peter):
    // person-blocked first (you can nudge), snooze (will self-clear),
    // dependency (count only), claimed-but-non-terminal (count only).
    return [
      { label: "BLOCKED · PERSON", glyph: "⏸", mode: "children" as const, items: all.filter((it) => !!it.blockedBy) },
      { label: "BLOCKED · SNOOZE", glyph: "⏰", mode: "children" as const, items: all.filter((it) => !!it.blockedUntil) },
      { label: "BLOCKED · DEPENDENCY", glyph: "⛓", mode: "count" as const, items: all.filter((it) => !!(it.deps && it.deps.length)) },
      { label: "CLAIMED", glyph: "◉", mode: "count" as const, items: all.filter((it) => !!it.claimedBy && it.status !== "DONE") },
    ];
  });

  return (
    <div class="component-section component-section--full">
      <ThreePanelLayout
        height="78vh"
        topBar={<SectionTitle>Categorical Triage — refining: queue done</SectionTitle>}
        leftPanelWidth="380px"
        leftPanel={
          <TightStack>
            <For each={items()}>
              {(it) => (
                <InteractiveCard active={it.id === selectedId()} onClick={() => setSelectedId(it.id)}>
                  <SpreadRow gap="sm">
                    <span>{it.name}</span>
                    <StatusChip status={it.status} options={["TODO", "DOING", "DONE"]} title={it.name} highlight={it.status === "DOING"} />
                  </SpreadRow>
                </InteractiveCard>
              )}
            </For>
          </TightStack>
        }
        centerPanel={
          <Placeholder
            label="Card detail"
            hint={`selected card goes here — title bar, prompt, workflow DAG, blockages (currently selected: "${selected()?.name ?? "none"}")`}
          />
        }
        rightPanel={
          <TightStack>
            <For each={categories()}>
              {(cat) => (
                <div>
                  <SpreadRow gap="sm">
                    <span class="text-meta">{cat.label}</span>
                    <CountChip count={cat.items.length} label="" active={cat.items.length > 0} />
                  </SpreadRow>
                  <Show when={cat.mode === "children"}>
                    <TightStack>
                      <For each={cat.items}>
                        {(it) => (
                          <span
                            class="text-meta"
                            style={{ "padding-left": "1rem", cursor: "pointer", opacity: it.id === selectedId() ? 1 : 0.7 }}
                            onClick={() => setSelectedId(it.id)}
                          >
                            {cat.glyph} {it.name}
                          </span>
                        )}
                      </For>
                    </TightStack>
                  </Show>
                </div>
              )}
            </For>
          </TightStack>
        }
      />
    </div>
  );
};

export default CategoricalTriageBench;
