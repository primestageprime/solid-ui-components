// JTF Card Catalog — violations cards.
// The compact violation-period sub-item (expands under an EntityCard row) and
// the ViolationHeatGrid hover popover card (per-call bucketed violations).
import { For } from "solid-js";
import {
  InteractiveCard,
  CompactSurface,
  CardSurface,
  TightStack,
  NarrowStack,
  SpreadRow,
  TopClusterRow,
  Column,
  Divider,
  TextTitle,
  TextLabel,
  TextBody,
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

// The floating popover shown when hovering a heat-grid cell: header
// (vessel — bucket) over a two-column body (timestamp ranges | explanation).
const HeatGridPopoverShowcase = () => (
  <CardBench>
    <CardCase
      title="Heat-grid hover popover"
      width="420px"
      routes={["components/reports/ViolationHeatGrid.tsx", "/reports/thousand-hour"]}
      why="Floats over a heat-grid cell on hover. Header names the vessel and the bucket that lit up; the body pairs the violation windows against the reviewer's explanation, so the whole story reads without leaving the grid."
    >
      <CardSurface>
        <TightStack>
          <TextTitle>MSC Bellissima — Outlet THC</TextTitle>
          <Divider />
          <TopClusterRow>
            <Column>
              <TextLabel>Periods</TextLabel>
              <For
                each={["14:05 → 14:32 · 27m", "16:10 → 16:24 · 14m", "19:47 → 20:15 · 28m"]}
              >
                {(p) => <TextSublabel>{p}</TextSublabel>}
              </For>
            </Column>
            <Column>
              <TextLabel>Explanation</TextLabel>
              <TextBody>FID drift during ramp; corrected with QA reference gas. Two windows excluded per SOP-14.</TextBody>
            </Column>
          </TopClusterRow>
        </TightStack>
      </CardSurface>
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
    status: "raw",
    note: "Floating card shown on heat-grid cell hover: header (vessel — bucket) over a two-column body (violation timestamp ranges | explanation). Raw floating popover — rebuilt from Surface + Layout.",
    component: HeatGridPopoverShowcase,
  },
];
