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
import { CumulativeDivergence } from "./contract-builder-kit/cumulative";
import { MISSING_COLOR, PeriodBars, TYPE_COLORS } from "./contract-builder-kit/period-bars";
import { STEP5, TODAY } from "./contract-builder.step1.fixtures";
import type { JobType } from "./contract-builder-model";

const { map } = fn;

export const meta = { label: "Contract Builder" };

const legendItems = [
  ...map(
    (t: JobType, i: number) => ({ color: TYPE_COLORS[i], label: t.name }),
    STEP5.types,
  ),
  { color: MISSING_COLOR, label: "Missing (past shortfall)" },
];

const cumulativeLegend = [
  { color: "var(--sui-success)", label: "Ahead of the total hope" },
  { color: "var(--sui-danger)", label: "Behind the total hope" },
];

const ContractBuilderBench: Component = () => (
  <div class="component-section component-section--full">
    <ViewportColumn>
      <ContentStack>
        <TightStack>
          <SectionTitle>Contract Builder</SectionTitle>
          <TextSublabel>Painter · example data, rebuilt one expectation at a time · step 6: now = April 15, missing, running divergence</TextSublabel>
          <MutedBody>
            Step 6: what a painter expects to bring in each month from
            exterior, interior and furniture work. Exterior = jobs a month × $4,000, a
            smooth seasonal curve peaking at five jobs in July and exactly $0
            in the three snow months — December, January and February.
            Interior = jobs a month × $2,500, the mirror image: a summer low
            of two jobs, rising smoothly through autumn to six jobs through
            the snow months, then easing back down through spring. Furniture = jobs a month × $1,200, occasional small pieces with no season: none in most months, one job in February, May and November, two in September. Signed EXTERIOR jobs are now booked against the hope, each month's money placed by when its payments land (deposit, progress, final): March 85% of the hope, April 115%, May through October exactly 100%, nothing signed for November or December. NOW is April 15, 2026 (the dashed rule): payments before it are invoiced, later ones are signed but not yet invoiced. Signed INTERIOR jobs show an improving year: 40–60% of the hope from January to April, climbing to about 80% by autumn, over the hope only in August (115%), with signed winter work for November (70%) and December (50%) not yet invoiced. Furniture is still an expectation only. Measured in dollars
            (assumption — not yet confirmed). The data is example data.
          </MutedBody>
        </TightStack>

        <ContentChartFrame title="Expected revenue, by month" yTitle="Revenue ($)">
          <TightStack>
            <PeriodBars config={STEP5} today={TODAY} />
            <Legend items={legendItems} />
            <MutedBody>
              Outline = expected revenue for one job type. Inside it: solid = invoiced, translucent = signed but not yet invoiced. Red cross-hatch = MISSING: a month that ended before NOW short of its hope — money hoped for and not got. Empty = still hoped for (the current month and later). Hatched above the outline = booked beyond the hope.
            </MutedBody>
          </TightStack>
        </ContentChartFrame>

        <ContentChartFrame
          title="Running divergence from the total hope"
          yTitle="Booked − hope, cumulative ($)"
        >
          <TightStack>
            <CumulativeDivergence config={STEP5} today={TODAY} />
            <Legend items={cumulativeLegend} />
            <MutedBody>
              Each month: the sum since January of booked minus hoped, across
              exterior, interior and furniture together. Above zero the mix is
              ahead of the total target, below it behind. Before NOW the bars
              are solid and the line is solid: actual money. From NOW's month
              on the bars are translucent and the line dashed: signed future
              work against the hope, so unsigned months still count as behind.
            </MutedBody>
          </TightStack>
        </ContentChartFrame>
      </ContentStack>
    </ViewportColumn>
  </div>
);

export default ContractBuilderBench;
