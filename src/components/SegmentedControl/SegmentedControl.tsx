// lastReviewedAt: 2026-06-03
// lastReviewedBy: adlai.arnold
// ============================================
// SegmentedControl — Atomic (Depth 1)
// Owns CSS (SegmentedControl.css), no component imports.
// Generic single-select segmented control with grouped (divider-separated)
// states, per-state color, and radio-group keyboard semantics.
// ============================================
import { Component, JSX, For, Show, splitProps, mergeProps } from "solid-js";
import type { ColorVariant } from "../../types";
import "./SegmentedControl.css";

export interface SegmentOption {
  /** Stable id emitted on selection. */
  value: string;
  /** Display content; string or JSX (icons ok). Defaults to `value`. */
  label?: string | JSX.Element;
  /** Group key — a divider renders wherever this differs from the previous option's group. */
  group?: string;
  /** Accent color when THIS segment is selected. */
  color?: ColorVariant;
  /** Disable just this segment. */
  disabled?: boolean;
}

export type SegmentedControlSize = "sm" | "md" | "lg";

export interface SegmentedControlProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** Ordered list of selectable states. */
  options: SegmentOption[];
  /** Controlled, single-select value. */
  value: string;
  /** Fires with the new value, only when the selection actually changes. */
  onValueChange?: (value: string) => void;
  /** Sizing, consistent with Toggle/Button. Default "md". */
  size?: SegmentedControlSize;
  /** Fallback accent for selected segments that don't specify their own. */
  color?: ColorVariant;
  /** Disable the entire control. */
  disabled?: boolean;
}

export const SegmentedControl: Component<SegmentedControlProps> = (props) => {
  const [local, others] = splitProps(props, [
    "options",
    "value",
    "onValueChange",
    "size",
    "color",
    "disabled",
    "class",
  ]);

  const containerClasses = () => {
    const cl = ["sui-segmented"];
    cl.push(`sui-segmented--${local.size || "md"}`);
    if (local.disabled) cl.push("sui-segmented--disabled");
    if (local.class) cl.push(local.class);
    return cl.join(" ");
  };

  const isDisabled = (opt: SegmentOption) => Boolean(local.disabled || opt.disabled);

  const segClasses = (opt: SegmentOption) => {
    const cl = ["sui-segmented__seg"];
    const selected = opt.value === local.value;
    if (selected) cl.push("sui-segmented__seg--selected");
    const color = opt.color || local.color;
    if (selected && color && color !== "default") cl.push(`sui-segmented__seg--${color}`);
    if (isDisabled(opt)) cl.push("sui-segmented__seg--disabled");
    return cl.join(" ");
  };

  const select = (opt: SegmentOption) => {
    if (isDisabled(opt) || opt.value === local.value) return;
    local.onValueChange?.(opt.value);
  };

  return (
    <div class={containerClasses()} role="radiogroup" {...others}>
      <For each={local.options}>
        {(opt, i) => {
          const selected = () => opt.value === local.value;
          const showDivider = () => i() > 0 && local.options[i() - 1].group !== opt.group;
          return (
            <>
              <Show when={showDivider()}>
                <span class="sui-segmented__divider" aria-hidden="true" />
              </Show>
              <button
                type="button"
                role="radio"
                aria-checked={selected() ? "true" : "false"}
                class={segClasses(opt)}
                onClick={() => select(opt)}
              >
                {opt.label ?? opt.value}
              </button>
            </>
          );
        }}
      </For>
    </div>
  );
};

/** Config/visual props locked at variant-definition time. */
export type SegmentedControlOverrides = Pick<SegmentedControlProps, "options" | "size" | "color">;
/** Props available to consumers of a curried variant. */
export type SegmentedControlDataProps = Omit<SegmentedControlProps, keyof SegmentedControlOverrides>;

export function createSegmentedControl(
  defaults: Partial<SegmentedControlProps>,
): Component<SegmentedControlDataProps> {
  // `options` is baked into `defaults`; the cast asserts the merged props are complete.
  return (props) => <SegmentedControl {...(mergeProps(defaults, props) as SegmentedControlProps)} />;
}
