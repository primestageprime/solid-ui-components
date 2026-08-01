// lastReviewedAt: 2026-07-24
// lastReviewedBy: adlai.arnold
// ============================================
// CountBadge — Composed (Depth 2)
// Composes DigitRoller so the count ROLLS on change (counts roll by default —
// Peter, 2026-07-14). Owns CountBadge.css as a deliberate Depth-2 exception:
// the corner-pill chrome is intrinsic styling no atomic variant expresses
// (same rationale as CountChip). Single non-danger tone (#2 Rule).
// A tiny pill of a numeric count, for overlaying a trigger's corner.
// NOTE: the roll requires this instance to SURVIVE count changes — the host
// must give it a stable position/key, not remount it.
// ============================================
import { type Component, type JSX, splitProps } from "solid-js";
import { DigitRoller } from "../DataDisplay/DigitRoller";
import "./CountBadge.css";

export interface CountBadgeProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  count: number;
}

export const CountBadge: Component<CountBadgeProps> = (props) => {
  const [local, others] = splitProps(props, ["count", "class"]);
  const cls = () =>
    local.class ? `sui-count-badge ${local.class}` : "sui-count-badge";
  return (
    <span class={cls()} {...others}>
      <DigitRoller value={String(local.count)} />
    </span>
  );
};
