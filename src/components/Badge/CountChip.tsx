// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// CountChip — Composed (Depth 2)
// Composes DigitRoller so the count ROLLS odometer-style on every change
// (numeric counts roll by default — Peter, 2026-07-14). Owns CountChip.css
// as a deliberate Depth-2 exception: the pill chrome is intrinsic styling
// no atomic variant expresses.
// Pill showing a count + a label. Visually emphasizes the chip when count > 0
// and dims it when count is zero. Use in dashboards / status strips where
// you want "12 IN PROGRESS · 4 BLOCKED" inline summaries.
// NOTE: the roll requires this instance to SURVIVE count changes — render
// chip lists with <Index> or stable keys, not <For> over rebuilt objects
// (a remount resets the roller's history and it mounts static).
// ============================================
import { type Component, type JSX, splitProps } from "solid-js";
import { DigitRoller } from "../DataDisplay/DigitRoller";
import "./CountChip.css";

export interface CountChipProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  count: number;
  label: string;
  /** Force the active visual state regardless of count. */
  active?: boolean;
}

export const CountChip: Component<CountChipProps> = (props) => {
  const [local, others] = splitProps(props, [
    "count",
    "label",
    "active",
    "class",
  ]);
  const isActive = () => local.active ?? local.count > 0;
  const cls = () => {
    const c = ["sui-count-chip"];
    if (isActive()) c.push("sui-count-chip--active");
    if (local.class) c.push(local.class);
    return c.join(" ");
  };
  return (
    <span class={cls()} {...others}>
      <span class="sui-count-chip__count">
        <DigitRoller value={String(local.count)} />
      </span>
      <span class="sui-count-chip__label">{local.label}</span>
    </span>
  );
};
