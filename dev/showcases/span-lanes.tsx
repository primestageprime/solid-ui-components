// SpanLanes — spans over time, packed into the fewest rows.
//
// The page plays the CONSUMER: it owns the jobs, their colours, the words on
// each bar, and what hovering or clicking one means. SpanLanes lays the bars
// out on the chart's own x-scale — a time domain here, so `XAxis` gives dates
// for free — and paints each segment with whatever `paint` returns: a token
// for work, a `HatchPattern` url for a wait.
//
// Everything drawn ON a bar is an adornment the consumer plugs in: end labels
// (`#3 … $33.8k`), a red ring and a ! on the over-capacity job, a padlock on
// the locked one. Hover is two-way with the list under the chart, and a click
// selects. The chart's height comes from `spanRowCount`, so the frame
// (`ContentChartFrame`) is exactly as tall as the packing needs.
import { type Component, For, createMemo, createSignal } from "solid-js";
import {
  Chart,
  ChartTooltip,
  type SpanSegment,
  SpanLanes,
  XAxis,
  createSpanBadge,
  createSpanEndLabels,
  createSpanRing,
  spanExtent,
  spanRowCount,
} from "../../src/components/Chart";
import { ContentChartFrame } from "../../src/components/ChartFrame";
import { HatchPattern } from "../../src/components/SvgMarks";
import { TextButton } from "../../src/components/Button";
import {
  ClusterRow,
  SpacedStack,
  TightStack,
  WrapRow,
} from "../../src/components/Layout";
import {
  CaptionLabel,
  MutedBody,
  SectionTitle,
  SubsectionTitle,
  TextSublabel,
} from "../../src/components/Text";

type Tone = "doing" | "todo" | "pending";

interface Job {
  readonly id: number;
  readonly name: string;
  readonly tone: Tone;
  readonly total: number;
  readonly over: boolean;
  readonly locked: boolean;
  readonly segments: readonly SpanSegment[];
}

const DAY = 86_400_000;
const at = (month: number, day: number) => Date.UTC(2026, month - 1, day);
/** `days` long from `start`, of `kind`. */
const seg = (start: number, days: number, kind: string): SpanSegment => ({
  start,
  end: start + days * DAY,
  kind,
});

const JOBS: readonly Job[] = [
  {
    id: 1,
    name: "Henderson re-roof",
    tone: "doing",
    total: 33800,
    over: false,
    locked: true,
    segments: [
      seg(at(10, 1), 4, "work"),
      seg(at(10, 5), 3, "wait"),
      seg(at(10, 8), 6, "work"),
    ],
  },
  {
    id: 2,
    name: "Johnson gutters",
    tone: "todo",
    total: 4100,
    over: false,
    locked: false,
    segments: [seg(at(10, 14), 3, "work")],
  },
  {
    id: 3,
    name: "Harold tear-off",
    tone: "todo",
    total: 21500,
    over: true,
    locked: false,
    segments: [seg(at(10, 6), 5, "work"), seg(at(10, 11), 4, "work")],
  },
  {
    id: 4,
    name: "Mill St. skylights",
    tone: "pending",
    total: 12900,
    over: false,
    locked: false,
    segments: [seg(at(10, 20), 2, "wait"), seg(at(10, 22), 7, "work")],
  },
];

const X_DOMAIN: [Date, Date] = [new Date(at(10, 1)), new Date(at(11, 1))];
const ROW = 34;
const MARGIN = { top: 10, right: 12, bottom: 28, left: 12 };

const FILL: Readonly<Record<Tone, string>> = {
  doing: "var(--sui-accent)",
  todo: "var(--sui-success)",
  pending: "var(--sui-warning)",
};
const INK: Readonly<Record<Tone, string>> = {
  doing: "var(--sui-text-primary)",
  todo: "var(--sui-bg-deep)",
  pending: "var(--sui-bg-deep)",
};
const TONES: readonly Tone[] = ["doing", "todo", "pending"];
const hatchId = (tone: Tone) => `span-lanes-demo-hatch-${tone}`;

