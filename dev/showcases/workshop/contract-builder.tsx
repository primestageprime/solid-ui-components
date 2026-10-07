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
import { STEP3 } from "./contract-builder.step1.fixtures";
import type { JobType } from "./contract-builder-model";

const { map } = fn;

export const meta = { label: "Contract Builder" };

const legendItems = map(
  (t: JobType, i: number) => ({ color: TYPE_COLORS[i], label: t.name }),
  STEP3.types,
);

const ContractBuilderBench: Component = () => (
  <div class="component-section component-section--full">
    <ViewportColumn>
      <ContentStack>
        <TightStack>
          <SectionTitle>Contract Builder</SectionTitle>
          <TextSublabel>Painter · example data, rebuilt one expectation at a time · step 3: exterior + interior + furniture</TextSublabel>
          <MutedBody>
            Step 3: what a painter expects to bring in each month from
            exterior, interior and furniture work. Exterior = jobs a month × $4,000, a
            smooth seasonal curve peaking at five jobs in July and exactly $0
            in the three snow months — December, January and February.
            Interior = jobs a month × $2,500, the mirror image: a summer low
            of two jobs, rising smoothly through autumn to six jobs through
            the snow months, then easing back down through spring. Furniture = jobs a month × $1,200, occasional small pieces with no season: none in most months, one job in February, May and November, two in September. No signed jobs yet. Measured in dollars
            (assumption — not yet confirmed). The data is example data.
          </MutedBody>
        </TightStack>

        <ContentChartFrame title="Expected revenue, by month" yTitle="Revenue ($)">
          <TightStack>
            <PeriodBars config={STEP3} />
            <Legend items={legendItems} />
            <MutedBody>
              Each outline is one month's expected revenue for one job type.
            </MutedBody>
          </TightStack>
        </ContentChartFrame>
      </ContentStack>
    </ViewportColumn>
  </div>
);

export default ContractBuilderBench;
