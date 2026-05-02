// ============================================
// Sandbox — ephemeral page mockup harness.
// Add a new step by appending to the `steps` array. The renderer flows the
// selected step's content into the main area. Hash deep-links via
// /#/sandbox/<step-id>. Steps are kept in source so HMR + the editor are the
// whole authoring experience — they reset on reload by design.
// ============================================
import { Component, createSignal, For, JSX, onCleanup, onMount, Show } from "solid-js";
import { loadTheme } from "./load-theme";
import { FlexRow, LgRegion, ContentStack, DelineatedSidebar, PageCanvas, TightStack, ClusterRow, SpacedStack, NarrowStack, ScrollPanel, ProportionalStack, ProportionalItem } from "../src/components/Layout";
import { HintText, EllipsizedTitle, PageTitle, TextSublabel, MutedBody, TextLabel } from "../src/components/Text";
import { SimplePanel } from "../src/components/Panel";
import { CompactCard } from "../src/components/Surface";
import { TruthIndicator } from "../src/components/TruthIndicator";
import { QuickFilter } from "../src/components/QuickFilter";
import { BaseTable } from "../src/components/Table";
import { ConversationTree, ConversationMessage } from "../src/components/ConversationTree";
import { StatusBadge } from "../src/components/Badge";

// ---- MockBaseline ----------------------------------------------------------
// The "baseline" every mock step starts from: thematic PageCanvas wrapping a
// two-column FlexRow (DelineatedSidebar + detail SimplePanel). Pass `sidebar`
// and `detail` JSX to populate; pass `sidebarEmpty` / `detailEmpty` strings
// to override the default empty hints.
//
// All slot content must use only curried components.

interface MockBaselineProps {
  /** Sidebar contents. Drop a `<QuickFilter>` here when filtering is wanted —
   *  it provides both the filter input and the filtered render-prop list. */
  sidebar?: JSX.Element;
  detail?: JSX.Element;
  sidebarEmpty?: string;
  detailEmpty?: string;
}

const DEFAULT_SIDEBAR_EMPTY = "this sidebar is empty";
const DEFAULT_DETAIL_EMPTY = "nothing selected";

const MockBaseline: Component<MockBaselineProps> = (props) => (
  <PageCanvas>
    <FlexRow gap="md" align="stretch" style={{ height: "100%", "min-height": "70vh" }}>
      <DelineatedSidebar>
        {props.sidebar ?? (
          <LgRegion>
            <HintText>{props.sidebarEmpty ?? DEFAULT_SIDEBAR_EMPTY}</HintText>
          </LgRegion>
        )}
      </DelineatedSidebar>
      <ContentStack>
        <SimplePanel style={{ height: "100%" }}>
          {props.detail ?? (
            <LgRegion>
              <HintText>{props.detailEmpty ?? DEFAULT_DETAIL_EMPTY}</HintText>
            </LgRegion>
          )}
        </SimplePanel>
      </ContentStack>
    </FlexRow>
  </PageCanvas>
);

// ---- step definitions -------------------------------------------------------

interface SandboxStep {
  id: string;
  label: string;
  /** Optional one-line description shown under the label in the sidebar. */
  hint?: string;
  render: (ctx: SandboxRenderCtx) => JSX.Element;
}

interface SandboxRenderCtx {
  goTo: (id: string) => void;
}

// ---- step list -------------------------------------------------------------

// ---- statement card helper ------------------------------------------------

interface Statement {
  id: string;
  value: boolean;
  title: string;
}

const StatementCard: Component<{ s: Statement; chosen?: boolean }> = (props) => (
  <CompactCard
    style={{
      width: "100%",
      "min-width": "0",
      "box-sizing": "border-box",
      border: props.chosen ? "2px solid var(--sui-warning, #ffcc00)" : undefined,
    }}
  >
    <ClusterRow style={{ "min-width": "0", "flex-wrap": "nowrap" }}>
      <TruthIndicator value={props.s.value} />
      <EllipsizedTitle title={props.s.title}>{props.s.title}</EllipsizedTitle>
      <StatusBadge variant="pending" label="draft" size="sm" />
    </ClusterRow>
  </CompactCard>
);

const TITLE_POOL = [
  "The system is currently exceeding throughput targets by 12%",
  "Latency is below the 200ms p99 target across all regions",
  "Cache hit ratio is sustained above 95% during peak hours",
  "All replicas are participating in the active quorum",
  "Background compactor is keeping up with write volume",
  "No alerts have fired in the last 24 hours",
  "The retry budget is exhausted on the payments queue",
  "Sustained CPU is below the autoscaler trigger threshold",
  "Index rebuild completed within the maintenance window",
  "Schema migration has been backfilled for all active tenants",
];

