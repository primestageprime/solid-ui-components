import { type Component, createSignal } from "solid-js";
import {
  DateAxis,
  DailyDateAxis,
  dailyCells,
  dayCellContext,
  type Cell,
} from "../../src/components/DateAxis";

// ── Static dates — anchored to 2026-05-01 so the gallery shows a stable
//    range without clocking. `today` is pinned near the middle of the range.
const RANGE_START = new Date("2026-05-01");
const RANGE_END = new Date("2026-07-14"); // ~75 days — forces horizontal scroll
const PINNED_TODAY = new Date("2026-05-27");

const NARROW_START = new Date("2026-05-19");
const NARROW_END = new Date("2026-06-08");

const fmtLong = (d: Date): string =>
  d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

// Deterministic stub net-cashflow ($) per day for the heatmap demo.
const cashflow = (i: number): number =>
  Math.round(Math.sin(i / 3.5) * 1100 + Math.sin(i / 1.6) * 480 + Math.sin(i / 13) * 260);

const fmtDollars = (v: number): string =>
  `${v >= 0 ? "+" : "−"}$${Math.abs(v).toLocaleString("en-US")}`;

const HEAT_GREEN = "rgba(0, 200, 120, 0.85)";
const HEAT_RED = "rgba(230, 70, 70, 0.85)";

const demoBox = (label: string, children: () => unknown) => (
  <div
    style={{
      padding: "0 0 4px",
      background: "var(--sui-bg-elevated)",
      border: "1px solid var(--sui-border)",
      "border-radius": "var(--sui-radius-md)",
      "margin-bottom": "16px",
      overflow: "hidden",
    }}
  >
    <div
      style={{
        padding: "8px 16px",
        "font-size": "11px",
        "text-transform": "uppercase",
        "letter-spacing": "0.08em",
        color: "var(--sui-text-muted)",
        "border-bottom": "1px solid var(--sui-border)",
      }}
    >
      {label}
    </div>
    <div style={{ padding: "0" }}>{children() as any}</div>
  </div>
);

