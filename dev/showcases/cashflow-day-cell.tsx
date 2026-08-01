import type { JSX } from "solid-js";
import {
  dayCellContext,
  type Cell,
  type DateAxisCellContext,
} from "../../src/components/DateAxis";

/** Deterministic stub net-cashflow ($) per day. */
export const cashflowAt = (i: number): number =>
  Math.round(
    Math.sin(i / 3.5) * 1100 + Math.sin(i / 1.6) * 480 + Math.sin(i / 13) * 260,
  );

const HEAT_GREEN = "rgba(0, 200, 120, 0.85)";
const HEAT_RED = "rgba(230, 70, 70, 0.85)";

export const fmtDollars = (v: number): string =>
  `${v >= 0 ? "+" : "−"}$${Math.abs(v).toLocaleString("en-US")}`;

/**
 * Cashflow-flavoured day cell: date corner (with month label on edges),
 * diverging green/red bar showing magnitude, and the dollar amount below.
 * Each cell sizes itself (60 × 72 px). Caller passes the value via the
 * `cashflowAt(ctx.index)` stub or via cell payload.
 */
export const cashflowDayCell = (
  cell: Cell,
  ctx: DateAxisCellContext,
): JSX.Element => {
  const dayCtx = dayCellContext(cell, ctx);
  const v = cashflowAt(ctx.index);
  const up = v >= 0;
  const frac = Math.min(1, Math.abs(v) / 2200);
  const corner =
    dayCtx.isFirstOfMonth || dayCtx.isLastOfMonth
      ? `${cell.start.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })} ${cell.start.getUTCDate()}`
      : String(cell.start.getUTCDate());
  return (
    <div
      class="cashflow-day-cell-demo__cell"
      style={{
        background: up ? "rgba(0,200,120,0.05)" : "rgba(230,70,70,0.05)",
      }}
    >
      <div class="cashflow-day-cell-demo__corner">{corner}</div>
      <div class="cashflow-day-cell-demo__plot">
        <div class="cashflow-day-cell-demo__baseline" />
        <div
          class="cashflow-day-cell-demo__bar"
          style={{
            height: `${(frac * 50).toFixed(0)}%`,
            ...(up
              ? {
                  bottom: "50%",
                  background: HEAT_GREEN,
                  "border-radius": "1px 1px 0 0",
                }
              : {
                  top: "50%",
                  background: HEAT_RED,
                  "border-radius": "0 0 1px 1px",
                }),
          }}
        />
      </div>
      <div
        class="cashflow-day-cell-demo__value"
        style={{ color: up ? HEAT_GREEN : HEAT_RED }}
      >
        {fmtDollars(v)}
      </div>
    </div>
  );
};
