import {
  type Component,
  createMemo,
  createSignal,
  For,
  onCleanup,
  onMount,
} from "solid-js";
import { SectionTitle } from "../../src/components/Text";
import {
  DateAxis,
  dailyCells,
  type Cell,
} from "../../src/components/DateAxis";
import { cashflowAt, cashflowDayCell, fmtDollars } from "./cashflow-day-cell";

// ── Linear chart + DateAxis bench ────────────────────────────────────────
// Replaces the previous ScrubChart fisheye demo. The chart spans the
// container width and renders ALL days at linear scale (so each day is a
// thin slice ~5–6 px wide); the DateAxis below keeps its 40-px cells and
// scrolls horizontally on its own. A vertical marker on the chart tracks
// the selected day; click an axis cell OR drag on the chart to scrub.

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

const fmtDate = (d: Date): string =>
  d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

const CHART_HEIGHT = 200;
const CELL_WIDTH = 40;
const PAD_LEFT = 56;
const PAD_RIGHT = 16;

export const WorkshopShowcase: Component = () => {
  const [selectedIdx, setSelectedIdx] = createSignal(Math.max(0, todayIndex));
  const cell = createMemo(() => cells[selectedIdx()]);

  // Measure the chart's pixel width via ResizeObserver so the linear day
  // pitch matches the actual rendered box.
  const [chartWidth, setChartWidth] = createSignal(1200);
  let chartFrameEl: HTMLDivElement | undefined;
  onMount(() => {
    if (!chartFrameEl) return;
    if (typeof ResizeObserver === "undefined") return;
    const obs = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setChartWidth(entry.contentRect.width);
    });
    obs.observe(chartFrameEl);
    onCleanup(() => obs.disconnect());
  });

  // Track the DateAxis's scroll position + viewport width so the chart can
  // show the visible-cell window as a highlighted band (overview + detail
  // pattern). DateAxis exposes its scroll container via scrollableRef.
  const [axisScrollLeft, setAxisScrollLeft] = createSignal(0);
  const [axisViewportWidth, setAxisViewportWidth] = createSignal(0);
  const handleAxisRef = (el: HTMLDivElement) => {
    setAxisViewportWidth(el.clientWidth);
    setAxisScrollLeft(el.scrollLeft);
    el.addEventListener(
      "scroll",
      () => setAxisScrollLeft(el.scrollLeft),
      { passive: true },
    );
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => setAxisViewportWidth(el.clientWidth));
      ro.observe(el);
      onCleanup(() => ro.disconnect());
    }
  };
  // First/last cell indices currently visible in the axis viewport. These
  // bound the highlighted window on the chart.
  const windowFirst = () =>
    Math.max(0, Math.floor(axisScrollLeft() / CELL_WIDTH));
  const windowLast = () =>
    Math.min(
      cells.length - 1,
      Math.ceil((axisScrollLeft() + axisViewportWidth()) / CELL_WIDTH) - 1,
    );

  const plotWidth = () => Math.max(1, chartWidth() - PAD_LEFT - PAD_RIGHT);
  const dayPitch = () => plotWidth() / cells.length;

  // Index <→ chart-x (centre of the day's column).
  const indexToX = (i: number): number => PAD_LEFT + (i + 0.5) * dayPitch();
  const xToIndex = (x: number): number => {
    const local = x - PAD_LEFT;
    if (local <= 0) return 0;
    if (local >= plotWidth()) return cells.length - 1;
    return Math.floor(local / dayPitch());
  };

  const balanceToY = (cents: number): number =>
    CHART_HEIGHT - 24 - ((cents - yMin) / yRange) * (CHART_HEIGHT - 40);

  // Polyline points across all cells, linearly spaced.
  const linePoints = createMemo(() =>
    cells
      .map((c, i) => `${indexToX(i).toFixed(1)},${balanceToY(c.balanceCents).toFixed(1)}`)
      .join(" "),
  );

  const zeroY = () => balanceToY(0);

  // ── Pointer-driven scrub on the chart. Linear pitch + no fisheye means
  //    each pointer move maps directly to a single day index — no anchored
  //    layout, no rAF tween, no morph.
  let dragging = false;
  const handlePointerDown = (e: PointerEvent) => {
    if (!chartFrameEl) return;
    const rect = chartFrameEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setSelectedIdx(xToIndex(x));
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    dragging = true;
  };
  const handlePointerMove = (e: PointerEvent) => {
    if (!dragging || !chartFrameEl) return;
    const rect = chartFrameEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setSelectedIdx(xToIndex(x));
  };
  const handlePointerUp = (e: PointerEvent) => {
    if (!dragging) return;
    try {
      (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
    } catch {
      /* not captured; nothing to release */
    }
    dragging = false;
  };

  // Sparse month tick labels along the bottom of the chart so the linear
  // scale stays readable without competing with the dense axis below.
  const monthTicks = cells
    .map((c, i) => ({ cell: c, i }))
    .filter(({ cell, i }) => i === 0 || cell.start.getUTCDate() === 1);

  return (
    <div class="component-section component-section--full">
      <SectionTitle>Workshop — Linear chart + DateAxis</SectionTitle>
      <p
        style={{
          "font-size": "12px",
          color: "var(--sui-text-secondary)",
          margin: "8px 0 16px",
          "max-width": "72ch",
        }}
      >
        Overview + detail. The chart spans the full container width and plots
        all {cells.length} days at linear scale (~{dayPitch().toFixed(1)} px
        per day); the highlighted blue window shows the slice currently
        visible in the DateAxis below — scrolling the axis slides the window,
        clicking a cell or dragging the chart scrubs the selection (the
        amber dot). The axis auto-scrolls to keep the selected cell centred,
        so the window tracks the selection too.
      </p>

      <div
        style={{
          background: "var(--sui-bg-elevated)",
          border: "1px solid var(--sui-border)",
          "border-radius": "var(--sui-radius-md)",
          overflow: "hidden",
        }}
      >
        <div
          ref={(el) => (chartFrameEl = el)}
          style={{
            position: "relative",
            width: "100%",
            height: `${CHART_HEIGHT}px`,
            "background": "var(--sui-bg-base, transparent)",
            "touch-action": "none",
            "cursor": "ew-resize",
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <svg
            viewBox={`0 0 ${chartWidth()} ${CHART_HEIGHT}`}
            preserveAspectRatio="none"
            style={{ width: "100%", height: "100%", display: "block" }}
          >
            {/* Y-axis ticks */}
            <line
              x1={PAD_LEFT}
              x2={chartWidth() - PAD_RIGHT}
              y1={zeroY()}
              y2={zeroY()}
              stroke="var(--sui-border)"
              stroke-dasharray="4 4"
            />
            <text
              x={PAD_LEFT - 6}
              y={zeroY()}
              text-anchor="end"
              dominant-baseline="middle"
              font-size="10"
              fill="var(--sui-text-muted)"
            >
              $0
            </text>
            <text
              x={PAD_LEFT - 6}
              y={balanceToY(yMax)}
              text-anchor="end"
              dominant-baseline="middle"
              font-size="10"
              fill="var(--sui-text-muted)"
            >
              {fmtDollars(yMax / 100)}
            </text>
            <text
              x={PAD_LEFT - 6}
              y={balanceToY(yMin)}
              text-anchor="end"
              dominant-baseline="middle"
              font-size="10"
              fill="var(--sui-text-muted)"
            >
              {fmtDollars(yMin / 100)}
            </text>

            {/* Sparse month ticks along the bottom edge */}
            <For each={monthTicks}>
              {({ cell: tc, i }) => (
                <>
                  <line
                    x1={indexToX(i)}
                    x2={indexToX(i)}
                    y1={CHART_HEIGHT - 18}
                    y2={CHART_HEIGHT - 14}
                    stroke="var(--sui-text-muted)"
                  />
                  <text
                    x={indexToX(i)}
                    y={CHART_HEIGHT - 4}
                    text-anchor="middle"
                    font-size="10"
                    fill="var(--sui-text-muted)"
                  >
                    {tc.start.toLocaleDateString("en-US", {
                      month: "short",
                      timeZone: "UTC",
                    })}
                  </text>
                </>
              )}
            </For>

            {/* Visible-window highlight — the slice of days currently
                shown in the DateAxis viewport. Drawn UNDER the line so the
                data stays legible inside the band. */}
            <rect
              x={indexToX(windowFirst()) - dayPitch() / 2}
              y={8}
              width={
                indexToX(windowLast()) -
                indexToX(windowFirst()) +
                dayPitch()
              }
              height={CHART_HEIGHT - 30}
              fill="rgba(88,166,255,0.14)"
              stroke="rgba(88,166,255,0.55)"
              stroke-width={1}
            />

            {/* Balance polyline */}
            <polyline
              points={linePoints()}
              fill="none"
              stroke="var(--sui-accent)"
              stroke-width={1.6}
            />

            {/* Selected day dot — anchors the precise day within the window */}
            <circle
              cx={indexToX(selectedIdx())}
              cy={balanceToY(cell().balanceCents)}
              r={4}
              fill="var(--sui-warning, #f5a623)"
            />
          </svg>
        </div>

        <DateAxis<CashflowCell>
          cells={cells}
          selected={selectedIdx()}
          today={PINNED_TODAY}
          cellWidth={CELL_WIDTH}
          onCellClick={(i) => setSelectedIdx(i)}
          renderCell={cashflowDayCell}
          scrollableRef={handleAxisRef}
        />
      </div>

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
  );
};
