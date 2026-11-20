// SUI's ThemedNumberInput (a Kobalte NumberField), as React markup, and the
// one sized variant the role card uses, CountInput100. It draws the field at
// a value: the same group, hidden form input, spin button and two steppers,
// with the same classes and width. Typing and stepping are left to the
// browser; `onChange` is never called (the mirror draws a state).
//
// What is ported is what the role card passes: `name`, `value`, `size`,
// `min`, `max`, `maxValue`, `step` and an `aria-label` on the group. A
// visible `label`, `errorMessage` and `description` are not yet drawn.
import type { ReactElement } from "react";
import "../../src/components/ThemedNumberInput/ThemedNumberInput.css";
import { ICON_PATHS } from "sui:Icon/paths";
import { NO_AUTOFILL_ATTRS } from "sui:Inputs/noAutofill";
import {
  INPUT_DEFAULT_WIDTH_MAX,
  fieldWidthForChars,
  numberFieldChars,
  tightNumberWidth,
} from "sui:../internal/fieldWidth/fieldWidth";
import { domProps } from "./internal/props.ts";
import { numberText } from "./MarkedSlider.tsx";

export interface ThemedNumberInputProps {
  readonly name: string;
  readonly value?: () => number | undefined;
  readonly onChange?: (value: number | undefined) => void;
  readonly min?: number;
  readonly max?: number;
  readonly maxValue?: number;
  readonly step?: number;
  readonly size?: "sm" | "md";
  readonly "aria-label"?: string;
}

/** Kobalte's spin-button bound when none is given: Number.MAX_SAFE_INTEGER. */
const UNBOUNDED = Number.MAX_SAFE_INTEGER;
/** ThemedNumberInput's own chrome (border, padding, steppers), in rem. */
const NUMBER_CHROME_REM = 4;

/** SUI's VisuallyHidden, as Kobalte writes it on the hidden form input's box. */
const HIDDEN = {
  border: "0",
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  height: "1px",
  margin: "0 -1px -1px 0",
  overflow: "hidden",
  padding: "0",
  position: "absolute",
  width: "1px",
  whiteSpace: "nowrap",
} as const;

/** The field's `max-width`: tight to `maxValue` when given, else to its bounds. */
export const numberInputWidth = (props: ThemedNumberInputProps): string => {
  const step = props.step ?? 1;
  return props.maxValue !== undefined
    ? tightNumberWidth({ max: props.maxValue, min: props.min, step })
    : `${fieldWidthForChars(
        numberFieldChars({
          max: props.max ?? INPUT_DEFAULT_WIDTH_MAX,
          min: props.min,
          step,
        }),
        NUMBER_CHROME_REM,
      )}rem`;
};

const Stepper = (props: {
  readonly direction: "increment" | "decrement";
  /** At its bound, as Kobalte disables it. */
  readonly atBound: boolean;
}): ReactElement => (
  <button
    type="button"
    tabIndex={-1}
    disabled={props.atBound}
    data-disabled={props.atBound ? "" : undefined}
    aria-label={props.direction === "increment" ? "Increment" : "Decrement"}
    className={`sui-number-input__trigger sui-number-input__trigger--${props.direction}`}
    aria-controls="number-input"
  >
    <svg
      width={12}
      height={12}
      viewBox="0 0 16 16"
      fill="none"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: SUI's own icon table, as SUI writes it
      dangerouslySetInnerHTML={{
        __html:
          ICON_PATHS[
            props.direction === "increment" ? "chevron-up" : "chevron-down"
          ].outline,
      }}
    />
  </button>
);

/** Whether `low` has reached `high`: a stepper with nowhere to go. */
export const atBound = (
  low: number | undefined,
  high: number | undefined,
): boolean => low !== undefined && high !== undefined && low >= high;

export const ThemedNumberInput = (
  props: ThemedNumberInputProps,
): ReactElement => {
  const value = props.value?.();
  const max = props.max ?? props.maxValue;
  const fitted = props.maxValue !== undefined;
  const text = value === undefined ? "" : numberText(value, "en-US");
  return (
    // biome-ignore lint/a11y/useSemanticElements: Kobalte's NumberField root is a div with role=group; the mirror draws the same tree
    <div
      role="group"
      data-valid=""
      aria-label={props["aria-label"]}
      className={`sui-number-input sui-number-input--${props.size ?? "md"}${fitted ? " sui-number-input--fit" : ""}`}
      style={{ maxWidth: numberInputWidth(props) }}
    >
      <div aria-hidden="true" style={HIDDEN}>
        <input
          type="text"
          tabIndex={-1}
          style={{ fontSize: "16px" }}
          name={props.name}
        />
      </div>
      <div className="sui-number-input__group">
        <input
          // The text is a property, not an attribute, as Kobalte sets it.
          ref={(el) => {
            if (el) el.value = text;
          }}
          role="spinbutton"
          style={{ touchAction: "none" }}
          aria-valuenow={value}
          // An empty field reads "NaN", as Kobalte writes it.
          aria-valuetext={value === undefined ? "NaN" : text}
          aria-valuemin={props.min ?? -UNBOUNDED}
          aria-valuemax={max ?? UNBOUNDED}
          type="text"
          data-valid=""
          inputMode="decimal"
          autoCorrect="off"
          spellCheck={false}
          {...domProps(NO_AUTOFILL_ATTRS)}
          className="sui-number-input__input"
        />
        <div className="sui-number-input__triggers">
          <Stepper direction="increment" atBound={atBound(value, max)} />
          <Stepper direction="decrement" atBound={atBound(props.min, value)} />
        </div>
      </div>
    </div>
  );
};

/** Counts up to 99 (SUI's CurrencyInput/sized.tsx). */
export const CountInput100 = (
  props: Omit<ThemedNumberInputProps, "maxValue">,
): ReactElement => <ThemedNumberInput {...props} maxValue={99} />;
