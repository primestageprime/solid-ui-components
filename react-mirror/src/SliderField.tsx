// SUI's SliderField (the dial's editable figure), as React markup. It shows
// `value` at rest; typing is left to the browser, and Enter/blur hand the text
// to `onCommit` — SUI's parse and validation stay with the caller.
import type { ReactElement } from "react";
import "../../src/components/Slider/Slider.css";
import { noAutofillAttrs } from "sui:Inputs/noAutofill";
import { domProps } from "./internal/props.ts";

export interface SliderFieldProps {
  readonly label: string;
  readonly value: string;
  readonly editValue?: string;
  readonly prefix?: string;
  readonly suffix?: string;
  readonly onCommit?: (text: string) => void;
  readonly disabled?: boolean;
}

export const SliderField = (props: SliderFieldProps): ReactElement => (
  <label
    className="sui-slider__field"
    data-disabled={props.disabled === true ? "" : undefined}
  >
    {props.prefix && (
      <span className="sui-slider__field-affix" aria-hidden="true">
        {props.prefix}
      </span>
    )}
    <span className="sui-slider__field-sizer">
      <span className="sui-slider__field-mirror" aria-hidden="true">
        {props.value}
      </span>
      <input
        {...domProps(noAutofillAttrs())}
        className="sui-slider__value sui-slider__value--editable"
        type="text"
        inputMode="decimal"
        aria-label={props.label}
        disabled={props.disabled}
        size={1}
        // A property, as Solid sets it, so no `value` attribute is written.
        ref={(input) => {
          if (input && document.activeElement !== input)
            input.value = props.value;
        }}
        onBlur={(event) => {
          if (event.currentTarget.value !== props.value)
            props.onCommit?.(event.currentTarget.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          event.stopPropagation();
        }}
      />
    </span>
    {props.suffix && (
      <span className="sui-slider__field-affix" aria-hidden="true">
        {props.suffix}
      </span>
    )}
  </label>
);
