// ============================================
// SegmentedInput — Atomic (Depth 1)
// Owns CSS (SegmentedInput.css), no component imports.
// Single-select segmented control: a horizontal row of
// connected, keyboard-focusable buttons. The selected
// segment gets the accent treatment.
//   <SegmentedInput
//     options={[{ id: "a", label: "A" }, { id: "b", label: "B" }]}
//     value="a"
//     onChange={(id) => ...}
//   />
// Factory: createSegmentedInput() for curried variants.
// ============================================
import { Component, For, JSX, mergeProps, splitProps } from "solid-js";
import "./SegmentedInput.css";

export interface SegmentedInputOption {
  /** Stable id returned via onChange when this segment is selected. */
  id: string;
  /** Visible label for the segment. */
  label: string;
}

export interface SegmentedInputProps
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** Selectable segments, rendered left-to-right. */
  options: SegmentedInputOption[];
  /** Currently selected option id. */
  value: string;
  /** Called with the option id when a segment is clicked. */
  onChange: (id: string) => void;
}

export const SegmentedInput: Component<SegmentedInputProps> = (props) => {
  const [local, others] = splitProps(props, [
    "options",
    "value",
    "onChange",
    "class",
  ]);

  const rootClass = () =>
    local.class ? `sui-segmented ${local.class}` : "sui-segmented";

  return (
    <div class={rootClass()} role="radiogroup" {...others}>
      <For each={local.options}>
        {(option) => {
          const selected = () => local.value === option.id;
          return (
            <button
              type="button"
              role="radio"
              aria-checked={selected()}
              class={
                selected()
                  ? "sui-segmented__segment sui-segmented__segment--selected"
                  : "sui-segmented__segment"
              }
              onClick={() => local.onChange(option.id)}
            >
              {option.label}
            </button>
          );
        }}
      </For>
    </div>
  );
};

export function createSegmentedInput(
  defaults: Partial<SegmentedInputProps>,
): Component<SegmentedInputProps> {
  return (props) => <SegmentedInput {...mergeProps(defaults, props)} />;
}
