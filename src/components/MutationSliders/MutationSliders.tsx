// ============================================
// MutationSliders — Composite (Depth 2)
// Owns CSS (MutationSliders.css). Composes Layout (ClusterRow,
// TightCenteredColumn) + Text (MonoMeta, MonoValue, NowrapLabel) + Button
// (SmallGhostButton). Kobalte-backed (@kobalte/core/slider), matching the
// Slider / Combobox / Select / Toast wrapping pattern.
//
// A row of VERTICAL dials, one per named entity. Each dial answers: what does
// this person's ROLE permit, where were they in it, and where are they going?
//
//   • The track runs the whole shared `domain`, so every dial in the row is on
//     ONE scale and two people are comparable at a glance.
//   • The shaded box is that entity's ROLE BAND — its min→max. It is NOT the
//     size of the change: two people on the same role draw the same box
//     however far each of them moved.
//   • A muted PRIOR arrowhead marks what they were paid; an accent FUTURE
//     arrowhead marks what they will be. Both point AT the track from opposite
//     sides, so a pair at the same amount meets nose to nose.
//   • Between them, a wider line, GREEN for a raise and RED for a cut (Peter,
//     2026-09-16). Hue is never the only cue — future-above-prior says the
//     same thing by position, so the colourblind theme loses only the
//     reinforcement.
//   • Beside that line, the SIGNED delta as a figure — `+$2.5k` in the same
//     tone, level with the line's midpoint. Peter's note of 2026-09-16 was
//     that "the levels are very close"; at close quarters an area is hard to
//     read and a number never is.
//   • Under the dial, the future amount through the caller's `format`, with
//     `was <prior>` muted beneath it — and nothing beneath it at all when the
//     amount did not move, so the figure is never printed twice.
//
// A NEW HIRE is `old: null` — someone who was not in the old scenario. Their
// dial draws the band and the future arrow and no prior arrow, there is no
// change to colour, and the readout says `new`. It is the mirror image of a
// removal, and the two are deliberately different shapes rather than one
// nullable "missing" flag.
//
// THE BAND IS THE CLAMP. Both amounts are pulled onto the role's band before
// they are drawn, the dial announces the CLAMPED figure, and `onChange` never
// emits outside it — so the thumb stops dead at a band edge. The raw figures
// survive in the geometry beside the clamped ones, because a value outside its
// band is usually a fact about the data rather than a rounding error.
//
// A removed entity is `value: null` — NOT a fall to the bottom of the band.
// Its name is struck through, its dial keeps the band and the prior arrow and
// loses the future one, and a ⊗ under it says so a second time for anyone who
// cannot see the strike.
//
// It reuses Kobalte's slider root rather than reinventing the drag: keyboard
// stepping, pointer capture, `role="slider"` and the aria value triple all
// come from there, with `orientation="vertical"` doing the rest. Kobalte's own
// Fill expresses none of these four marks — Fill runs min→value, while the
// band runs role-min→role-max and the change line runs prior→future — so every
// mark is drawn in a single SVG overlay lying exactly on the dial, and the
// Kobalte thumb is an INVISIBLE grab handle over the future arrowhead. One
// arrow shape, drawn once, from one geometry function: the two arrowheads
// cannot drift apart.
//
// The TRACK's domain is DERIVED from the entities by default — lowest band
// floor to highest band ceiling — so the bands fill the dial's full height
// rather than huddling in a corner of a caller-chosen scale. `domain` stays as
// an optional override for a track that must hold still.
//
// Kobalte's own min/max stay the DOMAIN, not the band, so the track element
// keeps the fixed inset geometry.ts maps onto and nothing needs a per-entity
// inline style. The band is enforced in `handleChange` instead, and the band's
// edges are announced by overriding `aria-valuemin`/`aria-valuemax` on the
// thumb.
//
// Everything positional lives in geometry.ts, which is pure and prints as a
// table (geometry.test.ts). This file only paints what that returns: there is
// nowhere in this module for a number to be decided.
//
// The values are in the CONSUMER'S OWN UNITS. The component formats nothing
// itself — `format` is the caller's, exactly as on Slider.
//
// LAYOUT PURITY — the ROW, each entity's COLUMN and the readout are composed
// from Layout and Text variants. The only geometry this component owns is the
// dial's own interior: a fixed canvas with an SVG overlay and a percentage-
// placed thumb, which is data-driven placement rather than an arrangement
// vocabulary — the same disposition as Slider's notches.
//
// No override props and no factory: `entities`, `domain`, `onChange`,
// `onRemove`, `onAdd` and `format` are all DATA. There is no size, no variant
// and no tone to curry.
// ============================================
import { Slider as KobalteSlider } from "@kobalte/core/slider";
import { type Component, Index, Show } from "solid-js";
import { SmallGhostButton } from "../Button";
import { ClusterRow, TightCenteredColumn } from "../Layout";
import { MonoMeta, MonoValue, NowrapLabel } from "../Text";
import {
  BAND_HALF,
  CHANGE_HALF,
  DELTA_X,
  type DialGeometry,
  type Domain,
  type Entity,
  TRACK_PATH,
  TRACK_X,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  clampToRange,
  deltaLabelOf,
  dialGeometry,
  niceStep,
  trackDomainOf,
} from "./geometry";
import "./MutationSliders.css";

