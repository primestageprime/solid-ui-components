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
import { type Component, Show, createSignal } from "solid-js";
import {
  ContentAutoGrowChartFrame,
  SignedAreaChart,
  TargetBarChart,
  ContentStack,
  Legend,
  Modal,
  MutedBody,
  SectionTitle,
  TextSublabel,
  ThemedNumberInput,
  createAxisWaterMarks,
  TightStack,
  ViewportColumn,
  fn,
} from "../../../src";
import {
  BAR_MARKS,
  CUMULATIVE_MARKS,
  PatternLegend,
} from "./contract-builder-kit/pattern-legend";
import { TYPE_COLORS, targetSeries } from "./contract-builder-kit/target-bars";
import { STEP5, TODAY } from "./contract-builder.step1.fixtures";
import {
  type Config,
  type JobType,
  MONTHS,
  type TypeId,
  cumulativeDelta,
  cumulativeFit,
  jobsAt,
  monthLabel,
  monthPosition,
  monthsOf,
  money,
  tallest,
  withCount,
} from "./contract-builder-model";

const { filter, map } = fn;

export const meta = { label: "Contract Builder" };

const legendItems = map(
  (t: JobType, i: number) => ({ color: TYPE_COLORS[i], label: t.name }),
  STEP5.types,
);

/** Which hope the double-click entry is open on. */
interface Entry {
  readonly type: TypeId;
  readonly month: number;
}

