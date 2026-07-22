// Workshop — Split Queue data-stub scenarios.
// Exercises SplitQueueList across the empty/edge/typical states so its layout,
// all-clear strip, seam, and top-cap scroll can all be eyeballed from one bench.
// The queue is framed as a COMPLIANCE REVIEW flow: the bottom list is vessel
// calls still to review, the top list is calls already reviewed (resolved).
import { type Component, type JSX, createSignal, createMemo } from "solid-js";
import { SplitQueueList } from "../../../src/components/SplitQueueList";
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

// A compliance-review queue item. `compliant` is the data-layer verdict the
// card tones; `at` is the review/connect timestamp shown as the sublabel.
interface ReviewItem {
  id: string;
  vessel: string;
  asset: string;
  compliant: boolean;
  at: string;
}

const item = (
  id: string,
  vessel: string,
  asset: string,
  compliant: boolean,
  at: string,
): ReviewItem => ({ id, vessel, asset, compliant, at });

// One shared pool so every scenario slices from the same believable data.
const POOL: ReviewItem[] = [
  item("vc-01", "Ever Steadfast", "BE-104", true, "2026-06-10 21:15"),
  item("vc-02", "Pacific Meridian", "BE-207", false, "2026-06-11 04:30"),
  item("vc-03", "Coral Dawn", "BE-112", true, "2026-06-12 07:00"),
  item("vc-04", "Harbor Vigilant", "BE-104", false, "2026-06-13 15:10"),
  item("vc-05", "Golden Horizon", "BE-309", false, "2026-06-14 23:45"),
  item("vc-06", "Ever Resolute", "BE-215", true, "2026-06-15 05:20"),
  item("vc-07", "Iron Halcyon", "BE-221", false, "2026-06-16 11:05"),
  item("vc-08", "Northern Crane", "BE-118", true, "2026-06-17 02:40"),
  item("vc-09", "Silver Marlin", "BE-303", false, "2026-06-18 19:55"),
  item("vc-10", "Blue Sentinel", "BE-142", true, "2026-06-19 08:30"),
  item("vc-11", "Cape Ranger", "BE-256", false, "2026-06-20 13:12"),
  item("vc-12", "Tide Warden", "BE-190", true, "2026-06-21 22:48"),
];

const nonCompliant = POOL.filter((i) => !i.compliant);

// Each scenario is a { resolved, unresolved } split of the pool. These are the
// states worth eyeballing: empty, top-only, all-one-verdict, typical, backlog.
interface Scenario {
  resolved: ReviewItem[];
  unresolved: ReviewItem[];
}
const SCENARIOS: Record<string, Scenario> = {
  none: { resolved: [], unresolved: [] },
  recent: { resolved: POOL.slice(0, 4), unresolved: [] },
  resolvedNc: { resolved: nonCompliant, unresolved: [] },
  mix: { resolved: POOL.slice(0, 3), unresolved: POOL.slice(3, 9) },
  backlog: { resolved: POOL.slice(0, 2), unresolved: POOL.slice(2) },
};

const SCENARIO_OPTIONS = [
  { value: "none", label: "No data" },
  { value: "recent", label: "Just recent" },
  { value: "resolvedNc", label: "Resolved non-compliant" },
  { value: "mix", label: "Full mix" },
  { value: "backlog", label: "Large backlog" },
];

// Card content — vessel name is the title, asset + timestamp the sublabel, and
// the compliance verdict rides a semantic tone (no hex at the call site).
const renderItem = (i: ReviewItem): JSX.Element => (
  <SpreadRow>
    <NarrowStack>
      <EllipsizedTitle>{i.vessel}</EllipsizedTitle>
      <FadedNowrapSublabel>{`${i.asset} · ${i.at}`}</FadedNowrapSublabel>
    </NarrowStack>
    {toneWrap(i.compliant ? "success" : "danger", i.compliant ? "OK" : "NON-COMPLIANT")}
  </SpreadRow>
);

const SplitQueueBench: Component = () => {
  const [scenario, setScenario] = createSignal("mix");
  const [selectedKey, setSelectedKey] = createSignal<string | undefined>(undefined);
  const current = createMemo(() => SCENARIOS[scenario()]);

  return (
    <div class="component-section component-section--full">
      <SectionTitle>Split Queue</SectionTitle>
      <MutedBody>
        SplitQueueList across its data-stub scenarios — pick a stub to see the
        empty state, the all-clear strip, a single-verdict top list, a typical
        mix, and a scrolling backlog.
      </MutedBody>

      <ClusterRow>
        <SubsectionTitle>Scenario</SubsectionTitle>
        <SegmentedControl
          options={SCENARIO_OPTIONS}
          value={scenario()}
          onValueChange={(v) => {
            setScenario(v);
            setSelectedKey(undefined);
          }}
        />
      </ClusterRow>

      <div style={{ "max-width": "420px", height: "480px" }}>
        <SplitQueueList<ReviewItem>
          resolved={current().resolved}
          unresolved={current().unresolved}
          keyOf={(i) => i.id}
          renderItem={renderItem}
          resolvedLabel="Reviewed"
          unresolvedLabel="To review"
          allClearLabel="All calls reviewed"
          selectedKey={selectedKey()}
          onSelect={setSelectedKey}
        />
      </div>
    </div>
  );
};

export const meta = { label: "Split Queue" };

export default SplitQueueBench;
