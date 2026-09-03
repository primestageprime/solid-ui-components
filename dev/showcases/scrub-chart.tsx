import { type Component, createMemo, createSignal } from "solid-js";
import { ScrubChart } from "../../src/components/ScrubChart";
import { dailyCells, type Cell } from "../../src/components/DateAxis";
import { cashflowAt, cashflowDayCell, fmtDollars } from "./cashflow-day-cell";
import { NarrowStack } from "../../src/components/Layout";

type CashflowCell = Cell & {
  cashflowCents: number;
  balanceCents: number;
};

const RANGE_START = new Date("2026-05-01");
const RANGE_END = new Date("2026-09-30");
const PINNED_TODAY = new Date("2026-05-28");

const cells: CashflowCell[] = (() => {
  let running = 0;
  return dailyCells(RANGE_START, RANGE_END).map((cell, i) => {
    const cashflowCents = cashflowAt(i) * 100;
    running += cashflowCents;
    return { ...cell, cashflowCents, balanceCents: running };
  });
})();

const todayIndex = cells.findIndex(
  (c) =>
    PINNED_TODAY.getTime() >= c.start.getTime() &&
    PINNED_TODAY.getTime() < c.end.getTime(),
);

const balances = cells.map((c) => c.balanceCents);
const yMin = Math.min(0, ...balances);
const yMax = Math.max(0, ...balances);
const yRange = yMax - yMin || 1;

// A series whose early days are tiny next to its later ones — the case the
// y-fit toggle answers. Fitted to the whole series, the first fortnight is a
// flat line on the floor; fitted to the visible window, it reads.
const signups: number[] = cells.map((_, i) => Math.round(2 * 1.055 ** i));

/** Extent of `signups` over an inclusive cell range, in data units. */
const signupsExtent = (from: number, to: number): [number, number] => {
  const slice = signups.slice(from, to + 1);
  return [Math.min(...slice), Math.max(...slice)];
};

const renderSignupsChart = (
  ctx: import("../../src/components/ScrubChart").ScrubChartContext<CashflowCell>,
) => {
  const toY = ctx.yToPlot;
  if (!toY) return null;
  const points = ctx.cells
    .map((_, i) => `${ctx.cellToX(i).toFixed(1)},${toY(signups[i]).toFixed(1)}`)
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${ctx.width} ${ctx.height}`}
      preserveAspectRatio="none"
      class="scrub-chart-demo__svg"
    >
      <polyline
        points={points}
        fill="none"
        stroke="var(--sui-accent)"
        stroke-width={1.6}
      />
    </svg>
  );
};

const fmtDate = (d: Date): string =>
  d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

// The window the "bounded highlight" example marks out: ONE pair of indices
// feeding both the `highlights` band and the two edge rules the consumer draws
// itself. Stated once on purpose — a band and its boundary lines that read
// different numbers drift apart the first time either is edited.
const RUNWAY_WINDOW = {
  from: 55,
  to: 110,
  fromLabel: "Raise closes",
  toLabel: "Runway ends",
};

const renderCashflowChart = (
  ctx: import("../../src/components/ScrubChart").ScrubChartContext<CashflowCell>,
) => {
  const balanceToY = (cents: number): number =>
    ctx.height - 24 - ((cents - yMin) / yRange) * (ctx.height - 40);
  const points = ctx.cells
    .map(
      (c, i) =>
        `${ctx.cellToX(i).toFixed(1)},${balanceToY(c.balanceCents).toFixed(1)}`,
    )
    .join(" ");
  const zeroY = balanceToY(0);
  const selectedCell = ctx.cells[ctx.selected];
  return (
    <svg
      viewBox={`0 0 ${ctx.width} ${ctx.height}`}
      preserveAspectRatio="none"
      class="scrub-chart-demo__svg"
    >
      <line
        x1={0}
        x2={ctx.width}
        y1={zeroY}
        y2={zeroY}
        stroke="var(--sui-border)"
        stroke-dasharray="4 4"
      />
      <polyline
        points={points}
        fill="none"
        stroke="var(--sui-accent)"
        stroke-width={1.6}
      />
      <circle
        cx={ctx.cellToX(ctx.selected)}
        cy={balanceToY(selectedCell.balanceCents)}
        r={4}
        fill="var(--sui-warning, #f5a623)"
      />
    </svg>
  );
};

// Same curve, but scaled through `ctx.yToPlot` so the drawn line agrees with
// the y-axis labels — and therefore with the gridlines, which sit at the very
// same ticks.
const renderScaledChart = (
  ctx: import("../../src/components/ScrubChart").ScrubChartContext<CashflowCell>,
) => {
  const toY = ctx.yToPlot ?? ((cents: number) => cents);
  const points = ctx.cells
    .map(
      (c, i) =>
        `${ctx.cellToX(i).toFixed(1)},${toY(c.balanceCents).toFixed(1)}`,
    )
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${ctx.width} ${ctx.height}`}
      preserveAspectRatio="none"
      class="scrub-chart-demo__svg"
    >
      <polyline
        points={points}
        fill="none"
        stroke="var(--sui-accent)"
        stroke-width={1.6}
      />
    </svg>
  );
};

