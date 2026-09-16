// ============================================
// MutationSliders — Composite (Depth 2)
// Owns CSS (MutationSliders.css). Composes Layout (ClusterRow,
// TightCenteredColumn) + Text (NowrapLabel, MonoMeta) + Button
// (SmallGhostButton). Kobalte-backed (@kobalte/core/slider), matching the
// Slider / Combobox / Select / Toast wrapping pattern.
//
// A row of VERTICAL dials, one per named entity, each answering one question:
// where was this entity, where is it now, and how big is the move? The old
// level is a fixed TICK, the new level is the draggable THUMB, a translucent
// BOX spans the two so the size of the change reads at a glance, and an
// ARROWHEAD on the thumb carries the sign.
//
// A removed entity is `value: null` — NOT a fall to the bottom of the domain.
// Its name is struck through, its dial keeps the track and the old tick and
// loses the thumb, and a ⊗ under it says so a second time for anyone who
// cannot see the strike. Reading a removal as a drop would draw a change that
// never happened, which is why the null is in the type rather than a sentinel
// number the caller has to remember.
//
// It reuses Kobalte's slider root rather than reinventing the drag: keyboard
// stepping, pointer capture, `role="slider"` and the aria value triple all
// come from there, with `orientation="vertical"` doing the rest. The one thing
// Kobalte's own Fill cannot express is the box — Fill runs min→value, and this
// bar runs old→new — so the box, the tick, the track line and the arrowhead
// are drawn in a single SVG overlay lying exactly on the dial.
//
// Everything positional lives in geometry.ts, which is pure and prints as a
// table (geometry.test.ts). This file only paints what that returns: there is
// nowhere in this module for a number to be decided.
//
// The values are in the CONSUMER'S OWN UNITS. The component runs no arithmetic
// on them beyond Kobalte's step snapping and formats nothing itself — `format`
// is the caller's, exactly as on Slider.
//
// LAYOUT PURITY — the ROW, each entity's COLUMN and the readout are composed
// from Layout and Text variants. The only geometry this component owns is the
// dial's own interior: a fixed canvas with an SVG overlay and a percentage-
// placed thumb, which is data-driven placement rather than an arrangement
// vocabulary — the same disposition as Slider's notches.
//
// No override props and no factory: `entities`, `domain`, `onChange`,
// `onRemove`, `onAdd` and `format` are all DATA. There is no size, no variant
// and no tone to curry. The box and the arrowhead are painted in `--sui-accent`
// ONLY: the arrowhead already carries the direction, so tinting the box by
// direction as well would be a second, redundant encoding — and a hue-only
// one, which is what `src/themes/colorblind.css` exists to avoid.
// ============================================
import { Slider as KobalteSlider } from "@kobalte/core/slider";
import { type Component, Index, Show } from "solid-js";
import { SmallGhostButton } from "../Button";
import { ClusterRow, TightCenteredColumn } from "../Layout";
import { MonoMeta, NowrapLabel } from "../Text";
import {
  BOX_HALF,
  type DialGeometry,
  type Domain,
  type Entity,
  OLD_TICK_HALF,
  TRACK_PATH,
  TRACK_X,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  dialGeometry,
} from "./geometry";
import "./MutationSliders.css";

export type { Domain, Entity } from "./geometry";

export interface MutationSlidersProps {
  /** One dial per entity, drawn in the order given — that order is the reading order. */
  entities: readonly Entity[];
  /** The shared `[min, max]` every dial maps onto, in the consumer's own units. */
  domain: Domain;
  /** Called when a drag or a thumb-moving key changes one entity's new level. */
  onChange: (id: string, value: number) => void;
  /**
   * Called when the ⊗ under a dial is pressed. Omitted, no ⊗ is drawn at all
   * and a removed entity still reads as removed by its struck-through name.
   */
  onRemove?: (id: string) => void;
  /** Called by the `+` at the end of the row. Omitted, no `+` is drawn. */
  onAdd?: () => void;
  /**
   * Renders the readout under each dial, and the `aria-valuetext` a screen
   * reader announces. Default `String`.
   *
   * Without it Kobalte reads the value as a percentage of the domain's top,
   * which is wrong for any domain that does not start at zero.
   */
  format?: (value: number) => string;
}

/** Arrow keys and drags move by one unit of the consumer's domain. */
const STEP = 1;

/** The removed entity's readout, and the missing half of a `format` pair. */
const NO_VALUE = "—";

/** The remove affordance. The sketch's own notation, kept verbatim. */
const REMOVE_MARK = "⊗";

/**
 * One dial: the painted marks, then the drag surface over them.
 *
 * The overlay is `aria-hidden`: every mark on it restates something the thumb
 * already announces through `aria-valuenow` and the readout prints in words, so
 * putting the drawing in the accessibility tree would say each value twice.
 */