const generateStatements = (n: number): Statement[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `s-${i + 1}`,
    value: i % 3 !== 0, // mix true/false, ~⅓ false
    title: `${i + 1}. ${TITLE_POOL[i % TITLE_POOL.length]}`,
  }));

const sidebarOf = (statements: Statement[], chosenId?: string) => (
  <TightStack style={{ width: "100%", "min-width": "0" }}>
    <For each={statements}>{(s) => <StatementCard s={s} chosen={s.id === chosenId} />}</For>
  </TightStack>
);

// ---- detail area helpers --------------------------------------------------

const SectionLabel: Component<{ children: any }> = (p) => (
  <TextSublabel
    style={{
      "text-transform": "uppercase",
      "letter-spacing": "0.06em",
      "font-size": "0.7rem",
      opacity: "0.7",
    }}
  >
    {p.children}
  </TextSublabel>
);

interface DetailHeaderProps {
  s: Statement;
  createdAt: string;
}

const StatementDetailHeader: Component<DetailHeaderProps> = (p) => (
  <TightStack>
    <ClusterRow>
      <TruthIndicator value={p.s.value} size="lg" />
      <PageTitle style={{ margin: "0", "font-size": "1.25rem" }}>{p.s.title}</PageTitle>
    </ClusterRow>
    <TextSublabel>created {p.createdAt}</TextSublabel>
  </TightStack>
);

interface TimelineEntry {
  ts: string;
  text: string;
}

const Timeline: Component<{ entries: TimelineEntry[] }> = (p) => (
  <NarrowStack>
    <For each={p.entries}>
      {(e) => (
        <ClusterRow>
          <TextSublabel style={{ "font-family": '"JetBrains Mono", monospace', "min-width": "10rem" }}>
            {e.ts}
          </TextSublabel>
          <MutedBody>{e.text}</MutedBody>
        </ClusterRow>
      )}
    </For>
  </NarrowStack>
);

// ---- detail body data ------------------------------------------------------

interface EvidenceRow {
  id: string;
  region: string;
  metric: string;
  value: number;
  threshold: number;
  observed: string;
}

const generateEvidence = (n: number): EvidenceRow[] => {
  const regions = ["us-east-1", "us-west-2", "eu-west-1", "eu-north-1", "ap-south-1", "ap-northeast-1"];
  const metrics = ["latency_p50", "latency_p99", "error_rate", "queue_depth", "rps", "cpu_util"];
  let s = 7;
  const rand = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  return Array.from({ length: n }, (_, i) => {
    const region = regions[i % regions.length];
    const metric = metrics[Math.floor(i / regions.length) % metrics.length];
    const value = Math.round(rand() * 1000) / 10;
    const threshold = 200;
    const ts = new Date(Date.now() - (n - i) * 60_000).toISOString().slice(11, 19);
    return {
      id: `e-${i + 1}`,
      region,
      metric,
      value,
      threshold,
      observed: ts,
    };
  });
};

const evidenceColumns = [
  { id: "id", header: "#", accessor: "id" as const, width: "60px" },
  { id: "observed", header: "Observed", accessor: "observed" as const, width: "100px" },
  { id: "region", header: "Region", accessor: "region" as const, sortable: true },
  { id: "metric", header: "Metric", accessor: "metric" as const, sortable: true },
  { id: "value", header: "Value", accessor: "value" as const, align: "right" as const, sortable: true },
  { id: "threshold", header: "Threshold", accessor: "threshold" as const, align: "right" as const },
];

const STATEMENT_PARTICIPANTS = [
  { id: "me", name: "You" },
  { id: "alex", name: "Alex Chen" },
  { id: "morgan", name: "Morgan Reyes" },
  { id: "sam", name: "Sam Patel" },
];

const NOW = Date.now();
const minsAgo = (m: number) => NOW - m * 60_000;
const hrsAgo = (h: number) => NOW - h * 3_600_000;