// The same scaled curve, plus the two EDGE RULES that bound the highlight
// band. ScrubChart draws the shaded area; the vertical lines and their
// captions are the consumer's, drawn here in the `renderChart` slot.
//
// Both rules land on the band's own edges because they read the SAME geometry
// ScrubChart reads: a band from `from` to `to` covers those cells entirely, so
// its left edge is `cellBounds(from)[0]` and its right edge is
// `cellBounds(to)[1]`. Nothing here needs to know the pixel pitch.
const renderBoundedChart = (
  ctx: import("../../src/components/ScrubChart").ScrubChartContext<CashflowCell>,
) => {
  const toY = ctx.yToPlot ?? ((cents: number) => cents);
  const points = ctx.cells
    .map(
      (c, i) =>
        `${ctx.cellToX(i).toFixed(1)},${toY(c.balanceCents).toFixed(1)}`,
    )
    .join(" ");
  const leftX = ctx.cellBounds(RUNWAY_WINDOW.from)[0];
  const rightX = ctx.cellBounds(RUNWAY_WINDOW.to)[1];
  // Captions sit just inside their own edge, at the top of the plot: the left
  // one runs rightwards into the band, the right one runs leftwards, so
  // neither can clip off the chart when the window sits against an edge.
  const captionY = ctx.plotTop + 12;
  return (
    <svg
      viewBox={`0 0 ${ctx.width} ${ctx.height}`}
      preserveAspectRatio="none"
      class="scrub-chart-demo__svg"
    >
      <line
        class="scrub-chart-demo__edge"
        x1={leftX}
        x2={leftX}
        y1={ctx.plotTop}
        y2={ctx.plotBottom}
      />
      <line
        class="scrub-chart-demo__edge"
        x1={rightX}
        x2={rightX}
        y1={ctx.plotTop}
        y2={ctx.plotBottom}
      />
      <text class="scrub-chart-demo__edge-label" x={leftX + 6} y={captionY}>
        {RUNWAY_WINDOW.fromLabel}
      </text>
      <text
        class="scrub-chart-demo__edge-label scrub-chart-demo__edge-label--end"
        x={rightX - 6}
        y={captionY}
      >
        {RUNWAY_WINDOW.toLabel}
      </text>
      <polyline
        points={points}
        fill="none"
        stroke="var(--sui-accent)"
        stroke-width={1.6}
      />
    </svg>
  );
};

