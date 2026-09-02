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
// `ticks` draws notches ON the track, over the fill. Kobalte has no tick
// primitive, so they are absolutely positioned spans inside its Track, beside
// the Fill and the Thumb. They carry no text and no pointer events — a notch
// is decoration, so `aria-hidden` keeps it out of the accessibility tree.
//
// LAYOUT PURITY — AUDITED INTRINSIC. The root column, the label line, the
// track and its notches are this widget's OWN parts, not caller children, and
// an Atomic may not import Layout components. The notches place themselves
// with `position: absolute` and a `left` percentage, which is data-driven
// placement rather than an arrangement vocabulary. Same disposition as Toggle,
// Checkbox and ThemedNumberInput.
// ============================================
import {
  Slider as KobalteSlider,
  type SliderRootProps as KobalteSliderRootProps,
} from "@kobalte/core/slider";
import { type Component, For, splitProps } from "solid-js";
import { filter } from "../../fn";
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
  /**
   * Notches drawn on the track. `true` marks every `step` from `min` to `max`
   * inclusive; an array marks exactly those values and ignores `step`. Omitted
   * or `false` draws nothing.
   *
   * A value outside `[min, max]` is dropped, not pulled to the edge — a notch
   * at an unreachable value would lie about the domain.
   */
  ticks?: boolean | readonly number[];
}

/** `Slider` combines the owned props with kobalte's forwarded root props. */
export type SliderProps = SliderOwnProps &
  Omit<
    KobalteSliderRootProps,
    "value" | "defaultValue" | "onChange" | "minValue" | "maxValue" | "step"
  >;

/**
 * Static visual decisions — curried at definition time by `createSlider`.
 *
 * `ticks` joins `format` because a tick set is a property of the SCALE, not of
 * the reading: a percentage dial marks quarters and a runway dial marks
 * quarters of a year, whatever value the caller holds today.
 */
export type SliderOverrides = Pick<SliderProps, "format" | "ticks">;

/** What a curried variant exposes: everything except the curried overrides. */
export type SliderDataProps = Omit<SliderProps, keyof SliderOverrides>;

const DEFAULT_STEP = 1;

/** Shared empty tick list, so a slider without ticks allocates nothing. */
const NO_TICKS: readonly number[] = [];

/** Half a notch, in CSS. Clamps an end notch inside the track's own bounds. */
const HALF_NOTCH = "calc(var(--sui-slider-tick-width) / 2)";

/**
 * Every step from `min` to `max`, inclusive, and never one past `max`.
 *
 * A `step` that does not divide the domain evenly simply stops short: a domain
 * of `0..15` by `4` marks 0, 4, 8 and 12, because a notch at 16 would sit off
 * the track and a notch at 15 is not a step.
 */
const ticksFromStep = (
  min: number,
  max: number,
  step: number,
): readonly number[] =>
  Array.from(
    { length: Math.floor((max - min) / step) + 1 },
    (_, index) => min + index * step,
  );

/** Whether a tick names a value the thumb can actually reach. */
const isInDomain =
  (min: number, max: number) =>
  (value: number): boolean =>
    value >= min && value <= max;

/** The notch values `ticks` asks for, in the consumer's own units. */
const resolveTicks = (
  ticks: boolean | readonly number[] | undefined,
  min: number,
  max: number,
  step: number,
): readonly number[] =>
  ticks === true
    ? ticksFromStep(min, max, step)
    : // What is left is an array, `false` or nothing; the last two mark nothing.
      filter(
        isInDomain(min, max),
        typeof ticks === "object" ? ticks : NO_TICKS,
      );

/** Position of a value on the track, as a percentage of the domain. */
const tickPercent = (value: number, min: number, max: number): number =>
  ((value - min) / (max - min)) * 100;

/**
 * Inline `left` for one notch.
 *
 * `clamp` keeps a notch at `min` or `max` half its own width inside the track,
 * so an end notch reads as a mark on the track rather than a cut-off sliver
 * beyond the rounded cap.
 */
const notchLeft = (percent: number): string =>
  `left: clamp(${HALF_NOTCH}, ${percent}%, calc(100% - ${HALF_NOTCH}))`;

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
    "ticks",
  ]);

  const format = (value: number): string => (local.format ?? String)(value);

  const notches = (): readonly number[] =>
    resolveTicks(local.ticks, local.min, local.max, local.step ?? DEFAULT_STEP);

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
        {/* Notches sit between the fill and the thumb, so the thumb covers
            the notch it stands on rather than the other way round. */}
        <For each={notches()}>
          {(tick) => (
            <span
              class="sui-slider__tick"
              classList={{ "sui-slider__tick--passed": tick <= local.value }}
              style={notchLeft(tickPercent(tick, local.min, local.max))}
              data-value={tick}
              aria-hidden="true"
            />
          )}
        </For>
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
