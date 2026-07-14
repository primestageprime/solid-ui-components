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
import { Component, For, Match, Show, Switch, createEffect, createMemo, createSignal, onCleanup, onMount } from "solid-js";
import { SectionTitle, TextBody, TextLabel, TextSublabel, TextTitle } from "../../../src/components/Text";
import { ClusterRow, FillColumn, ScrollColumn, SpreadRow, TightStack } from "../../../src/components/Layout";
import { ThreePanelLayout } from "../../../src/components/ThreePanelLayout";
import { InfoPanel } from "../../../src/components/Panel";
import { InteractiveCard } from "../../../src/components/Surface";
import { StatusChip, TagPill } from "../../../src/components/Badge";
import { Divider } from "../../../src/components/Divider";
import { Icon, type IconName } from "../../../src/components/Icon";
import { HotkeyButton, isEditableTarget } from "../../../src/components/HotkeyButton";
import { QuickFilter } from "../../../src/components/QuickFilter";
import { SmallButton, SmallDangerButton } from "../../../src/components/Button";
import { ThemedInput } from "../../../src/components/Inputs";
import { DatePicker } from "../../../src/components/DatePicker";
import { DigitRoller } from "../../../src/components/DataDisplay";
import {
  choreograph,
  collapse,
  commit,
  expand,
  glowIn,
  slideDown,
  step,
} from "../../../src/internal/animation/choreography";

export const meta = { label: "Categorical Triage" };

// Seed queue — shapes mirror dside's todo projection + the design's Work
// blockage columns. Multi-status is the point: TODO/DOING/DONE plus the
// blockage categories drive the whole triage flow.
type TriageItem = {
  id: string;
  name: string;
  prompt?: string;
  status: "TODO" | "DOING" | "DONE";
  creator: string;
  createdAt: number; // epoch ms
  claimedBy?: string;
  // Released to the agent pipeline. Mirrors dside's EXISTING data model:
  // StatementTag::Agentic routes the Statement to the workflow's agent-owned
  // work stage (persona_hint="architect", OwnerKind::Agent) — triage [a] is
  // just the human grant that applies that tag.
  agentic?: boolean;
  blockedBy?: string; // convention: starts with the person ("Ryan — …")
  blockedUntil?: number; // epoch ms
  deps?: string[];
};

const NOW = Date.now();
const HOUR = 3_600_000;

/** First word of a blocked-by string — the WHO (convention: person-first). */
const firstWord = (s: string) => s.split(/[\s—:-]+/)[0] ?? s;

