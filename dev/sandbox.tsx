// ============================================
// Sandbox — ephemeral page mockup harness.
// Add a new step by appending to the `steps` array. The renderer flows the
// selected step's content into the main area. Hash deep-links via
// /#/sandbox/<step-id>. Steps are kept in source so HMR + the editor are the
// whole authoring experience — they reset on reload by design.
// ============================================
import { Component, createEffect, createMemo, createSignal, For, JSX, onCleanup, onMount, Show } from "solid-js";
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
import { StackedProgressBar } from "../src/components/Progress";
import { SlotFillBar } from "../src/components/SlotFillBar";

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
  {
    id: "100-table",
    label: "100-table",
    hint: "100 stmts · table view",
    render: () => <Hundred100TableStep />,
  },
  {
    id: "completion-bars",
    label: "completion-bars",
    hint: "5 variants",
    render: () => <CompletionBarsStep />,
  },
  {
    id: "by-feature",
    label: "by-feature",
    hint: "products × feature areas",
    render: () => <ByFeatureStep />,
  },
];

// ---- by-feature step -------------------------------------------------------
// For a chosen client, lay out a grid: rows = feature area (UI / BG / API),
// columns = product. Each cell shows the features in that area for that
// product, plus their statement counts. Demonstrates the "above the line"
// product/feature pivot the user sketched.

type FeatureArea = "UI" | "BG" | "API";

const FEATURE_AREA: Record<string, FeatureArea> = {
  // UI surface
  "DAG-CHART": "UI",
  "DASHBOARD": "UI",
  "UI": "UI",
  "ONBOARDING": "UI",
  "SEARCH": "UI",
  "NOTIFICATIONS": "UI",
  "SETTINGS": "UI",
  // Backend / data plane
  "METRICS": "BG",
  "MIGRATION": "BG",
  "OBSERVABILITY": "BG",
  "PERFORMANCE": "BG",
  "REPORTING": "BG",
  "SCHEMA": "BG",
  "WEBHOOKS": "BG",
  // API / integration
  "API": "API",
  "AUTH": "API",
  "BILLING": "API",
  "EXPORT": "API",
  "IMPORT": "API",
  "SOLID-UI-COMPONENTS": "UI",
};
const FEATURE_AREAS: FeatureArea[] = ["UI", "BG", "API"];

interface FeatureCell {
  feature: string;
  total: number;
  truth: { True: number; False: number; Unknown: number };
}

