// Workshop — Split Queue as a THREE-section progression (ruled 2026-07-22).
// The control shows a work item's lifecycle as three ALWAYS-present sections
// stacked into one full-height bar:
//   • TERMINAL-HAPPY  (top)    — done, good outcome
//   • TERMINAL-UNHAPPY (middle) — done, bad outcome
//   • TRANSIENT       (bottom) — still in flight
// Every section is displayed at all times with its count; a 0-count section
// still shows its header + count and a "No <name>" line. Each section flex-grows
// by its count so the bar reads as a live progression, and the bar fills the
// full vertical area available. Framed here as a compliance-review queue.
import { type Component, type JSX, createSignal, createMemo, For, Show } from "solid-js";
import { SegmentedControl } from "../../../src/components/SegmentedControl";
import {
  SectionTitle,
  SubsectionTitle,
  MutedBody,
  EllipsizedTitle,
  FadedNowrapSublabel,
} from "../../../src/components/Text";
import { NarrowStack, SpreadRow, ClusterRow } from "../../../src/components/Layout";
import { toneWrap } from "../../../src/components/Table/fields";

type QState = "happy" | "unhappy" | "transient";

interface QueueItem {
  id: string;
  vessel: string;
  asset: string;
  at: string;
  state: QState;
}

const item = (
  id: string,
  vessel: string,
  asset: string,
  at: string,
  state: QState,
): QueueItem => ({ id, vessel, asset, at, state });

// One shared pool spanning all three states so scenarios slice believable data.
const POOL: QueueItem[] = [
  item("vc-01", "Ever Steadfast", "BE-104", "2026-06-10 21:15", "happy"),
  item("vc-03", "Coral Dawn", "BE-112", "2026-06-12 07:00", "happy"),
  item("vc-06", "Ever Resolute", "BE-215", "2026-06-15 05:20", "happy"),
  item("vc-08", "Northern Crane", "BE-118", "2026-06-17 02:40", "happy"),
  item("vc-02", "Pacific Meridian", "BE-207", "2026-06-11 04:30", "unhappy"),
  item("vc-04", "Harbor Vigilant", "BE-104", "2026-06-13 15:10", "unhappy"),
  item("vc-05", "Golden Horizon", "BE-309", "2026-06-14 23:45", "unhappy"),
  item("vc-07", "Iron Halcyon", "BE-221", "2026-06-16 11:05", "transient"),
  item("vc-09", "Silver Marlin", "BE-303", "2026-06-18 19:55", "transient"),
  item("vc-10", "Blue Sentinel", "BE-142", "2026-06-19 08:30", "transient"),
  item("vc-11", "Cape Ranger", "BE-256", "2026-06-20 13:12", "transient"),
  item("vc-12", "Tide Warden", "BE-190", "2026-06-21 22:48", "transient"),
];

const withState = (s: QState) => (i: QueueItem): QueueItem => ({ ...i, state: s });

// Each scenario is a set of items; the bar buckets them by state. These are the
// states worth eyeballing: empty (all "No <name>"), terminal-only, single-verdict,
// typical mix, and a transient-heavy backlog.
const SCENARIOS: Record<string, QueueItem[]> = {
  none: [],
  recent: POOL.filter((i) => i.state !== "transient").slice(0, 4),
  resolvedNc: POOL.filter((i) => i.state === "unhappy"),
  mix: POOL,
  backlog: [
    ...POOL.filter((i) => i.state === "happy").slice(0, 1),
    ...POOL.filter((i) => i.state === "unhappy").slice(0, 1),
    ...POOL.map(withState("transient")).slice(0, 10),
  ],
};

const SCENARIO_OPTIONS = [
  { value: "none", label: "No data" },
  { value: "recent", label: "Just recent" },
  { value: "resolvedNc", label: "Resolved non-compliant" },
  { value: "mix", label: "Full mix" },
  { value: "backlog", label: "Large backlog" },
];

// Section definitions, top → bottom. `role` drives the toned chrome; `title` is
// the header label; `empty` is the "No <name>" line shown at count 0.
interface SectionDef {
  role: QState;
  title: string;
  empty: string;
  tone: "success" | "danger" | "accent";
}
const SECTIONS: SectionDef[] = [
  { role: "happy", title: "Compliant", empty: "No compliant calls", tone: "success" },
  { role: "unhappy", title: "Non-compliant", empty: "No non-compliant calls", tone: "danger" },
  { role: "transient", title: "In review", empty: "No calls in review", tone: "accent" },
];

const ItemRow = (i: QueueItem): JSX.Element => (
  <div style={{ padding: "6px 12px", "border-top": "1px solid var(--sui-border-subtle, rgba(127,127,127,0.15))" }}>
    <SpreadRow>
      <NarrowStack>
        <EllipsizedTitle>{i.vessel}</EllipsizedTitle>
        <FadedNowrapSublabel>{`${i.asset} · ${i.at}`}</FadedNowrapSublabel>
      </NarrowStack>
    </SpreadRow>
  </div>
);

const SplitQueueBench: Component = () => {
  const [scenario, setScenario] = createSignal("mix");
  const items = createMemo(() => SCENARIOS[scenario()]);
  const inState = (role: QState) => items().filter((i) => i.state === role);

  return (
    <div class="component-section component-section--full" style={{ display: "flex", "flex-direction": "column", height: "calc(100vh - 200px)" }}>
      <SectionTitle>Split Queue</SectionTitle>
      <MutedBody>
        Three always-present sections as one full-height progression bar —
        terminal-happy (top), terminal-unhappy (middle), transient (bottom). Each
        keeps its count and a "No &lt;name&gt;" line when empty, and grows by its
        count so the bar reads as a live distribution.
      </MutedBody>

      <ClusterRow>
        <SubsectionTitle>Scenario</SubsectionTitle>
        <SegmentedControl
          options={SCENARIO_OPTIONS}
          value={scenario()}
          onValueChange={setScenario}
        />
      </ClusterRow>

      <div style={{ "max-width": "460px", flex: "1 1 auto", "min-height": "0", "margin-top": "12px" }}>
        <div class="prog-bar">
          <For each={SECTIONS}>
            {(s) => {
              const rows = createMemo(() => inState(s.role));
              const count = () => rows().length;
              return (
                <div
                  class={`prog-bar__section prog-bar__section--${s.role}`}
                  style={{ "flex-grow": Math.max(count(), 0.5) }}
                >
                  <div class="prog-bar__header">
                    <span>{s.title}</span>
                    <span class="prog-bar__count">
                      {toneWrap(count() > 0 ? s.tone : "muted", String(count()))}
                    </span>
                  </div>
                  <div class="prog-bar__body">
                    <Show
                      when={count() > 0}
                      fallback={<div class="prog-bar__empty">{s.empty}</div>}
                    >
                      <For each={rows()}>{(i) => ItemRow(i)}</For>
                    </Show>
                  </div>
                </div>
              );
            }}
          </For>
        </div>
      </div>
    </div>
  );
};

export const meta = { label: "Split Queue" };

export default SplitQueueBench;
