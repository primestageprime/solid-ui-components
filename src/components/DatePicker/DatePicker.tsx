// ============================================
// DatePicker — Atomic (Depth 1)
// Owns CSS (DatePicker.css), no component imports.
// A themed date control. Wraps a native
// <input type="date"> styled with --sui-* tokens to match
// the dark HUD theme; returns an ISO YYYY-MM-DD string.
//   <DatePicker value="2026-06-02" onChange={(iso) => ...} />
// Intentionally NOT a custom calendar — the native control
// gives us the picker UI for free. Factory:
// createDatePicker() for curried variants.
// ============================================
import { Component, JSX, mergeProps, splitProps } from "solid-js";
import "./DatePicker.css";

export interface DatePickerProps
  extends Omit<
    JSX.InputHTMLAttributes<HTMLInputElement>,
    "onChange" | "value" | "type"
  > {
  /** Current date as an ISO YYYY-MM-DD string (or "" for none). */
  value: string;
  /** Called with the ISO YYYY-MM-DD string when the date changes. */
  onChange: (iso: string) => void;
}

export const DatePicker: Component<DatePickerProps> = (props) => {
  const [local, others] = splitProps(props, ["value", "onChange", "class"]);

  const rootClass = () =>
    local.class ? `sui-date-picker ${local.class}` : "sui-date-picker";

  const handleInput: JSX.EventHandler<HTMLInputElement, InputEvent> = (e) => {
    // Native date inputs already emit ISO YYYY-MM-DD via `.value`.
    local.onChange(e.currentTarget.value);
  };

  return (
    <input
      type="date"
      class={rootClass()}
      value={local.value}
      onInput={handleInput}
      {...others}
    />
  );
};

export function createDatePicker(
  defaults: Partial<DatePickerProps>,
): Component<DatePickerProps> {
  return (props) => <DatePicker {...mergeProps(defaults, props)} />;
}
