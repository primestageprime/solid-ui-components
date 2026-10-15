// progress-flags — one diddit topic's progress as a step timeline with
// milestone flags.
//
// Region 1: the chart for topic 18 (M15 rolling bars). The dashed line is the
// ESTIMATE, stepping through every step at its estimated duration from the
// first claim; the solid line is the ACTUAL, stepping at each real StepDone.
// The area between them is blue within tolerance, purple ahead of it, red
// behind it (tolerance: TOLERANCE_RATIO / TOLERANCE_FLOOR_MIN in the model).
// One flag per step above its rise. Beside it, the receipts the picture is
// built from. The model is progress-flags.model.ts; the data is
// progress-flags.fixtures.ts.
import { type Component, createMemo } from "solid-js";
import {
  AreaSeries,
  Chart,
  ContentChartFrame,
  FieldTable,
  Grid,
  LineSeries,
  MutedBody,
  NarrowStack,
  PinMarkers,
  SectionTitle,
  ShapeGlyph,
  ViewportColumn,
  XAxis,
  YAxis,
  fields,
  fn,
  slotId,
} from "../../../src";
import type { Pin } from "../../../src";
import { TOPIC_18 } from "./progress-flags.fixtures";
import {
  type BandVertex,
  type Flag,
  type LevelPoint,
  type ReceiptRow,
  MIN_MS,
  actualLine,
  bandFor,
  clock,
  endOf,
  estimateLine,
  flagsOf,
  intervalsOf,
  receiptRows,
  startOf,
  timeTicks,
  totalMin,
} from "./progress-flags.model";

export const meta = { label: "Progress flags" };

// The palette has accent, danger and success but no purple or cyan, so those
// two are mixed from the tokens rather than written as hex.
const WITHIN = "var(--sui-accent)";
const AHEAD = "color-mix(in srgb, var(--sui-accent) 50%, var(--sui-danger))";
const BEHIND = "var(--sui-danger)";
const INK = "var(--sui-text-primary)";
const PAST = "var(--sui-text-secondary)";
const CURRENT = "color-mix(in srgb, var(--sui-accent) 50%, var(--sui-success))";
const BAND_OPACITY = 0.4;
const FLAG_SIZE = 9;
const FLAG_LIFT = 9;
const TICK_EVERY_MIN = 20;

interface FlagPin extends Pin {
  readonly flag: Flag;
}

const flagColor = (f: Flag): string => (f.state === "current" ? CURRENT : PAST);

const pinOf = (f: Flag): FlagPin => ({
  id: slotId(`step-${f.index}`),
  x: f.x,
  y: f.y,
  descriptor: { color: flagColor(f), shape: "square", size: FLAG_SIZE },
  flag: f,
});

const topx = (v: BandVertex): number => v.top;
const bottomx = (v: BandVertex): number => v.bottom;
const vx = (v: BandVertex): number => v.x;
const px = (p: LevelPoint): number => p.x;
const py = (p: LevelPoint): number => p.y;

const RECEIPT_FIELDS = ["elapsed", "kind", "detail"];
const RECEIPT_REGISTRY = {
  elapsed: fields.textCol<ReceiptRow>("elapsed"),
  kind: fields.textCol<ReceiptRow>("kind"),
  detail: fields.textCol<ReceiptRow>("detail"),
};

const ProgressFlagsBench: Component = () => {
  const topic = TOPIC_18;
  const t0 = startOf(topic);
  const end = endOf(topic);
  const estimate = createMemo(() => estimateLine(topic));
  const actual = createMemo(() => actualLine(topic, end));
  const intervals = createMemo(() => intervalsOf(topic, end));
  const pins = createMemo(() => fn.map(pinOf, flagsOf(topic, end)));
  const xEnd = Math.max(end, t0 + totalMin(topic) * MIN_MS);
  const ticks = timeTicks(t0, xEnd, TICK_EVERY_MIN);

  return (
    <div class="component-section component-section--full">
      <ViewportColumn>
        <SectionTitle>{`Topic ${topic.id}: ${topic.title}`}</SectionTitle>
        <NarrowStack>
          <ContentChartFrame
            title="Planned minutes earned over wall-clock time"
            yTitle="Planned minutes earned"
          >
            <Chart
              width={860}
              height={300}
              xDomain={[new Date(t0), new Date(xEnd)]}
              yDomain={[0, Math.round(totalMin(topic) * 1.15)]}
              margin={{ top: 16, right: 16, bottom: 34, left: 52 }}
              responsive
            >
              <Grid horizontal tickCount={5} />
              <YAxis hideLine tickCount={5} />
              <XAxis hideLine tickValues={[...ticks]} tickFormat={clock} />
              <AreaSeries<BandVertex>
                data={bandFor(intervals(), "within")}
                x={vx}
                y={topx}
                lower={bottomx}
                fill={WITHIN}
                fillOpacity={BAND_OPACITY}
              />
              <AreaSeries<BandVertex>
                data={bandFor(intervals(), "ahead")}
                x={vx}
                y={topx}
                lower={bottomx}
                fill={AHEAD}
                fillOpacity={BAND_OPACITY}
              />
              <AreaSeries<BandVertex>
                data={bandFor(intervals(), "behind")}
                x={vx}
                y={topx}
                lower={bottomx}
                fill={BEHIND}
                fillOpacity={BAND_OPACITY}
              />
              <LineSeries<LevelPoint>
                data={estimate()}
                x={px}
                y={py}
                stroke={INK}
                strokeWidth={1.5}
                strokeDasharray="5 4"
                curve="step"
              />
              <LineSeries<LevelPoint>
                data={actual()}
                x={px}
                y={py}
                stroke={INK}
                strokeWidth={2}
                curve="step"
              />
              <PinMarkers<FlagPin>
                data={pins()}
                renderPin={(pin, rc) => (
                  <ShapeGlyph
                    descriptor={pin.descriptor}
                    cx={rc.cx}
                    cy={rc.cy - FLAG_LIFT}
                    hollow={pin.flag.state === "planned"}
                  />
                )}
              />
            </Chart>
          </ContentChartFrame>
          <MutedBody>
            Dashed: estimate. Solid: actual. Blue: within tolerance. Purple:
            ahead of it. Red: behind it. Flags: grey done, cyan current, outline
            planned.
          </MutedBody>
          <SectionTitle>Receipts</SectionTitle>
          <FieldTable
            data={[...receiptRows(topic)]}
            fields={RECEIPT_FIELDS}
            registry={RECEIPT_REGISTRY}
            maxRows={14}
          />
        </NarrowStack>
      </ViewportColumn>
    </div>
  );
};

export default ProgressFlagsBench;
