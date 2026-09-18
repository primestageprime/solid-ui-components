// ============================================
// MarkedSlider — Atomic Primitive (Depth 1)
// Owns CSS (MarkedSlider.css), imports no other library component. Its only
// dependency is the headless third-party slider (@kobalte/core/slider), which
// counts as a Primitive's own DOM the same way Slider, Combobox, Select and
// Toast wrap theirs (BEST_PRACTICES §1).
//
// WHY THIS EXISTS AS A PRIMITIVE. Nothing else in the library draws a VERTICAL
// track with an allowed-range box on it, a muted prior mark and an accent
// value mark pointing at the track from opposite sides, a tone-coloured line
// between them and a small figure beside that line. `Slider` is a plain
// horizontal control with notches; `BandRail` paints bands and no thumb. This
// is the one drawing the axiom could not compose out of what was already here,
// so it is Depth 1 and it owns the CSS — rather than a Composite growing a
// stylesheet and a fistful of raw `<svg>`/`<path>`/`<rect>` nodes, which is
// what `MutationSliders` was doing before 2026-09-17.
//
// NAMED BY SHAPE, NOT BY DOMAIN (BEST_PRACTICES §6). There is no entity here,
// no scenario, no prior-versus-future: there is a DOMAIN, an allowed RANGE, a
// VALUE, a PRIOR value to compare it against, and a caller-formatted
// `deltaLabel`. What any of those MEAN is the consumer's business.
//
// WHAT IT OWNS: one slider's DOM — the Kobalte root, the SVG overlay of marks,
// the drag surface and the thumb. It measures its own box and intercepts its
// own arrow keys.
//
// WHAT IT DOES NOT OWN: anything around it. A name above, a readout below, a
// footer button, a row of siblings — all of that is the consumer's
// composition, and none of it is styled from this component's stylesheet.
//
// A DRAG IS CONTINUOUS AND A KEY PRESS IS NOT, and they need different steps.
// Kobalte's `step` governs both, so it gets the fine one — `dragStep`, the
// smallest unit the domain can express — and the arrow keys are intercepted in
// the capture phase and moved by `keyStep` instead. Handing Kobalte a keyboard
// -sized step made the thumb jump between rungs under the pointer (Peter,
// 2026-09-16: "they appear to snap to things").
//
// THE RANGE IS THE CLAMP. Both values are pulled onto the allowed range before
// they are drawn, the thumb announces the CLAMPED figure, and `onChange` never
// emits outside it — so the thumb stops dead at an edge. Kobalte's own
// min/max are the DOMAIN, which is what keeps the track's inset fixed and this
// component free of per-instance inline styles.
//
// Everything positional lives in geometry.ts, which is pure and prints as a
// table (geometry.test.ts).
// ============================================
import { Slider as KobalteSlider } from "@kobalte/core/slider";
import {
  type Component,
  type JSX,
  Show,
  mergeProps,
  onCleanup,
  onMount,
} from "solid-js";
import { observeSize } from "../../internal/dom/observeSize";
import {
  BAND_HALF,
  CHANGE_HALF,
  DELTA_X,
  type DialGeometry,
  type Domain,
  TRACK_X,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  dialGeometry,
  dragStep,
  niceStep,
  settle,
  trackPath,
} from "./geometry";
import "./MarkedSlider.css";

/** Which way each arrow key moves the value. */
const ARROW_DIRECTION: Record<string, number> = {
  ArrowUp: 1,
  ArrowRight: 1,
  ArrowDown: -1,
  ArrowLeft: -1,
};

/** Which way each page key moves it. */
const PAGE_DIRECTION: Record<string, number> = {
  PageUp: 1,
  PageDown: -1,
};

/** A page key, and Shift+arrow, move ten arrow steps. */
const PAGE_MULTIPLE = 10;

/**
 * The placeholder the delta slot carries when there is no delta to name.
 *
 * A non-breaking space, not an empty string: the node is always rendered so
 * every slider has the same shape in every state.
 */
const NBSP = " ";

/**
 * One slider's painted marks, drawn back to front: the scale, the allowed
 * range, the coloured change, then the two arrowheads on top of all of it.
 *
 * The overlay is `aria-hidden`: every mark on it restates something the thumb
 * already announces through `aria-valuenow`, so putting the drawing in the
 * accessibility tree would say each value twice.
 */
