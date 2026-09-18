import {
  type Component,
  createSignal,
  onCleanup,
  onMount,
  createMemo,
} from "solid-js";
import {
  Chart,
  Grid,
  XAxis,
  YAxis,
  LineSeries,
  AreaSeries,
  PointSeries,
  BarSeries,
  ReferenceLine,
  DeviationBand,
  ChartLabels,
  Crosshair,
  ChartTooltip,
  StackedAreaSeries,
  type StackedSeries,
  domainOf,
} from "../../src/components/Chart";
import { Stack } from "../../src/components/Layout/Stack";
import { Row } from "../../src/components/Layout/Row";

interface Pt {
  t: number;
  v: number;
}

const seedSeries = (n: number, seed = 1): Pt[] => {
  let s = seed;
  const rand = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const out: Pt[] = [];
  let v = 50;
  for (let i = 0; i < n; i++) {
    v += (rand() - 0.5) * 8;
    v = Math.max(5, Math.min(95, v));
    out.push({ t: i, v });
  }
  return out;
};

// ── Stacked-area fixture ────────────────────────────────────────────────
// Three step-valued series over twelve months. The third drops to zero at
// month 5 and returns at month 9, so the collapse case is visible in the
// gallery and not only in stackedArea.test.ts (whose printed table is this
// same fixture).
const STACK: readonly StackedSeries[] = [
  {
    id: "one",
    label: "One",
    points: [
      { at: 0, value: 12 },
      { at: 3, value: 18 },
      { at: 8, value: 14 },
    ],
  },
  {
    id: "two",
    label: "Two",
    points: [
      { at: 0, value: 8 },
      { at: 8, value: 16 },
    ],
  },
  {
    id: "three",
    label: "Three",
    points: [
      { at: 0, value: 6 },
      { at: 5, value: 0 },
      { at: 9, value: 9 },
    ],
  },
];
const STACK_CAP = 45;
const STACK_CAP_LINE: Pt[] = [
  { t: 0, v: 40 },
  { t: 12, v: 40 },
];

