// lastReviewedAt: 2026-05-30
// lastReviewedBy: frontend
// ============================================
// CheckboxField — Composite (Depth 2)
// Owns CSS (CheckboxField.css), composes Checkbox.
// A form-field row: the Checkbox control on the left, a clickable
// label + optional hint text stacked on the right. This is the
// zero-config form-field role for checklists — the call site passes
// only data (id, label, hint, checked) and a handler.
// ============================================
import { Component, JSX, Show, splitProps, createUniqueId } from "solid-js";
import { Checkbox, type CheckboxSize } from "./Checkbox";
import type { ColorVariant } from "../../types";
import "./CheckboxField.css";

export interface CheckboxFieldProps {
  /** Stable id, shared by the control and its label's `for`. */
  id?: string;
  /** Visible field label. */
  label: string;
  /** Optional secondary line under the label. */
  hint?: string;
  /** Controlled checked state. */
  checked?: boolean;
  /** Disable interaction. */
  disabled?: boolean;
  size?: CheckboxSize;
  color?: ColorVariant;
  /** Native change handler (receives the DOM event). */
  onChange?: JSX.ChangeEventHandler<HTMLInputElement, Event>;
  /** Value handler — receives the new checked boolean directly. */
  onCheckedChange?: (checked: boolean) => void;
  class?: string;
}

export const CheckboxField: Component<CheckboxFieldProps> = (props) => {
  const [local] = splitProps(props, [
    "id",
    "label",
    "hint",
    "checked",
    "disabled",
    "size",
    "color",
    "onChange",
    "onCheckedChange",
    "class",
  ]);

  const generatedId = createUniqueId();
  const fieldId = () => local.id || `checkbox-field-${generatedId}`;

  const classes = () => {
    const cl = ["sui-checkbox-field"];
    if (local.class) cl.push(local.class);
    return cl.join(" ");
  };

  return (
    <div class={classes()}>
      <Checkbox
        id={fieldId()}
        checked={local.checked}
        disabled={local.disabled}
        size={local.size}
        color={local.color}
        onChange={local.onChange}
        onCheckedChange={local.onCheckedChange}
      />
      <div class="sui-checkbox-field__text">
        <label class="sui-checkbox-field__label" for={fieldId()}>
          {local.label}
        </label>
        <Show when={local.hint}>
          <span class="sui-checkbox-field__hint">{local.hint}</span>
        </Show>
      </div>
    </div>
  );
};
