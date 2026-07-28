// Chart slots — the overlay components a client composes INTO a <Chart>,
// each shown in the parent that gives it meaning, over one shared series.
//
// None of these stands alone: a GhostArc has no position without a chart's
// scales, and an alarm band is a range projected onto someone else's x-axis.
// So the demo is a chart, and the slots are switched on over it — which is
// exactly the call-site shape a client should copy.
import { type Component, createSignal, For } from "solid-js";
import {
  Chart,
  Grid,
  XAxis,
  YAxis,
  LineSeries,
  GhostArc,
  SubtleGhostArc,
  WarningGhostArc,
  CompactPinMarkers,
  SubtleGhostPin,
  FaintHighlightSegments,
  DenseTimelineBar,
  SparseTimelineBar,
  WarningCurrentValueIndicator,
  EagerDragRangeSelect,
  domainOf,
  type Id,
} from "../../src/components/Chart";
import {
  AlarmBands,
  AlarmHotZones,
  AlarmStripeDefs,
  AlarmOverlay,
  detectRanges,
  findHotZones,
  padRanges,
} from "../../src/components/Alarm";
import {
  ChartCanvasMd,
  ChartCanvasMlg,
  ChartCanvasLg,
  ChartCanvasXl,
} from "../../src/components/ChartCanvas";
import { ContentStack, ClusterRow, NarrowStack } from "../../src/components/Layout";
import { SubsectionTitle, TextSublabel, TextBody } from "../../src/components/Text";
import { BlockPlaceholder } from "../../src/components/Placeholder";
import "./chart-slots.css";

// ── One shared series ────────────────────────────────────────────────────────
// A deterministic walk with two deliberate excursions above the alarm
// threshold, so the alarm pipeline has something real to detect rather than a
// hand-written list of ranges pretending to be derived.
interface Pt {
  x: number;
  y: number;
}

const SERIES: Pt[] = (() => {
  let s = 11;
  const rand = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const out: Pt[] = [];
  let v = 40;
  for (let i = 0; i < 120; i++) {
    // Two excursions: a long one mid-chart, a burst of chatter near the end.
    const push = i > 38 && i < 58 ? 3.2 : i > 92 && i < 108 ? 4.5 : 0;
    v += (rand() - 0.5) * 6 + push - (v > 70 ? 1.5 : 0);
    v = Math.max(5, Math.min(95, v));
    out.push({ x: i, y: v });
  }
  return out;
})();

const THRESHOLD = 70;
const X_DOMAIN = domainOf(SERIES, (p) => p.x);
const Y_DOMAIN: [number, number] = [0, 100];

const RANGES = detectRanges(SERIES, THRESHOLD);
const X_WIDTH = X_DOMAIN[1] - X_DOMAIN[0];
const HOT_ZONES = findHotZones(padRanges(RANGES, 0.02, X_WIDTH), 2);

// Pins: the peak of each detected excursion, which is what a reviewer clicks.
const PINS = RANGES.map((r, i) => {
  const inRange = SERIES.filter((p) => p.x >= r.start && p.x <= r.end);
  const peak = inRange.reduce((a, b) => (b.y > a.y ? b : a), inRange[0]);
  return {
    id: `excursion-${i + 1}` as Id,
    x: peak.x,
    y: peak.y,
    descriptor: { color: "var(--sui-danger)", shape: "pin" as const },
  };
});

const SEGMENTS = RANGES.map((r, i) => ({
  id: `segment-${i + 1}` as Id,
  start: r.start,
  end: r.end,
  lane: "outlet",
  color: "var(--sui-danger)",
}));

const LAST = SERIES[SERIES.length - 1];

const ChartFrame: Component<{ children: import("solid-js").JSX.Element }> = (props) => (
  <div class="chart-slot-frame">
    <Chart
      width={720}
      height={220}
      xDomain={X_DOMAIN}
      yDomain={Y_DOMAIN}
      margin={{ top: 12, right: 12, bottom: 28, left: 36 }}
      responsive
    >
      <Grid />
      <YAxis tickCount={5} />
      <XAxis tickCount={6} />
      <LineSeries data={SERIES} x={(d) => d.x} y={(d) => d.y} />
      {props.children}
    </Chart>
  </div>
);

