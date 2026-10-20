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
import { type Component, type JSX, Show, splitProps } from "solid-js";
import { DigitRoller } from "../DataDisplay/DigitRoller";
import { Icon, type IconName } from "../Icon/Icon";
import "./CountChip.css";

export interface CountChipProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  count: number;
  label: string;
  /** Force the active visual state regardless of count. */
  active?: boolean;
  /** Print the number with the viewer's thousands grouping ("2,594" in en-US).
   *  Default false: the digits print bare, as before. */
  grouped?: boolean;
  /** BCP 47 locale for `grouped`. Default: the runtime's own locale. */
  locale?: string;
  /** A glyph before the count (a warning triangle on a count of things that need attention). Additive: no icon, no change. */
  icon?: IconName;
}

export const CountChip: Component<CountChipProps> = (props) => {
  const [local, others] = splitProps(props, [
    "count",
    "label",
    "active",
    "grouped",
    "locale",
    "icon",
    "class",
  ]);
  const isActive = () => local.active ?? local.count > 0;
  const bare = () => local.label === "";
  const cls = () => {
    const c = ["sui-count-chip"];
    if (isActive()) c.push("sui-count-chip--active");
    if (bare()) c.push("sui-count-chip--bare");
    if (local.class) c.push(local.class);
    return c.join(" ");
  };
  return (
    <span class={cls()} {...others}>
      <Show when={local.icon}>{(i) => <Icon name={i()} size="xs" class="sui-count-chip__icon" />}</Show>
      <span class="sui-count-chip__count">
        <DigitRoller
          value={local.grouped ? local.count.toLocaleString(local.locale) : String(local.count)}
        />
      </span>
      <Show when={!bare()}>
        <span class="sui-count-chip__label">{local.label}</span>
      </Show>
    </span>
  );
};
