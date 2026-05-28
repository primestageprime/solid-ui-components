import { type Component, createMemo, createSignal, For } from "solid-js";
import {
  ScrubChart,
  createScrubChart,
} from "../../src/components/ScrubChart";
import { dailyCells, type Cell } from "../../src/components/DateAxis";
import { cashflowAt, cashflowDayCell, fmtDollars } from "./cashflow-day-cell";

type CashflowCell = Cell & {
  cashflowCents: number;
  balanceCents: number;
};

const RANGE_START = new Date("2026-05-01");
const RANGE_END = new Date("2026-09-30");
const PINNED_TODAY = new Date("2026-05-28");

// Pre-compute cells with running balance. Cashflow stub returns dollars; we
// store cents so consumers can decide their own display precision.
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
const balanceToY = (cents: number, height: number): number =>
  height - ((cents - yMin) / yRange) * height;

const fmtDate = (d: Date): string =>
  d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

// ── Render-prop chart used in every demo. Pulled out so the factory example
//    below can share the same drawing without duplicating ~30 lines of SVG.
const renderCashflowChart = (
  ctx: import("../../src/components/ScrubChart").ScrubChartContext<CashflowCell>,
) => {
  const points = ctx.visibleCells
    .map((i) => {
      const x = ctx.cellToX(i);
      const y = balanceToY(ctx.cells[i].balanceCents, ctx.height);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const zeroY = balanceToY(0, ctx.height);
  const selBounds = ctx.cellBounds(ctx.selected);
  return (
    <svg
      viewBox={`0 0 ${ctx.width} ${ctx.height}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <rect
        x={selBounds[0]}
        y={0}
        width={selBounds[1] - selBounds[0]}
        height={ctx.height}
        fill="rgba(88,166,255,0.10)"
      />
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
        stroke-width={2}
      />
      <For each={ctx.visibleCells}>
        {(i) => {
          const x = ctx.cellToX(i);
          const y = balanceToY(ctx.cells[i].balanceCents, ctx.height);
          const isSel = i === ctx.selected;
          return (
            <circle
              cx={x}
              cy={y}
              r={isSel ? 5 : 2.5}
              fill={isSel ? "var(--sui-warning, #f5a623)" : "var(--sui-accent)"}
            />
          );
        }}
      </For>
    </svg>
  );
};

// ── A baked-in "zoomed-in" variant for the factory example. Real consumers
//    would pick numbers that match their data density; these are tuned to look
//    visibly different from the defaults so the difference is obvious.
const ZoomedScrubChart = createScrubChart<CashflowCell>({
  selectedFraction: 0.85,
  sideCompression: 60,
});

export const ScrubChartShowcase: Component = () => {
  const [selectedIdx, setSelectedIdx] = createSignal(Math.max(0, todayIndex));
  const [selectedFraction, setSelectedFraction] = createSignal(2 / 3);
  const [sideCompression, setSideCompression] = createSignal(28);

  const cell = createMemo(() => cells[selectedIdx()]);

  return (
    <div class="component-section component-section--full">
      <h2>ScrubChart — Composite (Depth 2)</h2>
      <p class="text-meta">
        Composes <code>DateAxis</code> (Depth-1 atomic) and a user-supplied
        chart slot via a 20 px SVG gutter that draws diagonal connectors between
        each cell's chart-side and axis-side bounds. The focused cell occupies
        a fixed fraction of chart width (default 2/3) and morphs smoothly when
        scrubbed; neighbours compress into the side bands (fisheye). Scrubbing
        works via axis-cell click or drag-on-chart; an internal fractional{" "}
        <code>selectedAnim</code> drives a 250 ms ease-out tween on programmatic
        change. Generic over <code>C extends Cell</code> so consumers attach
        payload directly to each cell.
      </p>

      <div class="example-group">
        <h3>Base ScrubChart — daily cashflow line</h3>
        <p class="text-meta">
          The 153-day range scrolls under the chart's narrow focus window. Click
          any cell in the axis to scrub to that day; drag horizontally on the
          chart to scrub continuously. The selected day's column is highlighted
          in the chart and underlined in the axis.
        </p>

        <ScrubChart<CashflowCell>
          cells={cells}
          selected={selectedIdx()}
          onScrub={(i) => setSelectedIdx(i)}
          today={PINNED_TODAY}
          selectedFraction={selectedFraction()}
          sideCompression={sideCompression()}
          renderCell={cashflowDayCell}
          renderChart={renderCashflowChart}
        />

        <div
          style={{
            "margin-top": "16px",
            "font-size": "13px",
            color: "var(--sui-text-secondary)",
          }}
        >
          Selected:{" "}
          <strong style={{ color: "var(--sui-text-primary)" }}>
            {fmtDate(cell().start)}
          </strong>
          {" — "}
          Balance:{" "}
          <strong style={{ color: "var(--sui-text-primary)" }}>
            {fmtDollars(cell().balanceCents / 100)}
          </strong>
          {" · Day cashflow: "}
          <span>{fmtDollars(cell().cashflowCents / 100)}</span>
        </div>
      </div>

      <div class="example-group">
        <h3>Geometry controls — two knobs</h3>
        <p class="text-meta">
          <code>selectedFraction</code> (default 2/3) sets the fraction of chart
          width the focused cell occupies. <code>sideCompression</code>{" "}
          (default 28) sets how many times wider the focused cell is than each
          side cell — higher numbers fit more context in the side bands. Move
          the sliders and watch the chart above re-morph.
        </p>
        <div
          style={{
            padding: "12px 16px",
            background: "var(--sui-bg-elevated)",
            border: "1px solid var(--sui-border)",
            "border-radius": "var(--sui-radius-md)",
            display: "flex",
            "flex-direction": "column",
            gap: "8px",
            "max-width": "560px",
          }}
        >
          <label
            style={{
              display: "flex",
              "align-items": "center",
              gap: "12px",
              "font-size": "12px",
            }}
          >
            <span style={{ width: "150px", color: "var(--sui-text-secondary)" }}>
              Selected fraction: <code>{selectedFraction().toFixed(2)}</code>
            </span>
            <input
              type="range"
              min={0.4}
              max={0.9}
              step={0.01}
              value={selectedFraction()}
              onInput={(e) =>
                setSelectedFraction(parseFloat(e.currentTarget.value))
              }
              style={{ flex: 1 }}
            />
          </label>
          <label
            style={{
              display: "flex",
              "align-items": "center",
              gap: "12px",
              "font-size": "12px",
            }}
          >
            <span style={{ width: "150px", color: "var(--sui-text-secondary)" }}>
              Side compression: <code>{sideCompression()}</code>
            </span>
            <input
              type="range"
              min={4}
              max={60}
              step={1}
              value={sideCompression()}
              onInput={(e) =>
                setSideCompression(parseInt(e.currentTarget.value, 10))
              }
              style={{ flex: 1 }}
            />
          </label>
        </div>
      </div>

      <div class="example-group">
        <h3>createScrubChart factory — bake geometry into a named variant</h3>
        <p class="text-meta">
          <code>
            createScrubChart(&#123; selectedFraction: 0.85, sideCompression: 60
            &#125;)
          </code>{" "}
          returns a component whose call site is data + callbacks only — the
          presentational knobs are locked at variant-definition time. Per
          STYLE_GUIDE.md's "minimal variant surface" rule, the library ships no
          concrete named variant yet; add one when a real use case calls for
          different baked geometry.
        </p>
        <ZoomedScrubChart
          cells={cells}
          selected={selectedIdx()}
          onScrub={(i) => setSelectedIdx(i)}
          today={PINNED_TODAY}
          renderCell={cashflowDayCell}
          renderChart={renderCashflowChart}
        />
        <div class="text-meta">
          Same data, same callbacks as the base above — only the geometry
          differs. Both instances share the <code>selectedIdx</code> signal,
          so scrubbing one updates the other.
        </div>
      </div>
    </div>
  );
};
