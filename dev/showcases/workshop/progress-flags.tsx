// progress-flags — a diddit topic's progress as a step timeline with
// milestone flags, shown for five scenarios stacked.
//
// Each chart: the dashed line is the ESTIMATE, stepping through every step at
// its estimated duration from the first claim; the solid line is the ACTUAL,
// stepping at each real StepDone. The area between them is blue within
// tolerance, purple ahead of it, red behind it (tolerance: TOLERANCE_RATIO /
// TOLERANCE_FLOOR_MIN in the model). One flag per step in a row along the top,
// each with a thin drop line to its point on the series. The receipts table
// sits under "Ahead", the one scenario that is a real topic. The model is
// progress-flags.model.ts; the data is progress-flags.fixtures.ts.
import { type Accessor, type Component, Index, Show, createMemo, createSignal } from "solid-js";
import {
  AreaSeries,
  Chart,
  ContentAutoGrowChartFrame,
  FieldTable,
  Grid,
  Icon,
  LineSeries,
  MutedBody,
  NarrowStack,
  PinMarkers,
  ReferenceLine,
  ShapeGlyph,
  Tooltip,
  ViewportColumn,
  XAxis,
  YAxis,
  createAxisWaterMarks,
  fields,
  fn,
  slotId,
} from "../../../src";
import type { IconName, Id, Pin } from "../../../src";
import type { ReceiptKind, TopicTrace } from "./progress-flags.fixtures";
import { SCENARIOS } from "./progress-flags.fixtures";
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
  flagTip,
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
const LANE = 16;
/** Room past the last event, as a share of the span, so the last flag is not clipped. */
const X_PAD = 0.03;
const DROP_STROKE = "var(--sui-text-muted)";
const LIT_STROKE = "var(--sui-accent)";

interface FlagPin extends Pin {
  readonly flag: Flag;
}

const stepId = (n: number): Id => slotId(`step-${n}`);

const flagColor = (f: Flag): string => (f.state === "current" ? CURRENT : PAST);

