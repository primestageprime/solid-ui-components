// RTH receivables — how Thorcasting would show Rhino Tool House's unfulfilled
// (open) invoices against when they were expected to be paid.
//
// Region 1: the cumulative deviation chart. A step line of running actual
// minus expected, the schedule track of expected slots on the zero line, and a
// dot per actual payment. The model is rth-receivables.model.ts; the data is
// rth-receivables.fixtures.ts.
import { type Component, createMemo, createSignal } from "solid-js";
import {
  Chart,
  ClusterRow,
  ContentChartFrame,
  Grid,
  LineSeries,
  MutedBody,
  NarrowStack,
  PointCaptions,
  PointSeries,
  ReferenceLine,
  SectionTitle,
  SegmentedControl,
  SlotTrack,
  TextSublabel,
  ViewportColumn,
  XAxis,
  YAxis,
  fn,
} from "../../../src";
import {
  CUSTOMER,
  INVOICES,
  LAST_DATA,
  NOTE,
  PAYMENTS,
  TERMS_PRESETS,
} from "./rth-receivables.fixtures";
import {
  type Dot,
  type SeriesPoint,
  type Slot,
  X_START,
  dayMs,
  deviationSeries,
  dotsOf,
  expectations,
  slotsOf,
  stepsOf,
  xRange,
} from "./rth-receivables.model";

export const meta = { label: "RTH receivables" };

const SUCCESS = "var(--sui-success)";
const WARNING = "var(--sui-warning)";
const DANGER = "var(--sui-danger)";

const MONTHS = [
  "2026-04-01",
  "2026-05-01",
  "2026-06-01",
  "2026-07-01",
  "2026-08-01",
  "2026-09-01",
];
const MONTH_NAMES = ["Apr", "May", "Jun", "Jul", "Aug", "Sep"];
const MONTH_MS = fn.map(dayMs, MONTHS);
const monthName = (v: number): string =>
  MONTH_NAMES[fn.findIndex((m: number) => m === v, MONTH_MS)] ?? "";

const Y_TICKS = [0, -10_000, -20_000, -30_000];
const Y_DOMAIN: [number, number] = [-34_000, 4_000];
const yLabel = (v: number): string =>
  v === 0 ? "$0" : `${v < 0 ? "−" : "+"}$${Math.abs(v) / 1000}k`;

const RANGE = xRange(LAST_DATA);
const X_DOMAIN: [Date, Date] = [new Date(X_START), new Date(RANGE[1])];

const RthReceivablesBench: Component = () => {
  const [terms, setTerms] = createSignal(TERMS_PRESETS[0]?.id ?? "net30");
  const days = () =>
    fn.find(
      (t: (typeof TERMS_PRESETS)[number]) => t.id === terms(),
      TERMS_PRESETS,
    )?.days ?? 30;
  const exps = createMemo(() =>
    expectations(INVOICES, PAYMENTS, days(), LAST_DATA),
  );
  const series = createMemo(() =>
    deviationSeries(stepsOf(exps(), PAYMENTS, LAST_DATA), LAST_DATA),
  );
  const slots = createMemo(() => slotsOf(exps(), LAST_DATA));
  const dots = createMemo(() => dotsOf(exps(), PAYMENTS, LAST_DATA));
  const late = createMemo(() =>
    fn.filter((d: Dot) => d.timing !== undefined, dots()),
  );
  const lineColor = () =>
    (series()[series().length - 1]?.y ?? 0) < 0 ? DANGER : SUCCESS;

  return (
    <div class="component-section component-section--full">
      <ViewportColumn>
        <SectionTitle>{`${CUSTOMER}: open invoices against their expected payment`}</SectionTitle>
        <NarrowStack>
          <ClusterRow>
            <TextSublabel>Expected payment</TextSublabel>
            <SegmentedControl
              aria-label="Expected payment terms"
              options={fn.map(
                (t) => ({ value: t.id, label: t.label }),
                TERMS_PRESETS,
              )}
              value={terms()}
              onValueChange={(v) => {
                setTerms(v);
                console.table(
                  expectations(INVOICES, PAYMENTS, days(), LAST_DATA),
                );
              }}
            />
          </ClusterRow>
          <ContentChartFrame
            title="Cumulative deviation: actual minus expected"
            yTitle="Actual − expected ($)"
          >
            <Chart
              width={860}
              height={262}
              xDomain={X_DOMAIN}
              yDomain={Y_DOMAIN}
              margin={{ top: 30, right: 16, bottom: 34, left: 58 }}
              responsive
            >
              <Grid horizontal vertical tickCount={4} />
              <YAxis hideLine tickValues={Y_TICKS} tickFormat={yLabel} />
              <XAxis hideLine tickValues={MONTH_MS} tickFormat={monthName} />
              <ReferenceLine
                orientation="horizontal"
                value={0}
                color="var(--sui-accent)"
                strokeWidth={1.5}
                opacity={1}
              />
              <ReferenceLine
                orientation="vertical"
                value={new Date(dayMs(LAST_DATA))}
                strokeDasharray="3 3"
                label="Last data"
              />
              <SlotTrack<Slot>
                data={slots()}
                from={(s) => s.at}
                to={(s) => s.at}
                y={0}
                state={(s) => s.state}
                title={(s) => s.title}
              />
              <PointSeries<Dot>
                data={dots()}
                x={(d) => d.x}
                y={() => 0}
                radius={3}
                fill={(d) => (d.onTime ? SUCCESS : WARNING)}
                title={(d) => d.title}
              />
              <PointCaptions<Dot>
                data={late()}
                x={(d) => d.x}
                y={() => 0}
                text={(d) => d.timing ?? ""}
                offset={10}
                tone="warning"
              />
              <LineSeries<SeriesPoint>
                data={series()}
                x={(p) => p.x}
                y={(p) => p.y}
                stroke={lineColor()}
                strokeWidth={2}
                curve="step"
              />
            </Chart>
          </ContentChartFrame>
          <MutedBody>{NOTE}</MutedBody>
        </NarrowStack>
      </ViewportColumn>
    </div>
  );
};

export default RthReceivablesBench;
