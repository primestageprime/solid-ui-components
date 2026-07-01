import { type Component, createSignal, createMemo, For, Show } from "solid-js";
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

const pad2 = (n: number): string => n.toString().padStart(2, "0");
const fmtClock = (ms: number): string => {
  const d = new Date(ms);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};
const fmtOffset = (ms: number, originMs: number): string => {
  const delta = ms - originMs;
  const h = Math.floor(delta / 3600_000);
  const m = Math.round((delta % 3600_000) / 60_000);
  return m === 0 ? `+${h}h` : `+${h}h ${pad2(m)}m`;
};
const fmtDuration = (startMs: number, endMs: number): string => {
  const delta = endMs - startMs;
  const h = Math.floor(delta / 3600_000);
  const m = Math.round((delta % 3600_000) / 60_000);
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${pad2(m)}m`;
};

export const DotchartShowcase: Component = () => {
  const t0 = new Date(2026, 4, 15, 0, 0).getTime();
  const t1 = new Date(2026, 4, 15, 8, 0).getTime();

  const segments: HighlightSegment[] = [
    { id: "s1", start: t0 + 1 * 3600_000, end: t0 + 3 * 3600_000, color: "var(--sui-accent)" },
  ];
  const scheduledBars: TimelineBarDatum[] = [
    { id: "sched-1", start: t0 + 0.5 * 3600_000, end: t0 + 2.5 * 3600_000, lane: "scheduled", color: "var(--sui-accent)", state: "OK" },
    { id: "sched-2", start: t0 + 5 * 3600_000, end: t0 + 6.5 * 3600_000, lane: "scheduled", color: "var(--sui-accent)", state: "WARNING" },
  ];
  const detectedBars: TimelineBarDatum[] = [
    { id: "det-1", start: t0 + 3 * 3600_000, end: t0 + 4 * 3600_000, lane: "detected", color: "var(--sui-warning)", state: "WARNING" },
    { id: "det-2", start: t0 + 6 * 3600_000, end: t0 + 7 * 3600_000, lane: "detected", color: "var(--sui-warning)", state: "ALARM" },
  ];
  const [pins, setPins] = createSignal<Pin[]>([
    { id: "p1", x: t0 + 1.5 * 3600_000, descriptor: warningPin },
  ]);
  const [selectedPin, setSelectedPin] = createSignal<string | null>(null);
  const [currentX, setCurrentX] = createSignal(t0 + 5 * 3600_000);
  const currentPoint = createMemo(() => ({ x: currentX(), y: 50, label: "now" }));

  const [hoveredBarId, setHoveredBarId] = createSignal<string | number | null>(null);
  const [highlightedState, setHighlightedState] = createSignal<string | null>(null);
  const allBars = createMemo<TimelineBarDatum[]>(() => [...scheduledBars, ...detectedBars]);
  const hoveredBar = createMemo<TimelineBarDatum | null>(
    () => allBars().find((b) => b.id === hoveredBarId()) ?? null,
  );

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
      <div class="text-meta" style={{ display: "flex", "align-items": "center", gap: "8px", "margin-bottom": "8px" }}>
        <span>Highlight status:</span>
        <For each={["OK", "WARNING", "ALARM"]}>
          {(status) => (
            <button
              type="button"
              onPointerEnter={() => setHighlightedState(status)}
              onPointerLeave={() => setHighlightedState(null)}
              onFocus={() => setHighlightedState(status)}
              onBlur={() => setHighlightedState(null)}
              style={{
                padding: "2px 10px",
                "border-radius": "12px",
                border: highlightedState() === status
                  ? "1px solid var(--sui-accent, #5b8def)"
                  : "1px solid var(--sui-border, #333)",
                background: highlightedState() === status
                  ? "var(--sui-accent, #5b8def)"
                  : "transparent",
                color: "inherit",
                cursor: "pointer",
                "font-family": "var(--sui-font-mono, monospace)",
                "font-size": "11px",
              }}
            >
              {status}
            </button>
          )}
        </For>
        <span style={{ opacity: 0.6 }}>← hover a chip; every bar with that state glows</span>
      </div>
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
          hoveredId={hoveredBarId()}
          highlightedState={highlightedState()}
          onBarHover={(bar) => setHoveredBarId(bar ? bar.id : null)}
        />
        <TimelineBar
          data={detectedBars}
          lanes={["detected"]}
          bandHeight={STRIP_HEIGHT}
          bandY={{ anchor: "margin-bottom", gapPx: STRIP_HEIGHT }}
          barHeight={1}
          label="detected"
          hoveredId={hoveredBarId()}
          highlightedState={highlightedState()}
          onBarHover={(bar) => setHoveredBarId(bar ? bar.id : null)}
        />
        <Show when={hoveredBar()}>
          {(bar) => (
            <>
              <ReferenceLine
                orientation="vertical"
                value={new Date(bar().start)}
                color={bar().color}
                strokeDasharray="3 3"
                label={`${bar().id} · start ${fmtClock(bar().start)}`}
              />
              <ReferenceLine
                orientation="vertical"
                value={new Date(bar().end)}
                color={bar().color}
                strokeDasharray="3 3"
                label={`${bar().id} · end ${fmtClock(bar().end)}`}
              />
            </>
          )}
        </Show>
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

      <div class="example-group" style={{ "margin-top": "16px" }}>
        <h3 style={{ margin: "0 0 4px 0" }}>Timeline-bar data check</h3>
        <p class="text-meta" style={{ margin: "0 0 8px 0" }}>
          Hover any bar above to highlight its row below and pop dashed
          reference lines at its start/end on the chart. If the rendered rect
          doesn't line up with the dashed lines, the time → pixel mapping is
          wrong; if it does, the data itself is correct and any visual mismatch
          is downstream.
        </p>
        <div class="text-meta" style={{ "margin-bottom": "8px" }}>
          Domain: <code>{fmtClock(t0)}</code> → <code>{fmtClock(t1)}</code>
          {" "}({fmtDuration(t0, t1)}, t0 = <code>{t0}</code>)
        </div>
        <table style={{ "border-collapse": "collapse", "font-size": "12px", "font-family": "var(--sui-font-mono, monospace)" }}>
          <thead>
            <tr>
              <th style={{ "text-align": "left", padding: "4px 8px" }}>id</th>
              <th style={{ "text-align": "left", padding: "4px 8px" }}>lane</th>
              <th style={{ "text-align": "left", padding: "4px 8px" }}>start (clock)</th>
              <th style={{ "text-align": "left", padding: "4px 8px" }}>start (offset)</th>
              <th style={{ "text-align": "left", padding: "4px 8px" }}>end (clock)</th>
              <th style={{ "text-align": "left", padding: "4px 8px" }}>end (offset)</th>
              <th style={{ "text-align": "left", padding: "4px 8px" }}>duration</th>
              <th style={{ "text-align": "left", padding: "4px 8px" }}>start (ms)</th>
              <th style={{ "text-align": "left", padding: "4px 8px" }}>end (ms)</th>
            </tr>
          </thead>
          <tbody>
            <For each={allBars()}>
              {(bar) => {
                const isHovered = () => hoveredBarId() === bar.id;
                return (
                  <tr
                    onPointerEnter={() => setHoveredBarId(bar.id)}
                    onPointerLeave={() => setHoveredBarId(null)}
                    style={{
                      background: isHovered() ? "var(--sui-bg-hover, rgba(255,255,255,0.06))" : "transparent",
                      "border-left": `3px solid ${bar.color}`,
                      cursor: "pointer",
                    }}
                  >
                    <td style={{ padding: "4px 8px" }}>{bar.id}</td>
                    <td style={{ padding: "4px 8px" }}>{bar.lane}</td>
                    <td style={{ padding: "4px 8px" }}>{fmtClock(bar.start)}</td>
                    <td style={{ padding: "4px 8px" }}>{fmtOffset(bar.start, t0)}</td>
                    <td style={{ padding: "4px 8px" }}>{fmtClock(bar.end)}</td>
                    <td style={{ padding: "4px 8px" }}>{fmtOffset(bar.end, t0)}</td>
                    <td style={{ padding: "4px 8px" }}>{fmtDuration(bar.start, bar.end)}</td>
                    <td style={{ padding: "4px 8px", opacity: 0.7 }}>{bar.start}</td>
                    <td style={{ padding: "4px 8px", opacity: 0.7 }}>{bar.end}</td>
                  </tr>
                );
              }}
            </For>
          </tbody>
        </table>
      </div>
    </div>
  );
};
