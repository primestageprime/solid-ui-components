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
import { STEP5 } from "./contract-builder.step1.fixtures";
import type { JobType } from "./contract-builder-model";

const { map } = fn;

export const meta = { label: "Contract Builder" };

const legendItems = map(
  (t: JobType, i: number) => ({ color: TYPE_COLORS[i], label: t.name }),
  STEP5.types,
);

const ContractBuilderBench: Component = () => (
  <div class="component-section component-section--full">
    <ViewportColumn>
      <ContentStack>
        <TightStack>
          <SectionTitle>Contract Builder</SectionTitle>
          <TextSublabel>Painter · example data, rebuilt one expectation at a time · step 5: + signed interior jobs</TextSublabel>
          <MutedBody>
            Step 5: what a painter expects to bring in each month from
            exterior, interior and furniture work. Exterior = jobs a month × $4,000, a
            smooth seasonal curve peaking at five jobs in July and exactly $0
            in the three snow months — December, January and February.
            Interior = jobs a month × $2,500, the mirror image: a summer low
            of two jobs, rising smoothly through autumn to six jobs through
            the snow months, then easing back down through spring. Furniture = jobs a month × $1,200, occasional small pieces with no season: none in most months, one job in February, May and November, two in September. Signed EXTERIOR jobs are now booked against the hope, each month's money placed by when its payments land (deposit, progress, final): March 85% of the hope, April 115%, May through October exactly 100%, nothing signed for November or December. Today is October 7, 2026: payments before today are invoiced, later ones are signed but not yet invoiced. Signed INTERIOR jobs show an improving year: 40–60% of the hope from January to April, climbing to about 80% by autumn, over the hope only in August (115%), with signed winter work for November (70%) and December (50%) not yet invoiced. Furniture is still an expectation only. Measured in dollars
            (assumption — not yet confirmed). The data is example data.
          </MutedBody>
        </TightStack>

        <ContentChartFrame title="Expected revenue, by month" yTitle="Revenue ($)">
          <TightStack>
            <PeriodBars config={STEP5} />
            <Legend items={legendItems} />
            <MutedBody>
              Outline = expected revenue for one job type. Inside it: solid = invoiced, translucent = signed but not yet invoiced, empty = not yet booked. Hatched above the outline = booked beyond the hope.
            </MutedBody>
          </TightStack>
        </ContentChartFrame>
      </ContentStack>
    </ViewportColumn>
  </div>
);

export default ContractBuilderBench;
