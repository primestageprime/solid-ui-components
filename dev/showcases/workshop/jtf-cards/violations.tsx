// JTF Card Catalog — violations cards.
// The compact violation-period sub-item (expands under an EntityCard row) and
// the ViolationHeatGrid hover popover card (per-call bucketed violations).
import { type JSX, For, Show } from "solid-js";
import {
  InteractiveCard,
  CompactSurface,
  TightStack,
  NarrowStack,
  ClusterRow,
  StretchRow,
  NoShrinkColumn,
  GrowColumn,
  Divider,
  VerticalDivider,
  Tooltip,
  TextTitle,
  TextLabel,
  TextBody,
  NowrapBody,
  TextSublabel,
} from "../../../../src";
import { CardBench, CardCase } from "./case";
import type { CardEntry } from "./shared";

// Compact clickable period row, rendered inside a CompactSurface expansion list.
const PeriodListShowcase = () => (
  <CardBench>
    <CardCase
      title="Violation period sub-item"
      width="300px"
      routes={["components/violations/PeriodsList.tsx", "/violations/grid → /violations/explore"]}
      why="Rows that expand under a violation's EntityCard row — each a single clickable line: time window · duration · worst reading. No labels; the domain expert reads the run positionally. Selecting one scrubs the chart to that window."
    >
      <CompactSurface>
        <NarrowStack>
          <For
            each={[
              "14:05 → 14:32 · 27m · worst 142 ppm",
              "16:10 → 16:24 · 14m · worst 98 ppm",
              "19:47 → 20:15 · 28m · worst 121 ppm",
            ]}
          >
            {(line) => (
              <InteractiveCard>
                <TextSublabel>{line}</TextSublabel>
              </InteractiveCard>
            )}
          </For>
        </NarrowStack>
      </CompactSurface>
    </CardCase>
  </CardBench>
);

// The popover shown when hovering a heat-grid cell. Anchoring, viewport
// flipping and the elevated panel chrome all come from SUI's Tooltip (Kobalte
// under the hood), so the card here is only the content: a header naming the
// vessel and bucket, over the violation windows beside the reviewer's
// explanation.
interface HeatCell {
  bucket: string;
  count: number;
  periods: string[];
  explanation: string;
}

const CELLS: HeatCell[] = [
  {
    bucket: "Outlet THC Threshold",
    count: 3,
    periods: [
      "12-01 14:05 → 14:32 (27m)",
      "12-01 16:10 → 16:24 (14m)",
      "12-01 19:47 → 20:15 (28m)",
    ],
    explanation: "FID drift during ramp; corrected with QA reference gas. Two windows excluded per SOP-14.",
  },
  {
    bucket: "Inlet Pressure Threshold",
    count: 1,
    periods: ["12-01 09:12 → 09:20 (8m)"],
    explanation: "",
  },
];

function PopoverBody(props: { cell: HeatCell }): JSX.Element {
  return (
    <TightStack>
      <TextLabel>{`MSC Bellissima — ${props.cell.bucket}`}</TextLabel>
      <Divider />
      <StretchRow>
        <NoShrinkColumn>
          <TextSublabel>{`Violations (${props.cell.periods.length})`}</TextSublabel>
          <For each={props.cell.periods}>{(p) => <NowrapBody>{p}</NowrapBody>}</For>
        </NoShrinkColumn>
        <VerticalDivider />
        <GrowColumn>
          <TextSublabel>Explanation</TextSublabel>
          <Show when={props.cell.explanation} fallback={<TextSublabel>—</TextSublabel>}>
            <TextBody>{props.cell.explanation}</TextBody>
          </Show>
        </GrowColumn>
      </StretchRow>
    </TightStack>
  );
}

const HeatGridPopoverShowcase = () => (
  <CardBench>
    <CardCase
      title="Heat-grid hover popover"
      width="420px"
      routes={["components/reports/ViolationHeatGrid.tsx", "/reports/thousand-hour"]}
      why="Hover a cell to open it. The header names the vessel and the bucket that lit up; the body pairs the violation windows against the reviewer's explanation, so the whole story reads without leaving the grid. A cell with no explanation shows an em dash rather than an empty column."
    >
      <ClusterRow>
        <For each={CELLS}>
          {(cell) => (
            <Tooltip content={<PopoverBody cell={cell} />}>
              <CompactSurface>
                <TextTitle>{cell.count}</TextTitle>
              </CompactSurface>
            </Tooltip>
          )}
        </For>
      </ClusterRow>
    </CardCase>
  </CardBench>
);

export const ENTRIES: CardEntry[] = [
  {
    route: "violations/PeriodsList",
    name: "Violation period sub-item",
    status: "sui",
    note: "Compact InteractiveCard single line ('14:05 → 14:32 · 27m · worst 142 ppm') inside a CompactSurface expansion list under an EntityCard row. Already SUI.",
    component: PeriodListShowcase,
  },
  {
    route: "reports/ViolationHeatGrid",
    name: "Heat-grid hover popover",
    status: "sui",
    note: "SUI `Tooltip` carrying a Layout/Text body: header (vessel — bucket) over violation windows beside the explanation. Anchoring, viewport flipping and panel chrome come from Tooltip — replaces the hand-rolled fixed-position div with its own clamping math.",
    component: HeatGridPopoverShowcase,
  },
];
