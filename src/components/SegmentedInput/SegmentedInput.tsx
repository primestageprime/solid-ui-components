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
// Compact (stepper) mode renders a content-width control with
// ‹ / › chevron buttons around the current label, with swipe and
// arrow-key support, clamped at the ends (no wrap):
//   <SegmentedInput ... compact />
// Factory: createSegmentedInput() for curried variants.
// ============================================
import {
  type Component,
  For,
  type JSX,
  mergeProps,
  splitProps,
} from "solid-js";
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
  /**
   * When true, render a compact stepper (‹ label ›) instead of the
   * full horizontal strip. Steps are clamped at the ends (no wrap).
   * Supports chevron clicks, left/right arrow keys, and swipe.
   * @default false
   */
  compact?: boolean;
}

/** Horizontal swipe distance (px) required to register a step. */
const SWIPE_THRESHOLD = 30;

export const SegmentedInput: Component<SegmentedInputProps> = (props) => {
  const [local, others] = splitProps(props, [
    "options",
    "value",
    "onChange",
    "class",
    "compact",
  ]);

  const currentIndex = () =>
    local.options.findIndex((o) => o.id === local.value);

  // Step by `delta` (e.g. -1 prev, +1 next), clamped to [0, len-1].
  const step = (delta: number) => {
    const idx = currentIndex();
    const from = idx < 0 ? 0 : idx;
    const next = Math.min(Math.max(from + delta, 0), local.options.length - 1);
    if (next !== idx) local.onChange(local.options[next].id);
  };

  if (local.compact) {
    const compactClass = () =>
      local.class
        ? `sui-segmented-stepper ${local.class}`
        : "sui-segmented-stepper";

    const current = () => {
      const idx = currentIndex();
      return idx < 0 ? local.options[0] : local.options[idx];
    };
    const atStart = () => currentIndex() <= 0;
    const atEnd = () => currentIndex() >= local.options.length - 1;

    // Swipe: record pointerdown x, compare to pointerup x. Swiping
    // left (negative delta) advances to the next option; swiping
    // right (positive delta) goes to the previous one.
    let downX: number | null = null;
    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX;
    };
    const onPointerUp = (e: PointerEvent) => {
      if (downX === null) return;
      const dx = e.clientX - downX;
      downX = null;
      if (Math.abs(dx) >= SWIPE_THRESHOLD) step(dx < 0 ? 1 : -1);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        step(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        step(1);
      }
    };

    return (
      // biome-ignore lint/a11y/useSemanticElements: intentional ARIA segmented/stepper group pattern
      <div
        class={compactClass()}
        role="group"
        tabindex="0"
        aria-label={current()?.label}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        {...others}
      >
        <button
          type="button"
          class="sui-segmented-stepper__chevron"
          aria-label="Previous"
          disabled={atStart()}
          tabindex="-1"
          onClick={() => step(-1)}
        >
          ‹
        </button>
        <span class="sui-segmented-stepper__label">{current()?.label}</span>
        <button
          type="button"
          class="sui-segmented-stepper__chevron"
          aria-label="Next"
          disabled={atEnd()}
          tabindex="-1"
          onClick={() => step(1)}
        >
          ›
        </button>
      </div>
    );
  }

  const rootClass = () =>
    local.class ? `sui-segmented ${local.class}` : "sui-segmented";

  return (
    <div class={rootClass()} role="radiogroup" {...others}>
      <For each={local.options}>
        {(option) => {
          const selected = () => local.value === option.id;
          return (
            // biome-ignore lint/a11y/useSemanticElements: intentional ARIA radiogroup/segmented pattern
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