export const ScrubChartShowcase: Component = () => {
  const [selectedIdx, setSelectedIdx] = createSignal(Math.max(0, todayIndex));
  const cell = createMemo(() => cells[selectedIdx()]);

  return (
    <div class="component-section component-section--full">
      <h2>ScrubChart — Composite (Depth 1)</h2>
      <p class="text-meta">
        Linear-scale overview chart paired with a <code>DateAxis</code>. The
        chart slot renders all {cells.length} cells at uniform pixel pitch (
        <code>ctx.cellToX(i)</code> = <code>(i + 0.5) × dayPitch</code>); the
        axis below scrolls horizontally at its own cell width. ScrubChart draws
        a translucent <strong>window</strong> overlay across the slice of cells
        currently visible in the axis viewport — classic overview + detail.
        Click an axis cell or drag on the chart to scrub; the axis auto-scrolls
        to keep the selected cell centred, so the window follows the selection
        too. Generic over <code>C extends Cell</code>; consumers attach payload
        directly.
      </p>

      <div class="example-group">
        <h3>Base ScrubChart — daily cashflow line</h3>
        <p class="text-meta">
          Chart shows the full {cells.length}-day running-balance curve; the
          axis below is horizontally scrollable, one content-sized day-cell per
          day. The amber dot anchors the selected day's exact balance value
          inside the window.
        </p>

        <NarrowStack>
          <ScrubChart<CashflowCell>
            cells={cells}
            selected={selectedIdx()}
            onScrub={(i) => setSelectedIdx(i)}
            today={PINNED_TODAY}
            renderCell={cashflowDayCell}
            renderChart={renderCashflowChart}
          />

          <div class="scrub-chart-demo__readout">
            Selected:{" "}
            <strong class="scrub-chart-demo__strong">
              {fmtDate(cell().start)}
            </strong>
            {" — "}
            Balance:{" "}
            <strong class="scrub-chart-demo__strong">
              {fmtDollars(cell().balanceCents / 100)}
            </strong>
            {" · Day cashflow: "}
            <span>{fmtDollars(cell().cashflowCents / 100)}</span>
          </div>
        </NarrowStack>
      </div>

      <div class="example-group">
        <h3>Gridlines at the y-axis ticks</h3>
        <p class="text-meta">
          <code>showGridlines</code> draws one horizontal rule across the plot
          at every y-axis tick — the same rules the low-level <code>Chart</code>{" "}
          kit draws through its <code>Grid</code> slot. The rules read the SAME
          tick set as the labels, so a line never sits where no label is. Solid{" "}
          <code>--sui-border</code>, never dashed: on a chart whose every short
          dash pattern already means another line type, a dashed rule would read
          as one of them. OPT-IN — leave the prop off (every other example on
          this page) and nothing changes.
        </p>

        <ScrubChart<CashflowCell>
          cells={cells}
          scrub={false}
          showGridlines
          yDomain={[yMin, yMax]}
          formatYLabel={(v) => fmtDollars(v / 100)}
          xTickCadence="auto"
          renderCell={cashflowDayCell}
          renderChart={renderScaledChart}
        />
      </div>

      <div class="example-group">
        <h3>Highlight bands over a range of days</h3>
        <p class="text-meta">
          <code>highlights</code> shades a range of cells beneath the gridlines
          and beneath the series, so the data still reads over the band. A band
          names a stretch of the x-axis — a funding gap, a forecast horizon, a
          quarter. The range is stated in <strong>cell indices</strong>, both
          ends inclusive, and ScrubChart clamps them to the cell range, so a
          band computed from live data cannot draw outside the plot. Each band
          takes its own <code>class</code>; the shared base class supplies only
          a faint neutral, so recolouring one band never touches another. OPT-IN
          — leave the prop off and no band is drawn.
        </p>

        <ScrubChart<CashflowCell>
          cells={cells}
          scrub={false}
          showGridlines
          highlights={[
            { from: 20, to: 34, class: "scrub-chart-demo__band--gap" },
            {
              from: 95,
              to: cells.length - 1,
              class: "scrub-chart-demo__band--forecast",
            },
          ]}
          yDomain={[yMin, yMax]}
          formatYLabel={(v) => fmtDollars(v / 100)}
          xTickCadence="auto"
          renderCell={cashflowDayCell}
          renderChart={renderScaledChart}
        />
      </div>

      <div class="example-group">
        <h3>A highlight bounded by two labelled rules</h3>
        <p class="text-meta">
          The band alone shades a stretch; the two rules say what its edges
          MEAN. ScrubChart owns the shaded area, and the vertical lines and
          their captions are the consumer's, drawn in the{" "}
          <code>renderChart</code> slot. The two agree because they read the
          same geometry: a band from <code>from</code> to <code>to</code> covers
          those cells entirely, so its edges are{" "}
          <code>cellBounds(from)[0]</code> and <code>cellBounds(to)[1]</code>.
          Both the band and the rules here read one <code>RUNWAY_WINDOW</code>{" "}
          constant, so editing the range moves all three marks together. Base
          ScrubChart draws no rule of its own — <code>CashflowScrubChart</code>{" "}
          ships a labelled one as <code>markers</code> with{" "}
          <code>variant: "rule"</code>.
        </p>

        <ScrubChart<CashflowCell>
          cells={cells}
          scrub={false}
          showGridlines
          highlights={[
            {
              from: RUNWAY_WINDOW.from,
              to: RUNWAY_WINDOW.to,
              class: "scrub-chart-demo__band--window",
            },
          ]}
          yDomain={[yMin, yMax]}
          formatYLabel={(v) => fmtDollars(v / 100)}
          xTickCadence="auto"
          renderCell={cashflowDayCell}
          renderChart={renderBoundedChart}
        />
      </div>

      <div class="example-group">
        <h3>Y-fit toggle, with the floor pinned at zero</h3>
        <p class="text-meta">
          <code>yFitDomain</code> hands ScrubChart the extent of a cell range,
          and the control in the bottom-left corner picks WHICH range: the
          visible window (<code>zoom-in</code>) or the whole series (
          <code>zoom-out</code>). Both states are fits. Drag the chart to pan,
          then switch the control to see the trade-off: "visible" makes the
          early detail legible, and "series" keeps the heights comparable across
          a pan. Daily signups grow 5.5% a day here, so under "series" the first
          fortnight lies flat on the floor.
        </p>
        <p class="text-meta">
          <code>yFitPin</code> holds one end at a fixed value in both modes.
          This chart pins the floor at zero, so the baseline never drifts as the
          window moves. The pin is a prop rather than the caller's job, because
          the callback returns a RAW extent and ScrubChart pads it afterwards —
          a caller who returned 0 would watch the margin push it below zero. A
          pinned end takes no margin and no snap; the free end still gets both,
          so the ticks stay round.
        </p>

        <ScrubChart<CashflowCell>
          cells={cells}
          selected={selectedIdx()}
          onScrub={(i) => setSelectedIdx(i)}
          today={PINNED_TODAY}
          showGridlines
          yFitDomain={signupsExtent}
          yFitPin={{ min: 0 }}
          formatYLabel={(v) => v.toLocaleString("en-US")}
          xTickCadence="auto"
          renderCell={cashflowDayCell}
          renderChart={renderSignupsChart}
        />
      </div>

      <div class="example-group">
        <h3>Window mechanics</h3>
        <p class="text-meta">
          The blue band on the chart spans the cells currently visible in the
          DateAxis below. Scrolling the axis horizontally slides the band;
          clicking a cell or dragging on the chart scrubs the selection and the
          axis auto-scrolls to centre it, so the band tracks the selection too.
          The band is rendered by ScrubChart from the inner DateAxis's scroll
          position; consumers don't need to wire it themselves.
        </p>
        <p class="text-meta">
          Per-day data inside the band is the consumer's responsibility — the
          <code>renderChart</code> ctx exposes <code>cellToX(i)</code>,{" "}
          <code>cellBounds(i)</code>, <code>windowCells</code>, and{" "}
          <code>windowBounds</code> so you can plot lines, bars, or any other
          SVG drawing at the correct linear positions.
        </p>
      </div>
    </div>
  );
};