const ByFeatureStep: Component = () => {
  const data = generate100Statements();

  // CLIENT ↔ PROJECT pairs that actually appear in the data, plus their
  // ordering: prefer the most-statements client first.
  const clientOrder = createMemo(() => {
    const counts = new Map<string, number>();
    for (const r of data) {
      const c = tagValue(r, "CLIENT");
      if (!c) continue;
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  });

  const [client, setClient] = createSignal<string>("");

  // Initialize selection on first render.
  createEffect(() => {
    if (!client() && clientOrder().length > 0) setClient(clientOrder()[0]);
  });

  const productsForClient = createMemo(() => {
    const c = client();
    if (!c) return [] as string[];
    const set = new Set<string>();
    for (const r of data) {
      if (tagValue(r, "CLIENT") !== c) continue;
      for (const p of tagValues(r, "PROJECT")) set.add(p);
    }
    // Order alphabetically for stable column placement.
    return [...set].sort();
  });

  const cellFor = (product: string, area: FeatureArea): FeatureCell[] => {
    const c = client();
    const rows = data.filter(
      (r) => tagValue(r, "CLIENT") === c && tagValues(r, "PROJECT").includes(product),
    );
    const map = new Map<string, FeatureCell>();
    for (const r of rows) {
      for (const f of tagValues(r, "FEATURE")) {
        if (FEATURE_AREA[f] !== area) continue;
        if (!map.has(f)) {
          map.set(f, { feature: f, total: 0, truth: { True: 0, False: 0, Unknown: 0 } });
        }
        const cell = map.get(f)!;
        cell.total += 1;
        cell.truth[r.truth] += 1;
      }
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  };

  const totalForArea = (product: string, area: FeatureArea) =>
    cellFor(product, area).reduce((n, c) => n + c.total, 0);

  return (
    <MockBaseline
      sidebar={
        <TightStack style={{ width: "100%", "min-width": "0" }}>
          <TextLabel>By feature</TextLabel>
          <MutedBody>products × feature areas</MutedBody>
        </TightStack>
      }
      detail={
        <SpacedStack style={{ padding: "20px 24px", height: "100%", "min-height": "0" }}>
          <TightStack>
            <PageTitle style={{ margin: "0", "font-size": "1.25rem" }}>Statements by feature</PageTitle>
            <TextSublabel>
              Pick a client. Rows = feature area (UI / BG / API). Columns = product.
              Each cell lists the features touched in that area, with statement counts.
            </TextSublabel>
          </TightStack>

          <ClusterRow gap="xs" style={{ "flex-wrap": "wrap" }}>
            <For each={clientOrder()}>
              {(c) => (
                <button
                  onClick={() => setClient(c)}
                  style={{
                    padding: "4px 10px",
                    "border-radius": "999px",
                    border: `1px solid ${
                      client() === c
                        ? "var(--sui-accent, #4ea1ff)"
                        : "var(--sui-border, rgba(255,255,255,0.18))"
                    }`,
                    background:
                      client() === c
                        ? "var(--sui-bg-elevated, rgba(78,161,255,0.15))"
                        : "transparent",
                    color:
                      client() === c
                        ? "var(--sui-text-primary, inherit)"
                        : "var(--sui-text-muted, #888)",
                    "font-size": "12px",
                    cursor: "pointer",
                  }}
                >
                  {c}
                </button>
              )}
            </For>
          </ClusterRow>

          <Show
            when={productsForClient().length > 0}
            fallback={<MutedBody>no projects under this client</MutedBody>}
          >
            <div
              style={{
                display: "grid",
                "grid-template-columns": `60px repeat(${productsForClient().length}, minmax(160px, 1fr))`,
                gap: "8px",
                "align-items": "stretch",
                "max-width": "100%",
              }}
            >
              {/* corner spacer */}
              <div />
              {/* product column headers */}
              <For each={productsForClient()}>
                {(p) => (
                  <div
                    style={{
                      "font-size": "11px",
                      "font-weight": 600,
                      "text-transform": "uppercase",
                      "letter-spacing": "0.06em",
                      color: "var(--sui-text-primary, inherit)",
                      "padding-bottom": "4px",
                      "border-bottom": "1px solid var(--sui-border, rgba(255,255,255,0.18))",
                    }}
                  >
                    {p}
                  </div>
                )}
              </For>

              <For each={FEATURE_AREAS}>
                {(area) => (
                  <>
                    {/* row header */}
                    <div
                      style={{
                        "font-size": "11px",
                        "font-weight": 600,
                        color: "var(--sui-text-muted, #888)",
                        "padding-top": "8px",
                      }}
                    >
                      {area}
                    </div>
                    {/* cells across all products */}
                    <For each={productsForClient()}>
                      {(product) => {
                        const cells = cellFor(product, area);
                        return (
                          <div
                            style={{
                              "min-height": "60px",
                              padding: "6px 8px",
                              border: "1px solid var(--sui-border, rgba(255,255,255,0.12))",
                              "border-radius": "4px",
                              background: "var(--sui-bg-elevated, rgba(255,255,255,0.04))",
                              display: "flex",
                              "flex-direction": "column",
                              gap: "4px",
                            }}
                            title={`${product} · ${area} · ${totalForArea(product, area)} statements`}
                          >
                            <Show
                              when={cells.length > 0}
                              fallback={
                                <span
                                  style={{
                                    "font-size": "10px",
                                    color: "var(--sui-text-muted, #888)",
                                    "font-style": "italic",
                                    "align-self": "center",
                                    margin: "auto",
                                  }}
                                >
                                  —
                                </span>
                              }
                            >
                              <For each={cells}>
                                {(c) => (
                                  <div
                                    style={{
                                      display: "flex",
                                      "justify-content": "space-between",
                                      "align-items": "center",
                                      gap: "8px",
                                      padding: "2px 6px",
                                      "border-radius": "3px",
                                      background: "var(--sui-bg-deep, rgba(0,0,0,0.2))",
                                      "font-size": "11px",
                                    }}
                                  >
                                    <span
                                      style={{
                                        "white-space": "nowrap",
                                        overflow: "hidden",
                                        "text-overflow": "ellipsis",
                                        "min-width": "0",
                                      }}
                                    >
                                      {c.feature}
                                    </span>
                                    <span
                                      style={{
                                        color: "var(--sui-text-muted, #888)",
                                        "font-family": "var(--sui-mono, monospace)",
                                        "font-size": "10px",
                                      }}
                                    >
                                      {c.total}
                                    </span>
                                  </div>
                                )}
                              </For>
                            </Show>
                          </div>
                        );
                      }}
                    </For>
                  </>
                )}
              </For>
            </div>
          </Show>
        </SpacedStack>
      }
    />
  );
};

// ---- completion-bars step --------------------------------------------------

interface CompletionVariant {
  label: string;
  hint: string;
  todo: number;
  doing: number;
  done: number;
}

const COMPLETION_VARIANTS: CompletionVariant[] = [
  { label: "nothing complete", hint: "5 todo · 0 doing · 0 done",   todo: 5, doing: 0, done: 0 },
  { label: "just started",     hint: "4 todo · 1 doing · 0 done",   todo: 4, doing: 1, done: 0 },
  { label: "mid-flight",       hint: "2 todo · 1 doing · 2 done",   todo: 2, doing: 1, done: 2 },
  { label: "almost done",      hint: "0 todo · 1 doing · 4 done",   todo: 0, doing: 1, done: 4 },
  { label: "everything done",  hint: "0 todo · 0 doing · 5 done",   todo: 0, doing: 0, done: 5 },
];

const CompletionBar: Component<{ v: CompletionVariant; height?: number }> = (p) => {
  const total = () => p.v.todo + p.v.doing + p.v.done || 1;
  const segments = () => {
    const t = total();
    return [
      { percentage: (p.v.done / t) * 100,  color: "var(--sui-success, #2a6)",    label: String(p.v.done) },
      { percentage: (p.v.doing / t) * 100, color: "var(--sui-info, #4ea1ff)",    label: String(p.v.doing) },
      { percentage: (p.v.todo / t) * 100,  color: "var(--sui-text-muted, #555)", label: String(p.v.todo) },
    ];
  };
  return (
    <div
      title={`done: ${p.v.done} · doing: ${p.v.doing} · todo: ${p.v.todo}`}
      style={{ width: "100%", height: `${p.height ?? 10}px` }}
    >
      <StackedProgressBar
        segments={segments()}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
};

// Ratio-bar variant of CompletionBar: uses CSS grid with `<count>fr` per
// segment instead of percentage-based absolute positioning, so the segment
// widths are exactly the ratio of their counts. The bar itself is capped at
// 400px (4px per percent at 100%) and otherwise fills its container.
const RatioCompletionBar: Component<{ v: CompletionVariant; height?: number }> = (p) => {
  const total = () => p.v.todo + p.v.doing + p.v.done || 1;
  // grid-template-columns string: "<done>fr <doing>fr <todo>fr". Zero-count
  // tracks collapse cleanly because 0fr → 0 width.
  const cols = () => `${p.v.done}fr ${p.v.doing}fr ${p.v.todo}fr`;
  const seg = (count: number, color: string) => (
    <div
      style={{
        background: color,
        display: "flex",
        "align-items": "center",
        "justify-content": "center",
        overflow: "hidden",
        "container-type": "inline-size",
      }}
    >
      <Show when={count > 0}>
        <span class="stacked-progress-bar__segment-label">{count}</span>
      </Show>
    </div>
  );
  return (
    <div
      title={`done: ${p.v.done} · doing: ${p.v.doing} · todo: ${p.v.todo}`}
      style={{
        width: "100%",
        "max-width": "400px",
        height: `${p.height ?? 18}px`,
        display: "grid",
        "grid-template-columns": cols(),
        "border-radius": "2px",
        overflow: "hidden",
        background: "var(--stacked-bar-bg, rgba(0, 168, 204, 0.15))",
      }}
    >
      {seg(p.v.done, "var(--sui-success, #2a6)")}
      {seg(p.v.doing, "var(--sui-info, #4ea1ff)")}
      {seg(p.v.todo, "var(--sui-text-muted, #555)")}
    </div>
  );
};

const SAMPLE_VARIANT: CompletionVariant = COMPLETION_VARIANTS[2]; // mid-flight: 2/1/2

// Queue of 10 tasks progressing strictly one at a time. Each task is its own
// chip in a row; a single transition fires each tick (1s), advancing the
// in-flight task forward. Chip colors transition smoothly via CSS so the
// step appears as a wave moving through the queue.

type TaskState = "todo" | "doing" | "done";

const QUEUE_LENGTH = 10;
const QUEUE_TICK_MS = 1000;

const QueueAnimation: Component = () => {
  const [tasks, setTasks] = createSignal<TaskState[]>(
    Array.from({ length: QUEUE_LENGTH }, () => "todo" as TaskState),
  );
  // The bar wants explicit "in-flight" info to keep its overlay anchored:
  //   activeIdx — which task slot the overlay is on
  //   activePhase — 'doing' (blue) | 'done' (green) | 'idle' (transparent)
  // This is derived from the same step counter as `tasks` but exposed
  // separately so the bar can fade-in-place on doing→done.
  const [activeIdx, setActiveIdx] = createSignal<number | null>(null);
  const [activePhase, setActivePhase] = createSignal<"doing" | "done" | "idle">("idle");
  const [done, setDone] = createSignal(false);
  let timer: number | undefined;
  let step = 0;

  const start = () => {
    if (timer !== undefined) window.clearTimeout(timer);
    step = 0;
    setDone(false);
    setActiveIdx(null);
    setActivePhase("idle");
    setTasks(Array.from({ length: QUEUE_LENGTH }, () => "todo"));
    const tick = () => {
      step += 1;
      if (step > QUEUE_LENGTH * 2) {
        timer = undefined;
        setDone(true);
        setActivePhase("idle");
        return;
      }
      const idx = Math.floor((step - 1) / 2);
      const isOdd = step % 2 === 1;
      const newState: TaskState = isOdd ? "doing" : "done";
      setTasks((prev) => {
        const next = prev.slice();
        next[idx] = newState;
        return next;
      });
      setActiveIdx(idx);
      setActivePhase(isOdd ? "doing" : "done");
      timer = window.setTimeout(tick, QUEUE_TICK_MS);
    };
    timer = window.setTimeout(tick, QUEUE_TICK_MS);
  };

  onMount(start);
  onCleanup(() => {
    if (timer !== undefined) window.clearTimeout(timer);
  });

  const counts = () => {
    const t = tasks();
    return {
      todo: t.filter((x) => x === "todo").length,
      doing: t.filter((x) => x === "doing").length,
      done: t.filter((x) => x === "done").length,
    };
  };

  const bgFor = (s: TaskState): string =>
    s === "done"
      ? "var(--sui-success, #2a6)"
      : s === "doing"
      ? "var(--sui-info, #4ea1ff)"
      : "var(--sui-text-muted, #555)";

  return (
    <TightStack>
      <ClusterRow style={{ "justify-content": "space-between" }}>
        <TextLabel>
          {counts().done}/{QUEUE_LENGTH} done
          {counts().doing > 0 ? ` · 1 in flight` : done() ? " · ✓" : ""}
        </TextLabel>
        <Show when={done()}>
          <button
            onClick={start}
            style={{
              padding: "2px 10px",
              "border-radius": "999px",
              border: "1px solid var(--sui-border, rgba(255,255,255,0.18))",
              background: "transparent",
              color: "var(--sui-text-muted, #888)",
              cursor: "pointer",
              "font-size": "11px",
            }}
          >
            ↻ replay
          </button>
        </Show>
      </ClusterRow>
      <SlotFillBar
        slots={QUEUE_LENGTH}
        done={counts().done}
        active={
          activePhase() === "idle" || activeIdx() === null
            ? null
            : { index: activeIdx()!, phase: activePhase() as "doing" | "done" }
        }
      />
    </TightStack>
  );
};


const CONTAINER_SIZES: { label: string; width: number }[] = [
  { label: "container 50px (cramped)",   width: 50 },
  { label: "container 400px (at the cap)", width: 400 },
  { label: "container 1000px (capped at 400)", width: 1000 },
];

const CompletionBarsStep: Component = () => (
  <MockBaseline
    sidebar={
      <TightStack style={{ width: "100%", "min-width": "0" }}>
        <TextLabel>Completion bars</TextLabel>
        <MutedBody>5 variants + 3 container sizes</MutedBody>
      </TightStack>
    }
    detail={
      <SpacedStack style={{ padding: "20px 24px", height: "100%", "min-height": "0" }}>
        <TightStack>
          <PageTitle style={{ margin: "0", "font-size": "1.25rem" }}>Completion bars</PageTitle>
          <TextSublabel>
            Done <span style={{ color: "var(--sui-success, #2a6)" }}>■</span>
            {"  "}Doing <span style={{ color: "var(--sui-info, #4ea1ff)" }}>■</span>
            {"  "}Todo <span style={{ color: "var(--sui-text-muted, #888)" }}>■</span>
          </TextSublabel>
        </TightStack>

        <NarrowStack gap="md" style={{ "max-width": "640px" }}>
          <For each={COMPLETION_VARIANTS}>
            {(v) => (
              <TightStack>
                <TextLabel>{v.label}</TextLabel>
                <CompletionBar v={v} height={18} />
              </TightStack>
            )}
          </For>
        </NarrowStack>

        <TightStack style={{ "margin-top": "24px" }}>
          <PageTitle style={{ margin: "0", "font-size": "1.05rem" }}>Container width responsiveness</PageTitle>
          <TextSublabel>
            Same data ({SAMPLE_VARIANT.done}/{SAMPLE_VARIANT.doing}/{SAMPLE_VARIANT.todo}). Bar caps at 400px (4px per percent); below that it fills its container. Segment widths are
            grid-fr ratios of their counts.
          </TextSublabel>
        </TightStack>

        <NarrowStack gap="md">
          <For each={CONTAINER_SIZES}>
            {(c) => (
              <TightStack>
                <TextLabel>{c.label}</TextLabel>
                <div
                  style={{
                    width: `${c.width}px`,
                    border: "1px dashed var(--sui-border, rgba(255,255,255,0.18))",
                    padding: "4px",
                  }}
                >
                  <RatioCompletionBar v={SAMPLE_VARIANT} height={18} />
                </div>
              </TightStack>
            )}
          </For>
        </NarrowStack>

        <TightStack style={{ "margin-top": "24px" }}>
          <PageTitle style={{ margin: "0", "font-size": "1.05rem" }}>Queue of 10 tasks</PageTitle>
          <TextSublabel>
            Strictly serial: one task at a time goes todo → doing → done. Each
            transition every 1s; total run ~20s.
          </TextSublabel>
        </TightStack>

        <QueueAnimation />
      </SpacedStack>
    }
  />
);

// ---- 100-statements stub + table step --------------------------------------

interface TaggedStatement {
  id: string;
  description: string;
  status: "Drafted" | "Proposed" | "InProgress" | "AwaitingReview" | "Closed";
  truth: "True" | "False" | "Unknown";
  tags: string[];
}

// Cross-cutting test data: clients and projects are independent dimensions —
// the same project name can appear under multiple clients and vice versa
// (think shared internal tools like AMYGDALA or JTF that several clients
// adopt). Every tagged statement also carries FEATURE:SOLID-UI-COMPONENTS
// because every project consumes the design system; many statements *also*
// touch a specific sub-feature (DAG-CHART, AUTH, etc.), so a row can have
// multiple FEATURE tags.
const HUNDRED_CLIENTS = [
  "STAX", "PRIMESTAGE", "NETSUITE", "ASAP", "JOYJA", "ATLAS",
] as const;

const HUNDRED_PROJECTS = [
  "AMYGDALA", "JTF", "PEARLA", "DSIDE", "FACTORY", "RHINO", "WELLAPPOINT",
] as const;

const SHARED_FEATURE = "SOLID-UI-COMPONENTS";

const HUNDRED_SUB_FEATURES = [
  "DAG-CHART", "AUTH", "BILLING", "IMPORT", "EXPORT", "DASHBOARD", "METRICS",
  "SCHEMA", "MIGRATION", "REPORTING", "WEBHOOKS", "API", "ONBOARDING",
  "PERFORMANCE", "OBSERVABILITY", "SETTINGS", "SEARCH", "NOTIFICATIONS",
];

const HUNDRED_TAGGED_DESCRIPTIONS = [
  "Add tooltip on $FEATURE node hover",
  "Fix race condition in $FEATURE save handler",
  "Refactor $FEATURE column resolution to share with backend",
  "Tighten error message when $FEATURE upload fails mid-stream",
  "Document the $FEATURE state machine in the architecture doc",
  "Investigate $FEATURE slow path on cold cache",
  "Add per-row loading skeleton to $FEATURE list",
  "Improve empty-state copy on $FEATURE",
  "Add keyboard shortcuts to $FEATURE",
  "Wire $FEATURE up to the new audit-log table",
  "Migrate $FEATURE to the v2 endpoint",
  "Reduce $FEATURE bundle size by lazy-loading",
  "Surface validation errors inline on $FEATURE",
  "Add CSV export to $FEATURE",
  "Backfill $FEATURE history for legacy tenants",
];

const HUNDRED_GENERIC_DESCRIPTIONS = [
  "Set up new laptop",
  "Investigate flaky CI test in shared/utils",
  "Pick a new password manager",
  "Schedule dentist appointment",
  "Research alternatives to current bug tracker",
  "Reply to recruiter email",
  "Update Slack profile photo",
  "Write retro notes for last sprint",
  "File expense report for travel",
  "Renew SSL certificate",
  "Clear out old Docker images on dev box",
  "Fix typo in README",
  "Audit npm dependencies for high-severity advisories",
  "Triage backlog of unassigned issues",
  "Tag v0.x release in git",
  "Review PR from intern",
  "Deflake the integration test suite",
  "Write a migration script for the new schema",
  "Test the deploy on staging",
  "Document onboarding for the new hire",
];

const STATUSES: TaggedStatement["status"][] = [
  "Drafted", "Proposed", "InProgress", "AwaitingReview", "Closed",
];
const TRUTHS: TaggedStatement["truth"][] = ["Unknown", "True", "False"];

const generate100Statements = (): TaggedStatement[] => {
  let s = 73;
  const rand = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
  const out: TaggedStatement[] = [];
  // 60 tagged — independent client × project so values cross-cut.
  for (let i = 0; i < 60; i++) {
    const client = pick(HUNDRED_CLIENTS);
    const project = pick(HUNDRED_PROJECTS);
    const subFeature = pick(HUNDRED_SUB_FEATURES);
    const tmpl = pick(HUNDRED_TAGGED_DESCRIPTIONS);
    // Every tagged row carries the shared SOLID-UI-COMPONENTS feature; ~60%
    // of them also touch a specific sub-feature, so FEATURE is multi-valued
    // on those rows.
    const features = [SHARED_FEATURE];
    if (rand() < 0.6) features.push(subFeature);
    out.push({
      id: `s-${i + 1}`,
      description: tmpl.replace("$FEATURE", subFeature.toLowerCase().replace(/-/g, " ")),
      status: pick(STATUSES),
      truth: pick(TRUTHS),
      tags: [
        `CLIENT:${client}`,
        `PROJECT:${project}`,
        ...features.map((f) => `FEATURE:${f}`),
      ],
    });
  }
  // 40 untagged / generic
  for (let i = 60; i < 100; i++) {
    out.push({
      id: `s-${i + 1}`,
      description: pick(HUNDRED_GENERIC_DESCRIPTIONS),
      status: pick(STATUSES),
      truth: pick(TRUTHS),
      tags: [],
    });
  }
  // Shuffle so tagged + untagged interleave deterministically.
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  // Reassign sequential ids after shuffle so the # column is monotonic.
  return out.map((row, i) => ({ ...row, id: `s-${i + 1}` }));
};

// ---- 100-statements pivot tree -------------------------------------------

type PivotDim = "CLIENT" | "PROJECT" | "FEATURE";
const PIVOT_DIMS: PivotDim[] = ["CLIENT", "PROJECT", "FEATURE"];

// Returns ALL values for a given dimension on a row. FEATURE is multi-valued
// on ~60% of tagged rows (every tagged row has SOLID-UI-COMPONENTS, plus
// often a specific sub-feature). CLIENT and PROJECT are single-valued today
// but the API is symmetric so both pivot directions work.
const tagValues = (s: TaggedStatement, dim: PivotDim): string[] => {
  const prefix = `${dim}:`;
  return s.tags.filter((x) => x.startsWith(prefix)).map((x) => x.slice(prefix.length));
};

// Convenience for the rare caller that wants only the first value.
const tagValue = (s: TaggedStatement, dim: PivotDim): string | null =>
  tagValues(s, dim)[0] ?? null;

interface PivotBucket {
  key: string;
  total: number;
  truth: { True: number; False: number; Unknown: number };
  tasks: { todo: number; doing: number; done: number };
  children: PivotBucket[];
}

// Map workflow statuses → coarse task bucket.
//   todo  : not picked up yet
//   doing : actively being worked / under review
//   done  : closed / shipped
const taskBucket = (status: TaggedStatement["status"]): "todo" | "doing" | "done" => {
  switch (status) {
    case "Drafted":
    case "Proposed":
      return "todo";
    case "InProgress":
    case "AwaitingReview":
      return "doing";
    case "Closed":
      return "done";
  }
};

const tallyTasks = (rows: TaggedStatement[]): PivotBucket["tasks"] => {
  const t = { todo: 0, doing: 0, done: 0 };
  for (const r of rows) t[taskBucket(r.status)] += 1;
  return t;
};

// Bucket rows by outer × inner dimension. Multi-valued tags (e.g. a row
// with both FEATURE:SOLID-UI-COMPONENTS and FEATURE:DAG-CHART) contribute
// to *every* matching bucket — counts can therefore exceed total row count
// when one or both axes is multi-valued.
const bucketByDims = (
  rows: TaggedStatement[],
  outer: PivotDim,
  inner: PivotDim,
): PivotBucket[] => {
  const outerMap = new Map<string, TaggedStatement[]>();
  for (const r of rows) {
    for (const ov of tagValues(r, outer)) {
      if (!outerMap.has(ov)) outerMap.set(ov, []);
      outerMap.get(ov)!.push(r);
    }
  }
  const out: PivotBucket[] = [];
  for (const [ok, group] of outerMap) {
    const innerMap = new Map<string, TaggedStatement[]>();
    for (const r of group) {
      const ivs = tagValues(r, inner);
      if (ivs.length === 0) {
        const arr = innerMap.get("—") ?? [];
        arr.push(r);
        innerMap.set("—", arr);
      } else {
        for (const iv of ivs) {
          const arr = innerMap.get(iv) ?? [];
          arr.push(r);
          innerMap.set(iv, arr);
        }
      }
    }
    const children: PivotBucket[] = [];
    for (const [ik, sub] of innerMap) {
      children.push({
        key: ik,
        total: sub.length,
        truth: {
          True: sub.filter((r) => r.truth === "True").length,
          False: sub.filter((r) => r.truth === "False").length,
          Unknown: sub.filter((r) => r.truth === "Unknown").length,
        },
        tasks: tallyTasks(sub),
        children: [],
      });
    }
    children.sort((a, b) => b.total - a.total);
    // Container task counts = sum of children. (When the inner axis is
    // multi-valued — e.g. FEATURE — a row can land in multiple children, so
    // summing children would over-count. Instead, tally the outer group
    // directly so containers stay honest.)
    out.push({
      key: ok,
      total: group.length,
      truth: {
        True: group.filter((r) => r.truth === "True").length,
        False: group.filter((r) => r.truth === "False").length,
        Unknown: group.filter((r) => r.truth === "Unknown").length,
      },
      tasks: tallyTasks(group),
      children,
    });
  }
  out.sort((a, b) => b.total - a.total);
  return out;
};

const TruthBar: Component<{ truth: PivotBucket["truth"]; total: number }> = (p) => {
  const segments = () => {
    const t = p.total || 1;
    return [
      { percentage: (p.truth.True / t) * 100, color: "var(--sui-success, #2a6)" },
      { percentage: (p.truth.False / t) * 100, color: "var(--sui-danger, #c33)" },
      { percentage: (p.truth.Unknown / t) * 100, color: "var(--sui-text-muted, #888)" },
    ];
  };
  const tip = () =>
    `True: ${p.truth.True} · False: ${p.truth.False} · Unknown: ${p.truth.Unknown}`;
  return (
    <div title={tip()} style={{ height: "6px", width: "100%" }}>
      <StackedProgressBar segments={segments()} />
    </div>
  );
};

const TaskBar: Component<{ tasks: PivotBucket["tasks"] }> = (p) => {
  const total = () => p.tasks.todo + p.tasks.doing + p.tasks.done || 1;
  const segments = () => {
    const t = total();
    return [
      { percentage: (p.tasks.done / t) * 100, color: "var(--sui-success, #2a6)" },
      { percentage: (p.tasks.doing / t) * 100, color: "var(--sui-info, #4ea1ff)" },
      { percentage: (p.tasks.todo / t) * 100, color: "var(--sui-text-muted, #555)" },
    ];
  };
  const tip = () =>
    `done: ${p.tasks.done} · doing: ${p.tasks.doing} · todo: ${p.tasks.todo}`;
  return (
    <div title={tip()} style={{ height: "6px", width: "100%" }}>
      <StackedProgressBar segments={segments()} />
    </div>
  );
};

// Compact "done/doing/todo" counts as text. Used in the outer title row
// where a bar would compete with the truth bar visually.
const TaskCounts: Component<{ tasks: PivotBucket["tasks"] }> = (p) => (
  <span
    style={{
      "font-size": "10px",
      "font-family": "var(--sui-mono, monospace)",
      display: "inline-flex",
      gap: "4px",
    }}
    title={`done: ${p.tasks.done} · doing: ${p.tasks.doing} · todo: ${p.tasks.todo}`}
  >
    <span style={{ color: "var(--sui-success, #2a6)" }}>✓{p.tasks.done}</span>
    <span style={{ color: "var(--sui-info, #4ea1ff)" }}>•{p.tasks.doing}</span>
    <span style={{ color: "var(--sui-text-muted, #888)" }}>○{p.tasks.todo}</span>
  </span>
);

interface PivotSelection {
  outerKey: string;
  innerKey: string | null; // null = the whole outer bucket (or the untagged group)
  scope: "tagged" | "untagged";
}

const PivotTreemap: Component<{
  rows: TaggedStatement[];
  outer: PivotDim;
  inner: PivotDim;
  untaggedCount: number;
  selection: PivotSelection | null;
  onSelect: (sel: PivotSelection | null) => void;
}> = (p) => {
  const buckets = () => bucketByDims(p.rows, p.outer, p.inner);

  const isLeafSelected = (ok: string, ik: string) =>
    p.selection?.scope === "tagged" &&
    p.selection.outerKey === ok &&
    p.selection.innerKey === ik;

  const isOuterSelected = (ok: string) =>
    p.selection?.scope === "tagged" &&
    p.selection.outerKey === ok &&
    p.selection.innerKey === null;

  const isUntaggedSelected = () => p.selection?.scope === "untagged";

  const toggleLeaf = (ok: string, ik: string) => {
    if (isLeafSelected(ok, ik)) p.onSelect(null);
    else p.onSelect({ outerKey: ok, innerKey: ik, scope: "tagged" });
  };
  const toggleOuter = (ok: string) => {
    if (isOuterSelected(ok)) p.onSelect(null);
    else p.onSelect({ outerKey: ok, innerKey: null, scope: "tagged" });
  };
  const toggleUntagged = () => {
    if (isUntaggedSelected()) p.onSelect(null);
    else p.onSelect({ outerKey: "", innerKey: null, scope: "untagged" });
  };

  return (
    <ProportionalStack
      direction="row"
      gap="sm"
      style={{
        // Outer boxes stretch to the tallest sibling. Cap so a long tail of
        // inner cells doesn't push the table off-screen — overflow scrolls
        // inside the box instead of bleeding out.
        height: "auto",
        "min-height": "180px",
        "max-height": "320px",
        "align-items": "stretch",
      }}
    >
      <For each={buckets()}>
        {(b) => (
          <ProportionalItem
            weight={b.total}
            scrollWhenSmall={false}
            style={{
              border: `1px solid ${
                isOuterSelected(b.key)
                  ? "var(--sui-accent, #4ea1ff)"
                  : "var(--sui-border, rgba(255,255,255,0.12))"
              }`,
              "border-radius": "4px",
              padding: "8px",
              gap: "6px",
              "min-width": "0",
              background: "var(--sui-bg-elevated, rgba(255,255,255,0.04))",
            }}
          >
            <div
              onClick={(e) => {
                // Click the title row to filter on the whole outer bucket.
                e.stopPropagation();
                toggleOuter(b.key);
              }}
              style={{
                display: "flex",
                "align-items": "baseline",
                "justify-content": "space-between",
                gap: "8px",
                "min-width": 0,
                cursor: "pointer",
                "user-select": "none",
              }}
              title={`Click to filter table to ${p.outer}=${b.key}`}
            >
              <span style={{ "font-size": "11px", "font-weight": 600, "white-space": "nowrap", overflow: "hidden", "text-overflow": "ellipsis" }}>
                {b.key}
              </span>
              <span
                style={{ display: "inline-flex", "align-items": "baseline", gap: "6px", "font-size": "10px", color: "var(--sui-text-muted, #888)" }}
                title={`direct tally: ${b.tasks.done} done · ${b.tasks.doing} doing · ${b.tasks.todo} todo`}
              >
                <span>· {b.total}</span>
              </span>
            </div>
            {(() => {
              let slots = 0;
              let done = 0;
              for (const c of b.children) {
                slots += c.total;
                done += c.tasks.done;
              }
              return (
                <div style={{ width: "100%" }}>
                  <SlotFillBar
                    slots={slots}
                    done={done}
                    active={null}
                    height={4}
                    maxWidth={null}
                    label={`${done}/${slots} done (sum of children)`}
                  />
                </div>
              );
            })()}
            <div
              style={{
                flex: "1 1 auto",
                "min-height": 0,
                display: "flex",
                gap: "4px",
                "flex-wrap": "wrap",
                "align-content": "flex-start",
                "overflow-y": "auto",
              }}
            >
              <For each={b.children}>
                {(c) => (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLeaf(b.key, c.key);
                    }}
                    title={`Click to filter table to ${p.outer}=${b.key}, ${p.inner}=${c.key}`}
                    style={{
                      flex: `${c.total} 1 60px`,
                      "min-width": "60px",
                      padding: "4px 6px",
                      border: `1px solid ${
                        isLeafSelected(b.key, c.key)
                          ? "var(--sui-accent, #4ea1ff)"
                          : "var(--sui-border, rgba(255,255,255,0.12))"
                      }`,
                      "border-radius": "3px",
                      background: isLeafSelected(b.key, c.key)
                        ? "var(--sui-bg-elevated, rgba(78,161,255,0.12))"
                        : "var(--sui-bg-deep, rgba(0,0,0,0.2))",
                      display: "flex",
                      "flex-direction": "column",
                      gap: "4px",
                      "min-height": "0",
                      overflow: "hidden",
                      cursor: "pointer",
                      "user-select": "none",
                    }}
                  >
                    <div style={{ display: "flex", "justify-content": "space-between", "font-size": "10px", "min-width": 0, gap: "4px" }}>
                      <span style={{ "white-space": "nowrap", overflow: "hidden", "text-overflow": "ellipsis", "font-weight": 500 }}>
                        {c.key}
                      </span>
                      <span style={{ color: "var(--sui-text-muted, #888)" }}>{c.total}</span>
                    </div>
                    <SlotFillBar
                      slots={c.total}
                      done={c.tasks.done}
                      active={null}
                      height={6}
                      maxWidth={null}
                      label={`${c.tasks.done}/${c.total} done · ${c.tasks.doing} doing · ${c.tasks.todo} todo`}
                    />
                  </div>
                )}
              </For>
            </div>
          </ProportionalItem>
        )}
      </For>
      <Show when={p.untaggedCount > 0}>
        <ProportionalItem
          weight={p.untaggedCount}
          scrollWhenSmall={false}
          style={{
            border: `1px dashed ${
              isUntaggedSelected()
                ? "var(--sui-accent, #4ea1ff)"
                : "var(--sui-border, rgba(255,255,255,0.12))"
            }`,
            "border-radius": "4px",
            padding: "8px",
            "min-width": "0",
            opacity: isUntaggedSelected() ? 1 : 0.6,
            display: "flex",
            "flex-direction": "column",
            "justify-content": "center",
            "align-items": "center",
            "text-align": "center",
            cursor: "pointer",
            "user-select": "none",
          }}
          onClick={() => toggleUntagged()}
          title="Click to filter table to untagged rows"
        >
          <div style={{ "font-size": "11px", "font-weight": 600 }}>untagged</div>
          <div style={{ "font-size": "10px", color: "var(--sui-text-muted, #888)" }}>{p.untaggedCount} rows</div>
        </ProportionalItem>
      </Show>
    </ProportionalStack>
  );
};

// Drag-to-reorder pills. The order signal is a permutation of PIVOT_DIMS:
// position 0 = outer dimension, position 1 = inner dimension, position 2 =
// unused (greyed out). Drag any pill onto another to swap their slots.
const PivotPills: Component<{
  order: PivotDim[];
  setOrder: (next: PivotDim[]) => void;
}> = (p) => {
  const [dragFrom, setDragFrom] = createSignal<number | null>(null);
  const [dragOver, setDragOver] = createSignal<number | null>(null);

  const onDrop = (toIdx: number) => {
    const from = dragFrom();
    setDragFrom(null);
    setDragOver(null);
    if (from == null || from === toIdx) return;
    const next = p.order.slice();
    [next[from], next[toIdx]] = [next[toIdx], next[from]];
    p.setOrder(next);
  };

  const slotLabel = (idx: number) =>
    idx === 0 ? "outer" : idx === 1 ? "inner" : "unused";

  const pillStyle = (idx: number, isDragOver: boolean) => {
    const active = idx < 2;
    return {
      display: "inline-flex",
      "align-items": "center",
      gap: "6px",
      padding: "4px 10px",
      "border-radius": "999px",
      "font-size": "12px",
      "font-weight": 500,
      cursor: "grab",
      "user-select": "none" as const,
      border: `1px solid ${
        isDragOver
          ? "var(--sui-accent, #4ea1ff)"
          : active
          ? "var(--sui-border-strong, rgba(255,255,255,0.3))"
          : "var(--sui-border, rgba(255,255,255,0.12))"
      }`,
      background: isDragOver
        ? "var(--sui-bg-elevated, rgba(255,255,255,0.08))"
        : active
        ? "var(--sui-bg-elevated, rgba(255,255,255,0.04))"
        : "transparent",
      color: active
        ? "var(--sui-text-primary, inherit)"
        : "var(--sui-text-muted, #888)",
      opacity: active ? 1 : 0.55,
    };
  };

  return (
    <ClusterRow gap="sm" style={{ "font-size": "12px", "flex-wrap": "wrap" }}>
      <span style={{ color: "var(--sui-text-muted, #888)" }}>
        drag to reorder:
      </span>
      <For each={p.order}>
        {(dim, idx) => (
          <div
            style={{
              display: "flex",
              "flex-direction": "column",
              "align-items": "center",
              gap: "2px",
            }}
          >
            <span
              style={{
                "font-size": "9px",
                "text-transform": "uppercase",
                "letter-spacing": "0.06em",
                color:
                  idx() < 2
                    ? "var(--sui-text-muted, #888)"
                    : "var(--sui-text-muted, #888)",
                opacity: idx() < 2 ? 0.85 : 0.55,
              }}
            >
              {slotLabel(idx())}
              {idx() === 0 ? " ›" : ""}
            </span>
            <span
              draggable={true}
              onDragStart={(e) => {
                setDragFrom(idx());
                e.dataTransfer?.setData("text/plain", String(idx()));
                if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
                setDragOver(idx());
              }}
              onDragLeave={() => {
                if (dragOver() === idx()) setDragOver(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                onDrop(idx());
              }}
              onDragEnd={() => {
                setDragFrom(null);
                setDragOver(null);
              }}
              style={pillStyle(idx(), dragOver() === idx() && dragFrom() !== idx())}
              title="drag to swap with another pill"
            >
              <span style={{ opacity: 0.5, "font-size": "10px" }}>⋮⋮</span>
              {dim}
            </span>
          </div>
        )}
      </For>
    </ClusterRow>
  );
};

const Hundred100TableStep: Component = () => {
  const data = generate100Statements();
  const [pivotOrder, setPivotOrder] = createSignal<PivotDim[]>([
    "CLIENT",
    "PROJECT",
    "FEATURE",
  ]);
  const outer = () => pivotOrder()[0];
  const inner = () => pivotOrder()[1];
  const untaggedCount = data.filter((r) => r.tags.length === 0).length;

  const [selection, setSelection] = createSignal<PivotSelection | null>(null);

  const setOrderAndClear = (next: PivotDim[]) => {
    setPivotOrder(next);
    setSelection(null);
  };

  const filteredData = () => {
    const sel = selection();
    if (!sel) return data;
    if (sel.scope === "untagged") return data.filter((r) => r.tags.length === 0);
    return data.filter((r) => {
      if (!tagValues(r, outer()).includes(sel.outerKey)) return false;
      if (sel.innerKey !== null && !tagValues(r, inner()).includes(sel.innerKey)) return false;
      return true;
    });
  };

  const filterLabel = () => {
    const sel = selection();
    if (!sel) return null;
    if (sel.scope === "untagged") return "untagged";
    if (sel.innerKey === null) return `${outer()}=${sel.outerKey}`;
    return `${outer()}=${sel.outerKey} · ${inner()}=${sel.innerKey}`;
  };
  const columns = [
    { id: "id",          header: "#",           accessor: "id" as const,          width: "60px" },
    { id: "truth",       header: "Truth",       accessor: "truth" as const,       sortable: true, width: "80px" },
    { id: "status",      header: "Status",      accessor: "status" as const,      sortable: true, width: "120px" },
    { id: "description", header: "Description", accessor: "description" as const, sortable: true },
    {
      id: "tags",
      header: "Tags",
      accessor: (row: TaggedStatement) => row.tags.join(" · "),
      sortable: false,
    },
  ];
  return (
    <MockBaseline
      sidebar={
        <TightStack style={{ width: "100%", "min-width": "0" }}>
          <TextLabel>100 statements</TextLabel>
          <MutedBody>60 tagged · 40 generic</MutedBody>
        </TightStack>
      }
      detail={
        <SpacedStack style={{ padding: "16px 20px", height: "100%", "min-height": "0" }}>
          <TightStack>
            <PageTitle style={{ margin: "0", "font-size": "1.25rem" }}>Statements</PageTitle>
            <TextSublabel>{data.length} total · {data.length - untaggedCount} tagged · {untaggedCount} untagged</TextSublabel>
          </TightStack>

          <NarrowStack>
            <PivotPills order={pivotOrder()} setOrder={setOrderAndClear} />
            <PivotTreemap
              rows={data}
              outer={outer()}
              inner={inner()}
              untaggedCount={untaggedCount}
              selection={selection()}
              onSelect={setSelection}
            />
          </NarrowStack>

          <Show when={selection()}>
            <ClusterRow gap="sm" style={{ "font-size": "12px" }}>
              <span style={{ color: "var(--sui-text-muted, #888)" }}>filtered:</span>
              <span
                style={{
                  display: "inline-flex",
                  "align-items": "center",
                  gap: "6px",
                  padding: "2px 8px",
                  "border-radius": "999px",
                  background: "var(--sui-bg-elevated, rgba(78,161,255,0.12))",
                  border: "1px solid var(--sui-accent, #4ea1ff)",
                  color: "var(--sui-text-primary, inherit)",
                }}
              >
                {filterLabel()}
                <button
                  onClick={() => setSelection(null)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "inherit",
                    cursor: "pointer",
                    "font-size": "12px",
                    padding: "0 0 0 2px",
                  }}
                  title="clear filter"
                >
                  ×
                </button>
              </span>
              <span style={{ color: "var(--sui-text-muted, #888)" }}>
                · {filteredData().length} of {data.length}
              </span>
            </ClusterRow>
          </Show>

          <ScrollPanel style={{ "max-height": "calc(100vh - 460px)" }}>
            <BaseTable data={filteredData()} columns={columns} striped hoverable />
          </ScrollPanel>
        </SpacedStack>
      }
    />
  );
};

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