const DialMarks: Component<{ dial: DialGeometry }> = (props) => (
  <svg
    class="sui-mutation-sliders__marks"
    viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    <path class="sui-mutation-sliders__track-line" d={TRACK_PATH} />
    {/* The box sits UNDER the ticks: it is the span between two marks, not a
        third mark that hides them. */}
    <Show when={props.dial.box}>
      {(box) => (
        <rect
          class="sui-mutation-sliders__box"
          x={TRACK_X - BOX_HALF}
          y={box().y}
          width={BOX_HALF * 2}
          height={box().height}
        />
      )}
    </Show>
    <line
      class="sui-mutation-sliders__old-tick"
      x1={TRACK_X - OLD_TICK_HALF}
      x2={TRACK_X + OLD_TICK_HALF}
      y1={props.dial.oldY}
      y2={props.dial.oldY}
    />
    <Show when={props.dial.arrow}>
      {(arrow) => <path class="sui-mutation-sliders__arrow" d={arrow()} />}
    </Show>
  </svg>
);

/**
 * A row of old-vs-new dials, one per named entity.
 *
 * @example
 *   <MutationSliders
 *     entities={people()}
 *     domain={[0, 10]}
 *     onChange={(id, value) => setLevel(id, value)}
 *     onRemove={(id) => setLevel(id, null)}
 *     onAdd={addPerson}
 *     format={(n) => `L${n}`}
 *   />
 */
export const MutationSliders: Component<MutationSlidersProps> = (props) => {
  const format = (value: number): string => (props.format ?? String)(value);

  const readout = (dial: DialGeometry): string =>
    `${format(dial.old)} → ${dial.value === null ? NO_VALUE : format(dial.value)}`;

  return (
    <ClusterRow class="sui-mutation-sliders">
      {/* `Index`, not `For`. The row is POSITIONAL and its entities change
          value in place, so keying by item identity would replace the whole
          column — and the thumb's DOM node with it — on every step of a drag,
          which drops the pointer capture mid-gesture. Keying by position keeps
          each dial's node and updates only what it draws. */}
      <Index each={props.entities}>
        {(entity) => {
          const dial = (): DialGeometry => dialGeometry(props.domain, entity());
          // Kobalte models every slider as multi-thumb. This dial is
          // single-thumb by contract, so the array is an implementation detail
          // the consumer never sees: one value in, `values[0]` out. A removed
          // entity parks the root at the domain's floor and draws no thumb, so
          // nothing reads that number.
          const handleChange = (values: number[]): void =>
            props.onChange(entity().id, values[0]);

          return (
            <TightCenteredColumn>
              <NowrapLabel
                class={
                  dial().removed
                    ? "sui-mutation-sliders__name--removed"
                    : undefined
                }
              >
                {entity().label}
              </NowrapLabel>
              <KobalteSlider
                class="sui-mutation-sliders__dial"
                orientation="vertical"
                value={[entity().value ?? props.domain[0]]}
                onChange={handleChange}
                minValue={props.domain[0]}
                maxValue={props.domain[1]}
                step={STEP}
                disabled={dial().removed}
                data-removed={dial().removed ? "" : undefined}
                getValueLabel={(params) => format(params.values[0])}
              >
                <DialMarks dial={dial()} />
                <KobalteSlider.Track class="sui-mutation-sliders__track">
                  <Show when={!dial().removed}>
                    <KobalteSlider.Thumb
                      class="sui-mutation-sliders__thumb"
                      aria-label={entity().label}
                      // Kobalte's own `aria-valuetext` comes from its internal
                      // number formatter, NOT from `getValueLabel` — that only
                      // feeds its ValueLabel, which this dial does not draw.
                      aria-valuetext={format(entity().value ?? props.domain[0])}
                    >
                      <KobalteSlider.Input />
                    </KobalteSlider.Thumb>
                  </Show>
                </KobalteSlider.Track>
              </KobalteSlider>
              <MonoMeta>{readout(dial())}</MonoMeta>
              <Show when={props.onRemove}>
                {(onRemove) => (
                  <SmallGhostButton
                    aria-label={
                      dial().removed
                        ? `${entity().label} removed`
                        : `Remove ${entity().label}`
                    }
                    disabled={dial().removed}
                    onClick={() => onRemove()(entity().id)}
                  >
                    {REMOVE_MARK}
                  </SmallGhostButton>
                )}
              </Show>
            </TightCenteredColumn>
          );
        }}
      </Index>
      <Show when={props.onAdd}>
        {(onAdd) => (
          <SmallGhostButton aria-label="Add entity" onClick={() => onAdd()()}>
            +
          </SmallGhostButton>
        )}
      </Show>
    </ClusterRow>
  );
};
