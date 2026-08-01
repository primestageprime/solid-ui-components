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
  slotId,
  type Id,
} from "../../src/components/Chart";
import { ClusterRow } from "../../src/components/Layout";
import { SubsectionTitle } from "../../src/components/Text";

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
    {
      id: slotId("s1"),
      start: t0 + 1 * 3600_000,
      end: t0 + 3 * 3600_000,
      color: "var(--sui-accent)",
    },
  ];
  const scheduledBars: TimelineBarDatum[] = [
    {
      id: slotId("sched-1"),
      start: t0 + 0.5 * 3600_000,
      end: t0 + 2.5 * 3600_000,
      lane: "scheduled",
      color: "var(--sui-accent)",
      state: "OK",
    },
    {
      id: slotId("sched-2"),
      start: t0 + 5 * 3600_000,
      end: t0 + 6.5 * 3600_000,
      lane: "scheduled",
      color: "var(--sui-accent)",
      state: "WARNING",
    },
  ];
  const detectedBars: TimelineBarDatum[] = [
    {
      id: slotId("det-1"),
      start: t0 + 3 * 3600_000,
      end: t0 + 4 * 3600_000,
      lane: "detected",
      color: "var(--sui-warning)",
      state: "WARNING",
    },
    {
      id: slotId("det-2"),
      start: t0 + 6 * 3600_000,
      end: t0 + 7 * 3600_000,
      lane: "detected",
      color: "var(--sui-warning)",
      state: "ALARM",
    },
  ];
  const [pins, setPins] = createSignal<Pin[]>([
    { id: slotId("p1"), x: t0 + 1.5 * 3600_000, descriptor: warningPin },
  ]);
  const [selectedPin, setSelectedPin] = createSignal<Id | null>(null);
  const [currentX, setCurrentX] = createSignal(t0 + 5 * 3600_000);
  const currentPoint = createMemo(() => ({
    x: currentX(),
    y: 50,
    label: "now",
  }));

  // Proof-of-fix readout: the last range committed by releasing a drag. The
  // fix under test is that releasing OUTSIDE the chart (or dragging past an
  // edge) still commits — and a drag off the right edge should land end === t1.
  const [committedRange, setCommittedRange] = createSignal<{
    start: number;
    end: number;
  } | null>(null);
  const hitDomainMax = createMemo(() => committedRange()?.end === t1);
  const hitDomainMin = createMemo(() => committedRange()?.start === t0);

  const [hoveredBarId, setHoveredBarId] = createSignal<Id | null>(
    null,
  );
  const [highlightedState, setHighlightedState] = createSignal<string | null>(
    null,
  );
  const allBars = createMemo<TimelineBarDatum[]>(() => [
    ...scheduledBars,
    ...detectedBars,
  ]);
  const hoveredBar = createMemo<TimelineBarDatum | null>(
    () => allBars().find((b) => b.id === hoveredBarId()) ?? null,
  );

  return (
    <div class="component-section">
      <h2>DotChart Composition Smoke</h2>
      <p class="text-meta">
        Smoke test for the dotchart slot unification: HighlightSegments +
        PinMarkers + GhostPin + DragRangeSelect + CurrentValueIndicator +
        ReferenceLine composed under a single &lt;Chart&gt; with a time domain.
        Two stacked TimelineBar strips sit along the bottom of the x-axis
        (scheduled, then detected), matching the amygdala-ui dotchart layout —
        strips anchored in <code>margin-bottom</code>, with x-axis ticks pushed
        below.
      </p>
      <ClusterRow class="text-meta">
        <span>Highlight status:</span>
        <For each={["OK", "WARNING", "ALARM"]}>
          {(status) => (
            <button
              type="button"
              onPointerEnter={() => setHighlightedState(status)}
              onPointerLeave={() => setHighlightedState(null)}
              onFocus={() => setHighlightedState(status)}
              onBlur={() => setHighlightedState(null)}
              class="dotchart-demo__chip"
              classList={{
                "dotchart-demo__chip--active": highlightedState() === status,
              }}
            >
              {status}
            </button>
          )}
        </For>
        <span class="dotchart-demo__dim6">
          ← hover a chip; every bar with that state glows
        </span>
      </ClusterRow>
      <Chart
        width={800}
        height={300}
        xDomain={[new Date(t0), new Date(t1)]}
        yDomain={[0, 100]}
        margin={{ bottom: MARGIN_BOTTOM }}
      >
        <Grid />
        <ReferenceLine orientation="horizontal" value={50} label="threshold" />
        <ReferenceLine
          orientation="vertical"
          value={new Date(t0 + 6 * 3600_000)}
          color="var(--sui-warning)"
        />
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
        <XAxis
          tickCount={6}
          tickOffset={TICK_OFFSET}
          labelOffset={LABEL_OFFSET}
        />
        <YAxis />
        <WarningPinMarkers
          data={pins()}
          selectedId={selectedPin()}
          onClick={(p) => setSelectedPin(p.id)}
          onDelete={(p) => setPins(pins().filter((pp) => pp.id !== p.id))}
        />
        <WarningGhostPin descriptor={warningPin} />
        <CommitOnReleaseDragRangeSelect
          onRange={(s, e) => {
            console.log("range:", new Date(s), new Date(e));
            setCommittedRange({ start: s, end: e });
          }}
        />
        <AccentCurrentValueIndicator point={currentPoint()} />
        <Crosshair />
      </Chart>

      <div class="example-group dotchart-demo__proof">
        <SubsectionTitle>Drag-off-edge proof</SubsectionTitle>
        <p class="text-meta">
          Press inside the chart and drag. To prove the fix: (1) drag past the{" "}
          <strong>right edge</strong> — the range should extend to the domain
          max <code>{fmtClock(t1)}</code>, not freeze at the last in-bounds
          pixel; (2) release the mouse button <strong>outside the chart</strong>{" "}
          — the drag should still commit instead of getting stuck. Before the
          fix, both cases failed.
        </p>
        <div class="dotchart-demo__readout">
          <span class="dotchart-demo__dim6">last committed range:</span>
          <Show
            when={committedRange()}
            fallback={<span class="dotchart-demo__dim5">— none yet —</span>}
          >
            {(range) => (
              <>
                <span
                  class="dotchart-demo__range"
                  classList={{ "dotchart-demo__range--hit": hitDomainMin() }}
                >
                  {fmtClock(range().start)}
                </span>
                <span class="dotchart-demo__dim6">→</span>
                <span
                  class="dotchart-demo__range"
                  classList={{ "dotchart-demo__range--hit": hitDomainMax() }}
                >
                  {fmtClock(range().end)}
                </span>
                <span class="dotchart-demo__dim6">
                  ({fmtDuration(range().start, range().end)})
                </span>
                <Show when={hitDomainMax() || hitDomainMin()}>
                  <span class="dotchart-demo__reached">
                    ✓ reached domain {hitDomainMax() ? "max" : "min"}
                  </span>
                </Show>
              </>
            )}
          </Show>
        </div>
      </div>

      <div class="example-group">
        <SubsectionTitle>Timeline-bar data check</SubsectionTitle>
        <p class="text-meta">
          Hover any bar above to highlight its row below and pop dashed
          reference lines at its start/end on the chart. If the rendered rect
          doesn't line up with the dashed lines, the time → pixel mapping is
          wrong; if it does, the data itself is correct and any visual mismatch
          is downstream.
        </p>
        <div class="text-meta">
          Domain: <code>{fmtClock(t0)}</code> → <code>{fmtClock(t1)}</code> (
          {fmtDuration(t0, t1)}, t0 = <code>{t0}</code>)
        </div>
        <table class="dotchart-demo__table">
          <thead>
            <tr>
              <th class="dotchart-demo__th">id</th>
              <th class="dotchart-demo__th">lane</th>
              <th class="dotchart-demo__th">
                start (clock)
              </th>
              <th class="dotchart-demo__th">
                start (offset)
              </th>
              <th class="dotchart-demo__th">
                end (clock)
              </th>
              <th class="dotchart-demo__th">
                end (offset)
              </th>
              <th class="dotchart-demo__th">
                duration
              </th>
              <th class="dotchart-demo__th">
                start (ms)
              </th>
              <th class="dotchart-demo__th">
                end (ms)
              </th>
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
                    class="dotchart-demo__row"
                    classList={{ "dotchart-demo__row--hovered": isHovered() }}
                    style={{ "--dotchart-row-color": bar.color }}
                  >
                    <td class="dotchart-demo__td">{bar.id}</td>
                    <td class="dotchart-demo__td">{bar.lane}</td>
                    <td class="dotchart-demo__td">
                      {fmtClock(bar.start)}
                    </td>
                    <td class="dotchart-demo__td">
                      {fmtOffset(bar.start, t0)}
                    </td>
                    <td class="dotchart-demo__td">{fmtClock(bar.end)}</td>
                    <td class="dotchart-demo__td">
                      {fmtOffset(bar.end, t0)}
                    </td>
                    <td class="dotchart-demo__td">
                      {fmtDuration(bar.start, bar.end)}
                    </td>
                    <td class="dotchart-demo__td dotchart-demo__td--dim">
                      {bar.start}
                    </td>
                    <td class="dotchart-demo__td dotchart-demo__td--dim">
                      {bar.end}
                    </td>
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
