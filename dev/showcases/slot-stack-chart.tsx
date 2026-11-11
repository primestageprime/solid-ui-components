// SlotStackChart showcase. FIRST the two states (Peter, 2026-11-10: "By
// default show just the two values. (expected and actual)... When hovering
// with a mouse, show the breakdown by type"): a six-month run that draws one
// container per month, in the default blue, and breaks the hovered month
// into its types (one card shows a column shorter than its breakdown),
// beside the same run forced collapsed and forced expanded.
//
// Then the stacked-dollars mockup, scenario by scenario
// (thorcasting #4451, treatment B): one slot at a time (empty container,
// full, part-filled, overflow), three series mixed in one column, a job whose
// money lands late, a six-period run at full size and at a small panel's
// size, the optional status sub-fills, and the legend.
//
// The showcase plays the CONSUMER: it splits every figure into `expected`,
// `filled`, `unfilled` and `overflow` before the chart sees it, and curries
// its own words once. The chart only lays the parts out. Nothing here can be
// dragged, typed into or focused; hover a part for its text.
import type { Component } from "solid-js";
import {
  type SlotStackSeries,
  type SlotStackSlot,
  SlotStackLegend,
  createSlotStackChart,
  slotStackRows,
} from "../../src/components/SlotStackChart";
import { map } from "../../src/fn";
import { CaptionLabel, MutedBody, SectionTitle } from "../../src/components/Text";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
const TYPES = ["Remodels", "Cabinets", "Deck Builds"];
const money = (v: number): string => `$${v}k`;

/** This screen's words, curried once: its money "arrives". */
const WORDS = {
  filled: "arrived",
  unfilled: "still expected",
  overflow: "above expected",
  confirmed: "confirmed, not yet invoiced",
};
const DollarStack = createSlotStackChart({ words: WORDS, nowLabel: "today" });

/** The caller's split: what fills the expectation, what is left, what is over. */
const split = (period: number, expected: number, actual: number): SlotStackSlot => ({
  period,
  expected,
  filled: Math.min(expected, actual),
  unfilled: Math.max(0, expected - actual),
  overflow: Math.max(0, actual - expected),
});

const seriesOf = (
  rows: readonly (readonly (readonly [number, number])[])[],
): readonly SlotStackSeries[] =>
  map(
    (label: string, type: number): SlotStackSeries => ({
      id: label,
      label,
      slots: map(
        (row: readonly (readonly [number, number])[], period: number) =>
          split(period, row[type]?.[0] ?? 0, row[type]?.[1] ?? 0),
        rows,
      ),
    }),
    TYPES,
  );

/* One slot at a time: Remodels in March, $40k expected. */
const ONE = [
  { title: "1. Expected only", note: "An empty container: dashed all the way round.", actual: 0 },
  { title: "2. On target", note: "Full: the border is solid all the way round.", actual: 40 },
  { title: "3. Under", note: "Filling up: solid as far as the money, dashed above, no line between.", actual: 28 },
  { title: "4. Over", note: "Overflowing: the stripes leave the container with no line at the join and no border.", actual: 52 },
];
const oneSlot = (actual: number): readonly SlotStackSeries[] => [
  { id: "Remodels", label: "Remodels", slots: [split(2, 40, actual)] },
];

/* 5. The mixed column: Remodels $15k over, Cabinets $12k under, decks on. */
const MIXED = seriesOf([[[40, 55], [30, 18], [20, 20]]]);

/* 6. A 30/70 job: deposit on time in Mar, the balance expected in May and
   landing in Jun, larger. */
const LATE: readonly SlotStackSeries[] = [
  {
    id: "Remodels",
    label: "Remodels",
    slots: [split(2, 18, 18), split(3, 0, 0), split(4, 42, 0), split(5, 0, 46)],
  },
];

/* 7. Six months, expected / actual in $ thousands, per type. */
const RUN_ROWS: readonly (readonly (readonly [number, number])[])[] = [
  [[30, 30], [20, 20], [10, 10]],
  [[40, 28], [20, 20], [10, 14]],
  [[40, 55], [30, 18], [20, 20]],
  [[35, 35], [30, 38], [15, 15]],
  [[50, 20], [25, 10], [20, 0]],
  [[40, 0], [20, 0], [25, 0]],
];
const RUN = seriesOf(RUN_ROWS);
const PERIODS = [0, 1, 2, 3, 4, 5];

