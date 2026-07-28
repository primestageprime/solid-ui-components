// FIVE buckets, and a different shape of work from the triage demo next door.
//
// Triage is "one working queue, items leave it for terminal buckets". A
// PIPELINE is "every bucket is a stage, and an item walks the whole chain".
// Nothing about the component changes: `buckets` is just a longer array, and
// direction/distance still fall out of bucket order, so Inbox → Shipped is one
// four-hop transfer with no special casing.
import { type JSX, createSignal, Show } from "solid-js";
import {
  BucketQueue,
  type Bucket,
} from "../../../src/components/BucketQueue";
import {
  SmallPrimaryButton,
  SmallGhostButton,
} from "../../../src/components/Button/variants";
import {
  MutedBody,
  EllipsizedTitle,
  FadedNowrapSublabel,
} from "../../../src/components/Text";
import {
  NarrowStack,
  WrappedClusterRow,
  SpreadRow,
} from "../../../src/components/Layout";

interface Ticket {
  id: string;
  title: string;
  owner: string;
  stage: string;
}

// Five stages in flow order. Two carry per-bucket sizing rules so the
// water-fill has something to do at N=5 rather than just splitting evenly:
// "In progress" takes a double share of any overflow, and "Blocked" is capped
// so a pile-up there scrolls instead of squeezing the stages around it.
const STAGES: Bucket[] = [
  { key: "inbox", label: "Inbox", tone: "accent", emptyLabel: "Nothing new" },
  { key: "triaged", label: "Triaged", tone: "default", emptyLabel: "Nothing triaged" },
  {
    key: "active",
    label: "In progress",
    tone: "warning",
    weight: 2,
    emptyLabel: "Nobody working",
  },
  {
    key: "blocked",
    label: "Blocked",
    tone: "danger",
    capRows: 2,
    emptyLabel: "Nothing blocked",
  },
  { key: "shipped", label: "Shipped", tone: "success", emptyLabel: "Nothing shipped yet" },
];

// "Blocked" starts EMPTY on purpose: an empty bucket in the middle of a
// populated bar is the case where the water-fill has to collapse it to its
// summary line rather than hand it a share.
const TICKETS: Ticket[] = [
  { id: "k1", title: "Rotate the staging certs", owner: "ops", stage: "inbox" },
  { id: "k2", title: "Duplicate rows in the fortnight export", owner: "data", stage: "inbox" },
  { id: "k3", title: "Dark theme contrast on chips", owner: "design", stage: "inbox" },
  { id: "k4", title: "Vessel-call ingest retries", owner: "backend", stage: "triaged" },
  { id: "k5", title: "Slow query on asset history", owner: "data", stage: "triaged" },
  { id: "k6", title: "Roving focus skips inert rows", owner: "frontend", stage: "active" },
  { id: "k7", title: "Batch move animation", owner: "frontend", stage: "active" },
  { id: "k8", title: "Compliance rollup caching", owner: "backend", stage: "active" },
  { id: "k9", title: "Deprecate SplitQueueList", owner: "frontend", stage: "shipped" },
];

const renderTicket = (t: Ticket): JSX.Element => (
  <SpreadRow>
    <EllipsizedTitle>{t.title}</EllipsizedTitle>
    <FadedNowrapSublabel>{t.owner}</FadedNowrapSublabel>
  </SpreadRow>
);

export function PipelineDemo() {
  const [tickets, setTickets] = createSignal<Ticket[]>(TICKETS);
  const [selected, setSelected] = createSignal<string | undefined>("k1");

  const selectedTicket = () => tickets().find((t) => t.id === selected());
  const stageIndex = () =>
    STAGES.findIndex((s) => s.key === selectedTicket()?.stage);

  const sendTo = (stage: string) => {
    const key = selected();
    if (!key) return;
    setTickets((rows) =>
      rows.map((r) => (r.id === key ? { ...r, stage } : r)),
    );
    // FOLLOW THE TICKET. The queue's own advance hands the selection to the next
    // item in the stage we just left — exactly right for triage, exactly wrong
    // here, where the point is to walk ONE ticket down the chain. Re-asserting
    // the selection after the mutation overrides it: the same last-word ordering
    // the triage demo uses for its bulk reset. Nothing about the component needs
    // to change; a consumer that disagrees with the advance simply gets the last
    // word, because it owns the selection.
    setSelected(key);
  };

  const step = (delta: 1 | -1) => {
    const target = STAGES[stageIndex() + delta];
    if (target) sendTo(target.key);
  };

  return (
    <NarrowStack>
      <WrappedClusterRow>
        <SmallGhostButton
          onClick={() => step(-1)}
          disabled={!selected() || stageIndex() <= 0}
        >
          ◀ Back a stage
        </SmallGhostButton>
        <SmallPrimaryButton
          onClick={() => step(1)}
          disabled={!selected() || stageIndex() >= STAGES.length - 1}
        >
          Advance a stage ▶
        </SmallPrimaryButton>
        <SmallGhostButton
          onClick={() => sendTo("blocked")}
          disabled={!selected() || selectedTicket()?.stage === "blocked"}
        >
          Block
        </SmallGhostButton>
        <SmallGhostButton
          onClick={() => sendTo("shipped")}
          disabled={!selected() || selectedTicket()?.stage === "shipped"}
        >
          Ship it ⏭
        </SmallGhostButton>
        <SmallGhostButton
          onClick={() => {
            setTickets(TICKETS);
            setSelected("k1");
          }}
        >
          Reset
        </SmallGhostButton>
      </WrappedClusterRow>

      <MutedBody>
        <Show when={selectedTicket()} fallback="Click any ticket to pick one up.">
          {(t) => (
            <>
              Carrying <strong>{t().title}</strong> — currently in{" "}
              <strong>{STAGES[stageIndex()]?.label}</strong> (stage{" "}
              {stageIndex() + 1} of {STAGES.length}). The selection FOLLOWS this
              ticket rather than advancing within the stage it leaves, so you can
              walk it to the end from one button. <em>Ship it</em> jumps straight
              to the last stage — a four-hop transfer from Inbox, animated the
              same as a single step.
            </>
          )}
        </Show>
      </MutedBody>

      <div class="bucket-queue-pipeline-demo">
        <BucketQueue<Ticket>
          buckets={STAGES}
          items={tickets()}
          bucketOf={(t) => t.stage}
          keyOf={(t) => t.id}
          renderItem={renderTicket}
          selectedKey={selected()}
          onSelect={(k) => setSelected(k ?? undefined)}
        />
      </div>
    </NarrowStack>
  );
}
