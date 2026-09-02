// ============================================
// PROTOTYPE — Variant B: labelled rail under the track.
// Throwaway bench code. Not a component to promote.
//
// This variant trades density for readability on purpose: every tick prints
// its own `format(value)`. The stress case shows what that costs.
// ============================================
import { Slider as KobalteSlider } from "@kobalte/core/slider";
import { type Component, For } from "solid-js";
import "../../../../src/components/Slider/Slider.css";
import "./VariantBRail.css";
import { BenchCaseFrame } from "./BenchCaseFrame";
import { type CaseEntry, leftPercent, tickPercent } from "./cases";

interface RailSliderProps {
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

/** A slider with a labelled rail below the track. */
export const RailSlider: Component<RailSliderProps> = (props) => {
  const format = (value: number): string => (props.format ?? String)(value);
  const lastIndex = (): number => props.ticks.length - 1;

  return (
    <KobalteSlider
      class="sui-slider slider-ticks-b"
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
        <KobalteSlider.Thumb
          class="sui-slider__thumb"
          aria-valuetext={format(props.value)}
        >
          <KobalteSlider.Input />
        </KobalteSlider.Thumb>
      </KobalteSlider.Track>
      <div class="slider-ticks-b__rail">
        <For each={props.ticks}>
          {(tick, index) => (
            <span
              class="slider-ticks-b__tick"
              classList={{
                "slider-ticks-b__tick--first": index() === 0,
                "slider-ticks-b__tick--last": index() === lastIndex(),
                "slider-ticks-b__tick--passed": tick <= props.value,
              }}
              style={leftPercent(tickPercent(tick, props.min, props.max))}
            >
              <span class="slider-ticks-b__line" />
              <span class="slider-ticks-b__text">{format(tick)}</span>
            </span>
          )}
        </For>
      </div>
    </KobalteSlider>
  );
};

/** Renders every bench case with the labelled-rail treatment. */
export const VariantBPanel: Component<{ entries: readonly CaseEntry[] }> = (
  props,
) => (
  <For each={props.entries}>
    {(entry) => (
      <BenchCaseFrame tickCase={entry.tickCase} value={entry.value()}>
        <RailSlider
          value={entry.value()}
          onChange={entry.setValue}
          min={entry.tickCase.min}
          max={entry.tickCase.max}
          step={entry.tickCase.step}
          label={entry.tickCase.label}
          format={entry.tickCase.format}
          ticks={entry.tickCase.ticks}
        />
      </BenchCaseFrame>
    )}
  </For>
);