export type { ChangeTone, Domain, Entity } from "./geometry";

export interface MutationSlidersProps {
  /** One dial per entity, drawn in the order given — that order is the reading order. */
  entities: readonly Entity[];
  /**
   * The shared `[min, max]` the TRACK runs, in the consumer's own units. Every
   * dial in the row uses it, which is what makes two dials comparable.
   *
   * OPTIONAL. Left out, it is DERIVED from the entities — the lowest band
   * floor to the highest band ceiling — so the bands fill the dial's full
   * height instead of huddling in part of it. That is nearly always what you
   * want: a caller-chosen domain is usually too generous at one end, and the
   * entities already state the interesting range.
   *
   * Pass one only to hold the track STILL: a scale that must not move as
   * entities come and go, or two rows that have to be read against each other.
   */
  domain?: Domain;
  /**
   * Called when a drag or a thumb-moving key changes one entity's future
   * amount. The value is already clamped into that entity's role band — this
   * never emits a figure the band does not permit.
   */
  onChange: (id: string, value: number) => void;
  // NOTE: there is deliberately no `step` prop. See `niceStep` in geometry.ts.
  /**
   * Called when the ⊗ under a dial is pressed. Omitted, no ⊗ is drawn at all
   * and a removed entity still reads as removed by its struck-through name.
   */
  onRemove?: (id: string) => void;
  /** Called by the `+` at the end of the row. Omitted, no `+` is drawn. */
  onAdd?: () => void;
  /**
   * Renders the amount under each dial, and the `aria-valuetext` a screen
   * reader announces. Default `String`.
   *
   * Without it Kobalte reads the value as a percentage of the domain's top,
   * which is wrong for any domain that does not start at zero — and wrong for
   * money in every case.
   */
  format?: (value: number) => string;
}

/** The removed entity's readout: there is no future amount to print. */
const NO_VALUE = "—";

/** The new hire's readout: there is no prior amount to compare against. */
const NEW_HIRE = "new";

/** The remove affordance. The sketch's own notation, kept verbatim. */
const REMOVE_MARK = "⊗";

/**
 * One dial's painted marks, drawn back to front: the scale, the role band, the
 * coloured change, then the two arrowheads on top of all of it.
 *
 * The overlay is `aria-hidden`: every mark on it restates something the thumb
 * already announces through `aria-valuenow` and the readout prints in words, so
 * putting the drawing in the accessibility tree would say each amount twice.
 */
const DialMarks: Component<{
  dial: DialGeometry;
  /** The signed delta, already formatted, or `null` when there is none. */
  deltaLabel: string | null;
}> = (props) => (
  <svg
    class="sui-mutation-sliders__marks"
    viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    <path class="sui-mutation-sliders__track-line" d={TRACK_PATH} />
    {/* The role band, under everything: it is the span a role permits, not a
        mark that hides the scale it sits on. */}
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
    {/* A NEW HIRE has no prior amount, so there is no prior arrow to draw —
        not one parked at the band floor, which would point at a salary nobody
        was ever paid. */}
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
    <Show when={props.deltaLabel}>
      {(label) => (
        <text
          class="sui-mutation-sliders__delta"
          classList={{
            [`sui-mutation-sliders__delta--${props.dial.changeTone}`]: true,
          }}
          x={DELTA_X}
          y={props.dial.deltaY ?? 0}
        >
          {label()}
        </text>
      )}
    </Show>
  </svg>
);

/**
 * A row of role-banded prior-vs-future dials, one per named entity.
 *
 * @example
 *   <MutationSliders
 *     entities={people()}          // each with `range: [bandMin, bandMax]`
 *     domain={[0, 200_000]}
 *     onChange={(id, value) => setPay(id, value)}
 *     onRemove={(id) => setPay(id, null)}
 *     onAdd={hire}
 *     format={(n) => `$${(n / 1000).toFixed(0)}k`}
 *   />
 */