export const DateAxisShowcase: Component = () => {
  const [selected, setSelected] = createSignal<Date>(PINNED_TODAY);

  // Cells for the custom-render example are computed once.
  const customCells = dailyCells(RANGE_START, RANGE_END);

  return (
    <div class="component-section">
      <h2>DateAxis — Atomic (Depth 1)</h2>
      <p class="text-meta">
        Cadence-generic horizontal cell ribbon. Pass any <code>Cell[]</code>
        produced by <code>dailyCells</code> / <code>weeklyCells</code> /
        <code>monthlyCells</code> / <code>hourlyCells</code>, or build your own.
        For day-cell ergonomics use <code>DailyDateAxis</code>.
      </p>

      <div class="example-group">
        <h3>Default ribbon — DailyDateAxis</h3>
        <p class="text-meta">
          <code>{"<DailyDateAxis start={…} end={…} />"}</code>. Today (May 27)
          is marked; month names appear above the day number on the first and
          last day of each month.
        </p>
        {demoBox("DailyDateAxis · passive · 3-week · cellWidth=56", () => (
          <DailyDateAxis
            start={NARROW_START}
            end={NARROW_END}
            today={PINNED_TODAY}
            cellWidth={56}
          />
        ))}
      </div>

      <div class="example-group">
        <h3>Clickable days drive a linked view</h3>
        <p class="text-meta">
          Click (or focus + Enter/Space on) any day below. Both ribbons share
          one <code>selected</code> signal.
        </p>

        <div
          style={{
            display: "flex",
            "align-items": "center",
            gap: "12px",
            padding: "16px 20px",
            background: "var(--sui-bg-elevated)",
            border: "1px solid var(--sui-accent)",
            "border-radius": "var(--sui-radius-md)",
            "margin-bottom": "16px",
          }}
        >
          <span style={{ "font-size": "20px" }}>📈</span>
          <div>
            <div
              style={{
                "font-size": "11px",
                "text-transform": "uppercase",
                "letter-spacing": "0.08em",
                color: "var(--sui-text-muted)",
              }}
            >
              Graph view — centered on
            </div>
            <div
              style={{
                "font-size": "15px",
                "font-weight": "600",
                color: "var(--sui-accent)",
              }}
            >
              {fmtLong(selected())}
            </div>
          </div>
        </div>

        {demoBox("DailyDateAxis · clickable · start=2026-05-01  end=2026-07-14", () => (
          <DailyDateAxis
            start={RANGE_START}
            end={RANGE_END}
            today={PINNED_TODAY}
            selected={selected()}
            onDayClick={setSelected}
          />
        ))}

        {demoBox("DailyDateAxis · clickable · 3-week · cellWidth=56", () => (
          <DailyDateAxis
            start={NARROW_START}
            end={NARROW_END}
            today={PINNED_TODAY}
            selected={selected()}
            onDayClick={setSelected}
            cellWidth={56}
          />
        ))}
      </div>

      <div class="example-group">
        <h3>Custom cell renderer — cashflow heatmap (bare DateAxis)</h3>
        <p class="text-meta">
          Drop the curry: <code>DateAxis</code> with <code>cells</code> from
          <code>dailyCells(...)</code> and a custom <code>renderCell</code>.
          The renderer sizes each cell; the axis grows to respect it and the
          scrollbar stays entirely below the cells.
        </p>
        {demoBox("DateAxis · custom renderCell — date corner + diverging bar + $", () => (
          <DateAxis
            cells={customCells}
            today={PINNED_TODAY}
            renderCell={(cell: Cell, ctx) => {
              const dayCtx = dayCellContext(cell, ctx);
              const v = cashflow(ctx.index);
              const up = v >= 0;
              const frac = Math.min(1, Math.abs(v) / 2200);
              const corner =
                dayCtx.isFirstOfMonth || dayCtx.isLastOfMonth
                  ? `${cell.start.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })} ${cell.start.getUTCDate()}`
                  : String(cell.start.getUTCDate());
              return (
                <div
                  style={{
                    position: "relative",
                    width: "60px",
                    height: "72px",
                    "box-sizing": "border-box",
                    display: "flex",
                    "flex-direction": "column",
                    padding: "3px 4px 4px",
                    gap: "2px",
                    "border-right": "1px solid var(--sui-border)",
                    background: up ? "rgba(0,200,120,0.05)" : "rgba(230,70,70,0.05)",
                  }}
                >
                  <div
                    style={{
                      "font-size": "9px",
                      "line-height": "1.1",
                      color: "var(--sui-text-muted)",
                      "white-space": "nowrap",
                    }}
                  >
                    {corner}
                  </div>
                  <div style={{ position: "relative", flex: "1", "min-height": "0" }}>
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        top: "50%",
                        height: "1px",
                        background: "var(--sui-border)",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        left: "24%",
                        right: "24%",
                        height: `${(frac * 50).toFixed(0)}%`,
                        ...(up
                          ? { bottom: "50%", background: HEAT_GREEN, "border-radius": "1px 1px 0 0" }
                          : { top: "50%", background: HEAT_RED, "border-radius": "0 0 1px 1px" }),
                      }}
                    />
                  </div>
                  <div
                    style={{
                      "font-size": "9px",
                      "font-weight": "600",
                      "text-align": "center",
                      "white-space": "nowrap",
                      color: up ? HEAT_GREEN : HEAT_RED,
                    }}
                  >
                    {fmtDollars(v)}
                  </div>
                </div>
              );
            }}
          />
        ))}
        <div class="text-meta">
          DateAxis owns the cell wrapper (click handling, today / selected highlight);
          your <code>renderCell</code> controls what's inside and the cell's own size.
        </div>
      </div>
    </div>
  );
};
