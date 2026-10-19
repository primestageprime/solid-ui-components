// ============================================
// ProgressFlags — Composite (Depth 3, zero CSS)
//
// One topic's progress as a step timeline with a flag per step. Two step
// lines over wall-clock time: the dashed ESTIMATE steps through every step at
// its estimated duration from the first receipt; the solid ACTUAL steps at
// each real step completion and jumps to the whole estimate at the milestone.
// The area between them is coloured by verdict: accent within tolerance, the
// accent/danger mix when ahead of it, danger when behind. One flag per step
// sits in the annotation lane along the top, with a thin drop line to its
// point on the series: filled grey for a done step, the accent/success mix
// for the one in progress, hollow for a planned one. Hovering a flag shows
// its tooltip (step, estimate, actual, state); hovering or selecting a step
// lights its drop line, so a consumer can link a receipts table by row.
//
// Depth 3 because it renders ContentAutoGrowChartFrame (Depth 2); inside the
// frame it composes only Chart slots (Grid, XAxis, YAxis, AreaSeries,
// LineSeries, ReferenceLine, PinMarkers with ShapeGlyph, ChartTooltip). It
// owns no CSS and no intrinsic element. Colours are theme tokens; purple and
// cyan are mixed from the tokens because the palette has neither.
//
// No factory: every prop is DATA (`title`, `trace`, `asOf`, the hover/select
// pair), so the base component is already the curried form. The y-axis
// wording and the tolerance ratio are fixed here (Peter, 2026-10-19: an
// override exists only once a real caller sets it; expand on demand). Hover
// and selection are 1-based step numbers, the same numbers the model's
// receipt rows carry, so a consumer links a table without knowing the
// chart's slot ids. The model is model.ts; `observeProgressFlags` prints the
// same picture as text.
// ============================================
import { type Component, Index, Show, createMemo } from "solid-js";
import { AreaSeries, Chart, ChartTooltip, Grid, LineSeries, PinMarkers, ReferenceLine, ShapeGlyph, XAxis, YAxis } from "../Chart";
import { type Id, type Pin, slotId } from "../Chart";
import { ContentAutoGrowChartFrame } from "../ChartFrame";
import { createAxisWaterMarks } from "../../hooks/createAxisWaterMarks";
import { filter, find, join, map } from "../../fn";
import {
  type BandVertex,
  type LevelPoint,
  MIN_MS,
  type ProgressFlag,
  type ProgressTrace,
  TOLERANCE_RATIO,
  actualLine,
  bandFor,
  clock,
  endOf,
  estimateLine,
  flagTip,
  flagsOf,
  intervalsOf,
  startOf,
  timeTicks,
  totalMin,
} from "./model";

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
const CHART_WIDTH = 860;
const CHART_HEIGHT = 300;
const TICK_CHOICES = [10, 20, 30, 60];
const FALLBACK_TICK_MIN = 120;
const TICK_TARGET = 7;
const Y_HEADROOM = 1.1;
const Y_TITLE = "Planned minutes earned";

export interface ProgressFlagsProps {
  /** The frame's title: the topic, the scenario, whatever the reader calls it. */
  readonly title: string;
  readonly trace: ProgressTrace;
  /** Cut the trace here (epoch ms) and draw a "now" line; omitted, it runs to its end. */
  readonly asOf?: number;
  /** The 1-based step whose flag and drop line are lit from outside (a table row hover). */
  readonly hoveredStep?: number;
  readonly onHoverStep?: (step: number | undefined) => void;
  /** The 1-based step whose flag was pressed. */
  readonly selectedStep?: number;
  readonly onSelectStep?: (step: number) => void;
}

interface FlagPin extends Pin {
  readonly flag: ProgressFlag;
}

const stepId = (n: number): Id => slotId(`step-${n}`);

const flagColor = (f: ProgressFlag): string => (f.state === "current" ? CURRENT : PAST);

const pinOf = (f: ProgressFlag): FlagPin => ({
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
const flagX = (f: ProgressFlag): number => f.x;
const flagY = (f: ProgressFlag): number => f.y;
const tipOf = (f: ProgressFlag): string => join(" · ", flagTip(f));

/** The tick step that keeps about six ticks across the span. */
const tickEvery = (spanMs: number): number =>
  find((m: number) => spanMs / (m * MIN_MS) <= TICK_TARGET, TICK_CHOICES) ?? FALLBACK_TICK_MIN;

export const ProgressFlags: Component<ProgressFlagsProps> = (props) => {
  const t0 = () => startOf(props.trace);
  const end = () => props.asOf ?? endOf(props.trace);
  const estimate = createMemo(() => estimateLine(props.trace));
  const actual = createMemo(() => actualLine(props.trace, end()));
  const intervals = createMemo(() => intervalsOf(props.trace, end(), TOLERANCE_RATIO));
  const flags = createMemo(() => flagsOf(props.trace, end()));
  const pins = createMemo(() => map(pinOf, flags()));
  const xEnd = () => {
    const last = Math.max(endOf(props.trace), t0() + totalMin(props.trace) * MIN_MS);
    return last + (last - t0()) * X_PAD;
  };
  const yMax = () => Math.round(totalMin(props.trace) * Y_HEADROOM);
  // The y axis only grows; the frame's fit button drops it back to the data.
  const marks = createAxisWaterMarks(() => ({ min: 0, max: yMax() }));
  const yDomain = (): [number, number] => marks.domain() ?? [0, yMax()];
  const ticks = () => timeTicks(t0(), xEnd(), tickEvery(xEnd() - t0()));
  const lit = (n: number): boolean => props.hoveredStep === n || props.selectedStep === n;
  const emphasized = createMemo((): ReadonlySet<Id> =>
    props.hoveredStep === undefined ? new Set<Id>() : new Set<Id>([stepId(props.hoveredStep)]),
  );
  const hoveredFlags = createMemo((): readonly ProgressFlag[] =>
    filter((f: ProgressFlag) => props.hoveredStep === f.index, flags()),
  );
  const drop = (f: ProgressFlag): LevelPoint[] => [
    { x: f.x, y: yMax() },
    { x: f.x, y: f.y },
  ];
  const hover = (pin: FlagPin | null): void => props.onHoverStep?.(pin?.flag.index);
  const select = (pin: FlagPin): void => props.onSelectStep?.(pin.flag.index);
  return (
    <ContentAutoGrowChartFrame title={props.title} yTitle={Y_TITLE} onYAxisPress={marks.reset}>
      <Chart
        width={CHART_WIDTH}
        height={CHART_HEIGHT}
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
        <LineSeries<LevelPoint> data={actual()} x={px} y={py} stroke={INK} strokeWidth={2} curve="step" />
        <Show when={props.asOf !== undefined}>
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
          selectedId={props.selectedStep === undefined ? undefined : stepId(props.selectedStep)}
          emphasizedIds={emphasized()}
          onHover={hover}
          onClick={select}
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
        <ChartTooltip<ProgressFlag> data={hoveredFlags()} x={flagX} y={flagY} maxWidth={260}>
          {tipOf}
        </ChartTooltip>
      </Chart>
    </ContentAutoGrowChartFrame>
  );
};
