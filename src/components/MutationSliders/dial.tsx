// ============================================
// MutationDial — ONE dial. Private to MutationSliders (Depth 2).
//
// Lowercase filename ON PURPOSE, the same disposition as geometry.ts and
// BandRail/bands.tsx: `isEntryPath` in scripts/render-coverage.mjs matches any
// PascalCase `.tsx` under src/components/, so a `MutationDial.tsx` here would
// register as a published component owing its own showcase, its own catalog
// entry and its own COMPONENTS.md section. Nobody has asked for a standalone
// dial yet (SUI: start minimal, expand on demand), so the seam is real and the
// export is not. Promoting it later is one rename and a showcase.
//
// WHAT THIS OWNS: one entity's column — the name button, the Kobalte slider
// root, the SVG overlay of marks, the two readouts and the one footer slot. It
// measures its own height and intercepts its own arrow keys.
//
// WHAT IT DOES NOT OWN: the row. Paging, selection, pinning and the shared
// domain all belong to the composite, because each of them is a fact about the
// OTHER dials. This component is told whether it is selected; it never decides
// that, and it never sees its siblings.
//
// THE MOVE SEAM. A dial reports where its thumb WENT, in three phases, and the
// composite decides what that means for the row:
//
//   • `drag`   — an intermediate value under the pointer. Cheap listeners only.
//   • `commit` — the pointer was released. The expensive one.
//   • `step`   — one arrow key, which is a whole gesture on its own.
//
// Reporting the phase rather than calling two callbacks keeps the pin fan-out
// in ONE place: a pinned dial must move its peers instead of itself, and that
// decision cannot be made here without this component knowing the row.
//
// Composes Layout (TightCenteredColumn) + Text (MonoMeta, MonoValue,
// NowrapLabel) + Button (SmallGhostButton) + Icon, over Kobalte's slider root.
// The CSS it shares with the row (MutationSliders.css) is the dial's own
// interior geometry — a fixed canvas, an SVG overlay and a percentage-placed
// thumb — which is data-driven placement rather than an arrangement
// vocabulary, and is the deliberate Depth-2 CSS exception noted there.
// ============================================
import { Slider as KobalteSlider } from "@kobalte/core/slider";
import { type Component, type JSX, Show, onCleanup, onMount } from "solid-js";
import { observeSize } from "../../internal/dom/observeSize";
import { SmallGhostButton } from "../Button";
import { Icon } from "../Icon";
import { TightCenteredColumn } from "../Layout";
import { MonoMeta, MonoValue, NowrapLabel } from "../Text";
import type { ResolvedLabels } from "./labels";
import {
  BAND_HALF,
  CHANGE_HALF,
  DELTA_X,
  type DialGeometry,
  type Domain,
  type Entity,
  TRACK_X,
  VIEW_WIDTH,
  deltaLabelOf,
  dialGeometry,
  settle,
  trackPath,
} from "./geometry";

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
 * The placeholder an empty text slot carries.
 *
 * A non-breaking space, not an empty string: an empty inline box collapses to
 * zero height and takes the row with it, which is the shift this exists to
 * prevent. The `--reserved` class hides it; the character keeps the line.
 */
const NBSP = "\u00a0";

/** The removed entity's readout: there is no future amount to print. */
const NO_VALUE = "—";

/**
 * The remove affordance. Peter's sketch draws a circled cross, and this is
 * that character rather than an `Icon`: the closest glyph in the set is
 * `error`, whose NAME would misdescribe the action everywhere it was read.
 * Restore beside it IS an Icon (`undo`), because one exists that means it.
 */
const REMOVE_MARK = "⊗";

/** Which gesture produced a value, and therefore what it costs to honour. */
export type MovePhase = "drag" | "commit" | "step";

/**
 * One dial's painted marks, drawn back to front: the scale, the allowed range,
 * the coloured change, then the two arrowheads on top of all of it.
 *
 * The overlay is `aria-hidden`: every mark on it restates something the thumb
 * already announces through `aria-valuenow` and the readout prints in words, so
 * putting the drawing in the accessibility tree would say each amount twice.
 */