const k = (n: number) => `$${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
const LOCK_PATH = "M4 7.5h8v6H4z M5.5 7.5V5a2.5 2.5 0 0 1 5 0v2.5";
const short = (ms: number) =>
  new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

// The adornments, configured ONCE with accessors over this page's datum.
const Labels = createSpanEndLabels<Job>({
  lead: (j) => `#${j.id}`,
  trail: (j) => k(j.total),
  color: (j) => INK[j.tone],
});
const OverRing = createSpanRing<Job>({
  when: (j) => j.over,
  color: () => "var(--sui-danger)",
});
const OverBadge = createSpanBadge<Job>({
  when: (j) => j.over,
  glyph: () => ({ text: "!" }),
  color: () => "var(--sui-danger)",
  glyphColor: () => "var(--sui-text-primary)",
  corner: "top-right",
  size: 17,
});
const LockBadge = createSpanBadge<Job>({
  when: (j) => j.locked,
  glyph: () => ({ path: LOCK_PATH }),
  color: () => "var(--sui-bg-deep)",
  glyphColor: () => "var(--sui-text-primary)",
  ringColor: "var(--sui-text-secondary)",
  corner: "top-left",
  size: 15,
});
const ADORNMENTS = [OverRing, Labels, LockBadge, OverBadge];

export const SpanLanesShowcase: Component = () => {
  const [hovered, setHovered] = createSignal<number | null>(null);
  const [selected, setSelected] = createSignal<number | null>(null);
  const hoveredJob = createMemo(() => JOBS.find((j) => j.id === hovered()));
  const height = () => spanRowCount(JOBS) * ROW + MARGIN.top + MARGIN.bottom;
  const selectedJob = () => JOBS.find((j) => j.id === selected());

  return (
    <div class="component-section component-section--full">
      <SpacedStack>
        <TightStack>
          <SectionTitle>SpanLanes</SectionTitle>
          <MutedBody>
            Composite (Depth 2) chart slot: spans over time, each a bar of
            consecutive segments, packed into the fewest rows. Paint and
            adornments are the consumer's; hover, click and pointer-down come
            back with the datum.
          </MutedBody>
        </TightStack>

        <div class="example-group">
          <SubsectionTitle>Jobs over October</SubsectionTitle>
          <CaptionLabel>
            Solid is work, hatched is waiting. #3 is over capacity (ring and !),
            #1 is locked (padlock). Hover a bar or a name; click a bar to select
            it.
          </CaptionLabel>
          <div class="span-lanes-demo">
            <ContentChartFrame title="Schedule">
              <Chart
                width={720}
                height={height()}
                xDomain={X_DOMAIN}
                yDomain={[0, 1]}
                margin={MARGIN}
                responsive
              >
                <defs>
                  <For each={TONES}>
                    {(tone) => (
                      <HatchPattern id={hatchId(tone)} color={FILL[tone]} />
                    )}
                  </For>
                </defs>
                <XAxis tickCount={5} />
                <SpanLanes<Job>
                  data={JOBS}
                  paint={(s, j) =>
                    s.kind === "wait"
                      ? `url(#${hatchId(j.tone)})`
                      : FILL[j.tone]
                  }
                  adornments={ADORNMENTS}
                  hoveredId={hovered()}
                  describe={(j) => `#${j.id} ${j.name}, ${k(j.total)}`}
                  onSpanHover={(j) => setHovered(j ? j.id : null)}
                  onSpanClick={(j) => setSelected(j.id)}
                />
                <ChartTooltip
                  data={hoveredJob() ? [hoveredJob() as Job] : []}
                  x={(j) => spanExtent(j)?.start ?? 0}
                >
                  {(j) => `#${j.id} ${j.name} · ${k(j.total)}`}
                </ChartTooltip>
              </Chart>
            </ContentChartFrame>
          </div>
          <WrapRow>
            <For each={JOBS}>
              {(j) => (
                <ClusterRow>
                  <TextButton
                    onClick={() => setSelected(j.id)}
                    onPointerEnter={() => setHovered(j.id)}
                    onPointerLeave={() => setHovered(null)}
                  >
                    {`#${j.id} ${j.name}`}
                  </TextButton>
                </ClusterRow>
              )}
            </For>
          </WrapRow>
          <TextSublabel>
            {selectedJob()
              ? `Selected: #${selectedJob()?.id} ${selectedJob()?.name}, from ${short(spanExtent(selectedJob() as Job)?.start ?? 0)}`
              : "Nothing selected"}
          </TextSublabel>
        </div>
      </SpacedStack>
    </div>
  );
};
