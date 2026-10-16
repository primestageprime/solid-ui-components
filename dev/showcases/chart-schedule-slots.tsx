// Chart schedule slots — SlotTrack, PointCaptions and OutOfRangeMarkers over
// one running-deviation line drawn as a stair (`LineSeries curve="step"`).
// The second chart marks a window with no schedule (XSpan, hatched) and each
// payment as a tick on the zero line (TickSeries), captioned below.
//
// The parent that gives them meaning is a schedule: a payment expected in
// each slot, what arrived, and the running actual-minus-expected above the
// track. None of the three stands alone, so the demo is that chart.
import { type Component, createUniqueId } from "solid-js";
import {
  Chart,
  GapBracket,
  Grid,
  PinMarkers,
  slotId,
  LineSeries,
  OutOfRangeMarkers,
  PointCaptions,
  PointSeries,
  ReferenceLine,
  SlotTrack,
  SlotTrackSwatch,
  TickSeries,
  type SlotState,
  XAxis,
  XSpan,
  YAxis,
} from "../../src/components/Chart";
import { HatchPattern } from "../../src/components/SvgMarks";
import { Legend } from "../../src/components/Legend";
import { ContentStack, NarrowStack } from "../../src/components/Layout";
import { SubsectionTitle, TextSublabel } from "../../src/components/Text";

interface Slot {
  readonly from: number;
  readonly to: number;
  readonly state: SlotState;
  readonly hits: number;
  readonly expected: number;
}

interface Arrival {
  readonly x: number;
  readonly amount: number;
  readonly inSlot: boolean;
}

// Six monthly slots of ±2 days around day 15, two payments expected in each.
const SLOTS: readonly Slot[] = [0, 1, 2, 3, 4, 5].map((m) => {
  const hits = m === 2 ? 0 : m === 4 ? 1 : 2;
  return {
    from: m * 30 + 13,
    to: m * 30 + 17,
    hits,
    expected: 2,
    state: hits === 2 ? "filled" : hits === 0 ? "empty" : "partial",
  };
});

const ARRIVALS: readonly Arrival[] = [
  { x: 15, amount: 200, inSlot: true },
  { x: 16, amount: 200, inSlot: true },
  { x: 45, amount: 200, inSlot: true },
  { x: 46, amount: 200, inSlot: true },
  { x: 82, amount: 400, inSlot: false },
  { x: 105, amount: 200, inSlot: true },
  { x: 106, amount: 200, inSlot: true },
  { x: 135, amount: 200, inSlot: true },
  { x: 165, amount: 200, inSlot: true },
  { x: 166, amount: 200, inSlot: true },
];

// The running deviation: an arrival inside its slot counts against the $200
// expected; one outside any slot adds in full; a slot's end charges what did
// not arrive.
const EVENTS = [
  ...ARRIVALS.map((a) => ({ x: a.x, delta: a.inSlot ? a.amount - 200 : a.amount })),
  ...SLOTS.map((s) => ({ x: s.to, delta: -(s.expected - s.hits) * 200 })),
].sort((a, b) => a.x - b.x);
const LINE = EVENTS.reduce<{ x: number; y: number }[]>(
  (acc, e) => [...acc, { x: e.x, y: (acc[acc.length - 1]?.y ?? 0) + e.delta }],
  [{ x: 0, y: 0 }],
);
const LAST = LINE[LINE.length - 1]!;

const money = (v: number) => `${v < 0 ? "−" : "+"}$${Math.abs(v)}`;

// Payments with no schedule to judge them against: ticks on the zero line,
// and the stretch before the first schedule starts, hatched.
const UNSCHEDULED: readonly { x: number; amount: number }[] = [
  { x: 8, amount: 120 },
  { x: 22, amount: 75 },
  { x: 51, amount: 300 },
  { x: 97, amount: 150 },
  { x: 140, amount: 90 },
];

const NoScheduleChart: Component = () => {
  const hatch = createUniqueId();
  return (
    <Chart width={720} height={160} xDomain={[0, 180]} yDomain={[-1, 1]} margin={{ top: 12, right: 60, bottom: 28, left: 48 }} responsive>
      <HatchPattern id={hatch} color="var(--sui-text-secondary)" stripeOpacity={0.2} groundOpacity={0.05} />
      <XSpan from={0} to={60} paint={`url(#${hatch})`} label="no schedule" />
      <XAxis hideLine tickValues={[0, 30, 60, 90, 120, 150, 180]} tickFormat={(v) => `d${v}`} />
      <ReferenceLine orientation="horizontal" value={0} opacity={1} />
      <TickSeries
        data={UNSCHEDULED}
        x={(p) => p.x}
        y={() => 0}
        stroke={(p) => (p.x < 60 ? "var(--sui-text-secondary)" : "var(--sui-accent)")}
        title={(p) => `Day ${p.x}: $${p.amount}`}
      />
      <PointCaptions data={UNSCHEDULED} x={(p) => p.x} y={() => 0} text={(p) => `$${p.amount}`} side="below" offset={14} />
    </Chart>
  );
};

// Each month's smallest and largest payment: a min–max whisker with centred
// caps, over a dot at the month's median.
const SPREAD: readonly { x: number; min: number; median: number; max: number }[] = [
  { x: 15, min: 80, median: 140, max: 210 },
  { x: 45, min: 120, median: 160, max: 180 },
  { x: 75, min: 40, median: 150, max: 240 },
  { x: 105, min: 130, median: 150, max: 170 },
];