const DialMarks: Component<{
  dial: DialGeometry;
  /** The signed delta, already formatted, or `null` when there is none. */
  deltaLabel: string | null;
  /** The dial's drawn height in px — the viewBox is 1:1 with it. */
  height: number;
}> = (props) => (
  <svg
    class="sui-mutation-sliders__marks"
    // The viewBox grows with the BOX rather than the box stretching a fixed
    // viewBox. `preserveAspectRatio="none"` scales TEXT as well as geometry,
    // so a stretched viewBox would magnify the 11px delta labels vertically
    // into something distorted and unreadable. Keeping the two 1:1 means the
    // track lengthens while every label and arrowhead stays the size it was.
    viewBox={`0 0 ${VIEW_WIDTH} ${props.height}`}
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    <path
      class="sui-mutation-sliders__track-line"
      d={trackPath(props.height)}
    />
    {/* The allowed range, under everything: it is the span the entity is
        permitted, not a mark that hides the scale it sits on. */}
    <rect
      class="sui-mutation-sliders__band"
      x={TRACK_X - BAND_HALF}
      y={props.dial.band.y}
      width={BAND_HALF * 2}
      height={props.dial.band.height}
    />
    <Show when={props.dial.changeLine}>
      {(line) => (
        <rect
          class="sui-mutation-sliders__change"
          classList={{
            [`sui-mutation-sliders__change--${props.dial.changeTone}`]: true,
          }}
          x={TRACK_X - CHANGE_HALF}
          y={line().y}
          width={CHANGE_HALF * 2}
          height={line().height}
        />
      )}
    </Show>
    {/* A NEW entity has no prior amount, so there is no prior arrow to draw —
        not one parked at the range floor, which would point at a figure that
        was never true. */}
    <Show when={props.dial.priorArrow}>
      {(arrow) => (
        <path class="sui-mutation-sliders__arrow--prior" d={arrow()} />
      )}
    </Show>
    <Show when={props.dial.futureArrow}>
      {(arrow) => (
        <path class="sui-mutation-sliders__arrow--future" d={arrow()} />
      )}
    </Show>
    {/* The figure, level with the middle of the line it names. It is SVG text
        rather than a DOM node because its y is decided by the data, and a DOM
        node would need an inline style to sit there. */}
    {/* ALWAYS RENDERED, hidden when there is nothing to name. It carries no
        `aria-hidden` of its own: the whole overlay above is already
        `aria-hidden`, so repeating it here said nothing and tripped
        `noAriaHiddenOnFocusable`, which reads an SVG `<text>` as focusable.
        Deleting the redundant attribute is a better answer than suppressing
        the rule. An SVG text node
        cannot shift its siblings, but keeping the node means every dial has
        the same shape in every state — which is what the no-shift tests
        assert, and what stops a future edit reintroducing a conditional row
        somewhere it DOES matter. */}
    <text
      class="sui-mutation-sliders__delta"
      classList={{
        [`sui-mutation-sliders__delta--${props.dial.changeTone}`]: true,
        "sui-mutation-sliders__reserved": props.deltaLabel === null,
      }}
      x={DELTA_X}
      y={props.dial.deltaY ?? 0}
    >
      {props.deltaLabel ?? NBSP}
    </text>
  </svg>
);

export interface MutationDialProps {
  /** The entity this dial draws. */
  entity: Entity;
  /** The shared track every dial in the row is on. */
  domain: Domain;
  /** The height to draw at, in px — already floored by the row. */
  height: number;
  /** The consumer's unit. */
  format: (value: number) => string;
  /** Every word the dial says on the consumer's behalf, already resolved. */
  labels: ResolvedLabels;
  /** The grid emitted values land on, or `undefined` for a continuous drag. */
  snap?: number;
  /** What a POINTER drag moves by — Kobalte's own `step`. */
  dragStep: number;
  /** What one ARROW KEY moves by. Ten of these for a page key. */
  keyStep: number;
  /** Whether the name reads as selected. */
  selected: boolean;
  /** The name was clicked. */
  onSelect: () => void;
  /** The dial's box was measured — every dial in a row shares one height. */
  onMeasure: (height: number) => void;
  /** The thumb reached `value` by `phase`. Already settled onto range + grid. */
  onMove: (value: number, phase: MovePhase) => void;
  /** The footer's action on a present entity. Omitted, no ⊗ is drawn. */
  onRemove?: () => void;
  /** The footer's action on a removed entity. Omitted, no ↺ is drawn. */
  onRestore?: () => void;
}

/**
 * One entity's column: its name, its dial, its two readouts and its one footer
 * slot.
 */