const STATEMENT_COMMENTS = [
  { id: "c1", participantId: "alex", timestamp: hrsAgo(3), text: "Reading the evidence — the eu-north-1 numbers don't fit the pattern." },
  { id: "c2", participantId: "morgan", timestamp: hrsAgo(2.7), text: "Same. p99 there is consistently above 200 in the last hour.", replyToId: "c1" },
  { id: "c3", participantId: "me", timestamp: hrsAgo(2.5), text: "I'm flagging this as false on the all-regions claim. eu-north-1 is the counterexample.", replyToId: "c2" },
  { id: "c4", participantId: "sam", timestamp: hrsAgo(0.6), text: "Agreed. Dispatching to leslie for review." },
  { id: "c5", participantId: "morgan", timestamp: minsAgo(15), text: "I'll dig into the cascade resolve cost in eu-north-1 separately — looks like it's pulling p99 up." },
];

// Default activity log entries — used by all chosen-detail variants.
const STATEMENT_ACTIVITY_BASE: TimelineEntry[] = [
  { ts: "11:56:06 AM", text: "Drafted → Proposed — approved" },
  { ts: "11:56:07 AM", text: "Proposed → Dispatched — claimed by peter-laptop · persona hint: leslie" },
  { ts: "11:56:35 AM", text: "Dispatched → InProgress" },
  { ts: "12:02:19 PM", text: "InProgress → AwaitingReview" },
];

