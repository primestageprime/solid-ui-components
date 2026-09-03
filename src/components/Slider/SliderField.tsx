// lastReviewedAt: 2026-09-03
// lastReviewedBy: adlai.arnold
// ============================================
// Slider/SliderField — Atomic (Depth 1)
// Shares Slider.css with Slider. Imports no other component.
//
// The editable readout, on its own. `Slider`'s `editable` path draws one of
// these, and a caller who draws its own `valueLabel` node draws as many as the
// value has honest readings.
//
// IT OWNS THE INTERACTION, NOT THE MEANING. The field swaps to `editValue` on
// focus, sizes itself to its text, commits on Enter and on blur, and reverts on
// Escape. The CALLER parses the committed text, clamps it and maps it back to
// the value. The field never reads the slider's own min, max or step: a
// "$132.61/mo" figure and the "11%" the track moves have different domains, so
// a parse in here would be right for one figure and wrong for the other.
//
// `prefix` and `suffix` split the unit away from the number. The input then
// holds ONLY the number, and the unit stands beside it as static text. The
// three parts read as one unbroken string: one font, one size, one baseline,
// no gap. The border and the padding sit on the GROUP, so the input's own box
// cannot open a hole between the number and its suffix, and hover and focus
// light the whole group. The group is a `<label>`, so a press on the prefix or
// the suffix focuses the input — a figure a person reads as one string answers
// a click anywhere on it.
//
// With no prefix and no suffix the input holds the whole formatted string, the
// way `Slider`'s built-in field always has.
//
// TWO SHARP EDGES THE TYPES DO NOT CATCH. First, `value` carries the number
// PART once an affix is set, and a caller whose formatter already prints the
// sign draws `$$1,627.08`. Second, the caller owns the parse, the clamp, the
// snap AND the empty case, because `Number("")` is `0` and an emptied field
// otherwise commits a real zero. Both warnings sit on the props below.
//
// WIDTH COMES FROM A MIRROR, NOT FROM `size`. The `size` attribute sizes the
// content box in CHARACTERS, and the browser multiplies it by the AVERAGE
// character width. Any string whose glyphs run wider than that average
// overflows and clips: "$1,591.32/yr" lost its "r". So the group holds a
// hidden span with the SAME text in the SAME font, and the input lies on top
// of it in the same grid cell. The span is real text, so it measures the real
// glyphs — the width is exact in a proportional font as well as a monospace
// one. The input keeps `size="1"` to hold its intrinsic width down to one
// character, otherwise a text input's default of 20 characters would win the
// track. The span carries the text the input SHOWS, so the field grows and
// shrinks on every keystroke and does not jump on focus.
//
// LAYOUT PURITY — AUDITED INTRINSIC. The group, the sizer and the affixes are
// this widget's OWN parts, not caller children, and an Atomic may not import
// Layout components. Same disposition as Slider itself.
// ============================================
import { type Component, Show, createSignal } from "solid-js";
import "./Slider.css";

/** Props of the editable readout. */
export interface SliderFieldProps {
  /** Accessible name of the input. It carries the unit, since the affixes do not. */
  label: string;
  /**
   * The text the field shows at rest. With `prefix` or `suffix` it is the
   * NUMBER PART only, because the input holds nothing else.
   *
   * WARNING — THE DOUBLED AFFIX. Nothing type-checks the split. A caller whose
   * own formatter already prints the sign passes `"$1,627.08"`, sets
   * `prefix="$"`, and the field draws `$$1,627.08`. The caller strips every
   * affix out of `value` first. A test that asserts each readout string
   * carries no `"$"` and no `"/"` at all catches whichever affix doubles.
   */
  value: string;
  /**
   * The text the field takes on focus. Defaults to `value`.
   *
   * Pass the raw number when `value` is formatted. A formatter runs ONE WAY,
   * so a person who focuses "1,591.32" and types over it should start from
   * the figure a parser accepts.
   */
  editValue?: string;
  /**
   * Static text before the input, such as `"$"`. Never typeable.
   *
   * The field prints it BESIDE `value`, never instead of it. Keep the same
   * text out of `value` — see the warning there.
   */
  prefix?: string;
  /**
   * Static text after the input, such as `"%"` or `"/mo"`. Never typeable.
   *
   * The field prints it BESIDE `value`, never instead of it. Keep the same
   * text out of `value` — see the warning there.
   */
  suffix?: string;
  /**
   * Called with the typed text on Enter and on blur. Escape reverts and calls
   * nothing.
   *
   * THE CALLER OWNS PARSE, CLAMP, SNAP AND THE EMPTY CASE. The field clamps
   * nothing and snaps nothing on purpose, because a `$/mo` figure has a
   * different domain from the `%` the track moves. The consequence is the
   * caller's to handle: on a `$50–$250 step $5` slider, a coach who types
   * `137` gets `137` — a value the control could never produce, and one that
   * looks entirely plausible on screen and in a forecast.
   *
   * The empty field is worse, because it fails SILENTLY. `Number("")` is `0`,
   * so an emptied field commits a real zero rather than doing nothing. Commit
   * only a FINITE parse. `Slider`'s own `editable` path holds that guard; a
   * caller that wires its own `onCommit` inherits none of it.
   */
  onCommit: (text: string) => void;
  /** Whether the field is disabled. */
  disabled?: boolean;
}

