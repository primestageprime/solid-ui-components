// ============================================
// Toggle — Atomic (Depth 1)
// Owns CSS (Toggle.css), no component imports.
// Checkbox toggle switch with label positioning.
// Updated: absorbs HUDToggle features (variant, color).
// Dropped: power and circuit variants.
// ============================================
import { Component, JSX, mergeProps, splitProps, createUniqueId } from "solid-js";
import type { ColorVariant } from "../../types";
import "./Toggle.css";

export type ToggleSize = "sm" | "md" | "lg";

export interface ToggleProps extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  size?: ToggleSize;
  label?: string;
  labelPosition?: "left" | "right";
  /** Toggle style variant — "default", "minimal", or "thematic" pill-switch */
  variant?: "default" | "minimal" | "thematic";
  /** Accent color when checked */
  color?: ColorVariant;
  /**
   * Value-handler variant of `onChange` — receives the new checked boolean
   * directly so consumers can write `onCheckedChange={setEnabled}` instead of
   * unwrapping `event.currentTarget.checked`. Fires alongside any native
   * `onChange` handler if both are provided.
   */
  onCheckedChange?: (checked: boolean) => void;
}

export const Toggle: Component<ToggleProps> = (props) => {
  const [local, others] = splitProps(props, [
    "size",
    "label",
    "labelPosition",
    "variant",
    "color",
    "class",
    "id",
    "onCheckedChange",
    "onChange",
  ]);

  const generatedId = createUniqueId();
  const toggleId = () => local.id || `toggle-${generatedId}`;

  const classes = () => {
    const classList = ["sui-toggle"];
    classList.push(`sui-toggle--${local.size || "md"}`);
    if (local.labelPosition === "left") classList.push("sui-toggle--label-left");
    if (local.variant === "minimal") classList.push("sui-toggle--minimal");
    if (local.variant === "thematic") classList.push("sui-toggle--thematic");
    if (local.color && local.color !== "default") classList.push(`sui-toggle--${local.color}`);
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  // Forwards the native event to any `onChange` listener (preserving the
  // existing InputHTMLAttributes contract) and fans out the boolean value to
  // `onCheckedChange` for the cleaner consumer signature.
  type ToggleChangeEvent = Event & {
    currentTarget: HTMLInputElement;
    target: HTMLInputElement;
  };
  const handleChange: JSX.ChangeEventHandler<HTMLInputElement, Event> = (event) => {
    const native = local.onChange;
    if (typeof native === "function") {
      native(event);
    } else if (Array.isArray(native)) {
      const [handler, data] = native;
      (handler as (data: unknown, event: ToggleChangeEvent) => void)(data, event);
    }
    local.onCheckedChange?.(event.currentTarget.checked);
  };

  return (
    <div class={classes()}>
      {local.label && local.labelPosition === "left" && (
        <label class="sui-toggle__label" for={toggleId()}>
          {local.label}
        </label>
      )}
      <div class="sui-toggle__track">
        <input
          type="checkbox"
          id={toggleId()}
          class="sui-toggle__input"
          onChange={handleChange}
          {...others}
        />
        <label class="sui-toggle__slider" for={toggleId()} />
      </div>
      {local.label && local.labelPosition !== "left" && (
        <label class="sui-toggle__label" for={toggleId()}>
          {local.label}
        </label>
      )}
    </div>
  );
};

export type ToggleOverrides = Pick<ToggleProps, "size" | "variant" | "color" | "labelPosition">;
export type ToggleDataProps = Omit<ToggleProps, keyof ToggleOverrides>;

export function createToggle(defaults: Partial<ToggleProps>): Component<ToggleDataProps> {
  return (props) => <Toggle {...mergeProps(defaults, props)} />;
}
