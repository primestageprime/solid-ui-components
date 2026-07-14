// ============================================
// GapCell — Composite (Depth 2) table cell. Zero CSS exception: GapCell.css is
// structural only (the 40×4 inline bar geometry + number/percent stack) — no
// atomic expresses a two-line number+bar cell. Ported from rhinotools'
// migration app: shows REMAINING work (source − landed) as count + % + a thin
// completion bar, colored by severity (all-done green → mostly-remaining red).
// Data-only (no curried variant needed — everything is data, like SortableList).
// ============================================
import { Component, Show } from "solid-js";
import "./GapCell.css";

export type GapSeverity = "success" | "warning" | "danger";

/** Pure ramp over PERCENT REMAINING: 0 → success, ≤50 → warning, >50 → danger. */
export function gapSeverity(pctRemaining: number): GapSeverity {
  if (pctRemaining === 0) return "success";
  if (pctRemaining <= 50) return "warning";
  return "danger";
}

export interface GapCellProps {
  /** Rows still to land (source − bronze). Nullish renders the blank em-dash. */
  remaining: number | null | undefined;
  /** Denominator; 0 renders the blank em-dash. */
  total: number;
  /**
   * Single-line variant: collapses the count line into a hover title and shows
   * only `pct + bar` on one row. Keeps dense tables (e.g. CensusView) to a
   * single text line instead of the default two-line count/meta stack.
   */
  inline?: boolean;
}

export const GapCell: Component<GapCellProps> = (props) => {
  const blank = () => props.total === 0 || props.remaining == null;
  const pct = () => (props.total > 0 ? ((props.remaining ?? 0) / props.total) * 100 : 0);
  const severity = () => gapSeverity(pct());
  return (
    <Show when={!blank()} fallback={<span class="sui-gap-cell__blank">—</span>}>
      <Show
        when={props.inline}
        fallback={
          <div class={`sui-gap-cell sui-gap-cell--${severity()}`}>
            <div class="sui-gap-cell__count">{(props.remaining ?? 0).toLocaleString()}</div>
            <div class="sui-gap-cell__meta">
              <span class="sui-gap-cell__pct">{pct().toFixed(1)}%</span>
              <div class="sui-gap-cell__bar">
                <div class="sui-gap-cell__fill" style={{ width: `${Math.min(100, 100 - pct())}%` }} />
              </div>
            </div>
          </div>
        }
      >
        <div
          class={`sui-gap-cell sui-gap-cell--inline sui-gap-cell--${severity()}`}
          title={`${(props.remaining ?? 0).toLocaleString()} remaining`}
        >
          <span class="sui-gap-cell__pct">{pct().toFixed(0)}%</span>
          <div class="sui-gap-cell__bar">
            <div class="sui-gap-cell__fill" style={{ width: `${Math.min(100, 100 - pct())}%` }} />
          </div>
        </div>
      </Show>
    </Show>
  );
};
