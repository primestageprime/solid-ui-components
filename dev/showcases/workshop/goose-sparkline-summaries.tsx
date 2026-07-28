// Bench: Goose Sparkline Summaries (workshop:goose-sparkline-summaries)
//
// SKELETON ONLY — a bare page to talk over, not a design. This shows the
// three sparklines SUI already has (TrendSparkline, Sparkline, and
// HeartbeatSparkline) dropped into a rough summary-row shape so we have
// something concrete to react to. The composition is DELIBERATELY
// UNFINISHED: what a summary cell contains, how many sit in a row, and
// whether they share a y-scale are all open (see the questions at the
// bottom).
import { type Component, For } from "solid-js";
import {
  MutedBody,
  NoteText,
  SectionTitle,
  SubsectionTitle,
  TextLabel,
  TextSublabel,
  TextValue,
} from "../../../src/components/Text";
import { CompactSurface } from "../../../src/components/Surface";
import {
  CardGrid,
  ClusterRow,
  ContentStack,
  TightStack,
  WrappedClusterRow,
} from "../../../src/components/Layout";
import {
  BlockPlaceholder,
  MediumPlaceholder,
} from "../../../src/components/Placeholder";
import {
  TrendSparkline,
  trendOf,
} from "../../../src/components/TrendSparkline";
import { Sparkline } from "../../../src/components/Sparkline";
import { HeartbeatSparkline } from "../../../src/components/HeartbeatSparkline";

/** Stub series — rows migrated per hour over the last ~14 ticks, per source. */
interface SummaryStub {
  label: string;
  value: string;
  series: number[];
}

const SUMMARIES: SummaryStub[] = [
  {
    label: "Acumatica",
    value: "1.42M rows",
    series: [
      210, 260, 240, 305, 380, 350, 420, 470, 455, 520, 610, 580, 640, 705,
    ],
  },
  {
    label: "NetSuite",
    value: "884k rows",
    series: [
      480, 455, 470, 430, 410, 395, 360, 375, 320, 300, 315, 280, 265, 240,
    ],
  },
  {
    label: "Global Shop",
    value: "617k rows",
    series: [
      120, 135, 128, 140, 132, 145, 138, 150, 142, 155, 148, 160, 152, 165,
    ],
  },
];

/** Batches completed per poll tick — spiky, so `sawtooth` reads better. */
const BATCH_TICKS = [4, 0, 7, 1, 9, 2, 6, 0, 11, 3, 8, 1, 5, 12, 2, 7];

/** Worker heartbeat: fraction of the claim timeout consumed at each tick. */
const HEARTBEAT = [
  0.1, 0.3, 0.5, 0.2, 0.4, 0.6, 0.15, 0.35, 0.55, 0.25, 0.45, 0.2,
];

const OPEN_QUESTIONS = [
  "What is one summary cell? Right now it is label + big value + sparkline. Does it also need a delta ('+12% vs yesterday'), a target, or a status tone?",
  "Shared y-scale or per-series auto-scale? TrendSparkline takes `yDomain` — comparing sources side by side probably wants ONE domain, but then a small source flattens to a line.",
  "How many cells in a row, and what happens on narrow — wrap, scroll, or drop to a compact list?",
  "Is the sparkline the point, or decoration next to the number? That decides its size (24px inline vs a real 60px chart).",
  "Does a cell click through to the source detail, and if so what is the affordance?",
  "Trend colouring is up/down/flat by first-vs-last. For rows-remaining, DOWN is good — do we need an 'invert' notion, or do we pass the trend in ourselves?",
  "Does the heartbeat/liveness belong in this row at all, or up in the header with the connection status?",
  "Does this row react to the goose filter bar (see workshop:goose-filter-bar), or is it always global?",
];

export const meta = { label: "Goose Sparkline Summaries" };

const GooseSparklineSummariesBench: Component = () => (
  <div class="component-section component-section--full">
    <SectionTitle>Goose Sparkline Summaries</SectionTitle>
    <MutedBody>
      Bare page — a skeleton, not a design. A rough summary row using the
      sparklines SUI already ships, plus placeholders for the parts we have not
      decided. Stub data is per-source migration throughput.
    </MutedBody>

    <ContentStack>
      <SubsectionTitle>Region 1 — summary row (TrendSparkline)</SubsectionTitle>
      <CardGrid>
        <For each={SUMMARIES}>
          {(s) => (
            <CompactSurface>
              <TightStack>
                <TextLabel>{s.label}</TextLabel>
                <TextValue>{s.value}</TextValue>
                <TrendSparkline
                  values={s.series}
                  trend={trendOf(s.series[0], s.series[s.series.length - 1])}
                />
                <TextSublabel>rows/hr, last 14 ticks</TextSublabel>
              </TightStack>
            </CompactSurface>
          )}
        </For>
        <MediumPlaceholder label="4th cell? totals? unbuilt" />
      </CardGrid>

      <SubsectionTitle>
        Region 2 — other sparkline shapes, unplaced
      </SubsectionTitle>
      <CompactSurface>
        <TightStack>
          <TextSublabel>
            These two exist but we have not decided whether they belong in the
            summary row, the header, or a detail pane.
          </TextSublabel>
          <WrappedClusterRow>
            <ClusterRow>
              <TextLabel>Batches / tick</TextLabel>
              <Sparkline values={BATCH_TICKS} mode="sawtooth" />
            </ClusterRow>
            <ClusterRow>
              <TextLabel>Worker heartbeat</TextLabel>
              <HeartbeatSparkline state="connected" samples={HEARTBEAT} pulse />
            </ClusterRow>
          </WrappedClusterRow>
        </TightStack>
      </CompactSurface>

      <SubsectionTitle>Region 3 — whatever sits under the row</SubsectionTitle>
      <BlockPlaceholder label="drill-down / per-object table goes here" />

      <SubsectionTitle>Open questions</SubsectionTitle>
      <TightStack>
        <For each={OPEN_QUESTIONS}>{(q) => <NoteText>{q}</NoteText>}</For>
      </TightStack>
    </ContentStack>
  </div>
);

export default GooseSparklineSummariesBench;