/** Compact humanized span: "2d4h", "1d2h", "45m". */
const span = (ms: number) => {
  if (ms <= 0) return "now";
  const h = Math.floor(ms / HOUR);
  const d = Math.floor(h / 24);
  const m = Math.floor((ms % HOUR) / 60_000);
  if (d > 0) return h % 24 ? `${d}d${h % 24}h` : `${d}d`;
  if (h > 0) return m ? `${h}h${m}m` : `${h}h`;
  return `${m}m`;
};
/** Time REMAINING until an epoch-ms deadline. */
const remaining = (until: number) => span(until - NOW);
/** Time ELAPSED since an epoch-ms timestamp. */
const ago = (ts: number) => span(NOW - ts);
/** Compact absolute stamp: "Jul 12 08:14". */
const stamp = (ts: number) =>
  new Date(ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

const SEED: TriageItem[] = [
  { id: "t1", name: "need category for salaries", prompt: "Salaries land uncategorized in thorcasting. Add a category so the forecast splits them out.", status: "TODO", creator: "Ryan", createdAt: NOW - (2 * 24 + 3) * HOUR },
  { id: "t2", name: "need category for payroll", prompt: "Same treatment as salaries — payroll needs its own category.", status: "TODO", creator: "Ryan", createdAt: NOW - (2 * 24 + 2) * HOUR, deps: ["need category for salaries"] },
  { id: "t3", name: '"typical" derivation should clearly display how we got to these numbers', status: "DOING", creator: "Peter", createdAt: NOW - 5 * 24 * HOUR, claimedBy: "Adlai" },
  { id: "t4", name: "data quality officer view — y-axis alarm chart", status: "TODO", creator: "Adlai", createdAt: NOW - 26 * HOUR, blockedBy: "Ryan — grant metric access" },
  { id: "t5", name: "user should be able to filter todos for claimant", status: "TODO", creator: "Peter", createdAt: NOW - 4 * HOUR },
  { id: "t6", name: "user can mark items \"won't do\" or \"not needed\"", status: "TODO", creator: "Peter", createdAt: NOW - 3 * 24 * HOUR, blockedUntil: NOW + (2 * 24 + 4) * HOUR },
  { id: "t7", name: "change sf6 max threshold for jtf", prompt: "Bump the sf6 ceiling — current max trips false alarms on Vessel Call 12.", status: "TODO", creator: "Ryan", createdAt: NOW - 45 * 60_000 },
  { id: "t8", name: "get Ryan's email and find the range in time for 1-1 Vessel Call", status: "TODO", creator: "Peter", createdAt: NOW - 30 * HOUR, blockedBy: "Ryan — email the vessel-call range", blockedUntil: NOW + 26 * HOUR },
  // 27 more unresolved items (30 unresolved total) so the queue demonstrates
  // internal scrolling with realistic volume.
  ...[
    "surface forecast confidence bands on the expense chart",
    "add keyboard shortcut cheatsheet overlay",
    "export triage decisions to CSV",
    "dispatcher should retry failed decompositions",
    "show claimant avatar in the queue rail",
    "thorcasting: split contractor costs from salaries",
    "add snooze presets (1d, 3d, 1w)",
    "highlight items older than a week",
    "jtf: reconcile alarm thresholds with vessel-call 12 data",
    "batch-block items by the same person",
    "rhinotools: census view for extract worker fleet",
    "show dependency chain depth in the rail",
    "unsnooze should restore prior queue position",
    "add creator filter to the triage view",
    "persist triage session across reloads",
    "dside: link decomposition parent from item detail",
    "warn when blocking on someone with 3+ open blocks",
    "add won't-do terminal status with reason",
    "surface item age in the unresolved rail",
    "jtf: sf6 alarm digest email",
    "group snoozed items by wake day",
    "thorcasting: typical derivation drill-down",
    "add undo for the last categorize action",
    "show total cycle time per item after done",
    "rhinotools: throughput chart on extract dashboard",
    "auto-suggest category from prompt keywords",
    "dside: species flag rollout checklist",
  ].map((name, i) => ({
    id: `x${i + 1}`,
    name,
    status: "TODO" as const,
    creator: ["Peter", "Ryan", "Adlai"][i % 3],
    createdAt: NOW - (i * 5 + 2) * HOUR,
    ...(i % 4 === 0 ? { prompt: `Detail for "${name}" — captured during triage planning.` } : {}),
  })),
];

/**
 * Count lozenge whose digits roll like an odometer on change — the
 * EXISTING DigitRoller (DataDisplay: mod-10 strips, direction-aware:
 * increases roll up, decreases roll down). Self-animating on value
 * change: the commit flips the count, the component owns the motion —
 * no choreography step needed. Supersedes FlashCount for rail counts.
 */
const RollingCount: Component<{ count: number }> = (props) => {
  const [pair, setPair] = createSignal({ prev: null as string | null, cur: String(props.count) });
  createEffect<string>((prev) => {
    const next = String(props.count);
    if (prev !== undefined && next !== prev) setPair({ prev, cur: next });
    return next;
  });
  return (
    <span class="sui-tag-pill">
      <DigitRoller value={pair().cur} previousValue={pair().prev} animate duration={300} stagger={40} />
    </span>
  );
};

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
      { key: "person", label: "BLOCKED · PERSON", icon: "user" as IconName, mode: "children" as const, childData: (it: TriageItem) => firstWord(it.blockedBy ?? ""), items: all.filter((it) => !!it.blockedBy) },
      { key: "snooze", label: "BLOCKED · SNOOZE", icon: "clock" as IconName, mode: "children" as const, childData: (it: TriageItem) => remaining(it.blockedUntil ?? 0), items: all.filter((it) => !!it.blockedUntil) },
      { key: "dep", label: "BLOCKED · DEPENDENCY", icon: "dependency" as IconName, mode: "count" as const, childData: () => "", items: all.filter((it) => !!(it.deps && it.deps.length)) },
      { key: "claimed", label: "CLAIMED", icon: "user" as IconName, mode: "count" as const, childData: () => "", items: all.filter((it) => !!it.claimedBy && it.status !== "DONE") },
      // Handed to the agent pipeline (dside StatementTag::Agentic) — the
      // dispatcher claims from here; nothing for the human to do but watch,
      // so it sits last and counts only.
      { key: "agentic", label: "AGENTIC", icon: "agent" as IconName, mode: "count" as const, childData: () => "", items: all.filter((it) => !!it.agentic && it.status !== "DONE") },
    ];
  });

  // The left rail shows only UNRESOLVED items — anything that appears in a
  // right-bar category (blocked, snoozed, dependent, claimed) leaves the
  // queue: one item, one home, no double representation.
  const unresolved = createMemo(() =>
    items().filter(
      (it) =>
        !it.blockedBy &&
        !it.blockedUntil &&
        !(it.deps && it.deps.length) &&
        !it.claimedBy &&
        !it.agentic &&
        it.status !== "DONE",
    ),
  );
  // Arrow keys walk the UNRESOLVED queue; selection CLAMPS at the top and
  // bottom (no wrap — the edges are felt, matching list convention). If the
  // selection lives in the right rail, arrows re-enter the queue at the top.
  const move = (delta: number) => {
    const q = unresolved();
    if (!q.length) return;
    const i = q.findIndex((it) => it.id === selectedId());
    const next = i < 0 ? 0 : Math.min(q.length - 1, Math.max(0, i + delta));
    setSelectedId(q[next].id);
  };
  onMount(() => {
    const onKey = (e: KeyboardEvent) => {
      // Arrows + emacs-style C-n / C-p walk the queue. Defer to text inputs
      // (e.g. the dependency picker's QuickFilter) like HotkeyButton does.
      if (isEditableTarget(e.target)) return;
      const down = e.key === "ArrowDown" || (e.ctrlKey && e.key === "n");
      const up = e.key === "ArrowUp" || (e.ctrlKey && e.key === "p");
      if (down) { e.preventDefault(); move(1); }
      else if (up) { e.preventDefault(); move(-1); }
    };
    window.addEventListener("keydown", onKey);
    onCleanup(() => window.removeEventListener("keydown", onKey));
  });
  // Which right-rail category a categorize patch sends the item to —
  // drives the choreography's expand/rollUp targets.
  const railKeyFor = (patch: Partial<TriageItem>) =>
    patch.blockedBy ? "person"
    : patch.blockedUntil ? "snooze"
    : patch.deps ? "dep"
    : patch.claimedBy ? "claimed"
    : patch.agentic ? "agentic"
    : null;

  // Categorize an item, then advance to the next unresolved one — as ONE
  // choreographed gesture (the composable-animation dream, first wired
  // here explicitly; later this becomes the ambient list default):
  //   1. collapse the leaving card + the detail
  //   COMMIT — state flips here (item leaves queue, selection advances)
  //   2. expand the item's new rail row (if that rail shows children)
  //      and roll up the category count
  //   3. glow the selection onto the new queue item
  //   4. slide the new detail down into place
  // The candidate is computed BEFORE the patch: afterwards the item has
  // left the queue. Missing handles (count-only rails, empty queue) skip.
  const animateCategorize = (id: string, patch: Partial<TriageItem>) => {
    const q = unresolved();
    const i = q.findIndex((it) => it.id === id);
    const next = q[i + 1] ?? q[i - 1];
    const rail = railKeyFor(patch);
    void choreograph([
      step(collapse(`unresolved:${id}`), collapse("detail")),
      commit(() => {
        setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
        if (selectedId() === id && next) setSelectedId(next.id);
        setMode(null);
      }),
      // No count effect here: RollingCount self-animates its changed digits
      // on the commit (digital-clock roll) — motion owned by the component.
      step(expand(`rail:${rail}:${id}`)),
      step(glowIn(next ? `unresolved:${next.id}` : "", ".surface")),
      step(slideDown("detail")),
    ]);
  };
  const patchSelected = (patch: Partial<TriageItem>) =>
    animateCategorize(selectedId(), patch);
  // Restore actions for already-categorized items — the bottom row swaps
  // contextually: uncategorizing returns the item to Unresolved and keeps it
  // SELECTED (no advance — you navigated here deliberately).
  const patchStay = (patch: Partial<TriageItem>) =>
    setItems((prev) => prev.map((it) => (it.id === selectedId() ? { ...it, ...patch } : it)));
  const RESTORE = [
    { when: (it: TriageItem) => !!it.blockedBy, hotkey: "u", label: "unblock", apply: () => patchStay({ blockedBy: undefined }) },
    { when: (it: TriageItem) => !!it.blockedUntil, hotkey: "n", label: "unsnooze", apply: () => patchStay({ blockedUntil: undefined }) },
    { when: (it: TriageItem) => !!(it.deps && it.deps.length), hotkey: "d", label: "undepend", apply: () => patchStay({ deps: undefined }) },
    { when: (it: TriageItem) => !!it.claimedBy, hotkey: "r", label: "release", apply: () => patchStay({ claimedBy: undefined }) },
    // Withdraw the agentic grant — takes the item back human-side. (In dside
    // terms: if a worker holds a lease, the dispatcher stops renewing it.)
    { when: (it: TriageItem) => !!it.agentic, hotkey: "w", label: "withdraw", apply: () => patchStay({ agentic: undefined }) },
  ];
  const isCategorized = (it: TriageItem) => RESTORE.some((a) => a.when(it));

  // Center INPUT MODES — block/snooze/depends open an input surface instead
  // of patching directly (claim and later stay one-keystroke). Nothing
  // mutates until the mode commits; committing categorizes the item (it
  // moves to the right rail) and advances selection.
  const [mode, setMode] = createSignal<{ kind: "deps" | "block" | "snooze"; id: string } | null>(null);
  const modeTarget = createMemo(() => {
    const m = mode();
    return m ? items().find((it) => it.id === m.id) : undefined;
  });
  const [pending, setPending] = createSignal<string[]>([]); // deps picks
  const [blockText, setBlockText] = createSignal(""); // block reason
  const [customDate, setCustomDate] = createSignal(""); // snooze ISO date
  const candidates = createMemo(() => {
    const id = mode()?.id;
    const picked = new Set(pending());
    return items().filter((it) => it.id !== id && !picked.has(it.name));
  });
  /** Commit a categorization for the mode's target: same choreographed
   *  gesture (setMode(null) rides the choreography's commit). */
  const commitMode = (patch: Partial<TriageItem>) => {
    const id = mode()?.id;
    if (!id) return;
    animateCategorize(id, patch);
  };
  const finishDeps = () => (pending().length ? commitMode({ deps: pending() }) : setMode(null));
  const finishBlock = () => {
    const reason = blockText().trim();
    if (reason) commitMode({ blockedBy: reason });
  };
  const snoozeDays = (days: number) => commitMode({ blockedUntil: NOW + days * 24 * HOUR });
  const finishSnooze = () => {
    const iso = customDate();
    if (iso) commitMode({ blockedUntil: new Date(`${iso}T09:00`).getTime() });
  };

  // Each action carries its thematic glyph — the same icon the right rail
  // uses for the category it sends the item to.
  const CATEGORIZE: { hotkey: string; label: string; icon: IconName; apply: () => void }[] = [
    { hotkey: "c", label: "claim", icon: "user", apply: () => patchSelected({ claimedBy: "Peter" }) },
    // Release for agentic work: one keystroke, like claim — the tag is the
    // whole gesture (the agent pipeline takes it from there).
    { hotkey: "a", label: "agentic", icon: "agent", apply: () => patchSelected({ agentic: true }) },
    {
      hotkey: "b",
      label: "block",
      icon: "pause" as IconName,
      apply: () => {
        setBlockText("");
        setMode({ kind: "block", id: selectedId() });
      },
    },
    {
      hotkey: "s",
      label: "snooze",
      icon: "clock" as IconName,
      apply: () => {
        setCustomDate("");
        setMode({ kind: "snooze", id: selectedId() });
      },
    },
    {
      hotkey: "d",
      label: "depends",
      icon: "dependency" as IconName,
      apply: () => {
        setPending(selected()?.deps ?? []);
        setMode({ kind: "deps", id: selectedId() });
      },
    },
    // No "later" action: deferring is just NOT categorizing — arrow-down
    // skips without deciding, and priority ORDER belongs to the todo view's
    // drag-sort, not to triage (Peter, 2026-07-14).
  ];

  return (
    // Application mode: the bench fills the gallery content pane to the
    // bottom of the viewport; panels scroll internally (no document scroll).
    <div class="component-section component-section--app">
      <ThreePanelLayout
        topBar={<SectionTitle>Categorical Triage — refining: queue done</SectionTitle>}
        leftPanelWidth="380px"
        rightPanelWidth="300px"
        leftPanel={
          // Title pinned, cards scroll — same FillColumn/ScrollColumn pattern
          // as the center's pinned action row.
          <FillColumn>
            {/* Rails generally get a title; the count follows it (flashes on
                change). A Divider separates the pinned header from the list. */}
            <SpreadRow>
              <SectionTitle>Unresolved</SectionTitle>
              <FlashCount count={unresolved().length} />
            </SpreadRow>
            <Divider />
            <ScrollColumn>
              <TightStack>
                <For each={unresolved()}>
                  {(it) => (
                    // data-anim: choreography handle — collapse on leave,
                    // glowIn (inner .surface) when selection arrives.
                    <div data-anim={`unresolved:${it.id}`}>
                      <InteractiveCard active={it.id === selectedId()} onClick={() => setSelectedId(it.id)}>
                        <SpreadRow>
                          <TextTitle>{it.name}</TextTitle>
                          <StatusChip status={it.status} options={["TODO", "DOING", "DONE"]} title={it.name} highlight={it.status === "DOING"} />
                        </SpreadRow>
                      </InteractiveCard>
                    </div>
                  )}
                </For>
              </TightStack>
            </ScrollColumn>
          </FillColumn>
        }
        centerPanel={
          // data-anim="detail": one handle over BOTH center states (detail
          // view and input-mode surface) so collapse/slideDown always land.
          <div data-anim="detail" style={{ height: "100%", "min-height": 0 }}>
          <Show
            when={!modeTarget()}
            fallback={
              <FillColumn>
                <SpreadRow>
                  <TextLabel>{modeTarget()!.name}</TextLabel>
                  <TextSublabel>
                    {mode()!.kind === "deps" ? "select dependencies" : mode()!.kind === "block" ? "block — on whom / what" : "snooze — until when"}
                  </TextSublabel>
                </SpreadRow>
                <Divider />
                <Switch>
                <Match when={mode()!.kind === "block"}>
                  {/* Block: a focused reason input (person-first convention);
                      Enter commits — the input has focus, so Enter beats f. */}
                  <ScrollColumn>
                    <InfoPanel title="Blocked on">
                      <TightStack>
                        <ThemedInput
                          ref={(el: HTMLInputElement) => queueMicrotask(() => el.focus())}
                          value={blockText()}
                          onInput={(e) => setBlockText(e.currentTarget.value)}
                          placeholder={'start with the person — "Ryan — grant access"'}
                          onKeyDown={(e) => e.key === "Enter" && finishBlock()}
                        />
                        <TextSublabel>press Enter to block</TextSublabel>
                      </TightStack>
                    </InfoPanel>
                  </ScrollColumn>
                  <InfoPanel title="Confirm">
                    <ClusterRow>
                      <HotkeyButton hotkey="f" onTrigger={finishBlock}>
                        finish
                      </HotkeyButton>
                    </ClusterRow>
                  </InfoPanel>
                </Match>
                <Match when={mode()!.kind === "snooze"}>
                  {/* Snooze: common presets one keypress away; a date picker
                      for the long tail. */}
                  <ScrollColumn>
                    <InfoPanel title="Common">
                      <ClusterRow>
                        <HotkeyButton hotkey="1" onTrigger={() => snoozeDays(1)}>
                          1 day
                        </HotkeyButton>
                        <HotkeyButton hotkey="3" onTrigger={() => snoozeDays(3)}>
                          3 days
                        </HotkeyButton>
                        <HotkeyButton hotkey="7" onTrigger={() => snoozeDays(7)}>
                          7 days
                        </HotkeyButton>
                      </ClusterRow>
                    </InfoPanel>
                    <InfoPanel title="Custom">
                      <TightStack>
                        <DatePicker value={customDate()} onChange={setCustomDate} />
                        <TextSublabel>wakes at 09:00 that day</TextSublabel>
                      </TightStack>
                    </InfoPanel>
                  </ScrollColumn>
                  <InfoPanel title="Confirm">
                    <ClusterRow>
                      <HotkeyButton hotkey="f" onTrigger={finishSnooze}>
                        finish
                      </HotkeyButton>
                    </ClusterRow>
                  </InfoPanel>
                </Match>
                <Match when={mode()!.kind === "deps"}>
                <ScrollColumn>
                  <InfoPanel title="Dependencies">
                    <Show
                      when={pending().length}
                      fallback={<TextSublabel>none yet — add from the list below</TextSublabel>}
                    >
                      <TightStack>
                        <For each={pending()}>
                          {(name) => (
                            <SpreadRow>
                              <TextBody>{name}</TextBody>
                              <SmallDangerButton onClick={() => setPending((p) => p.filter((n) => n !== name))}>
                                Remove Dependency
                              </SmallDangerButton>
                            </SpreadRow>
                          )}
                        </For>
                      </TightStack>
                    </Show>
                  </InfoPanel>
                  <InfoPanel title="All items">
                    <QuickFilter items={candidates()} extract={(it) => it.name} placeholder="filter items…">
                      {(filtered) => (
                        <TightStack>
                          <For each={filtered}>
                            {(cand) => (
                              <SpreadRow>
                                <TextBody>{cand.name}</TextBody>
                                <SmallButton onClick={() => setPending((p) => [...p, cand.name])}>
                                  Add Dependency
                                </SmallButton>
                              </SpreadRow>
                            )}
                          </For>
                        </TightStack>
                      )}
                    </QuickFilter>
                  </InfoPanel>
                </ScrollColumn>
                <InfoPanel title="Confirm">
                  <ClusterRow>
                    <HotkeyButton hotkey="f" onTrigger={finishDeps}>
                      finish
                    </HotkeyButton>
                  </ClusterRow>
                </InfoPanel>
                </Match>
                </Switch>
              </FillColumn>
            }
          >
          <Show when={selected()} fallback={<Placeholder label="Triage" hint="empty queue — triage complete" />}>
            {(it) => (
              // FillColumn + ScrollColumn: title fixed at top, detail scrolls
              // internally, Categorize pinned to the bottom — the action row
              // never drifts as the detail grows.
              <FillColumn>
                <SpreadRow>
                  <TextLabel>{it().name}</TextLabel>
                  <StatusChip status={it().status} options={["TODO", "DOING", "DONE"]} title={it().name} highlight={it().status === "DOING"} />
                </SpreadRow>
                {/* Provenance sub-line — canon: ownership left, timing right. */}
                <SpreadRow>
                  <TextSublabel>{it().creator}</TextSublabel>
                  <TextSublabel>created {stamp(it().createdAt)} ({ago(it().createdAt)} ago)</TextSublabel>
                </SpreadRow>
                <ScrollColumn>
                  <Show when={it().prompt}>
                    <InfoPanel title="Prompt">
                      <TextBody>{it().prompt}</TextBody>
                    </InfoPanel>
                  </Show>
                  <Show when={it().blockedBy || it().blockedUntil}>
                    <InfoPanel title="Blocked">
                      <TextBody>
                        <Icon name={it().blockedBy ? "user" : "clock"} variant="outline" size="xs" />{" "}
                        {it().blockedBy ?? "snoozed"}
                        {it().blockedUntil ? ` · until ${remaining(it().blockedUntil!)}` : ""}
                      </TextBody>
                    </InfoPanel>
                  </Show>
                  <Show when={it().deps?.length}>
                    <InfoPanel title="Depends on">
                      <TightStack>
                        <For each={it().deps}>
                          {(dep) => {
                            const target = () => items().find((x) => x.name === dep);
                            return (
                              <div
                                style={{ cursor: target() ? "pointer" : "default" }}
                                onClick={() => target() && setSelectedId(target()!.id)}
                              >
                                <TextSublabel>→ {dep}</TextSublabel>
                              </div>
                            );
                          }}
                        </For>
                      </TightStack>
                    </InfoPanel>
                  </Show>
                </ScrollColumn>
                <Show
                  when={isCategorized(it())}
                  fallback={
                    <InfoPanel title="Categorize">
                      <SpreadRow>
                        <For each={CATEGORIZE}>
                          {(a) => (
                            <HotkeyButton hotkey={a.hotkey} icon={a.icon} onTrigger={a.apply}>
                              {a.label}
                            </HotkeyButton>
                          )}
                        </For>
                      </SpreadRow>
                    </InfoPanel>
                  }
                >
                  <InfoPanel title="Restore">
                    <ClusterRow>
                      <For each={RESTORE.filter((a) => a.when(it()))}>
                        {(a) => (
                          <HotkeyButton hotkey={a.hotkey} onTrigger={a.apply}>
                            {a.label}
                          </HotkeyButton>
                        )}
                      </For>
                    </ClusterRow>
                  </InfoPanel>
                </Show>
              </FillColumn>
            )}
          </Show>
          </Show>
          </div>
        }
        rightPanel={
          <TightStack>
            <For each={categories()}>
              {(cat) => (
                <div>
                  <SpreadRow>
                    <TextLabel>{cat.label}</TextLabel>
                    <span data-anim={`count:${cat.key}`}>
                      <RollingCount count={cat.items.length} />
                    </span>
                  </SpreadRow>
                  <Show when={cat.mode === "children"}>
                    <TightStack>
                      <For each={cat.items}>
                        {(it) => (
                          <div
                            data-anim={`rail:${cat.key}:${it.id}`}
                            style={{ "padding-left": "1rem", cursor: "pointer", opacity: it.id === selectedId() ? 1 : 0.7 }}
                            onClick={() => setSelectedId(it.id)}
                          >
                            <SpreadRow>
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
