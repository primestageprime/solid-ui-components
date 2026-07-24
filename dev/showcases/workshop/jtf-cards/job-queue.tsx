// JTF Card Catalog — job-queue cards (src/components/JobQueue/JobCard.tsx).
// Two variants share the JobCard file: an expanded "active" card and a compact
// single-row "recent" card. Both are raw (`.job-card` CSS with a status-colored
// left accent border + PlainBox/PlainText), rebuilt here from Surface + Layout.
import { type JSX, Show } from "solid-js";
import {
  CardSurface,
  TightStack,
  SpreadRow,
  ClusterRow,
  TightClusterRow,
  GrowBox,
  TextBody,
  TextSublabel,
  MutedBody,
  DangerBody,
  Icon,
} from "../../../../src";
import { SmStatusBadge } from "../../../../src/components/Badge";
import { SmallGhostButton } from "../../../../src/components/Button";
import { CardBench, CardCase } from "./case";
import type { CardEntry } from "./shared";
import "./catalog.css";

// Status → StatusBadge variant, mirroring statusToBadgeVariant(). The
// left-accent color is painted per status by `.jtf-job-frame--{status}`.
const BADGE: Record<string, "compliant" | "violation" | "warning" | "pending" | "info"> = {
  queued: "pending",
  in_progress: "info",
  completed: "compliant",
  failed: "violation",
  cancelled: "warning",
};

// A left-accent-bordered frame. `.job-card` bakes a 3px status-colored left
// border; here `.jtf-job-frame--{status}` paints it (a raw-form geometry note,
// same as the table catalog's raw entries).
function JobFrame(props: { status: string; children: JSX.Element }): JSX.Element {
  return (
    <div class={`jtf-job-frame jtf-job-frame--${props.status}`}>
      <CardSurface>{props.children}</CardSurface>
    </div>
  );
}

const ActiveJobCard = () => (
  <CardBench>
    <CardCase
      title="JobCard — active"
      width="340px"
      routes={["components/JobQueue/JobQueueModal.tsx", "global Layout job-queue modal"]}
      why="The expanded queue card, opened from the global job-queue indicator. Status-colored left accent + status badge; the progress message and Cancel share the timing row so it stays two lines. Shown for the in-progress and queued states."
    >
      <TightStack>
    <JobFrame status="in_progress">
      <TightStack>
        <SpreadRow>
          <TightClusterRow>
            <TextBody>MSC Bellissima</TextBody>
            <TextSublabel>xbox3-2</TextSublabel>
          </TightClusterRow>
          <SmStatusBadge variant={BADGE.in_progress}>in_progress</SmStatusBadge>
        </SpreadRow>
        <SpreadRow>
          <TextSublabel>Caching minute metrics… 640 / 1440</TextSublabel>
          <ClusterRow>
            <Icon name="clock" size="xs" />
            <TextSublabel>3m ago</TextSublabel>
          </ClusterRow>
        </SpreadRow>
      </TightStack>
    </JobFrame>

    <JobFrame status="queued">
      <TightStack>
        <SpreadRow>
          <TightClusterRow>
            <TextBody>Aframax Horizon</TextBody>
            <TextSublabel>xbox1-1</TextSublabel>
          </TightClusterRow>
          <SmStatusBadge variant={BADGE.queued}>queued</SmStatusBadge>
        </SpreadRow>
        <SpreadRow>
          <ClusterRow>
            <Icon name="clock" size="xs" />
            <TextSublabel>Requested 5m ago</TextSublabel>
          </ClusterRow>
          <SmallGhostButton>Cancel</SmallGhostButton>
        </SpreadRow>
      </TightStack>
    </JobFrame>
      </TightStack>
    </CardCase>
  </CardBench>
);

// Compact single-row recent card: status glyph, name, badge, duration,
// relative time; optional error box below.
function RecentRow(props: {
  status: "completed" | "failed" | "cancelled";
  name: string;
  duration?: string;
  ago: string;
  error?: string;
}): JSX.Element {
  const glyph = () =>
    props.status === "completed" ? "check" : props.status === "failed" ? "error" : "close";
  return (
    <JobFrame status={props.status}>
      <TightStack>
        <ClusterRow>
          <span class={`jtf-job-glyph--${props.status}`}>
            <Icon name={glyph()} />
          </span>
          <GrowBox>
            <TextBody>{props.name}</TextBody>
          </GrowBox>
          <SmStatusBadge variant={BADGE[props.status]}>{props.status}</SmStatusBadge>
          <Show when={props.duration}>
            <TextSublabel>{props.duration}</TextSublabel>
          </Show>
          <TextSublabel>{props.ago}</TextSublabel>
        </ClusterRow>
        <Show when={props.error}>
          <CardSurface>
            <DangerBody>{props.error}</DangerBody>
          </CardSurface>
        </Show>
      </TightStack>
    </JobFrame>
  );
}

const RecentJobCard = () => (
  <CardBench>
    <CardCase
      title="JobCard — recent"
      width="340px"
      routes={["components/JobQueue/JobQueueModal.tsx", "global Layout job-queue modal"]}
      why="The compact history entry below the active jobs: a single row of status glyph (check/error/close) + name + badge + duration + relative time. The error box appears only on failure."
    >
      <TightStack>
        <RecentRow status="completed" name="Pacific Trader" duration="2m 5s" ago="4h ago" />
        <RecentRow
          status="failed"
          name="Nordic Star"
          duration="0m 12s"
          ago="6h ago"
          error="Upstream timeout fetching FTIR series (asset xbox5-1)"
        />
        <RecentRow status="cancelled" name="Coral Voyager" ago="1d ago" />
      </TightStack>
    </CardCase>
  </CardBench>
);

export const ENTRIES: CardEntry[] = [
  {
    route: "JobQueue/JobCard",
    name: "JobCard — active",
    status: "raw",
    note: "Expanded queue card: title stack (vessel + asset) + StatusBadge, status-colored left accent, conditional Cancel (queued), progress-message box, clock timing footer. Raw `.job-card` CSS — rebuilt from Surface + Layout.",
    component: ActiveJobCard,
  },
  {
    route: "JobQueue/JobCard",
    name: "JobCard — recent",
    status: "raw",
    note: "Compact single-row history card: status glyph (check/error/close) + name + StatusBadge + duration + relative time, optional error box. Raw `.job-card--recent` CSS — rebuilt from Surface + Layout.",
    component: RecentJobCard,
  },
];
