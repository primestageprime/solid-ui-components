// ============================================
// PairedDial — ONE entity's PAIR of columns. Composite (Depth 2), private to
// PairedMutationSliders.
//
// ZERO CSS AND ZERO INTRINSIC ELEMENTS (Peter's axiom: no component above
// Depth 1 contains anything but existing SUI components — no raw elements, no
// CSS, no third-party primitives). Everything here comes from a component that
// owns it:
//
//   • each dial            → `MarkedSlider` (Depth 1, owns MarkedSlider.css,
//                            owns the Kobalte root and the SVG overlay)
//   • the name toggle      → `PressableLabelButton` + `NowrapLabel`
//   • the readouts         → `SteadyMonoValue`, `SteadyMonoMeta` /
//                            `ReservedMonoMeta`
//   • the footer slot      → `GlyphSlotGhostButton` / `ReservedGlyphSlotButton`
//   • the two columns      → `FillStretchRow` over `TightCenteredColumn`
//
// Lowercase filename ON PURPOSE, the same disposition as MutationSliders'
// dial.tsx: `isEntryPath` in scripts/render-coverage.mjs matches any
// PascalCase `.tsx` under src/components/, so a `PairedDial.tsx` here would
// register as a published component owing its own showcase, its own catalog
// entry and its own COMPONENTS.md section. Nobody has asked for a standalone
// paired column (SUI: start minimal, expand on demand), so the seam is real
// and the export is not.
//
// WHAT THIS OWNS: one entity's pair — the ONE name above both dials, which of
// the two footer actions the one slot is offering, and the summary line the
// consumer computes under them. It FORMATS, per measure: each axis's own
// `format` is applied here and the Primitives below are handed finished
// strings, because a unit is not a Primitive's business — and the two units
// are different, which is the reason this component exists at all.
//
// WHAT IT DOES NOT OWN: the row, and the scale. Paging, selection, pinning and
// both axes' resolved domains belong to the composite above, because each of
// them is a fact about the OTHER entities. This component is told whether it
// is selected and what scale to draw on; it decides neither.
//
// THE MEASURE INDEX IS CARRIED THROUGH EVERY EMISSION. `onMove` and `onCommit`
// both take the index the dial sits at, so the row can fan a pinned move out
// across the SAME measure of its peers and no other. Losing the index here
// would be the bug this whole component is a defence against: two dollars-per
// -hour dials moving because somebody dragged an hours-per-week one.
// ============================================
import { type Component, type JSX, Index, Show } from "solid-js";
import { Dynamic } from "solid-js/web";
import {
  GlyphSlotGhostButton,
  PressableLabelButton,
  ReservedGlyphSlotButton,
} from "../Button";
import { Icon } from "../Icon";
import { FillStretchRow, TightCenteredColumn } from "../Layout";
import { MarkedSlider } from "../MarkedSlider";
import {
  type DialGeometry,
  deltaLabelOf,
  dialGeometry,
} from "../MarkedSlider/geometry";
import {
  NowrapLabel,
  ReservedMonoMeta,
  SteadyMonoMeta,
  SteadyMonoValue,
} from "../Text";
import type { ResolvedAxes } from "./axes";
import type { ResolvedPairedLabels } from "./labels";
import {
  type MeasureIndex,
  MEASURE_INDICES,
  type PairedMutationEntity,
  isRemoved,
  measureEntity,
} from "./pairs";

/**
 * The placeholder an empty text slot carries.
 *
 * A non-breaking space, not an empty string: an empty inline box collapses to
 * zero height and takes the row with it, which is the shift this exists to
 * prevent. `ReservedMonoMeta` hides it; the character keeps the line.
 */
const NBSP = " ";

/** A measure with no future amount: there is nothing to print. */
const NO_VALUE = "—";

/**
 * The remove affordance. The closest glyph in the icon set is `error`, whose
 * NAME would misdescribe the action everywhere it was read, so this is the
 * character. Restore beside it IS an `Icon` (`undo`), because one exists that
 * means it.
 */
const REMOVE_MARK = "⊗";

export interface PairedDialProps {
  /** The entity this pair draws. */
  entity: PairedMutationEntity;
  /** Both axes, already resolved by the row — scale, unit, name and steps. */
  axes: ResolvedAxes;
  /** The height to draw the dials at, in px — already floored by the row. */
  height: number;
  /** Every word the pair says on the consumer's behalf, already resolved. */
  labels: ResolvedPairedLabels;
  /** The consumer's own one-line reading of the pair, or `null` for no line. */
  summary: string | null;
  /** Whether the name reads as selected. */
  selected: boolean;
  /** The name was clicked. */
  onSelect: () => void;
  /** A dial's box was measured — every dial in a row shares one height. */
  onMeasure: (height: number) => void;
  /** An intermediate value on one measure. Already settled onto range + grid. */
  onMove: (index: MeasureIndex, value: number) => void;
  /** A COMMITTED value on one measure — a released pointer, or one arrow key. */
  onCommit: (index: MeasureIndex, value: number) => void;
  /** The footer's action on a present entity. Omitted, no ⊗ is drawn. */
  onRemove?: () => void;
  /** The footer's action on a removed entity. Omitted, no ↺ is drawn. */
  onRestore?: () => void;
}

/**
 * One entity's pair: its name, two dials with their own readouts, the
 * consumer's summary line and one footer slot.
 */
