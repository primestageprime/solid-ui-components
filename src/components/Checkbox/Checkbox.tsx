// lastReviewedAt: 2026-05-30
// lastReviewedBy: frontend
// ============================================
// Checkbox — Atomic (Depth 1)
// Owns CSS (Checkbox.css), no component imports.
// Native input[type=checkbox] with a styled box + checkmark and
// optional inline label. Mirrors the Toggle API (size, color,
// label/labelPosition, onCheckedChange, create* factory) so the two
// boolean controls stay interchangeable at the call site.
// ============================================
import {
  type Component,
  type JSX,
  mergeProps,
  splitProps,
  createEffect,
  createUniqueId,
} from "solid-js";
import type { ColorVariant } from "../../types";
import "./Checkbox.css";

export type CheckboxSize = "sm" | "md" | "lg";

export interface CheckboxProps
  extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  size?: CheckboxSize;
  label?: string;
  labelPosition?: "left" | "right";
  /** Accent color when checked. */
  color?: ColorVariant;
  /**
   * Value-handler variant of `onChange` — receives the new checked boolean
   * directly so consumers can write `onCheckedChange={setDone}` instead of
   * unwrapping `event.currentTarget.checked`. Fires alongside any native
   * `onChange` handler if both are provided.
   */
  onCheckedChange?: (checked: boolean) => void;
  /**
   * Mixed state for aggregate checkboxes (a select-all over a partial
   * selection). Rendered as a dash; maps to the native input's
   * `indeterminate` property, which is only reachable via JS.
   */
  indeterminate?: boolean;
}

export const Checkbox: Component<CheckboxProps> = (props) => {
  const [local, others] = splitProps(props, [
    "size",
    "label",
    "labelPosition",
    "color",
    "class",
    "id",
    "onCheckedChange",
    "onChange",
    "indeterminate",
  ]);

  // `indeterminate` is a DOM property, not an attribute — sync it via ref.
  let inputEl: HTMLInputElement | undefined;
  createEffect(() => {
    if (inputEl) inputEl.indeterminate = local.indeterminate ?? false;
  });

  const generatedId = createUniqueId();
  const checkboxId = () => local.id || `checkbox-${generatedId}`;

  const classes = () => {
    const classList = ["sui-checkbox"];
    classList.push(`sui-checkbox--${local.size || "md"}`);
    if (local.labelPosition === "left")
      classList.push("sui-checkbox--label-left");
    if (local.color && local.color !== "default")
      classList.push(`sui-checkbox--${local.color}`);
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  // Forwards the native event to any `onChange` listener (preserving the
  // InputHTMLAttributes contract) and fans out the boolean value to
  // `onCheckedChange` for the cleaner consumer signature.
  type CheckboxChangeEvent = Event & {
    currentTarget: HTMLInputElement;
    target: HTMLInputElement;
  };
  const handleChange: JSX.ChangeEventHandler<HTMLInputElement, Event> = (
    event,
  ) => {
    const native = local.onChange;
    if (typeof native === "function") {
      native(event);
    } else if (Array.isArray(native)) {
      const [handler, data] = native;
      (handler as (data: unknown, event: CheckboxChangeEvent) => void)(
        data,
        event,
      );
    }
    local.onCheckedChange?.(event.currentTarget.checked);
  };

  return (
    <div class={classes()}>
      {local.label && local.labelPosition === "left" && (
        <label class="sui-checkbox__label" for={checkboxId()}>
          {local.label}
        </label>
      )}
      <span class="sui-checkbox__control">
        <input
          ref={inputEl}
          type="checkbox"
          id={checkboxId()}
          class="sui-checkbox__input"
          onChange={handleChange}
          {...others}
        />
        <span class="sui-checkbox__box" aria-hidden="true" />
      </span>
      {local.label && local.labelPosition !== "left" && (
        <label class="sui-checkbox__label" for={checkboxId()}>
          {local.label}
        </label>
      )}
    </div>
  );
};

export type CheckboxOverrides = Pick<
  CheckboxProps,
  "size" | "color" | "labelPosition"
>;
export type CheckboxDataProps = Omit<CheckboxProps, keyof CheckboxOverrides>;

export function createCheckbox(
  defaults: Partial<CheckboxProps>,
): Component<CheckboxDataProps> {
  return (props) => <Checkbox {...mergeProps(defaults, props)} />;
}