const WhiskerChart: Component = () => (
  <Chart width={720} height={160} xDomain={[0, 120]} yDomain={[0, 260]} margin={{ top: 12, right: 60, bottom: 28, left: 48 }} responsive>
    <Grid horizontal tickCount={4} />
    <YAxis hideLine tickCount={4} tickFormat={(v) => `$${v}`} />
    <XAxis hideLine tickValues={[0, 30, 60, 90, 120]} tickFormat={(v) => `d${v}`} />
    {SPREAD.map((m) => (
      <GapBracket from={m.min} to={m.max} x={m.x} offset={0} tick={10} tickAlign="center" stroke="var(--sui-accent)" />
    ))}
    <PointSeries data={SPREAD} x={(m) => m.x} y={(m) => m.median} radius={3} fill="var(--sui-accent)" />
  </Chart>
);

// A year track: a dot for each year with a payment, and a × for each year
// with none (PinMarkers, shape "cross", the size of a radius-6 dot).
const YEARS = [2019, 2020, 2021, 2022, 2023, 2024, 2025];
const PAID = new Set([2019, 2020, 2022, 2025]);

const YearTrackChart: Component = () => (
  <Chart width={720} height={70} xDomain={[2018.5, 2025.5]} yDomain={[-1, 1]} margin={{ top: 8, right: 60, bottom: 28, left: 48 }} responsive>
    <XAxis hideLine tickValues={YEARS} tickFormat={(v) => `${v}`} />
    <ReferenceLine orientation="horizontal" value={0} opacity={0.4} />
    <PointSeries data={YEARS.filter((y) => PAID.has(y))} x={(y) => y} y={() => 0} radius={6} fill="var(--sui-accent)" />
    <PinMarkers
      data={YEARS.filter((y) => !PAID.has(y)).map((y) => ({
        id: slotId(String(y)),
        x: y,
        y: 0,
        descriptor: { color: "var(--sui-text-secondary)", shape: "cross" as const, size: 12 },
      }))}
    />
  </Chart>
);

export const ChartScheduleSlotsShowcase: Component = () => (
  <div class="component-section component-section--full">
    <ContentStack>
      <SubsectionTitle>Schedule slots on a running deviation</SubsectionTitle>
      <TextSublabel>
        One lozenge per expected slot (SlotTrack) on the zero line, a dot per
        arrival (PointSeries), a word on the arrival that missed its slot
        (PointCaptions), the running actual-minus-expected as a stair
        (LineSeries curve="step") and the peak the y domain clips
        (OutOfRangeMarkers).
      </TextSublabel>
      <NarrowStack>
        <Chart width={720} height={220} xDomain={[0, 180]} yDomain={[-250, 250]} margin={{ top: 12, right: 60, bottom: 28, left: 48 }} responsive>
          <Grid horizontal tickCount={4} />
          <YAxis hideLine tickCount={4} tickFormat={(v) => money(v)} />
          <XAxis hideLine tickValues={[0, 30, 60, 90, 120, 150, 180]} tickFormat={(v) => `d${v}`} />
          <ReferenceLine orientation="horizontal" value={0} opacity={1} />
          <ReferenceLine orientation="vertical" value={170} strokeDasharray="3 3" label="Today" />
          <LineSeries data={LINE} x={(p) => p.x} y={(p) => p.y} stroke="var(--sui-success)" curve="step" />
          <OutOfRangeMarkers points={LINE} format={money} tone="success" />
          <SlotTrack
            data={SLOTS}
            from={(s) => s.from}
            to={(s) => s.to}
            y={0}
            state={(s) => s.state}
            caption={(s) => (s.hits === s.expected ? `×${s.hits}` : `${s.hits} of ${s.expected}`)}
            title={(s) => `Expected ${s.expected} around day ${(s.from + s.to) / 2}: ${s.hits} arrived`}
          />
          <PointSeries
            data={ARRIVALS}
            x={(a) => a.x}
            y={() => 0}
            radius={2.5}
            fill={(a) => (a.inSlot ? "var(--sui-success)" : "var(--sui-warning)")}
            title={(a) => `Day ${a.x}: $${a.amount}${a.inSlot ? "" : " — outside any slot"}`}
          />
          <PointCaptions
            data={ARRIVALS.filter((a) => !a.inSlot)}
            x={(a) => a.x}
            y={() => 0}
            text={() => "late"}
            offset={9}
            tone="warning"
          />
          <PointCaptions data={[LAST]} x={(p) => p.x} y={(p) => p.y} text={(p) => money(p.y)} side={LAST.y >= 0 ? "above" : "below"} offset={8} tone="success" />
        </Chart>
        <Legend
          items={[
            { swatch: <SlotTrackSwatch />, label: "expected slot, payment arrived" },
            { swatch: <SlotTrackSwatch state="empty" />, label: "expected slot, nothing arrived" },
            { color: "var(--sui-success)", line: true, label: "running actual minus expected" },
          ]}
        />
      </NarrowStack>
      <SubsectionTitle>A window with no schedule, and ticks</SubsectionTitle>
      <TextSublabel>
        A hatched stretch with a label (XSpan over a HatchPattern), a tick per
        payment on the zero line (TickSeries) and its amount below the tick
        (PointCaptions side="below").
      </TextSublabel>
      <NoScheduleChart />
      <SubsectionTitle>Min–max whiskers</SubsectionTitle>
      <TextSublabel>
        A stem from each month's smallest to its largest payment with a cap
        centred at each end (GapBracket tickAlign="center"), over a dot at the
        median (PointSeries).
      </TextSublabel>
      <WhiskerChart />
      <SubsectionTitle>A year track, with a × for an empty year</SubsectionTitle>
      <TextSublabel>
        A dot for each year with a payment (PointSeries, radius 6), and a ×
        the same size for each year with none (PinMarkers, shape "cross").
      </TextSublabel>
      <YearTrackChart />
    </ContentStack>
  </div>
);
