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
import { STEP1 } from "./contract-builder.step1.fixtures";
import type { JobType } from "./contract-builder-model";

const { map } = fn;

export const meta = { label: "Contract Builder" };

const legendItems = map(
  (t: JobType, i: number) => ({ color: TYPE_COLORS[i], label: t.name }),
  STEP1.types,
);

const ContractBuilderBench: Component = () => (
  <div class="component-section component-section--full">
    <ViewportColumn>
      <ContentStack>
        <TightStack>
          <SectionTitle>Contract Builder</SectionTitle>
          <TextSublabel>Painter · example data, rebuilt one expectation at a time · step 1: exterior</TextSublabel>
          <MutedBody>
            Step 1 shows one thing: what an exterior painter expects to bring
            in each month. Expected = jobs a month × $4,000 per job, on a
            smooth seasonal curve that peaks at five jobs in July and is
            exactly $0 in the three snow months — December, January and
            February. No other job types and no signed jobs yet. Measured in
            dollars (assumption — not yet confirmed). The data is example
            data.
          </MutedBody>
        </TightStack>

        <ContentChartFrame title="Exterior: expected revenue, by month" yTitle="Revenue ($)">
          <TightStack>
            <PeriodBars config={STEP1} />
            <Legend items={legendItems} />
            <MutedBody>
              Each outline is one month's expected exterior revenue.
            </MutedBody>
          </TightStack>
        </ContentChartFrame>
      </ContentStack>
    </ViewportColumn>
  </div>
);

export default ContractBuilderBench;