// Generators for the long variant.
const generateActivity = (n: number): TimelineEntry[] => {
  const verbs = [
    "transitioned state",
    "added evidence",
    "removed evidence",
    "claimed by peter-laptop",
    "claimed by ci-runner-04",
    "comment posted",
    "review requested",
    "review approved",
    "label added",
    "label removed",
  ];
  return Array.from({ length: n }, (_, i) => {
    const minute = Math.floor(i * 0.7) % 60;
    const hour = (11 + Math.floor(i / 60)) % 24;
    const ts = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}:${(i * 13 % 60).toString().padStart(2, "0")}`;
    return { ts, text: `${verbs[i % verbs.length]} (${i + 1})` };
  });
};

const generateComments = (n: number): ConversationMessage[] => {
  const ids = ["me", "alex", "morgan", "sam"];

  // The first few are deliberately long and multi-paragraph so the layout
  // (max width, wrapping, overlap) gets exercised at full width before the
  // short messages start.
  const opening: { who: string; text: string }[] = [
    {
      who: "me",
      text: [
        "Posting the long version of why I'm flagging this as false. The claim was \"latency is below the 200ms p99 target across all regions\" and the snapshot at 11:55 shows three of the six regions blowing through that bound — eu-north-1 in particular is sustained at 240–280ms for the last forty minutes.",
        "",
        "I dug through the per-shard p99 in the evidence table and the picture is consistent: the four regions on the new tile binning are within budget, the two that haven't migrated yet are well over. So the statement is technically false, but the failure mode is bounded and known. I'm marking it false and routing to leslie for a follow-up that scopes the migration ticket.",
      ].join("\n"),
    },
    {
      who: "alex",
      text:
        "Agreed on the call. One nit on the framing: the eu-north-1 p99 number is partly the cascade resolve cost regression we filed last week, not just a missed migration — the numbers will move once that lands. So the false flag is correct but the *reason* in the activity log should reference the cascade ticket too, otherwise the next on-call will look at this and assume the migration alone closes it.",
    },
    {
      who: "morgan",
      text: [
        "Adding context on the autoscaler interaction since I just finished tracing it.",
        "",
        "Around 11:50 the autoscaler stepped both us-west-2 and eu-west-1 from 8 → 12 nodes because of a queue depth signal. That partially masked the eu-north-1 number in the rollup view because the regional aggregator weights by capacity. The raw per-region p99 still showed the breach, but the rollup looked healthier than it was for about 90 seconds.",
        "",
        "Not blocking, but worth noting in the activity log so the rollup vs raw discrepancy doesn't surprise the next reviewer.",
      ].join("\n"),
      replyToId: "c-2",
    },
  ];

  const samples = [
    "noted, looking at the eu-north-1 numbers now",
    "p99 there is consistently above 200 in the last hour.",
    "I'll dig into the cascade resolve cost separately",
    "I'd like to see the rollup before we close this",
    "agree with the call — flag as false",
    "the autoscaler kicked in around 11:50, that explains some of the spike",
    "pushing a fixture to cover the boundary case",
    "deferred to leslie for the final review",
    "ack — landing the fix tonight",
  ];

  const out: ConversationMessage[] = [];
  opening.forEach((o, i) => {
    out.push({
      id: `c-${i + 1}`,
      participantId: o.who,
      timestamp: NOW - (n - i) * 5 * 60_000,
      text: o.text,
      replyToId: (o as any).replyToId,
    });
  });

  for (let i = opening.length; i < n; i++) {
    out.push({
      id: `c-${i + 1}`,
      participantId: ids[i % ids.length],
      timestamp: NOW - (n - i) * 5 * 60_000,
      text: `${i + 1}. ${samples[i % samples.length]}`,
      replyToId: i > opening.length && i % 4 === 0 ? `c-${i}` : undefined,
    });
  }
  return out;
};

// LabelledSection — a small sandbox-local helper: section label above a
// bordered ProportionalItem that scrolls internally when its share is too
// small. The proportional behavior itself is generic (ProportionalItem in
// the library); this is just the visual treatment used in this mock.
const LabelledSection: Component<{ weight: number; label: string; children: any }> = (p) => (
  <ProportionalItem
    weight={p.weight}
    scrollWhenSmall={false}
    style={{ gap: "8px" }}
  >
    <SectionLabel>{p.label}</SectionLabel>
    <div
      style={{
        flex: "1 1 auto",
        "min-height": "0",
        overflow: "auto",
        border: "1px solid var(--sui-border, rgba(255, 255, 255, 0.08))",
        "border-radius": "4px",
      }}
    >
      {p.children}
    </div>
  </ProportionalItem>
);

interface StatementDetailProps {
  s: Statement;
  evidence: EvidenceRow[];
  comments: ConversationMessage[];
  activity: TimelineEntry[];
}

const StatementDetail: Component<StatementDetailProps> = (p) => (
  <ProportionalStack direction="column" gap="md" style={{ padding: "20px 24px" }}>
    <ProportionalItem weight={0} scrollWhenSmall={false}>
      <StatementDetailHeader s={p.s} createdAt="2026-05-01 11:55:49" />
    </ProportionalItem>
    <LabelledSection weight={1} label={`evidence (${p.evidence.length} rows)`}>
      <BaseTable data={p.evidence} columns={evidenceColumns} striped hoverable />
    </LabelledSection>
    <LabelledSection weight={3} label={`discussion (${p.comments.length})`}>
      <ConversationTree
        currentUserId="me"
        participants={STATEMENT_PARTICIPANTS}
        messages={p.comments}
      />
    </LabelledSection>
    <LabelledSection weight={2} label={`activity (${p.activity.length})`}>
      <Timeline entries={p.activity} />
    </LabelledSection>
  </ProportionalStack>
);

const SEED_STEPS: SandboxStep[] = [
  {
    id: "dside-drafted-empty",
    label: "dside-drafted-empty",
    render: () => (
      <MockBaseline
        sidebarEmpty="enter a false Statement below to begin generating work"
        detailEmpty="No Statement selected"
      />
    ),
  },
  {
    id: "dside-drafted-one",
    label: "dside-drafted-one",
    render: () => (
      <MockBaseline
        sidebar={sidebarOf([
          { id: "s-1", value: true, title: "The system is currently exceeding throughput targets by 12%" },
        ])}
        detailEmpty="No Statement selected"
      />
    ),
  },
  {
    id: "dside-drafted-two",
    label: "dside-drafted-two",
    render: () => (
      <MockBaseline
        sidebar={sidebarOf([
          { id: "s-1", value: true, title: "The system is currently exceeding throughput targets by 12%" },
          { id: "s-2", value: false, title: "Latency is below the 200ms p99 target across all regions" },
        ])}
        detailEmpty="No Statement selected"
      />
    ),
  },
  {
    id: "dside-false-chosen-short",
    label: "dside-false-chosen-short",
    render: () => {
      const statements: Statement[] = [
        { id: "s-1", value: true, title: "The system is currently exceeding throughput targets by 12%" },
        { id: "s-2", value: false, title: "Latency is below the 200ms p99 target across all regions" },
      ];
      const chosen = statements.find((s) => !s.value)!;
      return (
        <MockBaseline
          sidebar={sidebarOf(statements, chosen.id)}
          detail={
            <StatementDetail
              s={chosen}
              evidence={generateEvidence(4)}
              comments={STATEMENT_COMMENTS.slice(0, 3)}
              activity={STATEMENT_ACTIVITY_BASE.slice(0, 3)}
            />
          }
        />
      );
    },
  },
  {
    id: "dside-false-chosen-long",
    label: "dside-false-chosen-long",
    render: () => {
      const statements: Statement[] = [
        { id: "s-1", value: true, title: "The system is currently exceeding throughput targets by 12%" },
        { id: "s-2", value: false, title: "Latency is below the 200ms p99 target across all regions" },
      ];
      const chosen = statements.find((s) => !s.value)!;
      return (
        <MockBaseline
          sidebar={sidebarOf(statements, chosen.id)}
          detail={
            <StatementDetail
              s={chosen}
              evidence={generateEvidence(150)}
              comments={generateComments(40)}
              activity={generateActivity(80)}
            />
          }
        />
      );
    },
  },
  {
    id: "dside-drafted-many",
    label: "dside-drafted-many",
    render: () => {
      const statements = generateStatements(100);
      return (
        <MockBaseline
          sidebar={
            <QuickFilter
              items={statements}
              extract={(s) => s.title}
              placeholder="Filter statements…"
            >
              {(filtered) => sidebarOf(filtered)}
            </QuickFilter>
          }
          detailEmpty="No Statement selected"
        />
      );
    },
  },
];

// ---- root ------------------------------------------------------------------

const stepIdFromHash = (h: string): string | null => {
  const m = h.match(/^#\/sandbox\/?([^/?#]*)/);
  if (!m) return null;
  return m[1] || null;
};

export const Sandbox: Component = () => {
  const initial = stepIdFromHash(location.hash) ?? SEED_STEPS[0].id;
  const [activeId, setActiveId] = createSignal(initial);
  const [extras, setExtras] = createSignal<SandboxStep[]>([]);

  const allSteps = () => [...SEED_STEPS, ...extras()];

  const goTo = (id: string) => {
    setActiveId(id);
    const desired = `#/sandbox/${id}`;
    if (location.hash !== desired) location.hash = desired;
  };

  const addBlank = () => {
    const n = extras().length + 1;
    const step: SandboxStep = {
      id: `scratch-${Date.now().toString(36)}`,
      label: `Scratch ${n}`,
      hint: "ephemeral",
      render: () => (
        <MockBaseline
          sidebarEmpty={`Scratch ${n} sidebar`}
          detailEmpty={`Scratch ${n} detail — populate via dev/sandbox.tsx`}
        />
      ),
    };
    setExtras((prev) => [...prev, step]);
    goTo(step.id);
  };

  const removeExtra = (id: string) => {
    setExtras((prev) => prev.filter((s) => s.id !== id));
    if (activeId() === id) goTo(SEED_STEPS[0].id);
  };

  onMount(() => {
    // Mount the default theme so atomic components (Toggle, Badge, etc.)
    // have their themed colors. Showcase loads this via ThemeSwitcher;
    // sandbox loads it directly so mockups render correctly in isolation.
    if (!document.getElementById("sui-theme")?.textContent) loadTheme("default");

    const onHash = () => {
      const id = stepIdFromHash(location.hash);
      if (id && id !== activeId() && allSteps().some((s) => s.id === id)) {
        setActiveId(id);
      }
    };
    window.addEventListener("hashchange", onHash);
    onCleanup(() => window.removeEventListener("hashchange", onHash));

    if (stepIdFromHash(location.hash) == null) {
      location.hash = `#/sandbox/${activeId()}`;
    }
  });

  const active = () => allSteps().find((s) => s.id === activeId()) ?? SEED_STEPS[0];

  return (
    <div class="sui-sandbox">
      <nav class="sui-sandbox__sidebar">
        <div class="sui-sandbox__brand">
          <h1>Sandbox</h1>
          <p>Ephemeral page mockups</p>
          <a class="sui-sandbox__exit" href="#/atomic/base-table">← back to showcase</a>
        </div>

        <div class="sui-sandbox__steps">
          <For each={allSteps()}>
            {(step, i) => {
              const isExtra = () => i() >= SEED_STEPS.length;
              return (
                <div
                  class={`sui-sandbox__step${activeId() === step.id ? " sui-sandbox__step--active" : ""}`}
                >
                  <button class="sui-sandbox__step-button" onClick={() => goTo(step.id)}>
                    <span class="sui-sandbox__step-num">{i() + 1}</span>
                    <span class="sui-sandbox__step-body">
                      <span class="sui-sandbox__step-label">{step.label}</span>
                      <Show when={step.hint}>
                        <span class="sui-sandbox__step-hint">{step.hint}</span>
                      </Show>
                    </span>
                  </button>
                  <Show when={isExtra()}>
                    <button
                      class="sui-sandbox__step-remove"
                      title="remove scratch step"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeExtra(step.id);
                      }}
                    >
                      ×
                    </button>
                  </Show>
                </div>
              );
            }}
          </For>
        </div>

        <button class="sui-sandbox__add" onClick={addBlank}>
          + add scratch step
        </button>
      </nav>

      <main class="sui-sandbox__content">{active().render({ goTo })}</main>
    </div>
  );
};
