// Manual Group — thorcasting's Import screen, Manual step, from the mockup
// of 2026-10-13. Three columns: the group list, the deviation chart with the
// config cards and the actions, the payment rows.
import { type Component, Show, createMemo, createSignal } from "solid-js";
import { CompliantBadge, InfoBadge, TagPill, ViolationBadge } from "../../../src/components/Badge";
import { SmallButton, SmallDangerButton, SmallGhostButton } from "../../../src/components/Button";
import { ButtonGroup } from "../../../src/components/ButtonGroup";
import { ContentChartFrame } from "../../../src/components/ChartFrame";
import { BucketQueue } from "../../../src/components/BucketQueue";
import { ClusterRow, ContentStack, GrowBox, NarrowStack, SpreadRow, TightStack } from "../../../src/components/Layout";
import { SegmentedControl } from "../../../src/components/SegmentedControl";
import { Tabs } from "../../../src/components/Tabs";
import { MutedBody, SectionTitle, TextSublabel, TextTitle } from "../../../src/components/Text";
import { ThreePanelLayout } from "../../../src/components/ThreePanelLayout";
import { ToastRegion, showToast } from "../../../src/components/Toast";
import { DeviationChart } from "./manual-group-kit/chart";
import { Actions, ConfigCards } from "./manual-group-kit/configs";
import { GROUPS, PAYEES, payeeOf } from "./manual-group-kit/data";
import { type Expected, activeConfigs, coveredKeys, rowKey, uncoveredNow } from "./manual-group-kit/model";
import { PaymentsTable } from "./manual-group-kit/payments-table";

export const meta = { label: "Manual Group" };

const TOTAL_OPEN = 36;
const QUEUE_HEIGHT = 780;
type Group = (typeof GROUPS)[number];
const LOOK_BACK = ["All", "1", "2", "3", "6", "12"].map((v) => ({ value: v, label: v }));
const TABS = [
  { id: "auto", label: "Auto group", hint: "20" },
  { id: "manual-group", label: "Manual group", hint: "13" },
  { id: "proposals", label: "Proposals", hint: "17" },
  { id: "halted", label: "Halted", hint: "5" },
  { id: "manual", label: "Manual", hint: String(TOTAL_OPEN) },
  { id: "people", label: "People" },
  { id: "summary", label: "Summary" },
];

type PerPayee<T> = Readonly<Record<string, T>>;
const perPayee = <T,>(v: T): PerPayee<T> => Object.fromEntries(PAYEES.map((p) => [p.key, v]));