const pinOf = (f: Flag): FlagPin => ({
  id: stepId(f.index),
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

type Scenario = (typeof SCENARIOS)[number];

const KIND_ICON: Record<ReceiptKind, IconName> = {
  Claimed: "log-in",
  Released: "log-out",
  Estimated: "hourglass",
  StepsSet: "menu",
  StepStarted: "arrow-right",
  StepDone: "check",
  Milestone: "chart-line",
  Parked: "pause",
  Blocked: "lock",
  Unblocked: "lock-open",
  ApprovalRequested: "bell",
  Approved: "user",
  Lapsed: "warning",
  Dismissed: "close",
};

const kindCell = (row: ReceiptRow) => (
  <Tooltip content={row.kind} triggerAs="span">
    <Icon name={KIND_ICON[row.kind]} size="sm" aria-label={row.kind} />
  </Tooltip>
);

const TICK_CHOICES = [10, 20, 30, 60];
/** The tick step that keeps about six ticks across the span. */
const tickEvery = (spanMs: number): number =>
  fn.find((m: number) => spanMs / (m * MIN_MS) <= 7, TICK_CHOICES) ?? 120;

const RECEIPT_FIELDS = ["elapsed", "kind", "detail", "estimate", "actual"];
const RECEIPT_REGISTRY = {
  elapsed: fields.textCol<ReceiptRow>("elapsed"),
  kind: fields.col<ReceiptRow>("kind", "Kind", kindCell, "status"),
  detail: fields.textCol<ReceiptRow>("detail"),
  estimate: fields.col<ReceiptRow>("estimate", "Est. duration", (r) => r.estimate, "duration"),
  actual: fields.col<ReceiptRow>("actual", "Actual duration", (r) => r.actual, "duration"),
};

/** One topic's step timeline: area, both lines, flags along the top with drop lines. */
interface TimelineProps {
  readonly name: string;
  readonly topic: TopicTrace;
  readonly nowMin?: number;
  /** The step whose flag the pointer is on (or whose row it is on). */
  readonly hovered: Accessor<Id | undefined>;
  readonly onHover: (id: Id | undefined) => void;
  /** The step whose flag was pressed. */
  readonly selected: Accessor<Id | undefined>;
  readonly onSelect: (id: Id) => void;
}

const StepTimeline: Component<TimelineProps> = (props) => {
  const t0 = () => startOf(props.topic);
  const end = () =>
    props.nowMin === undefined ? endOf(props.topic) : t0() + props.nowMin * MIN_MS;
  const estimate = createMemo(() => estimateLine(props.topic));
  const actual = createMemo(() => actualLine(props.topic, end()));
  const intervals = createMemo(() => intervalsOf(props.topic, end()));
  const flags = createMemo(() => flagsOf(props.topic, end()));
  const pins = createMemo(() => fn.map(pinOf, flags()));
  const xEnd = () => {
    const last = Math.max(endOf(props.topic), t0() + totalMin(props.topic) * MIN_MS);
    return last + (last - t0()) * X_PAD;
  };
  const yMax = () => Math.round(totalMin(props.topic) * 1.1);
  // The y axis only grows; the frame's fit button drops it back to the data.
  const marks = createAxisWaterMarks(() => ({ min: 0, max: yMax() }));
  const yDomain = (): [number, number] => marks.domain() ?? [0, yMax()];
  const ticks = () => timeTicks(t0(), xEnd(), tickEvery(xEnd() - t0()));
  const lit = (n: number): boolean =>
    props.hovered() === stepId(n) || props.selected() === stepId(n);
  const emphasized = createMemo((): ReadonlySet<Id> => {
    const id = props.hovered();
    return id === undefined ? new Set<Id>() : new Set<Id>([id]);
  });
  const drop = (f: Flag): LevelPoint[] => [
    { x: f.x, y: yMax() },
    { x: f.x, y: f.y },
  ];
  return (
    <ContentAutoGrowChartFrame
      title={props.name}
      yTitle="Planned minutes earned"
      onYAxisPress={marks.reset}
    >
      <Chart
        width={860}
        height={300}
        xDomain={[new Date(t0()), new Date(xEnd())]}
        yDomain={yDomain()}
        margin={{ top: LANE + 12, right: 16, bottom: 34, left: 52 }}
        annotationLaneHeight={LANE}
        responsive
      >
        <Grid horizontal tickCount={5} />
        <YAxis hideLine tickCount={5} />
        <XAxis hideLine tickValues={[...ticks()]} tickFormat={clock} />
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
        <Show when={props.nowMin !== undefined}>
          <ReferenceLine
            orientation="vertical"
            value={new Date(end())}
            label="now"
            stroke={INK}
            strokeDasharray="4 3"
          />
        </Show>
        <Index each={flags()}>
          {(f) => (
            <LineSeries<LevelPoint>
              data={drop(f())}
              x={px}
              y={py}
              stroke={lit(f().index) ? LIT_STROKE : DROP_STROKE}
              strokeWidth={lit(f().index) ? 2 : 1}
            />
          )}
        </Index>
        <PinMarkers<FlagPin>
          data={pins()}
          lane="annotation"
          selectedId={props.selected()}
          emphasizedIds={emphasized()}
          onHover={(pin) => props.onHover(pin?.id)}
          onClick={(pin) => props.onSelect(pin.id)}
          renderPin={(pin, rc) => (
            <ShapeGlyph
              descriptor={pin.descriptor}
              cx={rc.cx}
              cy={rc.cy}
              size={FLAG_SIZE}
              hollow={pin.flag.state === "planned"}
              stroke={rc.selected ? LIT_STROKE : undefined}
              strokeWidth={rc.selected ? 2 : undefined}
            />
          )}
        />
      </Chart>
    </ContentAutoGrowChartFrame>
  );
};

/** One scenario: its framed chart and, for the real topic, the receipts it is built from. */
const ScenarioSection: Component<{ readonly scenario: Scenario }> = (props) => {
  const [hovered, setHovered] = createSignal<Id | undefined>(undefined);
  const [selected, setSelected] = createSignal<Id | undefined>(undefined);
  return (
    <>
      <StepTimeline
        name={props.scenario.name}
        topic={props.scenario.topic}
        nowMin={props.scenario.nowMin}
        hovered={hovered}
        onHover={setHovered}
        selected={selected}
        onSelect={setSelected}
      />
      <MutedBody>{props.scenario.topic.title}</MutedBody>
      <Show when={props.scenario.name === "Ahead"}>
        <FieldTable
          data={[...receiptRows(props.scenario.topic)]}
          fields={RECEIPT_FIELDS}
          registry={RECEIPT_REGISTRY}
          maxRows={14}
          onRowHover={(row) =>
            setHovered(row?.step === undefined ? undefined : stepId(row.step))
          }
        />
      </Show>
    </>
  );
};

const ProgressFlagsBench: Component = () => (
  <div class="component-section component-section--full">
    <ViewportColumn>
      <NarrowStack>
        <MutedBody>
          Dashed: estimate. Solid: actual. Blue: within tolerance. Purple: ahead
          of it. Red: behind it. Flags: grey done, cyan current, outline planned.
        </MutedBody>
        <Index each={SCENARIOS}>{(sc) => <ScenarioSection scenario={sc()} />}</Index>
      </NarrowStack>
    </ViewportColumn>
  </div>
);

export default ProgressFlagsBench;