export const ChartShowcase: Component = () => {
  // ── Live reactive demo: stream new points every second ──────────
  const [live, setLive] = createSignal<Pt[]>(seedSeries(40, 7));
  onMount(() => {
    const id = window.setInterval(() => {
      setLive((prev) => {
        const last = prev[prev.length - 1];
        const next: Pt = {
          t: last.t + 1,
          v: Math.max(5, Math.min(95, last.v + (Math.random() - 0.5) * 12)),
        };
        const out = prev.slice(-49);
        out.push(next);
        return out;
      });
    }, 1000);
    onCleanup(() => window.clearInterval(id));
  });

  const liveX = createMemo<[number, number]>(() =>
    domainOf(live(), (d) => d.t),
  );
  const liveY = createMemo<[number, number]>(() => [0, 100]);
  const liveAvg = createMemo(
    () => live().reduce((a, b) => a + b.v, 0) / Math.max(1, live().length),
  );

  // ── Static — ThroughputChart-style reimplementation ─────────────
  const series = seedSeries(60, 42);
  const xDomain: [number, number] = [series[0].t, series[series.length - 1].t];
  const avg = series.reduce((a, b) => a + b.v, 0) / series.length;

  // ── Multi-series ─────────────────────────────────────────────────
  const a = seedSeries(40, 1);
  const b = seedSeries(40, 2);
  const c = seedSeries(40, 3).map((d) => ({ ...d, v: d.v * 0.6 + 20 }));

  return (
    <div class="component-section">
      <h2>Chart — Primitive (Depth 0)</h2>
      <p class="text-meta">
        Slot-style chart: <code>&lt;Chart&gt;</code> provides scales + viewport
        via context; drop in <code>&lt;Grid&gt;</code>,{" "}
        <code>&lt;XAxis&gt;</code>, <code>&lt;LineSeries&gt;</code>,{" "}
        <code>&lt;AreaSeries&gt;</code>, <code>&lt;ReferenceLine&gt;</code>,{" "}
        <code>&lt;Crosshair&gt;</code>, <code>&lt;ChartTooltip&gt;</code> —
        reactive against any signal.
      </p>

      <div class="depth2-layout">
        <div class="depth2-composed">
          <h3>Live (reactive — 1 new point / second)</h3>
          <Chart
            width={640}
            height={220}
            xDomain={liveX()}
            yDomain={liveY()}
            margin={{ top: 12, right: 12, bottom: 28, left: 36 }}
          >
            <Grid />
            <YAxis tickCount={5} />
            <XAxis tickCount={6} tickFormat={(v) => `t${v}`} />
            <AreaSeries data={live()} x={(d) => d.t} y={(d) => d.v} />
            <ReferenceLine
              orientation="horizontal"
              value={liveAvg()}
              label={`avg ${liveAvg().toFixed(1)}`}
            />
            <LineSeries data={live()} x={(d) => d.t} y={(d) => d.v} />
            <Crosshair
              series={[{ data: live(), x: (d) => d.t, y: (d) => d.v }]}
            />
            <ChartTooltip data={live()} x={(d) => d.t}>
              {(p) => (
                <span>
                  <strong>t{p.t}</strong>: {p.v.toFixed(1)}
                </span>
              )}
            </ChartTooltip>
          </Chart>

          <h3 class="showcase-heading-gap">
            Reimplementation — ThroughputChart features
          </h3>
          <p class="text-meta">
            Grid + axes + filled area + line + average reference + crosshair +
            tooltip. All slot children of <code>&lt;Chart&gt;</code>.
          </p>
          <Chart
            width={640}
            height={260}
            xDomain={xDomain}
            yDomain={[0, 100]}
            margin={{ top: 12, right: 16, bottom: 28, left: 40 }}
          >
            <Grid />
            <YAxis tickCount={5} tickFormat={(v) => `${v}%`} />
            <XAxis tickCount={6} />
            <AreaSeries
              data={series}
              x={(d) => d.t}
              y={(d) => d.v}
              fillOpacity={0.18}
            />
            <ReferenceLine
              orientation="horizontal"
              value={avg}
              label={`avg ${avg.toFixed(1)}`}
              strokeDasharray="3 3"
            />
            <LineSeries
              data={series}
              x={(d) => d.t}
              y={(d) => d.v}
              strokeWidth={2}
            />
            <Crosshair
              series={[{ data: series, x: (d) => d.t, y: (d) => d.v }]}
            />
            <ChartTooltip data={series} x={(d) => d.t}>
              {(p) => (
                <span>
                  t{p.t} — <strong>{p.v.toFixed(1)}%</strong>
                </span>
              )}
            </ChartTooltip>
          </Chart>

          <h3 class="showcase-heading-gap">
            Deviation band — the Chart adapter
          </h3>
          <p class="text-meta">
            <code>DeviationBand</code> shades the gap between a series and a
            reference line, split at every crossing — the <code>Chart</code>
            -side adapter for the SAME <code>buildDeviationBand</code> core{" "}
            <code>ScrubChart</code>'s <code>ScrubChartBand</code> adapter calls
            (ADR 0010). It bakes in no colour: this demo's colours come entirely
            from <code>positiveClass</code> / <code>negativeClass</code> below.
          </p>
          <Chart
            width={640}
            height={220}
            xDomain={xDomain}
            yDomain={[0, 100]}
            margin={{ top: 12, right: 16, bottom: 28, left: 40 }}
          >
            <Grid />
            <YAxis tickCount={5} tickFormat={(v) => `${v}%`} />
            <XAxis tickCount={6} />
            <DeviationBand
              data={series}
              x={(d) => d.t}
              series={(d) => d.v}
              reference={() => avg}
              positiveClass="chart-demo__deviation--positive"
              negativeClass="chart-demo__deviation--negative"
            />
            <ReferenceLine
              orientation="horizontal"
              value={avg}
              label={`avg ${avg.toFixed(1)}`}
              strokeDasharray="3 3"
            />
            <LineSeries
              data={series}
              x={(d) => d.t}
              y={(d) => d.v}
              strokeWidth={2}
            />
          </Chart>

          <h3 class="showcase-heading-gap">Labels — the Chart adapter</h3>
          <p class="text-meta">
            <code>ChartLabels</code> places one label per item with the same
            ladder core (<code>placeLabels</code>) <code>ScrubChart</code>'s{" "}
            <code>ScrubChartLabels</code> adapter calls (ADR 0010, dside task
            45164) — body first, then the right gutter, then a row under the
            axis.
          </p>
          <Chart
            width={640}
            height={220}
            xDomain={xDomain}
            yDomain={[0, 100]}
            margin={{ top: 12, right: 60, bottom: 28, left: 40 }}
          >
            <Grid />
            <YAxis tickCount={5} tickFormat={(v) => `${v}%`} />
            <XAxis tickCount={6} />
            <LineSeries
              data={series}
              x={(d) => d.t}
              y={(d) => d.v}
              strokeWidth={2}
            />
            <ChartLabels
              data={[series[series.length - 1]]}
              id={() => "last"}
              text={(d) => `${d.v.toFixed(1)}%`}
              width={() => 34}
              x={(d) => d.t}
              y={(d) => d.v}
              placement={() => "right"}
            />
          </Chart>

          <h3 class="showcase-heading-gap">Captioned vertical reference</h3>
          <p class="text-meta">
            A vertical <code>&lt;ReferenceLine&gt;</code> takes the same{" "}
            <code>label</code> as a horizontal one, but seats it at the top of
            the plot, centred on the rule. The two edge rules show the clamp:
            the caption stops 18px inside each edge and keeps its centred
            anchor. The horizontal caption keeps its own seat at the right edge.
          </p>
          <Chart
            width={640}
            height={220}
            xDomain={xDomain}
            yDomain={[0, 100]}
            margin={{ top: 12, right: 16, bottom: 28, left: 40 }}
          >
            <Grid />
            <YAxis tickCount={5} tickFormat={(v) => `${v}%`} />
            <XAxis tickCount={6} />
            <LineSeries
              data={series}
              x={(d) => d.t}
              y={(d) => d.v}
              strokeWidth={2}
            />
            <ReferenceLine orientation="vertical" value={0} label="start" />
            <ReferenceLine
              orientation="vertical"
              value={30}
              label="deploy"
              strokeDasharray="3 3"
            />
            <ReferenceLine orientation="vertical" value={59} label="now" />
            <ReferenceLine
              orientation="horizontal"
              value={avg}
              label={`avg ${avg.toFixed(1)}`}
              strokeDasharray="3 3"
            />
          </Chart>

          <h3 class="showcase-heading-gap">
            Wrapping tooltip (<code>maxWidth</code>)
          </h3>
          <p class="text-meta">
            Default tooltips are a single <code>nowrap</code> line. Pass{" "}
            <code>maxWidth</code> when the content is inherently multi-line — a
            title, a timestamp range, a free-text message. Hover the right-hand
            third: rather than overflow the chart, the tooltip flips to the left
            of its anchor.
          </p>
          <Chart
            width={640}
            height={220}
            xDomain={xDomain}
            yDomain={[0, 100]}
            margin={{ top: 12, right: 16, bottom: 28, left: 40 }}
          >
            <Grid />
            <YAxis tickCount={5} tickFormat={(v) => `${v}%`} />
            <XAxis tickCount={6} />
            <LineSeries
              data={series}
              x={(d) => d.t}
              y={(d) => d.v}
              strokeWidth={2}
            />
            <Crosshair
              series={[{ data: series, x: (d) => d.t, y: (d) => d.v }]}
            />
            <ChartTooltip data={series} x={(d) => d.t} maxWidth={320}>
              {(p) => (
                <div>
                  <div>
                    <strong>Sample t{p.t}</strong>
                  </div>
                  <div>utilisation {p.v.toFixed(1)}%</div>
                  <div>
                    A deliberately long explanatory line, the kind an alarm or
                    an annotation carries, so the wrap and the width cap are
                    both visible here.
                  </div>
                </div>
              )}
            </ChartTooltip>
          </Chart>

          <h3 class="showcase-heading-gap">Multi-series</h3>
          <p class="text-meta">
            Three independent <code>&lt;LineSeries&gt;</code> share the same
            scales; <code>&lt;Crosshair&gt;</code> spotlights a dot per series.
          </p>
          <Chart width={640} height={220} xDomain={[0, 39]} yDomain={[0, 100]}>
            <Grid />
            <YAxis />
            <XAxis />
            <LineSeries
              data={a}
              x={(d) => d.t}
              y={(d) => d.v}
              stroke="#4ea1ff"
            />
            <LineSeries
              data={b}
              x={(d) => d.t}
              y={(d) => d.v}
              stroke="#7ad29c"
            />
            <LineSeries
              data={c}
              x={(d) => d.t}
              y={(d) => d.v}
              stroke="#e0a14a"
            />
            <Crosshair
              series={[
                { data: a, x: (d) => d.t, y: (d) => d.v, stroke: "#4ea1ff" },
                { data: b, x: (d) => d.t, y: (d) => d.v, stroke: "#7ad29c" },
                { data: c, x: (d) => d.t, y: (d) => d.v, stroke: "#e0a14a" },
              ]}
            />
          </Chart>

          <h3 class="showcase-heading-gap">Stacked areas</h3>
          <p class="text-meta">
            <code>&lt;StackedAreaSeries&gt;</code> — three step-valued series
            stacked from the baseline over twelve months. Band <em>k</em> sits
            on the cumulative top of the bands below it, so the top of the
            stack is the total; each band takes one series-palette slot, and
            a change is crossed with a Sankey blend rather than a wall. The
            third series drops to zero at month 5 and returns at month 9 — its
            band collapses onto the edge below and leaves the rest untouched.
            The dashed <code>&lt;LineSeries&gt;</code> is a cap the stack is
            read against; the y-domain is pinned to it, which is the whole
            point of composing the mark with the existing slots rather than
            giving it a frame of its own.
          </p>
          <Chart
            width={640}
            height={240}
            xDomain={[0, 12]}
            yDomain={[0, STACK_CAP]}
          >
            <Grid />
            <YAxis />
            <XAxis tickValues={[0, 3, 6, 9, 12]} />
            <StackedAreaSeries series={STACK} />
            <LineSeries
              data={STACK_CAP_LINE}
              x={(d) => d.t}
              y={(d) => d.v}
              stroke="var(--sui-text-secondary)"
              strokeWidth={1.5}
              strokeDasharray="6 4"
            />
          </Chart>

          <h3 class="showcase-heading-gap">
            Reimplementation — CompletionTimeline-style
          </h3>
          <p class="text-meta">
            Markers on a horizontal axis via <code>&lt;PointSeries&gt;</code>.
          </p>
          <Chart
            width={640}
            height={120}
            xDomain={[0, 39]}
            yDomain={[0, 1]}
            margin={{ top: 24, right: 16, bottom: 28, left: 16 }}
          >
            <XAxis />
            <PointSeries
              data={a}
              x={(d) => d.t}
              y={() => 0.5}
              radius={(d) => 2 + (d.v / 100) * 5}
              fill={(d) =>
                d.v > 60 ? "#7ad29c" : d.v > 30 ? "#e0a14a" : "#e57373"
              }
              title={(d) => `t${d.t}: ${d.v.toFixed(1)}`}
            />
          </Chart>

          <h3 class="showcase-heading-gap">
            Reimplementation — BurndownChart-style
          </h3>
          <p class="text-meta">
            Stacked bars above (planned remaining + complete) and below
            (unplanned remaining + complete) the zero axis, with a trendline +
            projection. All composable: <code>BarSeries</code> with
            <code> segments</code> + two <code>LineSeries</code> for the trend.
          </p>
          {(() => {
            const burndown = [
              { day: "Mon", pi: 30, pc: 0, uc: 0, ui: 0 },
              { day: "Tue", pi: 26, pc: 4, uc: 0, ui: 2 },
              { day: "Wed", pi: 22, pc: 8, uc: 1, ui: 0 },
              { day: "Thu", pi: 17, pc: 13, uc: 0, ui: 1 },
              { day: "Fri", pi: 12, pc: 18, uc: 2, ui: 3 },
              { day: "Mon", pi: 9, pc: 21, uc: 0, ui: 0 },
              { day: "Tue", pi: 5, pc: 25, uc: 1, ui: 1 },
            ];
            const n = burndown.length;
            const trendStart = burndown[0].pi;
            const trendEnd = burndown[n - 1].pi;
            const rate = (trendStart - trendEnd) / (n - 1);
            const projDays = rate > 0 ? trendEnd / rate : 0;
            const xMax = n - 1 + Math.max(0, projDays);
            return (
              <Chart
                width={640}
                height={300}
                xDomain={[-0.5, xMax + 0.5]}
                yDomain={[-12, 32]}
                margin={{ top: 16, right: 32, bottom: 36, left: 40 }}
              >
                <Grid />
                <YAxis tickValues={[-10, -5, 0, 5, 10, 15, 20, 25, 30]} />
                <XAxis
                  tickValues={burndown.map((_, i) => i)}
                  tickFormat={(v) => burndown[Math.round(v)]?.day ?? ""}
                />
                <ReferenceLine
                  orientation="horizontal"
                  value={0}
                  stroke="currentColor"
                  strokeDasharray=""
                />
                <BarSeries
                  data={burndown}
                  x={(_d, i) => i}
                  segments={(d) => [
                    { value: d.pi, fill: "#3a4a5e", key: "pi" },
                    { value: d.pc, fill: "#5fb37c", key: "pc" },
                    { value: -d.uc, fill: "#e0a14a", key: "uc" },
                    { value: -d.ui, fill: "#e57373", key: "ui" },
                  ]}
                  onSegmentClick={(d, seg) =>
                    console.log("click", d.day, seg.key)
                  }
                />
                {/* Trendline + projection */}
                <LineSeries
                  data={[
                    { x: 0, y: trendStart },
                    { x: n - 1, y: trendEnd },
                  ]}
                  x={(d) => d.x}
                  y={(d) => d.y}
                  stroke="#9bb"
                  strokeWidth={1.5}
                />
                <LineSeries
                  data={[
                    { x: n - 1, y: trendEnd },
                    { x: xMax, y: 0 },
                  ]}
                  x={(d) => d.x}
                  y={(d) => d.y}
                  stroke="#9bb"
                  strokeDasharray="4 4"
                />
              </Chart>
            );
          })()}

          <h3 class="showcase-heading-gap">
            BarSeries — single value, with crosshair
          </h3>
          <p class="text-meta">
            Simpler bar chart: one value per bar via <code>value</code> instead
            of <code>segments</code>.
          </p>
          {(() => {
            const counts = [12, 18, 9, 22, 17, 25, 14, 19, 11, 24];
            return (
              <Chart
                width={640}
                height={200}
                xDomain={[-0.5, counts.length - 0.5]}
                yDomain={[0, 30]}
                margin={{ top: 12, right: 16, bottom: 28, left: 36 }}
              >
                <Grid />
                <YAxis />
                <XAxis
                  tickValues={counts.map((_, i) => i)}
                  tickFormat={(v) => `w${v + 1}`}
                />
                <BarSeries
                  data={counts}
                  x={(_v, i) => i}
                  value={(v) => v}
                  fill="#4ea1ff"
                  bandWidth={0.7}
                />
              </Chart>
            );
          })()}

          <h3 class="showcase-heading-gap">Minimal — line only</h3>
          <Chart width={400} height={120} xDomain={[0, 39]} yDomain={[0, 100]}>
            <LineSeries data={a} x={(d) => d.t} y={(d) => d.v} />
          </Chart>
        </div>

        <div class="depth2-atoms">
          <h3>Composed from</h3>

          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Root</div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">&lt;Chart&gt;</div>
              <div class="text-meta">
                provides width/height/margin/xScale/yScale/hoverX via context
              </div>
            </div>
          </div>

          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Grid + Axes</div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">&lt;Grid&gt;</div>
              <div class="text-meta">
                horizontal/vertical reference lines at scale ticks
              </div>
            </div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">&lt;XAxis&gt; &lt;YAxis&gt;</div>
              <div class="text-meta">tick lines + labels; tickFormat hook</div>
            </div>
          </div>

          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Series</div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">&lt;LineSeries&gt;</div>
              <div class="text-meta">
                stroked path; per-series x/y accessors
              </div>
            </div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">&lt;AreaSeries&gt;</div>
              <div class="text-meta">filled path closed to the y-baseline</div>
            </div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">&lt;PointSeries&gt;</div>
              <div class="text-meta">
                markers; radius/fill/stroke can be functions of datum
              </div>
            </div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">&lt;BarSeries&gt;</div>
              <div class="text-meta">
                discrete bars; single <code>value</code> or stacked
                <code> segments</code> with positive/negative stacking
              </div>
            </div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">&lt;ReferenceLine&gt;</div>
              <div class="text-meta">
                horizontal (y=) or vertical (x=) guide with optional label
              </div>
            </div>
          </div>

          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Interaction</div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">&lt;Crosshair&gt;</div>
              <div class="text-meta">
                vertical guide + nearest-point dot per series
              </div>
            </div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">&lt;ChartTooltip&gt;</div>
              <div class="text-meta">
                HTML overlay anchored to nearest x; render-prop child
              </div>
            </div>
          </div>

          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Helpers</div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">linearScale / domainOf</div>
              <div class="text-meta">
                pure scale + min/max derivation utility
              </div>
            </div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">useChart()</div>
              <div class="text-meta">
                read scales/dims/hoverX from a custom slot child
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
