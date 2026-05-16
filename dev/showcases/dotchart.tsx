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
  PinMarkers,
  GhostPin,
  DragRangeSelect,
  CurrentValueIndicator,
  AccentHighlightSegments,
  DenseTimelineBar,
  WarningPinMarkers,
  WarningGhostPin,
  CommitOnReleaseDragRangeSelect,
  AccentCurrentValueIndicator,
  type HighlightSegment,
  type TimelineBarDatum,
  type Pin,
  type Descriptor,
} from "../../src/components/Chart";

const warningPin: Descriptor = { color: "var(--sui-warning)", shape: "pin" };
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const accentDot: Descriptor = { color: "var(--sui-accent)", shape: "circle" };

export const DotchartShowcase: Component = () => {
  const t0 = new Date(2026, 4, 15, 0, 0).getTime();
  const t1 = new Date(2026, 4, 15, 8, 0).getTime();

  const segments: HighlightSegment[] = [
    { id: "s1", start: t0 + 1 * 3600_000, end: t0 + 3 * 3600_000, color: "var(--sui-accent)" },
  ];
  const bars: TimelineBarDatum[] = [
    { id: "b1", start: t0 + 0.5 * 3600_000, end: t0 + 2.5 * 3600_000, lane: "scheduled", color: "var(--sui-accent)" },
    { id: "b2", start: t0 + 3 * 3600_000, end: t0 + 4 * 3600_000, lane: "detected", color: "var(--sui-warning)" },
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
        Smoke test for the dotchart slot unification: HighlightSegments + TimelineBar +
        PinMarkers + GhostPin + DragRangeSelect + CurrentValueIndicator + ReferenceLine
        composed under a single &lt;Chart&gt; with a time domain.
      </p>
      <Chart width={800} height={300} xDomain={[new Date(t0), new Date(t1)]} yDomain={[0, 100]}>
        <Grid />
        <XAxis tickCount={6} />
        <YAxis />
        <ReferenceLine orientation="horizontal" value={50} label="threshold" />
        <ReferenceLine orientation="vertical" value={new Date(t0 + 6 * 3600_000)} color="var(--sui-warning)" />
        <AccentHighlightSegments data={segments} />
        <DenseTimelineBar data={bars} lanes={["scheduled", "detected"]} />
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
