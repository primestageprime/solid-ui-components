/**
 * Contract Builder bench — Peter's paper sketch of 2026-10-07, composed one
 * region at a time. A tradesperson's year: HOPED work per type (a seasonal
 * guess) composited with KNOWN work (signed jobs, placed by when their payments
 * land), planned consuming projected.
 *
 * Every component comes through the package barrel (`../../../src`), as a client
 * would import it. Regions so far:
 *
 *   Per-month bars — `ContentChartFrame` holding `PeriodBars`
 *                    (`contract-builder-kit/period-bars.tsx`): `Chart`,
 *                    `BarSeries`, `LineSeries`, `HatchPattern`; `Legend` for
 *                    the type colours.
 *
 * Every number is a pure function in `contract-builder-model.ts`, pinned by
 * `contract-builder-model.test.ts` (which also prints the year as a table).
 * The data is example data, `contract-builder.fixtures.ts`.
 */
import type { Component } from "solid-js";
import {
  ContentChartFrame,
  ContentStack,
  Legend,
  MutedBody,
  SectionTitle,
  TextSublabel,
  TightStack,
  ViewportColumn,
  fn,
} from "../../../src";
import { PeriodBars, TYPE_COLORS } from "./contract-builder-kit/period-bars";
import { CONFIG } from "./contract-builder.fixtures";
import type { JobType } from "./contract-builder-model";

const { map } = fn;

export const meta = { label: "Contract Builder" };

const legendItems = map(
  (t: JobType, i: number) => ({ color: TYPE_COLORS[i], label: t.name }),
  CONFIG.types,
);

const ContractBuilderBench: Component = () => (
  <div class="component-section component-section--full">
    <ViewportColumn>
      <ContentStack>
        <TightStack>
          <SectionTitle>Contract Builder</SectionTitle>
          <TextSublabel>Painter · projected vs planned · region 1 of 4</TextSublabel>
          <MutedBody>
            Measured in dollars, not job counts (assumption — not yet
            confirmed). A job's money lands in the month each payment falls —
            deposit, phase payments, final — not by its start date, and a job
            paying across three months has no single month to "count" in, so
            only dollars respect that rule. Projected = jobs a month × typical $
            per job. The data is example data.
          </MutedBody>
        </TightStack>

        <ContentChartFrame title="Booked vs hoped, by month" yTitle="Revenue ($)">
          <TightStack>
            <PeriodBars config={CONFIG} />
            <Legend items={legendItems} />
            <MutedBody>
              Outline = what you hoped for. Inside it: solid = invoiced,
              translucent = signed but not yet invoiced, empty = still hoped
              for, not yet booked. Hatched above the outline = booked beyond
              the hope (an unplanned win — the projection was low), invoiced
              or not. Click a bar to log its numbers to the console.
            </MutedBody>
          </TightStack>
        </ContentChartFrame>
      </ContentStack>
    </ViewportColumn>
  </div>
);

export default ContractBuilderBench;
