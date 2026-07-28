// JTF Card Catalog — job-queue cards (src/components/JobQueue/JobCard.tsx).
// Two variants share the JobCard file: an expanded "active" card and a compact
// single-row "recent" card. Both are now SUI: TitleAssetProgress (name + asset
// + status over progress + timing, tone rail, conditional Cancel) and
// DenseStatusNote (glyph + name + status + duration + relTime, with the error
// line appearing only on failure).
import { For } from "solid-js";
import { TightStack, TitleAssetProgress, DenseStatusNote } from "../../../../src";
import type { AccentTone } from "../../../../src";
import { CardBench, CardCase } from "./case";
import type { CardEntry } from "./shared";

// Job status → SlotCard tone, mirroring jtf's statusToBadgeVariant(). The tone
// paints both the left accent rail and the status badge.
const TONE: Record<string, AccentTone> = {
  queued: "warning",
  in_progress: "info",
  completed: "success",
  failed: "danger",
  cancelled: "warning",
};

const noop = () => undefined;

const ActiveJobCard = () => (
  <CardBench>
    <CardCase
      title="JobCard — active"
      width="340px"
      routes={["components/JobQueue/JobCard.tsx", "global Layout job-queue modal"]}
      why="The expanded queue card, opened from the global job-queue indicator. Vessel name + asset id + status badge over the progress message and the timing line, with the status tone on the left rail. Cancel is wired only while the job is still queued — once it starts, the affordance is gone."
    >
      <TightStack>
        <TitleAssetProgress
          accent={TONE.in_progress}
          maxWidth={324}
          values={{
            name: { text: "MSC Bellissima", icon: "⛴" },
            string: "xbox3-2",
            status: { tone: TONE.in_progress, label: "in_progress" },
            text: "Caching minute metrics… 640 / 1440",
            relTime: "Started 3m ago",
          }}
        />
        <TitleAssetProgress
          accent={TONE.queued}
          maxWidth={324}
          action={{ label: "Cancel", onClick: noop }}
          values={{
            name: { text: "Aframax Horizon", icon: "⛴" },
            string: "xbox1-1",
            status: { tone: TONE.queued, label: "queued" },
            relTime: "Requested 5m ago",
          }}
        />
      </TightStack>
    </CardCase>
  </CardBench>
);

// The compact history entries below the active jobs. Outcome drives the glyph,
// the badge, and the rail; the error line is present on failure only.
interface RecentJob {
  status: "completed" | "failed" | "cancelled";
  glyph: string;
  name: string;
  duration?: string;
  ago: string;
  error?: string;
}

const RECENT: RecentJob[] = [
  { status: "completed", glyph: "check", name: "Pacific Trader", duration: "2m 5s", ago: "4h ago" },
  {
    status: "failed",
    glyph: "error",
    name: "Nordic Star",
    duration: "0m 12s",
    ago: "6h ago",
    error: "Upstream timeout fetching FTIR series (asset xbox5-1)",
  },
  { status: "cancelled", glyph: "close", name: "Coral Voyager", ago: "1d ago" },
];

const RecentJobCard = () => (
  <CardBench>
    <CardCase
      title="JobCard — recent"
      width="340px"
      routes={["components/JobQueue/JobCard.tsx", "global Layout job-queue modal"]}
      why="The compact history entry below the active jobs: a single row of status glyph (check/error/close) + name + badge + duration + relative time. The failure reason appears as a second line on failed jobs only — a succeeded card is exactly one row tall."
    >
      <TightStack>
        <For each={RECENT}>
          {(job) => (
            <DenseStatusNote
              accent={TONE[job.status]}
              maxWidth={324}
              values={{
                icon: { name: job.glyph, tone: TONE[job.status] },
                name: { text: job.name },
                status: { tone: TONE[job.status], label: job.status },
                duration: job.duration,
                relTime: job.ago,
                error: job.error,
              }}
            />
          )}
        </For>
      </TightStack>
    </CardCase>
  </CardBench>
);

export const ENTRIES: CardEntry[] = [
  {
    route: "JobQueue/JobCard",
    name: "JobCard — active",
    status: "sui",
    note: "SlotCard `TitleAssetProgress` — name + asset + status over progress + timing, status tone on the left rail, Cancel wired only in the queued state. Replaces the raw `.job-card--active` CSS.",
    component: ActiveJobCard,
  },
  {
    route: "JobQueue/JobCard",
    name: "JobCard — recent",
    status: "sui",
    note: "SlotCard `DenseStatusNote` — glyph + name + status + duration + relative time, with the failure reason as a conditional second row. Replaces the raw `.job-card--recent` CSS.",
    component: RecentJobCard,
  },
];