export const PairedDial: Component<PairedDialProps> = (props) => {
  const removed = (): boolean => isRemoved(props.entity);

  /** One measure's geometry, on that measure's own scale. */
  const dial = (index: MeasureIndex): DialGeometry =>
    dialGeometry(
      props.axes[index].domain,
      measureEntity(props.entity, index),
      props.height,
    );

  /** The required line under one dial: what this measure will be. */
  const valueReadout = (index: MeasureIndex): string => {
    const value = dial(index).clampedValue;
    return value === null ? NO_VALUE : props.axes[index].format(value);
  };

  /**
   * The muted line beneath it: what this measure IS — `Hrs/wk`, `$/hr`.
   *
   * A measure with no prior amount says the consumer's `labels.new` in the
   * same slot instead, which is the one thing about this column that is worth
   * more than its name: an arrival is the state a reader most needs told, and
   * the axis name is the same on every other column in the row anyway.
   *
   * Empty when there is neither — always RENDERED and merely hidden, so a
   * labelled and an unlabelled pair stand at exactly the same height.
   */
  const metaReadout = (index: MeasureIndex): string => {
    if (dial(index).isNew) return props.labels.new;
    return props.axes[index].label ?? "";
  };

  /**
   * What the one footer slot does right now, or `null` when the consumer has
   * given it nothing to do.
   *
   * Resolved in ONE place so the label, the glyph and the click can never
   * disagree about which state the entity is in — the failure that shape
   * prevents is a ⊗ that says Remove and calls restore.
   */
  const footer = (): {
    label: string;
    glyph: JSX.Element;
    act: () => void;
  } | null => {
    if (removed()) {
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

  return (
    <TightCenteredColumn>
      {/* ONE name over BOTH dials — that is the shape this component is for.
          It is the SELECT control, a real button so Tab and Enter work without
          this component inventing key handling, and `aria-pressed` because it
          is a toggle rather than a command. `data-struck` is the removal,
          which the strike says a second time for anyone who cannot see the
          colour. */}
      <PressableLabelButton
        active={props.selected}
        aria-pressed={props.selected}
        data-struck={removed() ? "" : undefined}
        onClick={() => props.onSelect()}
      >
        <NowrapLabel>{props.entity.label}</NowrapLabel>
      </PressableLabelButton>
      {/* The pair. `FillStretchRow` is the same `sm`-gap (8px) fill chain the
          ROW uses, which is why `PAIR_SLOT` is exactly two dial slots and not
          a third constant that can drift out of step with it. */}
      <FillStretchRow role="group" aria-label={props.entity.label}>
        <Index each={MEASURE_INDICES}>
          {(index) => (
            <TightCenteredColumn>
              {/* ONE height feeds everything: the viewBox, the track path AND
                  every value→y mapping behind the range, the arrows, the
                  change line and the delta label.

                  The BASE `MarkedSlider`, not `ContinuousMarkedSlider`: `snap`
                  is the one override a variant can lock, and this row forwards
                  a CONSUMER'S grid, which is data here rather than a decision
                  this file gets to make. */}
              <MarkedSlider
                domain={props.axes[index()].domain}
                range={dial(index()).range}
                value={props.entity.measures[index()].value}
                prior={props.entity.measures[index()].prior}
                height={props.height}
                snap={props.axes[index()].snap}
                dragStep={props.axes[index()].dragStep}
                keyStep={props.axes[index()].keyStep}
                // The accessible name carries BOTH the entity and the measure,
                // because "Design" said twice is two controls a screen-reader
                // user cannot tell apart — and telling them apart is the one
                // thing this component adds over a row of single dials.
                label={`${props.entity.label} ${props.axes[index()].label ?? `measure ${index() + 1}`}`}
                valueText={valueReadout(index())}
                deltaLabel={deltaLabelOf(
                  props.axes[index()].format,
                  dial(index()).delta,
                )}
                active={props.selected}
                onMeasure={props.onMeasure}
                onChange={(value) => props.onMove(index(), value)}
                onChangeEnd={(value) => props.onCommit(index(), value)}
              />
              <SteadyMonoValue>{valueReadout(index())}</SteadyMonoValue>
              {/* ALWAYS RENDERED and merely hidden when it has nothing to say
                  (Peter, 2026-09-16: "elements that become invisible but don't
                  hold their space ... the control moves around when you change
                  it"). */}
              <Dynamic
                component={
                  metaReadout(index()) === ""
                    ? ReservedMonoMeta
                    : SteadyMonoMeta
                }
              >
                {metaReadout(index()) || NBSP}
              </Dynamic>
            </TightCenteredColumn>
          )}
        </Index>
      </FillStretchRow>
      {/* The consumer's own reading of the PAIR — `$15k` for 20 hours a week
          at $75 an hour. This component runs no arithmetic across the two
          measures and could not: their units are unrelated by construction, so
          what a pair MEANS together is knowledge only the consumer has.

          The line exists at all only when the consumer supplied `summary`,
          which is a component-level decision every column in the row agrees
          on; within it, an entity with nothing to say keeps the space. */}
      <Show when={props.summary !== null}>
        <SteadyMonoValue>{props.summary || NBSP}</SteadyMonoValue>
      </Show>
      {/* ONE slot, three states. A present entity offers ⊗ Remove; a removed
          one offers ↺ Restore in the same place; and where the consumer
          supplies neither callback the button still holds its space, hidden. A
          disabled ⊗ was the wrong shape: it said "you did this and there is
          nothing more to do", when what the reader wants is the way back. */}
      <Show
        when={footer()}
        fallback={
          <ReservedGlyphSlotButton disabled aria-hidden="true">
            {REMOVE_MARK}
          </ReservedGlyphSlotButton>
        }
      >
        {(slot) => (
          <GlyphSlotGhostButton
            aria-label={slot().label}
            onClick={() => slot().act()}
          >
            {slot().glyph}
          </GlyphSlotGhostButton>
        )}
      </Show>
    </TightCenteredColumn>
  );
};
