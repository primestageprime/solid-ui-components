// ============================================
// DatePicker — Atomic (Depth 1)
// Owns CSS (DatePicker.css), no component imports.
// A themed date control that ALWAYS DISPLAYS ISO YYYY-MM-DD at a FIXED
// width, regardless of browser/OS locale.
//
// HOW (and why): a native <input type="date"> renders its value in the OS
// locale (08/28/2026 …) and that presentation cannot be forced to ISO. So
// the control renders its own ISO text display ("YYYY-MM-DD" placeholder
// when empty) and keeps the NATIVE input stretched invisibly over it —
// clicking anywhere opens the native calendar picker, and keyboard entry
// still works through the native input's segments (the display echoes the
// committed ISO value live). Width is fixed to the ISO string + icon +
// padding; the control never flexes to fill its container.
//   <DatePicker value="2026-06-02" onChange={(iso) => ...} />
// Factory: createDatePicker() for curried variants.
// ============================================
import { type Component, type JSX, mergeProps, splitProps } from "solid-js";
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
    <span class={rootClass()}>
      <span
        class="sui-date-picker__display"
        classList={{ "sui-date-picker__display--empty": !local.value }}
      >
        {local.value || "YYYY-MM-DD"}
      </span>
      <span class="sui-date-picker__icon" aria-hidden="true">
        ▾
      </span>
      {/* The native input — invisible, stretched over the whole control so a
          click anywhere opens the native calendar and typing still works. */}
      <input
        type="date"
        class="sui-date-picker__native"
        value={local.value}
        onInput={handleInput}
        {...others}
      />
    </span>
  );
};

export function createDatePicker(
  defaults: Partial<DatePickerProps>,
): Component<DatePickerProps> {
  return (props) => <DatePicker {...mergeProps(defaults, props)} />;
}
