// TargetBarChart showcase — three job types over eight months, NOW in mid
// April. Every mark kind shows: solid invoiced and red cross-hatched missing
// in the past, translucent Confirmed and lighter Planned ahead, hatched excess
// above a projection, and empty outline still to sell. Drag a grip (whole
// $500 steps, floor 0) or double-click a bar to type a projection in.
import { type Component, createMemo, createSignal } from "solid-js";
import {
  type TargetBar,
  type TargetBarSeries,
  TargetBarChart,
} from "../../src/components/TargetBarChart";
import { ChartFrame, fn } from "../../src";

const { map } = fn;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];
const PERIODS = map((_m: string, i: number) => i, MONTHS);
const NOW = 3.5;
const STEP = 500;

interface Booked {
  readonly invoiced: number;
  readonly confirmed: number;
  readonly planned: number;
}
const b = (invoiced: number, confirmed = 0, planned = 0): Booked => ({
  invoiced,
  confirmed,
  planned,
});

const TYPES = [
  {
    id: "ext",
    label: "Exterior",
    booked: [b(6000), b(3500), b(9000), b(2000, 2500), b(0, 4000, 1000), b(0, 2000, 3000), b(0, 0, 2000), b(0)],
    projected: [6000, 6000, 7000, 7000, 7000, 8000, 8000, 8000],
  },
  {
    id: "int",
    label: "Interior",
    booked: [b(3000), b(4000), b(2500), b(1000, 1500), b(0, 3000), b(0, 0, 4500), b(0), b(0)],
    projected: [3000, 3000, 3500, 3500, 4000, 4000, 4000, 4500],
  },
  {
    id: "fen",
    label: "Fences",
    booked: [b(1500), b(0), b(2000), b(500, 500), b(0, 0, 1500), b(0), b(0, 1000), b(0)],
    projected: [1500, 1500, 1500, 2000, 2000, 2000, 2000, 2000],
  },
];

/** Clip the booked marks into the projection in stack order; the rest is above it. */
const barOf = (period: number, projected: number, booked: Booked): TargetBar => {
  const invoicedIn = Math.min(booked.invoiced, projected);
  const confirmedIn = Math.min(booked.confirmed, projected - invoicedIn);
  const plannedIn = Math.min(booked.planned, projected - invoicedIn - confirmedIn);
  const total = booked.invoiced + booked.confirmed + booked.planned;
  return {
    period,
    projected,
    invoiced: invoicedIn,
    confirmed: confirmedIn,
    planned: plannedIn,
    missing: period + 1 <= NOW ? Math.max(0, projected - total) : 0,
    above: Math.max(0, total - projected),
  };
};

const money = (v: number): string => `$${Math.round(v / 100) / 10}k`;

export const TargetBarChartShowcase: Component = () => {
  const [projections, setProjections] = createSignal<Record<string, readonly number[]>>(
    Object.fromEntries(map((t: (typeof TYPES)[number]) => [t.id, t.projected], TYPES)),
  );
  const series = createMemo((): readonly TargetBarSeries[] =>
    map(
      (t: (typeof TYPES)[number]) => ({
        id: t.id,
        label: t.label,
        step: STEP,
        bars: map(
          (p: number) => barOf(p, projections()[t.id][p], t.booked[p]),
          PERIODS,
        ),
      }),
      TYPES,
    ),
  );
  const setProjection = (id: string, period: number, value: number): void => {
    const snapped = Math.max(0, Math.round(value / STEP) * STEP);
    setProjections((prev) => ({
      ...prev,
      [id]: map((v: number, i: number) => (i === period ? snapped : v), prev[id]),
    }));
  };
  return (
    <ChartFrame title="Projections, month by month" yTitle="Revenue ($)">
      <TargetBarChart
        series={series()}
        periods={PERIODS}
        periodLabel={(p) => MONTHS[p] ?? ""}
        now={NOW}
        valueFormat={money}
        onProjectionChange={setProjection}
        onProjectionEnter={(id, p) => console.table(targetRow(series(), id, p))}
      />
    </ChartFrame>
  );
};

const targetRow = (s: readonly TargetBarSeries[], id: string, period: number) =>
  fn.filter((t: TargetBarSeries) => t.id === id, s)[0]?.bars[period];