/* Each month's OWN two values, netted by the caller: the month's expected
   total against its actual total. March nets to $3k over although one type
   is $15k over and another $12k under, which is why the chart is handed
   these and never adds the types up itself. */
const RUN_TOTALS: readonly SlotStackSlot[] = map(
  (row: readonly (readonly [number, number])[], period: number) =>
    split(
      period,
      row.reduce((sum, [expected]) => sum + expected, 0),
      row.reduce((sum, [, actual]) => sum + actual, 0),
    ),
  RUN_ROWS,
);

/* A column SHORTER than its own breakdown: the month expects $14k and holds
   $12k (a 14-tall container, 12 full), while its types stand 8 (Remodels:
   $3k of $8k) and 9 (Cabinets: $6k full, $3k over), 17 in all. The same
   $12k and $14k either way; only the netting differs, and it is the
   caller's. */
const SHORTER: readonly SlotStackSeries[] = [
  { id: "Remodels", label: "Remodels", slots: [{ period: 2, expected: 8, filled: 3, unfilled: 5, overflow: 0 }] },
  { id: "Cabinets", label: "Cabinets", slots: [{ period: 2, expected: 6, filled: 6, unfilled: 0, overflow: 3 }] },
];
const SHORTER_TOTAL: readonly SlotStackSlot[] = [
  { period: 2, expected: 14, filled: 12, unfilled: 2, overflow: 0 },
];

/* Status sub-fills: the filled and overflow parts, by status. */
const STATUSES: readonly SlotStackSeries[] = [
  {
    id: "Remodels",
    label: "Remodels",
    slots: [
      { ...split(3, 40, 40), filledByClass: { invoiced: 40, confirmed: 0, planned: 0 } },
      {
        ...split(4, 40, 52),
        filledByClass: { invoiced: 22, confirmed: 18, planned: 0 },
        overflowByClass: { invoiced: 0, confirmed: 7, planned: 5 },
      },
      { ...split(5, 40, 26), filledByClass: { invoiced: 0, confirmed: 10, planned: 16 } },
    ],
  },
  {
    id: "Cabinets",
    label: "Cabinets",
    slots: [
      { ...split(3, 20, 26), filledByClass: { invoiced: 20, confirmed: 0, planned: 0 }, overflowByClass: { invoiced: 6, confirmed: 0, planned: 0 } },
      { ...split(4, 20, 14), filledByClass: { invoiced: 6, confirmed: 8, planned: 0 } },
      { ...split(5, 20, 0) },
    ],
  },
];

const label = (period: number): string => MONTHS[period] ?? "";