export const MutationSliders: Component<MutationSlidersProps> = (props) => {
  const format = (value: number): string => (props.format ?? String)(value);

  /**
   * Arrow keys and drags move by a step DERIVED from the domain — see
   * `niceStep`. There is no `step` prop because nobody was configuring one,
   * and a step is a property of the scale, which is already here. Kobalte
   * derives its own `pageSize` as a tenth of the span snapped to this, so
   * Shift+Arrow and PageUp move ten steps with nothing asked of the caller.
   */
  /**
   * The track every dial shares. The caller's if they gave one, otherwise the
   * span the entities themselves bracket.
   */
  const domain = (): Domain => props.domain ?? trackDomainOf(props.entities);

  const step = (): number => niceStep(domain());

  /** The required line: what this person will be paid. */
  const futureReadout = (dial: DialGeometry): string =>
    dial.clampedValue === null ? NO_VALUE : format(dial.clampedValue);

  /**
   * The muted line beneath it: where they came from — and ONLY that, so the
   * future amount is not printed twice.
   *
   * Empty when there is nothing to say: a new hire has no prior amount (it
   * says `new` instead), and an entity that did not move has a prior amount
   * identical to the line above.
   */
  const priorReadout = (dial: DialGeometry): string => {
    if (dial.isNew) return NEW_HIRE;
    if (dial.clampedOld === null) return "";
    if (dial.clampedOld === dial.clampedValue) return "";
    return `was ${format(dial.clampedOld)}`;
  };

  return (
    <ClusterRow class="sui-mutation-sliders">
      {/* `Index`, not `For`. The row is POSITIONAL and its entities change
          value in place, so keying by item identity would replace the whole
          column — and the thumb's DOM node with it — on every step of a drag,
          which drops the pointer capture mid-gesture. Keying by position keeps
          each dial's node and updates only what it draws. */}
      <Index each={props.entities}>
        {(entity) => {
          const dial = (): DialGeometry => dialGeometry(domain(), entity());

          // Kobalte models every slider as multi-thumb. This dial is
          // single-thumb by contract, so the array is an implementation detail
          // the consumer never sees: one value in, `values[0]` out.
          //
          // THE CLAMP LIVES HERE. Kobalte's own min/max are the DOMAIN, which
          // is what keeps the track's inset fixed and this component free of
          // per-entity inline styles — so the ROLE BAND is enforced on the way
          // out instead. The component is controlled, so an emitted value that
          // the caller writes straight back leaves the thumb parked on the band
          // edge, which is exactly the "stops dead at the edge" behaviour.
          const handleChange = (values: number[]): void => {
            const current = dial();
            props.onChange(entity().id, clampToRange(current.range, values[0]));
          };

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
                value={[dial().clampedValue ?? dial().range[0]]}
                onChange={handleChange}
                minValue={domain()[0]}
                maxValue={domain()[1]}
                step={step()}
                disabled={dial().removed}
                data-removed={dial().removed ? "" : undefined}
                getValueLabel={(params) => format(params.values[0])}
              >
                <DialMarks
                  dial={dial()}
                  deltaLabel={deltaLabelOf(format, dial().delta)}
                />
                <KobalteSlider.Track class="sui-mutation-sliders__track">
                  <Show when={!dial().removed}>
                    <KobalteSlider.Thumb
                      class="sui-mutation-sliders__thumb"
                      aria-label={entity().label}
                      // The BAND is what a reader can reach, so the band is
                      // what the thumb announces — Kobalte would otherwise
                      // read out the shared domain, which is the track's
                      // extent rather than this person's.
                      aria-valuemin={dial().range[0]}
                      aria-valuemax={dial().range[1]}
                      // Kobalte's own `aria-valuetext` comes from its internal
                      // number formatter, NOT from `getValueLabel` — that only
                      // feeds its ValueLabel, which this dial does not draw.
                      aria-valuetext={futureReadout(dial())}
                    >
                      <KobalteSlider.Input />
                    </KobalteSlider.Thumb>
                  </Show>
                </KobalteSlider.Track>
              </KobalteSlider>
              {/* The required line, then where they came from — if anywhere. */}
              <MonoValue>{futureReadout(dial())}</MonoValue>
              <Show when={priorReadout(dial())}>
                {(prior) => <MonoMeta>{prior()}</MonoMeta>}
              </Show>
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
