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
import { Component, For, Show, createEffect, createMemo, createSignal } from "solid-js";
import { SectionTitle, TextBody, TextLabel, TextSublabel, TextTitle } from "../../../src/components/Text";
import { FillColumn, ScrollColumn, SpreadRow, TightStack } from "../../../src/components/Layout";
import { ThreePanelLayout } from "../../../src/components/ThreePanelLayout";
import { InfoPanel } from "../../../src/components/Panel";
import { InteractiveCard } from "../../../src/components/Surface";
import { StatusChip, TagPill } from "../../../src/components/Badge";
import { Icon, type IconName } from "../../../src/components/Icon";
import { HotkeyButton } from "../../../src/components/HotkeyButton";

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
  blockedBy?: string; // convention: starts with the person ("Ryan — …")
  blockedUntil?: number; // epoch ms
  deps?: string[];
};

const NOW = Date.now();
const HOUR = 3_600_000;

/** First word of a blocked-by string — the WHO (convention: person-first). */
const firstWord = (s: string) => s.split(/[\s—:-]+/)[0] ?? s;

/** Humanized time REMAINING, compact: "2d4h", "26h" → "1d2h", "45m". */
const remaining = (until: number) => {
  const ms = until - NOW;
  if (ms <= 0) return "now";
  const h = Math.floor(ms / HOUR);
  const d = Math.floor(h / 24);
  const m = Math.floor((ms % HOUR) / 60_000);
  if (d > 0) return h % 24 ? `${d}d${h % 24}h` : `${d}d`;
  if (h > 0) return m ? `${h}h${m}m` : `${h}h`;
  return `${m}m`;
};

const SEED: TriageItem[] = [
  { id: "t1", name: "need category for salaries", prompt: "Salaries land uncategorized in thorcasting. Add a category so the forecast splits them out.", status: "TODO" },
  { id: "t2", name: "need category for payroll", prompt: "Same treatment as salaries — payroll needs its own category.", status: "TODO", deps: ["need category for salaries"] },
  { id: "t3", name: '"typical" derivation should clearly display how we got to these numbers', status: "DOING", claimedBy: "Adlai" },
  { id: "t4", name: "data quality officer view — y-axis alarm chart", status: "TODO", blockedBy: "Ryan — grant metric access" },
  { id: "t5", name: "user should be able to filter todos for claimant", status: "TODO" },
  { id: "t6", name: "user can mark items \"won't do\" or \"not needed\"", status: "TODO", blockedUntil: NOW + (2 * 24 + 4) * HOUR },
  { id: "t7", name: "change sf6 max threshold for jtf", prompt: "Bump the sf6 ceiling — current max trips false alarms on Vessel Call 12.", status: "TODO" },
  { id: "t8", name: "get Ryan's email and find the range in time for 1-1 Vessel Call", status: "TODO", blockedBy: "Ryan — email the vessel-call range", blockedUntil: NOW + 26 * HOUR },
];

/** De-emphasized count lozenge that briefly lights up when the value changes
 * (reuses TagPill's active state as the flash). */
const FlashCount: Component<{ count: number }> = (props) => {
  const [flash, setFlash] = createSignal(false);
  let prev: number | undefined;
  createEffect(() => {
    const n = props.count;
    if (prev !== undefined && n !== prev) {
      setFlash(true);
      setTimeout(() => setFlash(false), 700);
    }
    prev = n;
  });
  return <TagPill tag={{ label: String(props.count), active: flash() }} />;
};

const Placeholder: Component<{ label: string; hint: string }> = (props) => (
  <InfoPanel title={props.label}>
    <TextBody>{props.hint}</TextBody>
  </InfoPanel>
);

