// ============================================
// PROTOTYPE — Variant C: segmented track.
// Throwaway bench code. Not a component to promote.
//
// Every tick puts a gap in the bar and a cap over the gap. There is no text,
// so the density limit is the cap width, not a label width.
// ============================================
import { Slider as KobalteSlider } from "@kobalte/core/slider";
import { type Component, For } from "solid-js";
import "../../../../src/components/Slider/Slider.css";
import "./VariantCSegments.css";
import { BenchCaseFrame } from "./BenchCaseFrame";
import { type CaseEntry, leftPercent, tickPercent } from "./cases";

interface SegmentSliderProps {
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

/** A slider whose track breaks into segments at every tick. */
export const SegmentSlider: Component<SegmentSliderProps> = (props) => {
  const format = (value: number): string => (props.format ?? String)(value);
  const percents = (): readonly number[] =>
    props.ticks.map((tick) => tickPercent(tick, props.min, props.max));

  return (
    <KobalteSlider
      class="sui-slider slider-ticks-c"
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
        <For each={percents()}>
          {(percent) => (
            <span class="slider-ticks-c__gap" style={leftPercent(percent)} />
          )}
        </For>
        <For each={props.ticks}>
          {(tick) => (
            <span
              class="slider-ticks-c__cap"
              classList={{ "slider-ticks-c__cap--passed": tick <= props.value }}
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

/** Renders every bench case with the segmented-track treatment. */
export const VariantCPanel: Component<{ entries: readonly CaseEntry[] }> = (
  props,
) => (
  <For each={props.entries}>
    {(entry) => (
      <BenchCaseFrame tickCase={entry.tickCase} value={entry.value()}>
        <SegmentSlider
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
