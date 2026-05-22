import { Component, createSignal, createMemo } from "solid-js";
import {
  Chart,
  Grid,
  XAxis,
  YAxis,
  ReferenceLine,
  Crosshair,
  HighlightSegments,
  TimelineBar,
  GhostPin,
  DragRangeSelect,
  CurrentValueIndicator,
  AccentHighlightSegments,
  WarningPinMarkers,
  WarningGhostPin,
  CommitOnReleaseDragRangeSelect,
  AccentCurrentValueIndicator,
  type HighlightSegment,
  type TimelineBarDatum,
  type Pin,
  type Descriptor,
} from "../../src/components/Chart";

const STRIP_HEIGHT = 10;
const TICK_LENGTH = 4;
const LABEL_GAP = 8;
const LABEL_HEIGHT = 18;
const STRIP_COUNT = 2;
const TICK_OFFSET = STRIP_HEIGHT * STRIP_COUNT;
const LABEL_OFFSET = TICK_OFFSET + TICK_LENGTH + LABEL_GAP;
const MARGIN_BOTTOM = LABEL_OFFSET + LABEL_HEIGHT + 6;

const warningPin: Descriptor = { color: "var(--sui-warning)", shape: "pin" };
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const accentDot: Descriptor = { color: "var(--sui-accent)", shape: "circle" };

export const DotchartShowcase: Component = () => {
  const t0 = new Date(2026, 4, 15, 0, 0).getTime();
  const t1 = new Date(2026, 4, 15, 8, 0).getTime();

  const segments: HighlightSegment[] = [
    { id: "s1", start: t0 + 1 * 3600_000, end: t0 + 3 * 3600_000, color: "var(--sui-accent)" },
  ];
  const scheduledBars: TimelineBarDatum[] = [
    { id: "sched-1", start: t0 + 0.5 * 3600_000, end: t0 + 2.5 * 3600_000, lane: "scheduled", color: "var(--sui-accent)" },
    { id: "sched-2", start: t0 + 5 * 3600_000, end: t0 + 6.5 * 3600_000, lane: "scheduled", color: "var(--sui-accent)" },
  ];
  const detectedBars: TimelineBarDatum[] = [
    { id: "det-1", start: t0 + 3 * 3600_000, end: t0 + 4 * 3600_000, lane: "detected", color: "var(--sui-warning)" },
    { id: "det-2", start: t0 + 6 * 3600_000, end: t0 + 7 * 3600_000, lane: "detected", color: "var(--sui-warning)" },
  ];
  const [pins, setPins] = createSignal<Pin[]>([
    { id: "p1", x: t0 + 1.5 * 3600_000, descriptor: warningPin },
  ]);
  const [selectedPin, setSelectedPin] = createSignal<string | null>(null);
  const [currentX, setCurrentX] = createSignal(t0 + 5 * 3600_000);
  const currentPoint = createMemo(() => ({ x: currentX(), y: 50, label: "now" }));

  return (
    <div class="component-section">
      <h2>DotChart Composition Smoke</h2>
      <p class="text-meta">
        Smoke test for the dotchart slot unification: HighlightSegments + PinMarkers +
        GhostPin + DragRangeSelect + CurrentValueIndicator + ReferenceLine composed
        under a single &lt;Chart&gt; with a time domain. Two stacked TimelineBar strips
        sit along the bottom of the x-axis (scheduled, then detected), matching the
        amygdala-ui dotchart layout — strips anchored in <code>margin-bottom</code>,
        with x-axis ticks pushed below.
      </p>
      <Chart
        width={800}
        height={300}
        xDomain={[new Date(t0), new Date(t1)]}
        yDomain={[0, 100]}
        margin={{ bottom: MARGIN_BOTTOM }}
      >
        <Grid />
        <ReferenceLine orientation="horizontal" value={50} label="threshold" />
        <ReferenceLine orientation="vertical" value={new Date(t0 + 6 * 3600_000)} color="var(--sui-warning)" />
        <AccentHighlightSegments data={segments} />
        <TimelineBar
          data={scheduledBars}
          lanes={["scheduled"]}
          bandHeight={STRIP_HEIGHT}
          bandY={{ anchor: "margin-bottom", gapPx: 0 }}
          barHeight={1}
          label="scheduled"
        />
        <TimelineBar
          data={detectedBars}
          lanes={["detected"]}
          bandHeight={STRIP_HEIGHT}
          bandY={{ anchor: "margin-bottom", gapPx: STRIP_HEIGHT }}
          barHeight={1}
          label="detected"
        />
        <XAxis tickCount={6} tickOffset={TICK_OFFSET} labelOffset={LABEL_OFFSET} />
        <YAxis />
        <WarningPinMarkers
          data={pins()}
          selectedId={selectedPin()}
          onClick={(p) => setSelectedPin(p.id)}
          onDelete={(p) => setPins(pins().filter((pp) => pp.id !== p.id))}
        />
        <WarningGhostPin descriptor={warningPin} />
        <CommitOnReleaseDragRangeSelect
          onRange={(s, e) => console.log("range:", new Date(s), new Date(e))}
        />
        <AccentCurrentValueIndicator point={currentPoint()} />
        <Crosshair />
      </Chart>
    </div>
  );
};
