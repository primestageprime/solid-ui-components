// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// DateRangePicker/PresetButtons — Internal (Depth 1) (not exported from library root).
// Native <button> chips styled by the parent Primitive's own CSS
// (`.sui-drp__preset-btn`). Intentionally does NOT import the library's
// `Button` — keeps DateRangePicker a leaf Primitive with no sibling-component
// imports, matching the Combobox/Select/Tooltip Kobalte-wrapping pattern.
// ============================================
import { type Component, For, Show } from "solid-js";
import { WrapRow } from "../Layout/variants";
import type { DateRangePreset } from "./types";

export interface PresetButtonsProps {
  presets: DateRangePreset[] | undefined;
  onSelect: (preset: DateRangePreset) => void;
}

export const PresetButtons: Component<PresetButtonsProps> = (props) => (
  <Show when={props.presets?.length}>
    <WrapRow class="sui-drp__presets">
      <For each={props.presets}>
        {(preset) => (
          <button
            type="button"
            class="sui-drp__preset-btn"
            onClick={() => props.onSelect(preset)}
          >
            {preset.label}
          </button>
        )}
      </For>
    </WrapRow>
  </Show>
);
