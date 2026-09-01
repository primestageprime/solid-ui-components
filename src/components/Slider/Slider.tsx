// lastReviewedAt: 2026-08-28
// lastReviewedBy: adlai.arnold
// ============================================
// Slider — Atomic (Depth 1)
// Owns CSS (Slider.css), imports no other component.
// Kobalte-backed (@kobalte/core/slider), matching the Combobox / Select /
// Toast / ThemedNumberInput wrapping pattern.
// Factory: createSlider().
//
// A labelled range control that prints its own live value. The label line
// carries the caption on the left and `format(value)` right-aligned on the
// right, so a caption reads "Months of runway" / "6 months" on one line and
// the control needs no separate readout beside it.
//
// The value is in the CONSUMER'S OWN UNITS. The component runs no arithmetic
// on it beyond Kobalte's step snapping, and it formats nothing itself — a
// dial that keeps integer cents passes cents and a `format` that renders
// dollars. Assuming dollars here would put a unit in the widget that only the
// consumer knows.
//
// It does NOT emit `onChange` at mount. `ThemedNumberInput` does (one call
// with `undefined`), which cost thorcasting a guard in `MoneyField` and is a
// documented data-loss trap; `Slider.test.tsx` pins the opposite behaviour
// here. The value moves on a drag or on a key that moves the thumb, nothing
// else.
//
// LAYOUT PURITY — AUDITED INTRINSIC. The root column, the label line and the
// track are this widget's OWN parts, not caller children, and an Atomic may
// not import Layout components. Same disposition as Toggle, Checkbox and
// ThemedNumberInput.
// ============================================
import {
  Slider as KobalteSlider,
  type SliderRootProps as KobalteSliderRootProps,
} from "@kobalte/core/slider";
import { type Component, splitProps } from "solid-js";
import "./Slider.css";

/** Props owned by `Slider`; everything else is kobalte passthrough. */
interface SliderOwnProps {
  /** Current value, controlled, in the consumer's own units. */
  value: number;
  /** Called when a drag or a thumb-moving key changes the value. Never at mount. */
  onChange: (value: number) => void;
  /** Smallest allowed value — forwarded as kobalte's `minValue`. */
  min: number;
  /** Largest allowed value — forwarded as kobalte's `maxValue`. */
  max: number;
  /** Arrow-key and drag increment (default `1`). */
  step?: number;
  /** Accessible name and visible caption. */
  label: string;
  /**
   * Renders the live value printed right-aligned on the label line, and the
   * `aria-valuetext` a screen reader announces. Default `String`.
   *
   * Without it kobalte reads the value as a percentage of `max`, which is
   * wrong for any domain that does not start at zero.
   */
  format?: (value: number) => string;
  /** Whether the control is disabled. */
  disabled?: boolean;
}

/** `Slider` combines the owned props with kobalte's forwarded root props. */
export type SliderProps = SliderOwnProps &
  Omit<
    KobalteSliderRootProps,
    "value" | "defaultValue" | "onChange" | "minValue" | "maxValue" | "step"
  >;

/** Static visual decisions — curried at definition time by `createSlider`. */
export type SliderOverrides = Pick<SliderProps, "format">;

/** What a curried variant exposes: everything except the curried overrides. */
export type SliderDataProps = Omit<SliderProps, keyof SliderOverrides>;

const DEFAULT_STEP = 1;

/**
 * Labelled range control with a live value readout.
 *
 * @example
 *   // Minimal
 *   <Slider label="Safety buffer" value={months()} onChange={setMonths}
 *           min={3} max={18} />
 *
 *   // Money kept as integer cents, rendered as dollars
 *   <Slider
 *     label="Monthly draw"
 *     value={cents()}
 *     onChange={setCents}
 *     min={0}
 *     max={1_000_000}
 *     step={10_000}
 *     format={(c) => `$${(c / 100).toLocaleString()}/mo`}
 *   />
 */
export const Slider: Component<SliderProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "value",
    "onChange",
    "min",
    "max",
    "step",
    "label",
    "format",
    "disabled",
  ]);

  const format = (value: number): string => (local.format ?? String)(value);

  // Kobalte models every slider as multi-thumb. This wrapper is single-thumb
  // by contract, so the array is an implementation detail the consumer never
  // sees: one value in, `values[0]` out.
  const handleChange = (values: number[]): void => {
    local.onChange(values[0]);
  };

  return (
    <KobalteSlider
      {...(rest as KobalteSliderRootProps)}
      class="sui-slider"
      value={[local.value]}
      onChange={handleChange}
      minValue={local.min}
      maxValue={local.max}
      step={local.step ?? DEFAULT_STEP}
      disabled={local.disabled}
      getValueLabel={(params) => format(params.values[0])}
    >
      <div class="sui-slider__header">
        <KobalteSlider.Label class="sui-slider__label">
          {local.label}
        </KobalteSlider.Label>
        <KobalteSlider.ValueLabel class="sui-slider__value" />
      </div>
      <KobalteSlider.Track class="sui-slider__track">
        <KobalteSlider.Fill class="sui-slider__fill" />
        <KobalteSlider.Thumb
          class="sui-slider__thumb"
          // Kobalte's own `aria-valuetext` comes from its internal number
          // formatter, NOT from `getValueLabel` — that only feeds ValueLabel.
          // Left alone a screen reader reads "6" where the sighted user sees
          // "6 months". `others` is spread last on the thumb, so this wins.
          aria-valuetext={format(local.value)}
        >
          <KobalteSlider.Input />
        </KobalteSlider.Thumb>
      </KobalteSlider.Track>
    </KobalteSlider>
  );
};

/**
 * Curry the formatter when the unit is a static decision.
 *
 * @example
 *   const MonthsSlider = createSlider({ format: (n) => `${n} months` });
 */
export const createSlider = (
  overrides: SliderOverrides,
): Component<SliderDataProps> => {
  return (props) => <Slider {...overrides} {...props} />;
};
