// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// CountChip — Atomic (Depth 1)
// Owns CSS (CountChip.css), no component imports.
// Pill showing a count + a label. Visually emphasizes the chip when count > 0
// and dims it when count is zero. Use in dashboards / status strips where
// you want "12 IN PROGRESS · 4 BLOCKED" inline summaries.
// ============================================
import { type Component, type JSX, splitProps } from "solid-js";
import "./CountChip.css";

export interface CountChipProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  count: number;
  label: string;
  /** Force the active visual state regardless of count. */
  active?: boolean;
}

export const CountChip: Component<CountChipProps> = (props) => {
  const [local, others] = splitProps(props, ["count", "label", "active", "class"]);
  const isActive = () => (local.active ?? local.count > 0);
  const cls = () => {
    const c = ["sui-count-chip"];
    if (isActive()) c.push("sui-count-chip--active");
    if (local.class) c.push(local.class);
    return c.join(" ");
  };
  return (
    <span class={cls()} {...others}>
      <span class="sui-count-chip__count">{local.count}</span>
      <span class="sui-count-chip__label">{local.label}</span>
    </span>
  );
};