export const SlotStackChartShowcase: Component = () => (
  <div class="component-section component-section--full">
    <div class="example-group">
      <SectionTitle>Two values by default, the breakdown on hover</SectionTitle>
      <MutedBody>
        Each month is one container in the chart's default blue: what was
        expected, and the money filling it or overflowing it. Move the pointer
        over a month and that month alone breaks into its types. Its height is
        not held: March stands at $93k as two values and $105k as types.
      </MutedBody>
      <SlotStackLegend series={RUN} words={WORDS} />
      <div class="slot-stack-chart-demo slot-stack-chart-demo--run">
        <DollarStack
          series={RUN}
          totals={RUN_TOTALS}
          periods={PERIODS}
          periodLabel={label}
          valueFormat={money}
          now={3.5}
        />
      </div>
      <div class="slot-stack-chart-demo-row">
        <div class="slot-stack-chart-demo-card">
          <CaptionLabel>At a small panel's size, on hover</CaptionLabel>
          <div class="slot-stack-chart-demo slot-stack-chart-demo--small">
            <DollarStack series={RUN} totals={RUN_TOTALS} periods={PERIODS} periodLabel={label} valueFormat={money} />
          </div>
        </div>
        <div class="slot-stack-chart-demo-card">
          <CaptionLabel>expand="never": always the two values</CaptionLabel>
          <div class="slot-stack-chart-demo slot-stack-chart-demo--small">
            <DollarStack series={RUN} totals={RUN_TOTALS} expand="never" periods={PERIODS} periodLabel={label} valueFormat={money} />
          </div>
        </div>
        <div class="slot-stack-chart-demo-card">
          <CaptionLabel>expand="always": always the types</CaptionLabel>
          <div class="slot-stack-chart-demo slot-stack-chart-demo--small">
            <DollarStack series={RUN} totals={RUN_TOTALS} expand="always" periods={PERIODS} periodLabel={label} valueFormat={money} />
          </div>
        </div>
        <div class="slot-stack-chart-demo-card">
          <CaptionLabel>A column shorter than its hovered slots</CaptionLabel>
          <div class="slot-stack-chart-demo slot-stack-chart-demo--single">
            <DollarStack series={SHORTER} totals={SHORTER_TOTAL} periods={[2]} periodLabel={label} valueFormat={money} yMax={17} />
          </div>
          <MutedBody>
            The column expects $14k and holds $12k, so it stands 14 tall. Its
            two types stand 8 and 9: hovered, the bar grows to 17.
          </MutedBody>
        </div>
      </div>
    </div>

    <div class="example-group">
      <SectionTitle>One slot at a time</SectionTitle>
      <MutedBody>
        Each series' segment is a container the size of what was expected.
        Money fills it from the bottom; what is left stays dashed; anything
        more overflows as stripes. Read-only: hover a part for its text.
      </MutedBody>
      <div class="slot-stack-chart-demo-row">
        {map(
          (one: (typeof ONE)[number]) => (
            <div class="slot-stack-chart-demo-card">
              <CaptionLabel>{one.title}</CaptionLabel>
              <div class="slot-stack-chart-demo slot-stack-chart-demo--single">
                <DollarStack
                  series={oneSlot(one.actual)}
                  periods={[2]}
                  periodLabel={label}
                  valueFormat={money}
                  yMax={55}
                />
              </div>
              <MutedBody>{one.note}</MutedBody>
            </div>
          ),
          ONE,
        )}
      </div>
    </div>

    <div class="example-group">
      <SectionTitle>Three series in one column, and money that lands late</SectionTitle>
      <div class="slot-stack-chart-demo-row">
        <div class="slot-stack-chart-demo-card">
          <CaptionLabel>5. Mixed: one over, one under, one on target</CaptionLabel>
          <div class="slot-stack-chart-demo slot-stack-chart-demo--single">
            <DollarStack series={MIXED} periods={[0]} periodLabel={() => "Mar"} valueFormat={money} />
          </div>
          <MutedBody>
            Each type keeps its own slot, so the Cabinets gap sits right above
            Cabinets and the Remodels overflow right above Remodels.
          </MutedBody>
        </div>
        <div class="slot-stack-chart-demo-card">
          <CaptionLabel>6. A 30/70 job: deposit on time, balance late and larger</CaptionLabel>
          <div class="slot-stack-chart-demo slot-stack-chart-demo--wide">
            <DollarStack series={LATE} periods={[2, 3, 4, 5]} periodLabel={label} valueFormat={money} />
          </div>
          <MutedBody>
            May is an empty dashed container; June is all overflow, striped from
            the floor, because nothing was expected there.
          </MutedBody>
        </div>
      </div>
    </div>

    <div class="example-group">
      <SectionTitle>7. A six-period run, always by type (no totals given)</SectionTitle>
      <SlotStackLegend series={RUN} words={WORDS} />
      <div class="slot-stack-chart-demo slot-stack-chart-demo--run">
        <DollarStack series={RUN} periods={PERIODS} periodLabel={label} valueFormat={money} now={3.5} />
      </div>
      <CaptionLabel>At a small panel's size (300 x 130): a tighter inset.</CaptionLabel>
      <div class="slot-stack-chart-demo slot-stack-chart-demo--small">
        <DollarStack series={RUN} periods={PERIODS} periodLabel={label} valueFormat={money} now={3.5} />
      </div>
      <MutedBody>
        {`slotStackRows(series) prints the numbers drawn, one row per slot: ${JSON.stringify(slotStackRows(RUN)[4])}`}
      </MutedBody>
    </div>

    <div class="example-group">
      <SectionTitle>Status sub-fills</SectionTitle>
      <MutedBody>
        A slot may state its filled and overflow parts by status: invoiced is
        solid, confirmed translucent, planned lighter, and the overflow's
        stripes soften the same way.
      </MutedBody>
      <SlotStackLegend series={STATUSES} words={WORDS} statuses />
      <div class="slot-stack-chart-demo slot-stack-chart-demo--wide">
        <DollarStack series={STATUSES} periods={[3, 4, 5]} periodLabel={label} valueFormat={money} />
      </div>
    </div>
  </div>
);