const CategoricalTriageBench: Component = () => {
  const [items, setItems] = createSignal<TriageItem[]>(SEED);
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
      { label: "BLOCKED · PERSON", icon: "user" as IconName, mode: "children" as const, childData: (it: TriageItem) => firstWord(it.blockedBy ?? ""), items: all.filter((it) => !!it.blockedBy) },
      { label: "BLOCKED · SNOOZE", icon: "clock" as IconName, mode: "children" as const, childData: (it: TriageItem) => remaining(it.blockedUntil ?? 0), items: all.filter((it) => !!it.blockedUntil) },
      { label: "BLOCKED · DEPENDENCY", icon: "external-link" as IconName, mode: "count" as const, childData: () => "", items: all.filter((it) => !!(it.deps && it.deps.length)) },
      { label: "CLAIMED", icon: "user" as IconName, mode: "count" as const, childData: () => "", items: all.filter((it) => !!it.claimedBy && it.status !== "DONE") },
    ];
  });

  // Categorize the SELECTED item, then advance to the next — the center's
  // whole activity. Keyboard-first: HotkeyButton arms window-level keys.
  const advance = () => {
    const all = items();
    const i = all.findIndex((it) => it.id === selectedId());
    setSelectedId(all[(i + 1) % all.length].id);
  };
  const patchSelected = (patch: Partial<TriageItem>) => {
    setItems((prev) => prev.map((it) => (it.id === selectedId() ? { ...it, ...patch } : it)));
    advance();
  };
  const CATEGORIZE = [
    { hotkey: "c", label: "claim", apply: () => patchSelected({ claimedBy: "Peter" }) },
    { hotkey: "b", label: "block", apply: () => patchSelected({ blockedBy: "Ryan — follow up" }) },
    { hotkey: "s", label: "snooze", apply: () => patchSelected({ blockedUntil: NOW + 26 * HOUR }) },
    { hotkey: "d", label: "depends", apply: () => patchSelected({ deps: ["need category for salaries"] }) },
    {
      hotkey: "l",
      label: "later",
      apply: () =>
        setItems((prev) => {
          const i = prev.findIndex((it) => it.id === selectedId());
          if (i < 0) return prev;
          const next = [...prev];
          const [moved] = next.splice(i, 1);
          next.push(moved);
          setSelectedId(next[Math.min(i, next.length - 1)].id);
          return next;
        }),
    },
  ];

  return (
    <div class="component-section component-section--full">
      <ThreePanelLayout
        height="78vh"
        topBar={<SectionTitle>Categorical Triage — refining: queue done</SectionTitle>}
        leftPanelWidth="380px"
        rightPanelWidth="300px"
        leftPanel={
          <TightStack>
            <For each={items()}>
              {(it) => (
                <InteractiveCard active={it.id === selectedId()} onClick={() => setSelectedId(it.id)}>
                  <SpreadRow gap="sm">
                    <TextTitle>{it.name}</TextTitle>
                    <StatusChip status={it.status} options={["TODO", "DOING", "DONE"]} title={it.name} highlight={it.status === "DOING"} />
                  </SpreadRow>
                </InteractiveCard>
              )}
            </For>
          </TightStack>
        }
        centerPanel={
          <Show when={selected()} fallback={<Placeholder label="Triage" hint="empty queue — triage complete" />}>
            {(it) => (
              // FillColumn + ScrollColumn: title fixed at top, detail scrolls
              // internally, Categorize pinned to the bottom — the action row
              // never drifts as the detail grows.
              <FillColumn>
                <SpreadRow gap="sm">
                  <TextLabel>{it().name}</TextLabel>
                  <StatusChip status={it().status} options={["TODO", "DOING", "DONE"]} title={it().name} highlight={it().status === "DOING"} />
                </SpreadRow>
                <ScrollColumn>
                  <Show when={it().prompt}>
                    <InfoPanel title="Prompt">
                      <TextBody>{it().prompt}</TextBody>
                    </InfoPanel>
                  </Show>
                </ScrollColumn>
                <InfoPanel title="Categorize">
                  <SpreadRow gap="sm">
                    <For each={CATEGORIZE}>
                      {(a) => (
                        <HotkeyButton hotkey={a.hotkey} onTrigger={a.apply}>
                          {a.label}
                        </HotkeyButton>
                      )}
                    </For>
                  </SpreadRow>
                </InfoPanel>
              </FillColumn>
            )}
          </Show>
        }
        rightPanel={
          <TightStack>
            <For each={categories()}>
              {(cat) => (
                <div>
                  <SpreadRow gap="sm">
                    <TextLabel>{cat.label}</TextLabel>
                    <FlashCount count={cat.items.length} />
                  </SpreadRow>
                  <Show when={cat.mode === "children"}>
                    <TightStack>
                      <For each={cat.items}>
                        {(it) => (
                          <div
                            style={{ "padding-left": "1rem", cursor: "pointer", opacity: it.id === selectedId() ? 1 : 0.7 }}
                            onClick={() => setSelectedId(it.id)}
                          >
                            <SpreadRow gap="sm">
                              <TextSublabel>{it.name}</TextSublabel>
                              <TextSublabel style={{ "white-space": "nowrap" }}>
                                <Icon name={cat.icon} variant="outline" size="xs" /> {cat.childData(it)}
                              </TextSublabel>
                            </SpreadRow>
                          </div>
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
