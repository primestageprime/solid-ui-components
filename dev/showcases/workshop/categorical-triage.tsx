// Bench: Categorical Triage — a flow for moving a list of todo items through
// categorical triage, per dside's "Triage Route & Blockage Model" design
// (dside /designs/4102): a triage queue of eligible items that one-by-one get
// Claimed / Blocked / made Dependent / deferred Later.
//
// LAYOUT: ThreePanelLayout — chosen via /design-options (over ResizableContainer
// split, Page+Stack single-column, TabbedSidePanel).
//
// STAGE 2 (current): three-panel triage layout — cards (queue) in the left
// rail, the selected card's detail in the center (title bar, prompt, workflow
// DAG with click-to-move stage), and the categorical counts on the right
// (total / claimed / blocked-person / blocked-snooze / blocked-dependency /
// eligible). Existing SUI components only.
import { Component, For, Show, createMemo, createSignal } from "solid-js";
import { SectionTitle } from "../../../src/components/Text";
import { ContentStack, SpreadRow, TightStack } from "../../../src/components/Layout";
import { ThreePanelLayout } from "../../../src/components/ThreePanelLayout";
import { ActionList } from "../../../src/components/ActionList";
import { CountChip, StatusChip } from "../../../src/components/Badge";
import { InfoPanel } from "../../../src/components/Panel";
import { DagChart } from "../../../src/components/DagChart";

export const meta = { label: "Categorical Triage" };

// ---------------------------------------------------------------------------
// Seed data — the blockage model's four "cannot change now" categories:
// claimed elsewhere / person-blocked / snoozed / dependency-blocked, plus the
// eligible remainder. Shapes mirror dside's todo projection + Work columns.
type TriageItem = {
  id: string;
  name: string;
  prompt?: string;
  tags: { key: string; value: string }[];
  status: "TODO" | "DOING" | "DONE";
  claimedBy?: string;
  blockedBy?: string; // person-blocked free text
  blockedUntil?: string; // snooze horizon
  deps?: string[]; // unmet dependency statement names
};

const SEED: TriageItem[] = [
  {
    id: "t1",
    name: "need category for salaries",
    prompt: "Salaries land uncategorized in thorcasting. Add a category so the forecast splits them out.",
    tags: [{ key: "primestage", value: "thorcasting" }],
    status: "TODO",
  },
  {
    id: "t2",
    name: "need category for payroll",
    prompt: "Same treatment as salaries — payroll needs its own category.",
    tags: [{ key: "primestage", value: "thorcasting" }],
    status: "TODO",
    deps: ["need category for salaries"],
  },
  {
    id: "t3",
    name: '"typical" derivation should clearly display how we got to these numbers',
    prompt: "Show the derivation chain for the 'typical' figure so the number is auditable at a glance.",
    tags: [{ key: "primestage", value: "thorcasting" }],
    status: "DOING",
    claimedBy: "Adlai",
  },
  {
    id: "t4",
    name: "data quality officer view — y-axis alarm chart",
    prompt: "A chart where the y-axis shows alarms so the DQ officer can spot drift per metric.",
    tags: [{ key: "stax", value: "amygdala - mobile" }],
    status: "TODO",
    blockedBy: "Waiting for Ryan to grant metric access",
  },
  {
    id: "t5",
    name: "user should be able to filter todos for claimant",
    tags: [{ key: "primestage", value: "dside" }],
    status: "TODO",
  },
  {
    id: "t6",
    name: "user can mark items \"won't do\" or \"not needed\"",
    tags: [{ key: "primestage", value: "dside" }],
    status: "TODO",
    blockedUntil: "Jul 16",
  },
  {
    id: "t7",
    name: "change sf6 max threshold for jtf",
    prompt: "Bump the sf6 ceiling — current max trips false alarms on Vessel Call 12.",
    tags: [{ key: "stax", value: "jtf" }],
    status: "TODO",
  },
  {
    id: "t8",
    name: "get Ryan's email and find the range in time for 1-1 Vessel Call",
    tags: [{ key: "stax", value: "jtf" }],
    status: "TODO",
    blockedBy: "Waiting for Ryan's email",
    blockedUntil: "Jul 15",
  },
];

// The one shared blocked/eligible predicate (design: pure, defined once).
const isBlocked = (it: TriageItem) => !!it.blockedBy || !!it.blockedUntil || !!(it.deps && it.deps.length);
const isEligible = (it: TriageItem) => !it.claimedBy && !isBlocked(it) && it.status !== "DONE";

