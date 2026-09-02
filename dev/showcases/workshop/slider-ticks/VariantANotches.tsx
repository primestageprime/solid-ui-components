// ============================================
// PROTOTYPE — Variant A: notches on the track.
// Throwaway bench code. Not a component to promote.
//
// The Kobalte wiring is copied from `src/components/Slider/Slider.tsx`, not
// imported, so a variant can change the track markup without touching `src/`.
// ============================================
import { Slider as KobalteSlider } from "@kobalte/core/slider";
import { type Component, For } from "solid-js";
import "../../../../src/components/Slider/Slider.css";
import "./VariantANotches.css";
import {
  type CaseEntry,
  leftPercent,
  tickPercent,
  type TickCase,
} from "./cases";
import { BenchCaseFrame } from "./BenchCaseFrame";

interface NotchSliderProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  label: string;
  format?: (value: number) => string;
  disabled?: boolean;
  ticks: readonly number[];
}

/** A slider whose stops are notches cut into the track. */
export const NotchSlider: Component<NotchSliderProps> = (props) => {
  const format = (value: number): string => (props.format ?? String)(value);

  return (
    <KobalteSlider
      class="sui-slider slider-ticks-a"
      value={[props.value]}
      onChange={(values) => props.onChange(values[0])}
      minValue={props.min}
      maxValue={props.max}
      step={props.step ?? 1}
      disabled={props.disabled}
      getValueLabel={(params) => format(params.values[0])}
    >
      <div class="sui-slider__header">
        <KobalteSlider.Label class="sui-slider__label">
          {props.label}
        </KobalteSlider.Label>
        <KobalteSlider.ValueLabel class="sui-slider__value" />
      </div>
      <KobalteSlider.Track class="sui-slider__track">
        <KobalteSlider.Fill class="sui-slider__fill" />
        <For each={props.ticks}>
          {(tick) => (
            <span
              class="slider-ticks-a__notch"
              classList={{
                "slider-ticks-a__notch--passed": tick <= props.value,
              }}
              style={leftPercent(tickPercent(tick, props.min, props.max))}
            />
          )}
        </For>
        <KobalteSlider.Thumb
          class="sui-slider__thumb"
          aria-valuetext={format(props.value)}
        >
          <KobalteSlider.Input />
        </KobalteSlider.Thumb>
      </KobalteSlider.Track>
    </KobalteSlider>
  );
};

/** Renders every bench case with the notch treatment. */
export const VariantAPanel: Component<{ entries: readonly CaseEntry[] }> = (
  props,
) => (
  <For each={props.entries}>
    {(entry) => (
      <BenchCaseFrame tickCase={entry.tickCase} value={entry.value()}>
        <div class="slider-ticks-a__row">
          <NotchSlider
            value={entry.value()}
            onChange={entry.setValue}
            min={entry.tickCase.min}
            max={entry.tickCase.max}
            step={entry.tickCase.step}
            label={entry.tickCase.label}
            format={entry.tickCase.format}
            ticks={entry.tickCase.ticks}
          />
        </div>
      </BenchCaseFrame>
    )}
  </For>
);

/** Re-exported so the bench can name the case type without a second import. */
export type { TickCase };