export const MutationDial: Component<MutationDialProps> = (props) => {
  const dial = (): DialGeometry =>
    dialGeometry(props.domain, props.entity, props.height);

  /** The required line: what this entity will be. */
  const futureReadout = (): string => {
    const value = dial().clampedValue;
    return value === null ? NO_VALUE : props.format(value);
  };

  /**
   * The muted line beneath it: where it came from — and ONLY that, so the
   * future amount is not printed twice.
   *
   * Empty when there is nothing to say: a new entity has no prior amount (it
   * says the consumer's `labels.new` instead), and an entity that did not move
   * has a prior amount identical to the line above.
   */
  const priorReadout = (): string => {
    const current = dial();
    if (current.isNew) return props.labels.new;
    if (current.clampedOld === null) return "";
    if (current.clampedOld === current.clampedValue) return "";
    return `was ${props.format(current.clampedOld)}`;
  };

  /**
   * What the one footer slot does right now, or `null` when the consumer has
   * given it nothing to do.
   *
   * Resolved in ONE place so the label, the glyph, the disabled state and the
   * click can never disagree about which state the button is in — the failure
   * that shape prevents is a ⊗ that says Remove and calls restore.
   */
  const footer = (): {
    label: string;
    glyph: JSX.Element;
    act: () => void;
  } | null => {
    if (dial().removed) {
      const onRestore = props.onRestore;
      return onRestore
        ? {
            label: `${props.labels.restore} ${props.entity.label}`,
            glyph: <Icon name="undo" size="sm" />,
            act: onRestore,
          }
        : null;
    }
    const onRemove = props.onRemove;
    return onRemove
      ? {
          label: `${props.labels.remove} ${props.entity.label}`,
          glyph: REMOVE_MARK,
          act: onRemove,
        }
      : null;
  };

  /**
   * Arrow and page keys, intercepted in the CAPTURE phase.
   *
   * Kobalte's own thumb handler steps by its `step`, which is the DRAG unit —
   * one unit on a wide scale, which no keyboard user wants. Its handler runs
   * unconditionally and does not check `defaultPrevented`, so the only way to
   * replace it is to stop the event before it arrives: a capture listener on
   * the dial fires ahead of Solid's delegated one, and `stopPropagation` there
   * means Kobalte never sees the key at all.
   *
   * Home and End are deliberately left to Kobalte: they run to the domain's
   * ends, and the move handler settles them onto the allowed range.
   */
  const bindDial = (el: HTMLElement): void => {
    // FIRST MEASUREMENT, SYNCHRONOUSLY, on mount.
    //
    // The ref runs before the element is in the document, so `clientHeight`
    // here is 0 and the dial would paint its first frame at the fallback
    // height while the box is already tall. That frame is not cosmetic: the
    // drawn track and Kobalte's track element only line up when the viewBox
    // height EQUALS the dial's pixel height, so until the measurement lands, a
    // pointer maps over one extent while the reader aims at another — which is
    // exactly "my mouse appears to be changing proportionate to the whole
    // slider rather than dragging the handle".
    //
    // `onMount` + `getBoundingClientRect` forces layout and returns the real
    // height with NO animation frame in between. That also makes the dial
    // correct in a hidden tab, where the browser suspends rAF and
    // `observeSize`'s deferred delivery never runs.
    onMount(() => {
      const measured = el.getBoundingClientRect().height;
      // A ZERO height is no information, not a measurement — the same rule the
      // row's signal uses. Writing it would CLOBBER a real size the observer
      // had already delivered, which is exactly what happens under jsdom,
      // where nothing lays out and every rect is zero.
      if (measured > 0) props.onMeasure(measured);
    });
    onCleanup(observeSize(el, (size) => props.onMeasure(size.height)));

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
        paging !== 0 || event.shiftKey
          ? props.keyStep * PAGE_MULTIPLE
          : props.keyStep;
      const sign = paging !== 0 ? paging : direction;
      const from = current.clampedValue ?? current.range[0];
      const next = settle(current.range, from + sign * magnitude, props.snap);
      // Each step IS a completed gesture for the keyboard, so it commits
      // immediately rather than on keyup: a held arrow key repeats keydown
      // without an intervening keyup, so waiting for one would commit once at
      // the END of a long press instead of once per step.
      if (next !== current.clampedValue) props.onMove(next, "step");
    };
    el.addEventListener("keydown", onKeyDown, true);
    onCleanup(() => el.removeEventListener("keydown", onKeyDown, true));
  };

  /**
   * Kobalte models every slider as multi-thumb. This dial is single-thumb by
   * contract, so the array is an implementation detail the consumer never
   * sees: one value in, `values[0]` out.
   *
   * `settle`, not a bare clamp: the grid is this component's promise too, not
   * only Kobalte's. Kobalte snaps to its OWN min-relative grid, which is not
   * the same grid when a range floor is not a multiple of `snap`.
   */
  const report = (values: number[], phase: MovePhase): void => {
    props.onMove(settle(dial().range, values[0], props.snap), phase);
  };

  return (
    <TightCenteredColumn>
      {/* The name is the SELECT control. A real <button>, so Tab and Enter
          work without this component inventing key handling, and
          `aria-pressed` because it is a toggle rather than a command — a
          screen reader then says "Adlai, pressed" instead of leaving the state
          to the colour. */}
      <button
        type="button"
        class="sui-mutation-sliders__name"
        classList={{
          "sui-mutation-sliders__name--removed": dial().removed,
          "sui-mutation-sliders__name--selected": props.selected,
        }}
        aria-pressed={props.selected}
        onClick={() => props.onSelect()}
      >
        <NowrapLabel>{props.entity.label}</NowrapLabel>
      </button>
      <KobalteSlider
        ref={bindDial}
        class="sui-mutation-sliders__dial"
        classList={{
          "sui-mutation-sliders__dial--selected": props.selected,
        }}
        orientation="vertical"
        value={[dial().clampedValue ?? dial().range[0]]}
        onChange={(values) => report(values, "drag")}
        onChangeEnd={(values) => report(values, "commit")}
        minValue={props.domain[0]}
        maxValue={props.domain[1]}
        // THE CLAMP IS NOT HERE. Kobalte's own min/max are the DOMAIN, which
        // is what keeps the track's inset fixed and this component free of
        // per-entity inline styles — so the allowed range is enforced on the
        // way OUT, in `settle`. The component is controlled, so an emitted
        // value that the caller writes straight back leaves the thumb parked
        // on the range edge, which is the "stops dead at the edge" behaviour.
        step={props.dragStep}
        disabled={dial().removed}
        data-removed={dial().removed ? "" : undefined}
        getValueLabel={(params) => props.format(params.values[0])}
      >
        <DialMarks
          dial={dial()}
          deltaLabel={deltaLabelOf(props.format, dial().delta)}
          height={props.height}
        />
        <KobalteSlider.Track class="sui-mutation-sliders__track">
          <Show when={!dial().removed}>
            <KobalteSlider.Thumb
              class="sui-mutation-sliders__thumb"
              aria-label={props.entity.label}
              // The allowed RANGE is what a reader can reach, so the range is
              // what the thumb announces — Kobalte would otherwise read out
              // the shared domain, which is the track's extent rather than
              // this entity's.
              aria-valuemin={dial().range[0]}
              aria-valuemax={dial().range[1]}
              // Kobalte's own `aria-valuetext` comes from its internal number
              // formatter, NOT from `getValueLabel` — that only feeds its
              // ValueLabel, which this dial does not draw.
              aria-valuetext={futureReadout()}
            >
              <KobalteSlider.Input />
            </KobalteSlider.Thumb>
          </Show>
        </KobalteSlider.Track>
      </KobalteSlider>
      {/* The required line, then where it came from — if anywhere. The second
          line is ALWAYS RENDERED and merely hidden when it has nothing to say
          (Peter, 2026-09-16: "elements that become invisible but don't hold
          their space ... the control moves around when you change it").
          Dragging a value onto its prior amount used to delete this row, which
          jumped the big figure and the button up under the pointer
          mid-gesture. */}
      <MonoValue class="sui-mutation-sliders__figure">
        {futureReadout()}
      </MonoValue>
      <MonoMeta
        class={`sui-mutation-sliders__prior${
          priorReadout() === "" ? " sui-mutation-sliders__reserved" : ""
        }`}
      >
        {priorReadout() || NBSP}
      </MonoMeta>
      {/* ONE slot, three states. A present entity offers ⊗ Remove; a removed
          one offers ↺ Restore in the same place; and where the consumer
          supplies neither callback the button still holds its space, hidden. A
          disabled ⊗ was the wrong shape: it said "you did this and there is
          nothing more to do", when what the reader wants is the way back. */}
      <SmallGhostButton
        class={`sui-mutation-sliders__footer${
          footer() ? "" : " sui-mutation-sliders__reserved"
        }`}
        aria-label={footer()?.label}
        aria-hidden={footer() ? undefined : "true"}
        disabled={!footer()}
        onClick={() => footer()?.act()}
      >
        {footer()?.glyph ?? REMOVE_MARK}
      </SmallGhostButton>
    </TightCenteredColumn>
  );
};