const ContractBuilderBench: Component = () => {
  /* The hopes are UI state (the fold stays a pure function of the config):
     a drag or a typed count replaces the config, and every view recomputes. */
  const [config, setConfig] = createSignal<Config>(STEP5);
  const [entry, setEntry] = createSignal<Entry | null>(null);
  const setCount = (type: TypeId, month: number, count: number) => {
    const t = config().types.find((x) => x.id === type);
    if (!t || t.qty[month] === count) return;
    console.table([{ type, month: MONTHS[month], count, $: count * t.typical }]);
    setConfig((c) => withCount(c, type, month, count));
  };
  /* Both y-axes follow the chart language's default, "Auto-grow | manual
     shrink": a value past the held extent grows the axis at once; a fall never
     shrinks it — only the fit button does. Only that mode is offered: the
     frame's split button would also list "Full auto" and "Locked", and nobody
     configures them here (Locked has no range editor). Dragging a
     hope swings both charts, and a re-fitting axis would rescale under the
     pointer. */
  const cumAxis = createAxisWaterMarks(() =>
    cumulativeFit(config(), Number.POSITIVE_INFINITY, TODAY),
  );
  const barsAxis = createAxisWaterMarks(() => ({ min: 0, max: tallest(config()) }));
  const divergence = () =>
    map((m: number) => ({ x: m, y: cumulativeDelta(config(), m, TODAY) }), monthsOf(config()));
  const divergenceExtent = (): readonly [number, number] | undefined => {
    const held = cumAxis.domain();
    return held ? [Math.min(0, held[0]), Math.max(0, held[1])] : undefined;
  };
  const entryType = () => config().types.find((t) => t.id === entry()?.type);
  return (
  <div class="component-section component-section--full">
    <ViewportColumn>
      <ContentStack>
        <TightStack>
          <SectionTitle>Contract Builder</SectionTitle>
          <TextSublabel>Painter · example data, rebuilt one expectation at a time · step 8: divergence on top, hopes below</TextSublabel>
          <MutedBody>
            The bars (below) are where you set your hopes, month by month — month is the default period. The running divergence (top) is your view of how your planned contracts fulfil those hopes, summed across every job type since January. Step 8: the charts are flipped; the example data is what a painter expects to bring in each month from
            exterior, interior and furniture work. Exterior = jobs a month × $4,000, a
            smooth seasonal curve peaking at five jobs in July and exactly $0
            in the three snow months — December, January and February.
            Interior = jobs a month × $2,500, the mirror image: a summer low
            of two jobs, rising smoothly through autumn to six jobs through
            the snow months, then easing back down through spring. Furniture = jobs a month × $1,200, occasional small pieces with no season: none in most months, one job in February, May and November, two in September. Signed EXTERIOR jobs, each month's money placed by when its payments land (deposit, progress, final), swing over and under the hope: winter deposits for spring jobs land in January and February against a $0 hope, then March 300%, April 83%, May 150%, June 79%, July 145%, August 58%, September 163%, October 100%, nothing signed for November. NOW is April 15, 2026 (the dashed rule): payments before it are invoiced, later ones are signed but not yet invoiced. Signed INTERIOR jobs show an improving year: 40–60% of the hope from January to April, climbing to about 80% by autumn, over the hope only in August (115%), with signed winter work for November (70%) and December (50%) not yet invoiced. Furniture is still an expectation only. Measured in dollars
            (assumption — not yet confirmed). The data is example data.
          </MutedBody>
        </TightStack>

        <ContentAutoGrowChartFrame
          title="How your planned contracts fulfil your hopes"
          yTitle="Booked − hope, cumulative ($)"
          onYAxisPress={cumAxis.reset}
        >
          <TightStack>
            <SignedAreaChart
              data={divergence()}
              now={monthPosition(TODAY)}
              xDomain={[-0.5, monthsOf(config()).length - 0.5]}
              xTickValues={monthsOf(config())}
              xTickFormat={(m) => monthLabel(Math.round(m))}
              yTickFormat={money}
              yDomain={divergenceExtent()}
            />
            <PatternLegend items={CUMULATIVE_MARKS} />
            <MutedBody>
              Each month: the sum since January of booked minus hoped, across
              exterior, interior and furniture together. Above zero the mix is
              ahead of the total target, below it behind. Before NOW the bars
              are solid and the line is solid: actual money. From NOW's month
              on the bars are translucent and the line dashed: only work signed
              BEYOND a month's hope moves it — unsold hope is not behind until
              its month has passed (NOW's month counts as future).
            </MutedBody>
          </TightStack>
        </ContentAutoGrowChartFrame>

        <ContentAutoGrowChartFrame
          title="Your hopes, month by month"
          yTitle="Revenue ($)"
          onYAxisPress={barsAxis.reset}
        >
          <TightStack>
            <TargetBarChart
              series={targetSeries(config(), TODAY, monthsOf(config()).length - 1)}
              periods={monthsOf(config())}
              periodLabel={monthLabel}
              now={monthPosition(TODAY)}
              valueFormat={money}
              yMax={barsAxis.domain()?.[1]}
              onProjectionChange={(id, month, dollars) => {
                const t = config().types.find((x) => x.id === id);
                if (t) setCount(t.id, month, jobsAt(t, dollars));
              }}
              onProjectionEnter={(id, month) => setEntry({ type: id as TypeId, month })}
            />
            <Legend items={legendItems} />
            <PatternLegend items={BAR_MARKS} />
            <MutedBody>
              Drag the top edge of an outline to set that month's hoped-for
              jobs for that type (whole jobs, never below zero; only that one
              month moves), or double-click a bar to type the number in. The
              chart above follows live. Outline = expected revenue for one job type. Inside it: solid = invoiced, translucent = signed but not yet invoiced. Red cross-hatch = MISSING: a month that ended before NOW short of its hope — money hoped for and not got. Empty = still hoped for (the current month and later). Hatched above the outline = booked beyond the hope.
            </MutedBody>
          </TightStack>
        </ContentAutoGrowChartFrame>
      </ContentStack>
    </ViewportColumn>
    <Show when={entry()}>
      {(e) => (
        <Modal
          open
          onClose={() => setEntry(null)}
          title={`${entryType()?.name ?? ""} · ${MONTHS[e().month]}`}
          subtitle={`Hoped-for jobs at $${(entryType()?.typical ?? 0).toLocaleString()} each`}
        >
          <ThemedNumberInput
            name="hoped-jobs"
            label="Jobs"
            min={0}
            step={1}
            value={() => entryType()?.qty[e().month]}
            onChange={(v) => {
              if (v !== undefined) setCount(e().type, e().month, Math.max(0, Math.round(v)));
            }}
          />
        </Modal>
      )}
    </Show>
  </div>
  );
};

export default ContractBuilderBench;
