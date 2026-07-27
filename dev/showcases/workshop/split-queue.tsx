// Workshop — BucketQueue driven by fortnight vessel-call compliance.
// Exercises the promoted SUI component across realistic fortnight distributions.
// The bucketOf derivation here is the one the live fortnight route uses: a call
// with any unevaluated metric is In review; otherwise Compliant iff both pass,
// else Non-compliant.
import { type Component, type JSX, createSignal, createMemo } from "solid-js";
import { BucketQueue, type Bucket } from "../../../src/components/BucketQueue";
import { SegmentedControl } from "../../../src/components/SegmentedControl";
import {
  SectionTitle,
  SubsectionTitle,
  MutedBody,
  EllipsizedTitle,
  FadedNowrapSublabel,
} from "../../../src/components/Text";
import { NarrowStack, SpreadRow, ClusterRow } from "../../../src/components/Layout";

interface Call {
  vessel_call_id: string;
  vessel_name: string;
  asset_id: string;
  connected_at: string;
  nox_compliant: boolean | null;
  rog_compliant: boolean | null;
}

// THE derivation the fortnight route uses.
const bucketOf = (c: Call): string => {
  if (c.nox_compliant == null || c.rog_compliant == null) return "in-review";
  return c.nox_compliant && c.rog_compliant ? "compliant" : "non-compliant";
};

const NAMES = [
  "Ever Steadfast", "Coral Dawn", "Ever Resolute", "Northern Crane",
  "Pacific Meridian", "Harbor Vigilant", "Golden Horizon", "Iron Halcyon",
  "Silver Marlin", "Blue Sentinel", "Cape Ranger", "Tide Warden",
];

const gen = (n: number, nox: boolean | null, rog: boolean | null, tag: string): Call[] =>
  Array.from({ length: n }, (_, k) => ({
    vessel_call_id: `${tag}${k}`,
    vessel_name: NAMES[k % NAMES.length],
    asset_id: `BE-${104 + (k % 12)}`,
    connected_at: `2026-06-${String(10 + (k % 18)).padStart(2, "0")} ${String(6 + (k % 16)).padStart(2, "0")}:15`,
    nox_compliant: nox,
    rog_compliant: rog,
  }));

const SCENARIOS: Record<string, Call[]> = {
  none: [],
  fresh: gen(6, null, null, "r"),
  reviewed: [...gen(4, true, true, "c"), ...gen(3, false, true, "n")],
  mix: [...gen(4, true, true, "c"), ...gen(3, true, false, "n"), ...gen(5, null, null, "r")],
  overflow: [...gen(8, true, true, "c"), ...gen(8, false, false, "n"), ...gen(24, null, null, "r")],
  terminalHeavy: [...gen(20, true, true, "c"), ...gen(20, false, true, "n"), ...gen(4, null, null, "r")],
};

const SCENARIO_OPTIONS = [
  { value: "none", label: "Empty report" },
  { value: "fresh", label: "Fresh (all in review)" },
  { value: "reviewed", label: "Reviewed" },
  { value: "mix", label: "Full mix" },
  { value: "overflow", label: "Overflow (1:1:2)" },
  { value: "terminalHeavy", label: "20 / 20 / 4" },
];

// Top → bottom: terminal-happy, terminal-unhappy, transient (double weight).
const BUCKETS: Bucket[] = [
  { key: "compliant", label: "Compliant", tone: "success" },
  { key: "non-compliant", label: "Non-compliant", tone: "danger" },
  { key: "in-review", label: "In review", tone: "accent", weight: 2 },
];

// Bare content — `.bucket-queue__row` owns the padding, so a renderItem that
// padded itself would double it.
const renderCall = (c: Call): JSX.Element => (
  <SpreadRow>
    <NarrowStack>
      <EllipsizedTitle>{c.vessel_name}</EllipsizedTitle>
      <FadedNowrapSublabel>{`${c.asset_id} · ${c.connected_at}`}</FadedNowrapSublabel>
    </NarrowStack>
  </SpreadRow>
);

const SplitQueueBench: Component = () => {
  const [scenario, setScenario] = createSignal("mix");
  const [selected, setSelected] = createSignal<string | undefined>(undefined);
  const calls = createMemo(() => SCENARIOS[scenario()]);

  return (
    <div class="component-section component-section--full">
      <SectionTitle>Split Queue</SectionTitle>
      <MutedBody>
        The promoted <code>BucketQueue</code> driven by fortnight vessel-call
        compliance — Compliant (top), Non-compliant (middle), In review (bottom).
        Empty sections collapse to a summary line; populated sections shrink-wrap;
        on overflow they share the height 1:1:2 and hand back any surplus.
      </MutedBody>

      <ClusterRow>
        <SubsectionTitle>Scenario</SubsectionTitle>
        <SegmentedControl
          options={SCENARIO_OPTIONS}
          value={scenario()}
          onValueChange={(v) => {
            setScenario(v);
            setSelected(undefined);
          }}
        />
      </ClusterRow>

      {/* A definite-height flex context so the fill-parent bar has a height. */}
      <div style={{ "max-width": "460px", "margin-top": "12px", height: "calc(100vh - 220px)", display: "flex" }}>
        <BucketQueue<Call>
          buckets={BUCKETS}
          items={calls()}
          bucketOf={bucketOf}
          keyOf={(c) => c.vessel_call_id}
          renderItem={renderCall}
          selectedKey={selected()}
          // Not `onSelect={setSelected}`: the queue emits `null` when the
          // worked section drains, and a Solid Setter would store that null
          // rather than clearing the signal.
          onSelect={(k) => setSelected(k ?? undefined)}
        />
      </div>
    </div>
  );
};

export const meta = { label: "Split Queue" };

export default SplitQueueBench;