// Workflow DAG — the manual todo→doing→done flow, current stage focused,
// click a node to move the item ("DAG option").
const STAGES = ["TODO", "DOING", "DONE"] as const;
const DAG_NODES = STAGES.map((s) => ({ id: s, data: s }));
const DAG_EDGES = [
  { source: "TODO", target: "DOING" },
  { source: "DOING", target: "DONE" },
];

const CategoricalTriageBench: Component = () => {
  const [items, setItems] = createSignal<TriageItem[]>(SEED);
  const [selectedId, setSelectedId] = createSignal<string>(SEED[0].id);
  const selected = createMemo(() => items().find((it) => it.id === selectedId()));

  const counts = createMemo(() => {
    const all = items();
    return {
      total: all.length,
      claimed: all.filter((it) => !!it.claimedBy).length,
      blockedPerson: all.filter((it) => !!it.blockedBy).length,
      blockedSnooze: all.filter((it) => !!it.blockedUntil).length,
      blockedDependency: all.filter((it) => !!(it.deps && it.deps.length)).length,
      eligible: all.filter(isEligible).length,
    };
  });

  const setStage = (id: string, stage: TriageItem["status"]) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status: stage } : it)));

  return (
    <div class="component-section component-section--full">
      <ThreePanelLayout
        height="78vh"
        topBar={
          <SpreadRow>
            <SectionTitle>Categorical Triage</SectionTitle>
            <CountChip count={counts().eligible} label="to triage" active={counts().eligible > 0} />
          </SpreadRow>
        }
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
          <Show when={selected()} fallback={<InfoPanel title="Triage">Select a card.</InfoPanel>}>
            {(it) => (
              <ContentStack>
                {/* Title bar: name + stage chip + claim/blockage facts */}
                <SpreadRow>
                  <SectionTitle>{it().name}</SectionTitle>
                  <StatusChip
                    status={it().status}
                    options={[...STAGES]}
                    title={it().name}
                    highlight={it().status === "DOING"}
                    onChange={(s) => setStage(it().id, s as TriageItem["status"])}
                  />
                </SpreadRow>

                <Show when={it().prompt}>
                  <InfoPanel title="Prompt">{it().prompt}</InfoPanel>
                </Show>

                {/* Workflow DAG — click a stage to move the item */}
                <InfoPanel title="Workflow">
                  <div style={{ height: "140px" }}>
                    <DagChart
                      nodes={DAG_NODES}
                      edges={DAG_EDGES}
                      direction="horizontal"
                      focusedNodeId={it().status}
                      interactive={false}
                      onNodeClick={(id) => setStage(it().id, id as TriageItem["status"])}
                      nodeSize={() => [96, 44]}
                      renderNode={(node, state) => (
                        <div
                          style={{
                            width: "96px",
                            height: "44px",
                            display: "flex",
                            "align-items": "center",
                            "justify-content": "center",
                            border: `1px solid ${state.kind === "focused" ? "var(--sui-warning)" : "var(--sui-border)"}`,
                            "border-radius": "4px",
                            color: state.kind === "focused" ? "var(--sui-warning)" : "var(--sui-text-secondary)",
                            background: "var(--sui-bg-elevated)",
                            "font-family": "var(--sui-font-mono)",
                            "font-size": "12px",
                            cursor: "pointer",
                          }}
                        >
                          {node.data as string}
                        </div>
                      )}
                    />
                  </div>
                </InfoPanel>

                {/* Why it isn't moving (blockage facts, when present) */}
                <Show when={it().claimedBy || isBlocked(it())}>
                  <InfoPanel title="Blockages">
                    <TightStack>
                      <Show when={it().claimedBy}>
                        <span>Claimed by {it().claimedBy}</span>
                      </Show>
                      <Show when={it().blockedBy}>
                        <span>⏸ {it().blockedBy}</span>
                      </Show>
                      <Show when={it().blockedUntil}>
                        <span>⏰ Snoozed until {it().blockedUntil}</span>
                      </Show>
                      <For each={it().deps ?? []}>
                        {(dep) => <span>⛓ Depends on: "{dep}"</span>}
                      </For>
                    </TightStack>
                  </InfoPanel>
                </Show>
              </ContentStack>
            )}
          </Show>
        }
        rightPanel={
          <TightStack>
            <SectionTitle>Counts</SectionTitle>
            <CountChip count={counts().total} label="total" />
            <CountChip count={counts().claimed} label="claimed" />
            <CountChip count={counts().blockedPerson} label="blocked · person" />
            <CountChip count={counts().blockedSnooze} label="blocked · snooze" />
            <CountChip count={counts().blockedDependency} label="blocked · dependency" />
            <CountChip count={counts().eligible} label="eligible" active={counts().eligible > 0} />
          </TightStack>
        }
      />
    </div>
  );
};

export default CategoricalTriageBench;
