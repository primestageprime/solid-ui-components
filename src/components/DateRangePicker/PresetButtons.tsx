// ============================================
// DateRangePicker/PresetButtons — Internal (not exported from library root).
// Composes the upstream Button (small, outlined) for each preset.
// ============================================
import { type Component, For, Show } from "solid-js";
import { Button } from "../Button/Button";
import type { DateRangePreset } from "./types";

export interface PresetButtonsProps {
  presets: DateRangePreset[] | undefined;
  onSelect: (preset: DateRangePreset) => void;
}

export const PresetButtons: Component<PresetButtonsProps> = (props) => (
  <Show when={props.presets?.length}>
    <div class="sui-drp__presets">
      <For each={props.presets}>
        {(preset) => (
          <Button
            variant="outlined"
            size="sm"
            class="sui-drp__preset-btn"
            onClick={() => props.onSelect(preset)}
          >
            {preset.label}
          </Button>
        )}
      </For>
    </div>
  </Show>
);