const Marks: Component<{
  dial: DialGeometry;
  /** The signed delta, already formatted, or `null` when there is none. */
  deltaLabel: string | null;
  /** The drawn height in px — the viewBox is 1:1 with it. */
  height: number;
}> = (props) => (
  <svg
    class="sui-marked-slider__marks"
    // The viewBox grows with the BOX rather than the box stretching a fixed
    // viewBox. `preserveAspectRatio="none"` scales TEXT as well as geometry,
    // so a stretched viewBox would magnify the 11px delta labels vertically
    // into something distorted and unreadable. Keeping the two 1:1 means the
    // track lengthens while every label and arrowhead stays the size it was.
    viewBox={`0 0 ${VIEW_WIDTH} ${props.height}`}
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    <path class="sui-marked-slider__track-line" d={trackPath(props.height)} />
    {/* The allowed range, under everything: it is the span the value is
        permitted, not a mark that hides the scale it sits on. */}
    <rect
      class="sui-marked-slider__band"
      x={TRACK_X - BAND_HALF}
      y={props.dial.band.y}
      width={BAND_HALF * 2}
      height={props.dial.band.height}
    />
    <Show when={props.dial.changeLine}>
      {(line) => (
        <rect
          class="sui-marked-slider__change"
          classList={{
            [`sui-marked-slider__change--${props.dial.changeTone}`]: true,
          }}
          x={TRACK_X - CHANGE_HALF}
          y={line().y}
          width={CHANGE_HALF * 2}
          height={line().height}
        />
      )}
    </Show>
    {/* No PRIOR value means no prior arrow to draw — not one parked at the
        range floor, which would point at a figure that was never true. */}
    <Show when={props.dial.priorArrow}>
      {(arrow) => <path class="sui-marked-slider__arrow--prior" d={arrow()} />}
    </Show>
    <Show when={props.dial.futureArrow}>
      {(arrow) => <path class="sui-marked-slider__arrow--future" d={arrow()} />}
    </Show>
    {/* The figure, level with the middle of the line it names. It is SVG text
        rather than a DOM node because its y is decided by the data, and a DOM
        node would need an inline style to sit there. */}
    {/* ALWAYS RENDERED, hidden when there is nothing to name. It carries no
        `aria-hidden` of its own: the whole overlay above is already
        `aria-hidden`, so repeating it here said nothing and tripped
        `noAriaHiddenOnFocusable`, which reads an SVG `<text>` as focusable.
        An SVG text node cannot shift its siblings, but keeping the node means
        every slider has the same shape in every state — which is what the
        no-shift tests assert, and what stops a future edit reintroducing a
        conditional row somewhere it DOES matter. */}
    <text
      class="sui-marked-slider__delta"
      classList={{
        [`sui-marked-slider__delta--${props.dial.changeTone}`]: true,
        "sui-marked-slider__reserved": props.deltaLabel === null,
      }}
      x={DELTA_X}
      y={props.dial.deltaY ?? 0}
    >
      {props.deltaLabel ?? NBSP}
    </text>
  </svg>
);

export interface MarkedSliderProps {
  /** The `[min, max]` the TRACK runs — the whole scale, in caller units. */
  domain: Domain;
  /** The `[min, max]` the VALUE is allowed: the shaded box, and the clamp. */
  range: Domain;
  /** The draggable value, or `null` for a slider with none — no thumb. */
  value: number | null;
  /** The value to compare against, drawn as a muted mark, or `null`. */
  prior: number | null;
  /** The height to draw at, in px. Defaults to the canvas's own 260. */
  height?: number;
  /** Round every emitted value onto a grid of this size. */
  snap?: number;
  /** What a POINTER drag moves by. Derived from the domain when omitted. */
  dragStep?: number;
  /** What one ARROW KEY moves by; ten for a page key. Derived when omitted. */
  keyStep?: number;
  /**
   * The signed change beside the change line, ALREADY FORMATTED by the caller
   * — this component never formats a number, because the unit is not its
   * business. `null` or omitted draws nothing and holds the space.
   */
  deltaLabel?: string | null;
  /** The thumb's accessible name. */
  label: string;
  /**
   * What a screen reader announces as the value. Without it Kobalte reads a
   * percentage of the domain's top, which is wrong for any domain that does
   * not start at zero.
   */
  valueText?: string;
  /** Draws the selected ring. The caller decides what selection means. */
  active?: boolean;
  /** Every intermediate value of a drag, and every key step. Clamped. */
  onChange?: (value: number) => void;
  /** Once per COMMITTED gesture — pointer release, or one key step. Clamped. */
  onChangeEnd?: (value: number) => void;
  /** The box was measured. Fires on mount and on every resize. */
  onMeasure?: (height: number) => void;
  class?: string;
}