const ManualGroupBench: Component = () => {
  const [payeeKey, setPayeeKey] = createSignal("asa");
  const [lookBack, setLookBack] = createSignal("All");
  const [applied, setApplied] = createSignal<PerPayee<readonly string[]>>(perPayee([]));
  const [discarded, setDiscarded] = createSignal<PerPayee<boolean>>(perPayee(false));
  const [groupGone, setGroupGone] = createSignal<PerPayee<boolean>>(perPayee(false));
  const [editing, setEditing] = createSignal<PerPayee<string | null>>(perPayee(null));
  const [exp, setExp] = createSignal<Expected>({});
  const [expanded, setExpanded] = createSignal<Readonly<Record<string, boolean>>>({});

  const payee = () => payeeOf(payeeKey());
  const configs = createMemo(() => activeConfigs(payee(), applied()[payeeKey()] ?? []));
  const uncovered = createMemo(() => uncoveredNow(payee(), configs()));
  const isDiscarded = () => discarded()[payeeKey()] ?? false;
  const isGone = () => groupGone()[payeeKey()] ?? false;
  const settled = () => isGone() || isDiscarded() || uncovered().length === 0;
  const touched = () =>
    (applied()[payeeKey()]?.length ?? 0) > 0 || isDiscarded() || isGone() || editing()[payeeKey()] != null || Object.keys(exp()).some((k) => payee().configs.some((c) => c.id === k));

  const doneCount = createMemo(
    () =>
      PAYEES.filter((p) => {
        if (groupGone()[p.key] || discarded()[p.key]) return true;
        const covered = coveredKeys(activeConfigs(p, applied()[p.key] ?? []));
        return p.uncovered.every((r) => covered.has(rowKey(r)));
      }).length,
  );
  const openCount = () => TOTAL_OPEN - doneCount();
  const tabs = () => TABS.map((t) => (t.id === "manual" ? { ...t, hint: String(openCount()) } : t));

  const tagOf = (key: string | undefined, tag0: string): { label: string; active: boolean } => {
    if (!key) return { label: tag0, active: false };
    if (groupGone()[key]) return { label: "discarded", active: false };
    const p = payeeOf(key);
    const covered = coveredKeys(activeConfigs(p, applied()[key] ?? []));
    const ok = discarded()[key] || p.uncovered.every((r) => covered.has(rowKey(r)));
    return ok ? { label: "done", active: true } : { label: tag0, active: false };
  };

  const setFor = <T,>(setter: (f: (prev: PerPayee<T>) => PerPayee<T>) => void, value: T) =>
    setter((prev) => ({ ...prev, [payeeKey()]: value }));

  const reset = () => {
    setFor(setApplied, [] as readonly string[]);
    setFor(setDiscarded, false);
    setFor(setGroupGone, false);
    setFor(setEditing, null);
    setExp((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => !payee().configs.some((c) => c.id === k))));
  };

  const verdict = () =>
    isGone() ? <InfoBadge label="Nothing modelled" /> : settled() ? <CompliantBadge label="All series on target" /> : <ViolationBadge label={`${uncovered().length} payments uncovered`} />;

  // The app chrome sits above the layout. The tab strip draws its own bottom
  // border, so the layout gets no top bar: that bar draws a second rule.
  const chrome = (
    <TightStack>
      <SpreadRow>
        <ClusterRow>
          <TextTitle>thorcasting</TextTitle>
          <MutedBody>PrimeStage · Import</MutedBody>
        </ClusterRow>
        <ClusterRow>
          <TextSublabel>Look back</TextSublabel>
          <SegmentedControl aria-label="Look back" size="xs" options={LOOK_BACK} value={lookBack()} onValueChange={setLookBack} />
          <TextSublabel>mo</TextSublabel>
        </ClusterRow>
      </SpreadRow>
      <SpreadRow>
        <GrowBox>
          <Tabs tabs={tabs()} activeTab="manual" onTabChange={() => undefined} />
        </GrowBox>
        <ButtonGroup>
          <SmallGhostButton>Back</SmallGhostButton>
          <SmallButton>Next</SmallButton>
        </ButtonGroup>
      </SpreadRow>
    </TightStack>
  );

  // The buckets are the queue: every group sits in DONE, FORCED or OPEN, each
  // bucket always shown with its count and collapsible to its summary line.
  const bucketOfGroup = (g: Group): string => {
    const tag = tagOf(g.key, g.tag).label;
    return tag === "done" || tag === "discarded" ? "done" : "open";
  };
  const left = (
    <BucketQueue
      buckets={[
        { key: "done", label: "DONE", tone: "success", collapsible: true },
        { key: "forced", label: "FORCED", tone: "warning", collapsible: true },
        { key: "open", label: "OPEN", tone: "danger", collapsible: true, fill: true },
      ]}
      items={[...GROUPS]}
      bucketOf={bucketOfGroup}
      keyOf={(g) => g.key ?? g.name}
      renderItem={(g) => (
        <SpreadRow>
          <span>{g.name}</span>
          <TagPill tag={tagOf(g.key, g.tag)} />
        </SpreadRow>
      )}
      selectedKey={payeeKey()}
      onSelect={(key) => {
        if (key && GROUPS.some((g) => g.key === key)) setPayeeKey(key);
      }}
      height={QUEUE_HEIGHT}
    />
  );

  const center = (
    <ContentStack>
      <SpreadRow>
        <ClusterRow>
          <TextTitle>{payee().name}</TextTitle>
          <TextSublabel>· {payee().meta}</TextSublabel>
        </ClusterRow>
        <ClusterRow>
          <Show when={touched()}>
            <SmallGhostButton onClick={reset}>Reset mockup</SmallGhostButton>
          </Show>
          <SmallDangerButton disabled={isGone()} onClick={() => setFor(setGroupGone, true)}>
            Discard group
          </SmallDangerButton>
        </ClusterRow>
      </SpreadRow>
      <ContentChartFrame title="Cumulative deviation: actual minus expected, per config" actions={verdict()}>
        <DeviationChart payee={payee()} configs={configs()} uncovered={uncovered()} exp={exp()} discarded={isDiscarded()} groupGone={isGone()} />
      </ContentChartFrame>
      <ConfigCards
        payee={payee()}
        configs={configs()}
        exp={exp()}
        editing={editing()[payeeKey()] ?? null}
        groupGone={isGone()}
        onEdit={(id) => setFor(setEditing, id)}
        onExpected={(id, cents) => setExp((prev) => ({ ...prev, [id]: cents }))}
      />
      <Actions
        payee={payee()}
        applied={applied()[payeeKey()] ?? []}
        uncovered={uncovered()}
        discarded={isDiscarded()}
        groupGone={isGone()}
        settled={settled()}
        coveredCount={coveredKeys(configs()).size}
        onAddConfig={() => showToast({ title: "Opens the config editor over the uncovered rows (not mocked)", variant: "info" })}
        onApply={(id) => setFor(setApplied, [...(applied()[payeeKey()] ?? []), id])}
        onDiscard={() => setFor(setDiscarded, true)}
      />
    </ContentStack>
  );

  const right = (
    <NarrowStack>
      <TextSublabel>
        {isGone()
          ? `${(payee().configs[0]?.rows.length ?? 0) + payee().uncovered.length} payments, none modelled`
          : `${(payee().configs[0]?.rows.length ?? 0) + payee().uncovered.length} payments · ${coveredKeys(configs()).size} covered, ${uncovered().length} ${isDiscarded() ? "discarded" : "uncovered"}`}
      </TextSublabel>
      <PaymentsTable
        payee={payee()}
        configs={configs()}
        uncovered={uncovered()}
        exp={exp()}
        gone={isDiscarded() || isGone()}
        groupGone={isGone()}
        expanded={expanded()}
        onToggle={(key) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))}
      />
    </NarrowStack>
  );

  return (
    <div class="component-section component-section--full">
      <SectionTitle>Manual Group</SectionTitle>
      <NarrowStack>
        {chrome}
        <ThreePanelLayout leftPanel={left} centerPanel={center} rightPanel={right} leftPanelWidth="230px" rightPanelWidth="320px" height="auto" asideMaxHeight="none" />
      </NarrowStack>
      <ToastRegion />
    </div>
  );
};

export default ManualGroupBench;