export const ChartSlotsShowcase: Component = () => {
  const [range, setRange] = createSignal<[number, number] | null>(null);

  return (
    <div class="component-section component-section--full">
      <h2>Chart slots — overlays composed into a Chart</h2>
      <p class="text-meta">
        Each of these is a SLOT: it reads the chart's scales from context and
        draws into the same SVG, so it has no meaning outside a parent. One
        shared 120-point series runs under every example, with two real
        excursions above {THRESHOLD} — the alarm ranges below are DETECTED from
        it, not hand-written.
      </p>

      <ContentStack>
        <SubsectionTitle>Alarm overlay — the whole pipeline</SubsectionTitle>
        <TextSublabel>
          AlarmOverlay takes the raw series and its threshold and runs the
          detect → pad → hot-zone pipeline itself. {RANGES.length} ranges
          detected; {HOT_ZONES.length} dense enough to collapse into a block.
        </TextSublabel>
        <ChartFrame>
          <AlarmOverlay series={[{ data: SERIES, threshold: THRESHOLD }]} />
        </ChartFrame>
      </ContentStack>

      <ContentStack>
        <SubsectionTitle>Alarm bands and hot zones — the pieces</SubsectionTitle>
        <TextSublabel>
          The same result assembled by hand when a caller wants to own the
          pipeline: AlarmStripeDefs supplies the hatch pattern, AlarmBands
          draws each detected range, AlarmHotZones blocks in the regions where
          they crowd together.
        </TextSublabel>
        <ChartFrame>
          <AlarmStripeDefs />
          <AlarmBands ranges={RANGES} />
          <AlarmHotZones zones={HOT_ZONES} />
        </ChartFrame>
      </ContentStack>

      <ContentStack>
        <SubsectionTitle>Ghost arcs</SubsectionTitle>
        <TextSublabel>
          An arc from one point to another — "this excursion caused that one".
          The tone variants say how loudly: GhostArc plain, SubtleGhostArc for
          background context, WarningGhostArc when the link is the finding.
        </TextSublabel>
        <ChartFrame>
          <GhostArc from={{ x: PINS[0]?.x ?? 10, y: PINS[0]?.y ?? 50 }} to={{ x: 80, y: 30 }} />
          <SubtleGhostArc from={{ x: 5, y: 20 }} to={{ x: 40, y: 60 }} />
          <WarningGhostArc
            from={{ x: PINS[PINS.length - 1]?.x ?? 100, y: PINS[PINS.length - 1]?.y ?? 80 }}
            to={{ x: 60, y: 40 }}
          />
        </ChartFrame>
      </ContentStack>

      <ContentStack>
        <SubsectionTitle>Pins</SubsectionTitle>
        <TextSublabel>
          One pin per excursion peak. CompactPinMarkers is the dense form for a
          short chart; SubtleGhostPin marks a position that is context rather
          than a finding.
        </TextSublabel>
        <ChartFrame>
          <CompactPinMarkers data={PINS} selectedId={PINS[0]?.id ?? null} />
          <SubtleGhostPin descriptor={{ color: "var(--sui-text-muted)", shape: "circle" }} y={35} />
        </ChartFrame>
      </ContentStack>

      <ContentStack>
        <SubsectionTitle>Segments and timeline bars</SubsectionTitle>
        <TextSublabel>
          The same excursions read as spans rather than points:
          FaintHighlightSegments washes them over the plot, while the timeline
          bars carry them in their own strip — dense when every span matters,
          sparse when the strip is a summary.
        </TextSublabel>
        <ChartFrame>
          <FaintHighlightSegments data={SEGMENTS} />
        </ChartFrame>
        <ChartFrame>
          <DenseTimelineBar data={SEGMENTS} />
        </ChartFrame>
        <ChartFrame>
          <SparseTimelineBar data={SEGMENTS} />
        </ChartFrame>
      </ContentStack>

      <ContentStack>
        <SubsectionTitle>Current value and range selection</SubsectionTitle>
        <TextSublabel>
          WarningCurrentValueIndicator marks the live value in the warning tone.
          EagerDragRangeSelect commits on drag — drag across the plot:{" "}
          {range() ? `selected ${range()![0].toFixed(0)} → ${range()![1].toFixed(0)}` : "nothing selected yet"}.
        </TextSublabel>
        <ChartFrame>
          <WarningCurrentValueIndicator point={{ x: LAST.x, y: LAST.y }} />
          <EagerDragRangeSelect onRange={(start, end) => setRange([start, end])} />
        </ChartFrame>
      </ContentStack>

      <ContentStack>
        <SubsectionTitle>ChartCanvas — the sized frames</SubsectionTitle>
        <TextSublabel>
          The host element for a canvas-drawn chart (Chart.js and friends).
          Height is baked per variant, never passed at the call site: md 240,
          mlg 350, lg 300, xl 420.
        </TextSublabel>
        <NarrowStack>
          <For
            each={[
              ["ChartCanvasMd", ChartCanvasMd],
              ["ChartCanvasMlg", ChartCanvasMlg],
              ["ChartCanvasLg", ChartCanvasLg],
              ["ChartCanvasXl", ChartCanvasXl],
            ] as Array<[string, Component<{ children?: import("solid-js").JSX.Element }>]>}
          >
            {([name, Canvas]) => (
              <ClusterRow>
                <TextBody>{name}</TextBody>
                <div class="chart-canvas-frame">
                  <Canvas>
                    <BlockPlaceholder label={`${name} — canvas host`} />
                  </Canvas>
                </div>
              </ClusterRow>
            )}
          </For>
        </NarrowStack>
      </ContentStack>
    </div>
  );
};
