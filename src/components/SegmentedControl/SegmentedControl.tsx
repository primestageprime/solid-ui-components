// lastReviewedAt: 2026-06-03
// lastReviewedBy: adlai.arnold
// ============================================
// SegmentedControl — Atomic (Depth 1)
// Owns CSS (SegmentedControl.css), no component imports.
// Generic single-select segmented control with grouped (divider-separated)
// states, per-state color, and radio-group keyboard semantics.
// ============================================
import {
  type Component,
  type JSX,
  For,
  Show,
  splitProps,
  mergeProps,
} from "solid-js";
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

/**
 * Single-select segmented control with optional grouping (dividers) and per-state color.
 *
 * Accessibility: provide an accessible name via `aria-label` or `aria-labelledby` —
 * these flow through the prop spread onto the `role="radiogroup"` element and are
 * required by the WAI-ARIA radio-group pattern.
 */
export interface SegmentedControlProps
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** Ordered list of selectable states. */
  options: SegmentOption[];
  /** Controlled, single-select value. */
  value: string;
  /** Fires with the new value, only when the selection actually changes. */
  onValueChange?: (value: string) => void;
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
    "color",
    "disabled",
    "class",
  ]);

  const containerClasses = () => {
    const cl = ["sui-segmented"];
    if (local.disabled) cl.push("sui-segmented--disabled");
    if (local.class) cl.push(local.class);
    return cl.join(" ");
  };

  const isDisabled = (opt: SegmentOption) =>
    Boolean(local.disabled || opt.disabled);

  const segClasses = (opt: SegmentOption) => {
    const cl = ["sui-segmented__seg"];
    const selected = opt.value === local.value;
    if (selected) cl.push("sui-segmented__seg--selected");
    const color = opt.color || local.color;
    if (selected && color && color !== "default")
      cl.push(`sui-segmented__seg--${color}`);
    if (isDisabled(opt)) cl.push("sui-segmented__seg--disabled");
    return cl.join(" ");
  };

  const select = (opt: SegmentOption) => {
    if (isDisabled(opt) || opt.value === local.value) return;
    local.onValueChange?.(opt.value);
  };

  const enabledValues = () =>
    local.options.filter((o) => !isDisabled(o)).map((o) => o.value);

  const resolveNext = (
    dir: 1 | -1 | "home" | "end",
    vals: string[],
  ): string => {
    if (dir === "home") return vals[0];
    if (dir === "end") return vals[vals.length - 1];
    const idx = vals.indexOf(local.value);
    // Current value absent from the enabled set (e.g. the selected option became
    // disabled): step in from the appropriate end rather than the same index for
    // both directions.
    if (idx === -1) return dir === 1 ? vals[0] : vals[vals.length - 1];
    return vals[(idx + dir + vals.length) % vals.length];
  };

  const move = (dir: 1 | -1 | "home" | "end") => {
    if (local.disabled) return; // a fully-disabled control ignores keyboard nav
    const vals = enabledValues();
    if (vals.length === 0) return;
    const next = resolveNext(dir, vals);
    if (next !== local.value) local.onValueChange?.(next);
  };

  const onKeyDown: JSX.EventHandler<HTMLDivElement, KeyboardEvent> = (e) => {
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        move(1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        move(-1);
        break;
      case "Home":
        e.preventDefault();
        move("home");
        break;
      case "End":
        e.preventDefault();
        move("end");
        break;
    }
  };

  return (
    <div
      class={containerClasses()}
      role="radiogroup"
      aria-disabled={local.disabled ? "true" : undefined}
      onKeyDown={onKeyDown}
      {...others}
    >
      <For each={local.options}>
        {(opt, i) => {
          const selected = () => opt.value === local.value;
          const showDivider = () =>
            i() > 0 && local.options[i() - 1].group !== opt.group;
          return (
            <>
              <Show when={showDivider()}>
                <span class="sui-segmented__divider" aria-hidden="true" />
              </Show>
              <button
                type="button"
                role="radio"
                aria-checked={selected() ? "true" : "false"}
                aria-disabled={isDisabled(opt) ? "true" : undefined}
                disabled={isDisabled(opt)}
                tabindex={!isDisabled(opt) && selected() ? 0 : -1}
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
export type SegmentedControlOverrides = Pick<
  SegmentedControlProps,
  "options" | "color"
>;
/** Props available to consumers of a curried variant. */
export type SegmentedControlDataProps = Omit<
  SegmentedControlProps,
  keyof SegmentedControlOverrides
>;

export function createSegmentedControl(
  defaults: Pick<SegmentedControlProps, "options"> &
    Partial<SegmentedControlProps>,
): Component<SegmentedControlDataProps> {
  // `options` is required in `defaults`; the cast bridges mergeProps' merged type to the
  // full SegmentedControlProps shape, which TS cannot infer satisfies the required fields.
  return (props) => (
    <SegmentedControl
      {...(mergeProps(defaults, props) as SegmentedControlProps)}
    />
  );
}