/**
 * What a curried variant locks: `snap`, which values the caller's scale admits
 * at all. Everything else is data — the domain, the range, the two values and
 * the callbacks — or a measurement.
 */
export type MarkedSliderOverrides = Pick<MarkedSliderProps, "snap">;

/** What a curried variant exposes: everything except the curried overrides. */
export type MarkedSliderDataProps = Omit<
  MarkedSliderProps,
  keyof MarkedSliderOverrides
>;

/**
 * A vertical slider with an allowed-range box, a prior mark and a signed
 * delta.
 *
 * @example
 *   <MarkedSlider
 *     domain={[0, 200]}
 *     range={[40, 60]}
 *     prior={44}
 *     value={52}
 *     label="Ana"
 *     deltaLabel="+8"
 *     onChange={setValue}
 *   />
 */
export const MarkedSlider: Component<MarkedSliderProps> = (props) => {
  const height = (): number => props.height ?? VIEW_HEIGHT;

  /**
   * The marks, from the pure geometry.
   *
   * `dialGeometry` reads a value, a prior value and a range off one object, so
   * the props are gathered into that shape here. The `id` it also carries is
   * for a CALLER's table of marks (`mutationGeometry`) and nothing this
   * component draws depends on it.
   */
  const dial = (): DialGeometry =>
    dialGeometry(
      props.domain,
      {
        id: "",
        label: props.label,
        old: props.prior,
        value: props.value,
        range: props.range,
      },
      height(),
    );

  const drag = (): number => props.dragStep ?? dragStep(props.domain);
  const key = (): number => props.keyStep ?? niceStep(props.domain);

  /**
   * Arrow and page keys, intercepted in the CAPTURE phase.
   *
   * Kobalte's own thumb handler steps by its `step`, which is the DRAG unit —
   * one unit on a wide scale, which no keyboard user wants. Its handler runs
   * unconditionally and does not check `defaultPrevented`, so the only way to
   * replace it is to stop the event before it arrives: a capture listener here
   * fires ahead of Solid's delegated one, and `stopPropagation` there means
   * Kobalte never sees the key at all.
   *
   * Home and End are deliberately left to Kobalte: they run to the domain's
   * ends, and `settle` pulls them onto the allowed range on the way out.
   */
  const bind = (el: HTMLElement): void => {
    // FIRST MEASUREMENT, SYNCHRONOUSLY, on mount.
    //
    // The ref runs before the element is in the document, so `clientHeight`
    // here is 0 and the slider would paint its first frame at the fallback
    // height while the box is already tall. That frame is not cosmetic: the
    // drawn track and Kobalte's track element only line up when the viewBox
    // height EQUALS the pixel height, so until the measurement lands a
    // pointer maps over one extent while the reader aims at another — which is
    // exactly "my mouse appears to be changing proportionate to the whole
    // slider rather than dragging the handle".
    //
    // `onMount` + `getBoundingClientRect` forces layout and returns the real
    // height with NO animation frame in between. That also makes the drawing
    // correct in a hidden tab, where the browser suspends rAF and
    // `observeSize`'s deferred delivery never runs.
    onMount(() => {
      const measured = el.getBoundingClientRect().height;
      // A ZERO height is no information, not a measurement. Reporting it would
      // CLOBBER a real size the observer had already delivered, which is
      // exactly what happens under jsdom, where nothing lays out and every
      // rect is zero.
      if (measured > 0) props.onMeasure?.(measured);
    });
    onCleanup(observeSize(el, (size) => props.onMeasure?.(size.height)));

    const onKeyDown = (event: KeyboardEvent): void => {
      const direction = ARROW_DIRECTION[event.key] ?? 0;
      const paging = PAGE_DIRECTION[event.key] ?? 0;
      if (direction === 0 && paging === 0) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      event.preventDefault();
      event.stopPropagation();

      const current = dial();
      if (current.removed) return;
      // Shift+arrow pages, the way it does in Kobalte's own handler.
      const magnitude =
        paging !== 0 || event.shiftKey ? key() * PAGE_MULTIPLE : key();
      const sign = paging !== 0 ? paging : direction;
      const from = current.clampedValue ?? current.range[0];
      const next = settle(current.range, from + sign * magnitude, props.snap);
      // Each step IS a completed gesture for the keyboard, so it commits
      // immediately rather than on keyup: a held arrow key repeats keydown
      // without an intervening keyup, so waiting for one would commit once at
      // the END of a long press instead of once per step.
      if (next !== current.clampedValue) {
        props.onChange?.(next);
        props.onChangeEnd?.(next);
      }
    };
    el.addEventListener("keydown", onKeyDown, true);
    onCleanup(() => el.removeEventListener("keydown", onKeyDown, true));
  };

  /**
   * Kobalte models every slider as multi-thumb. This one is single-thumb by
   * contract, so the array is an implementation detail the consumer never
   * sees: one value in, `values[0]` out.
   *
   * `settle`, not a bare clamp: the grid is this component's promise too, not
   * only Kobalte's. Kobalte snaps to its OWN min-relative grid, which is not
   * the same grid when a range floor is not a multiple of `snap`.
   */
  const emit = (values: number[], commit: boolean): void => {
    const next = settle(dial().range, values[0], props.snap);
    // A COMMIT emits only `onChangeEnd`: Kobalte has already sent the same
    // value through its `onChange`, and emitting it twice would make every
    // released drag look like one extra move.
    if (commit) props.onChangeEnd?.(next);
    else props.onChange?.(next);
  };

  return (
    <KobalteSlider
      ref={bind}
      class={`sui-marked-slider${props.class ? ` ${props.class}` : ""}`}
      classList={{ "sui-marked-slider--active": props.active }}
      orientation="vertical"
      value={[dial().clampedValue ?? dial().range[0]]}
      onChange={(values) => emit(values, false)}
      onChangeEnd={(values) => emit(values, true)}
      minValue={props.domain[0]}
      maxValue={props.domain[1]}
      step={drag()}
      disabled={dial().removed}
      data-removed={dial().removed ? "" : undefined}
      getValueLabel={() => props.valueText ?? String(dial().clampedValue ?? "")}
    >
      <Marks
        dial={dial()}
        deltaLabel={props.deltaLabel ?? null}
        height={height()}
      />
      <KobalteSlider.Track class="sui-marked-slider__track">
        <Show when={!dial().removed}>
          <KobalteSlider.Thumb
            class="sui-marked-slider__thumb"
            aria-label={props.label}
            // The allowed RANGE is what a reader can reach, so the range is
            // what the thumb announces — Kobalte would otherwise read out the
            // whole domain, which is the track's extent rather than this
            // slider's.
            aria-valuemin={dial().range[0]}
            aria-valuemax={dial().range[1]}
            // Kobalte's own `aria-valuetext` comes from its internal number
            // formatter, NOT from `getValueLabel` — that only feeds its
            // ValueLabel, which this slider does not draw.
            aria-valuetext={props.valueText}
          >
            <KobalteSlider.Input />
          </KobalteSlider.Thumb>
        </Show>
      </KobalteSlider.Track>
    </KobalteSlider>
  );
};

/**
 * Curry a slider: lock the grid once, and the call site is left with the
 * scale, the values and the callbacks.
 *
 * @example
 *   const ThousandsSlider = createMarkedSlider({ snap: 1_000 });
 */
export function createMarkedSlider(
  defaults: Partial<MarkedSliderOverrides>,
): Component<MarkedSliderDataProps> {
  return (props): JSX.Element => (
    <MarkedSlider {...mergeProps(defaults, props)} />
  );
}
