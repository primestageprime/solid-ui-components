import { type Component, createMemo, createSignal, For } from "solid-js";
import { SectionTitle } from "../../src/components/Text";
import { ScrubChart } from "../../src/components/ScrubChart";
import { dailyCells, type Cell } from "../../src/components/DateAxis";
import { cashflowAt, cashflowDayCell, fmtDollars } from "./cashflow-day-cell";

type CashflowCell = Cell & {
  cashflowCents: number;
  balanceCents: number;
};

const RANGE_START = new Date("2026-05-01");
const RANGE_END = new Date("2026-09-30");
const PINNED_TODAY = new Date("2026-05-28");

// Pre-compute cells with running balance.
const cells: CashflowCell[] = (() => {
  let running = 0;
  return dailyCells(RANGE_START, RANGE_END).map((cell, i) => {
    const cashflowCents = cashflowAt(i) * 100; // cashflowAt returns dollars; store cents
    running += cashflowCents;
    return { ...cell, cashflowCents, balanceCents: running };
  });
})();

const todayIndex = cells.findIndex(
  (c) =>
    PINNED_TODAY.getTime() >= c.start.getTime() &&
    PINNED_TODAY.getTime() < c.end.getTime(),
);

// Y-axis bounds for the running balance.
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

export const WorkshopShowcase: Component = () => {
  const [selectedIdx, setSelectedIdx] = createSignal(Math.max(0, todayIndex));
  const [selectedFraction, setSelectedFraction] = createSignal(2 / 3);
  const [sideCompression, setSideCompression] = createSignal(28);

  const cell = createMemo(() => cells[selectedIdx()]);

  return (
    <div class="component-section component-section--full">
      <SectionTitle>Workshop — ScrubChart</SectionTitle>
      <p
        style={{
          "font-size": "12px",
          color: "var(--sui-text-secondary)",
          margin: "8px 0 16px",
          "max-width": "72ch",
        }}
      >
        DateAxis paired with a fisheye chart. Click an axis cell or drag on the
        chart to scrub. The focused cell smoothly morphs to{" "}
        {(selectedFraction() * 100).toFixed(0)}% of the chart width while
        neighbouring cells compress into the side bands.
      </p>

      <ScrubChart<CashflowCell>
        cells={cells}
        selected={selectedIdx()}
        onScrub={(i) => setSelectedIdx(i)}
        today={PINNED_TODAY}
        selectedFraction={selectedFraction()}
        sideCompression={sideCompression()}
        renderCell={cashflowDayCell}
        renderChart={(ctx) => {
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
        }}
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
        {"  · Day cashflow: "}
        <span>{fmtDollars(cell().cashflowCents / 100)}</span>
      </div>

      <div
        style={{
          "margin-top": "20px",
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
        <div
          style={{
            "font-size": "11px",
            "text-transform": "uppercase",
            "letter-spacing": "0.08em",
            color: "var(--sui-text-muted)",
          }}
        >
          Geometry controls
        </div>
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
            onInput={(e) => setSelectedFraction(parseFloat(e.currentTarget.value))}
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
            onInput={(e) => setSideCompression(parseInt(e.currentTarget.value, 10))}
            style={{ flex: 1 }}
          />
        </label>
      </div>
    </div>
  );
};