/**
 * What the field is doing.
 *
 * `reverting` is its own state, not a flag beside the draft: Escape blurs the
 * input, and the blur that follows must NOT commit. A boolean would let
 * "reverting with a draft" exist, which is not a state this field has.
 */
type FieldState =
  | { readonly phase: "rest" }
  | { readonly phase: "editing"; readonly text: string }
  | { readonly phase: "reverting" };

const AT_REST: FieldState = { phase: "rest" };
const REVERTING: FieldState = { phase: "reverting" };

/** The text the input shows: the draft while typing, `value` otherwise. */
const textOf = (state: FieldState, value: string): string =>
  state.phase === "editing" ? state.text : value;

/**
 * The editable readout of a slider value.
 *
 * @example
 *   // The whole formatted figure, the way `Slider editable` draws it
 *   <SliderField label="Runway" value="6 months" editValue="6"
 *                onCommit={(text) => setMonths(parse(text))} />
 *
 *   // Only the number is typeable; "$" and "/mo" stand beside it
 *   <SliderField label="Price per month" prefix="$" suffix="/mo"
 *                value="132.61" onCommit={(text) => setPrice(parse(text))} />
 */
export const SliderField: Component<SliderFieldProps> = (props) => {
  const [state, setState] = createSignal<FieldState>(AT_REST);

  const text = (): string => textOf(state(), props.value);

  const commit = (): void => {
    const current = state();
    setState(AT_REST);
    if (current.phase === "editing") props.onCommit(current.text);
  };

  return (
    // The group is a `<label>`, so a press anywhere on it focuses the input.
    <label
      class="sui-slider__field"
      data-disabled={props.disabled === true ? "" : undefined}
    >
      <Show when={props.prefix}>
        <span class="sui-slider__field-affix" aria-hidden="true">
          {props.prefix}
        </span>
      </Show>
      <span class="sui-slider__field-sizer">
        {/* The width mirror. It is hidden text in the input's own font, so the
            grid cell is exactly as wide as the glyphs the input draws. */}
        <span class="sui-slider__field-mirror" aria-hidden="true">
          {text()}
        </span>
        <input
          class="sui-slider__value sui-slider__value--editable"
          type="text"
          inputmode="decimal"
          aria-label={props.label}
          disabled={props.disabled}
          value={text()}
          // A floor, not a measurement. The mirror above sets the width.
          size={1}
          onFocus={(event) => {
            setState({
              phase: "editing",
              text: props.editValue ?? props.value,
            });
            event.currentTarget.select();
          }}
          onInput={(event) =>
            setState({ phase: "editing", text: event.currentTarget.value })
          }
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.currentTarget.blur();
            } else if (event.key === "Escape") {
              setState(REVERTING);
              event.currentTarget.blur();
            }
            // A slider root moves the thumb on arrow keys. Inside the field
            // those keys belong to the caret.
            event.stopPropagation();
          }}
        />
      </span>
      <Show when={props.suffix}>
        <span class="sui-slider__field-affix" aria-hidden="true">
          {props.suffix}
        </span>
      </Show>
    </label>
  );
};
