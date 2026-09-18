// ============================================
// GroupedDial — ONE entity's column of N dials in captioned runs. Composite
// (Depth 2), private to GroupedMutationSliders.
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
//   • the GROUP CAPTIONS   → the same two Text variants as the readouts
//   • the footer slot      → `GlyphSlotGhostButton` / `ReservedGlyphSlotButton`
//   • every row and column → `FillStretchRow` over `TightCenteredColumn`
//
// Lowercase filename ON PURPOSE, the same disposition as MutationSliders'
// dial.tsx and PairedMutationSliders' pair.tsx: `isEntryPath` in
// scripts/render-coverage.mjs matches any PascalCase `.tsx` under
// src/components/, so a `GroupedDial.tsx` here would register as a component
// owing its own mount test. Nobody has asked for a standalone grouped column
// (SUI: start minimal, expand on demand), so the seam is real and the export is
// not.
//
// WHAT THIS OWNS: one entity's column — the ONE name above every dial, the
// captions that say which dials go together, which of the two footer actions
// the one slot is offering, and the summary line the consumer computes under
// them. It FORMATS, per measure: each axis's own `format` is applied here and
// the Primitives below are handed finished strings, because a unit is not a
// Primitive's business — and the units are all different, which is the reason
// this component exists at all.
//
// WHAT IT DOES NOT OWN: the row, and the scale. Paging, selection, pinning and
// every axis's resolved domain belong to the composite above, because each of
// them is a fact about the OTHER entities.
//
// THE CAPTION IS A ROW OF COLUMNS, not a grid. A caption spanning its run is
// simply the run's own column header: each run is a `TightCenteredColumn`
// holding a caption above a `FillStretchRow` of its dials, so the caption
// centres over exactly the dials it names without anything here knowing a
// pixel. That is why this composes rather than measures.
//
// THE MEASURE INDEX IS CARRIED THROUGH EVERY EMISSION. `onMove` and `onCommit`
// both take the index the dial sits at, so the row can fan a pinned move out
// across the SAME measure of its peers and no other. Losing the index here
// would be the bug this whole component is a defence against: four dials moving
// because somebody dragged one.
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
import type { ResolvedGroupedAxes } from "./axes";
import {
  type GroupRun,
  type GroupedMeasureIndex,
  type GroupedMutationEntity,
  dialLabel,
  isRemoved,
  measureEntity,
} from "./groups";
import type { ResolvedGroupedLabels } from "./labels";

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

export interface GroupedDialProps {
  /** The entity this column draws. */
  entity: GroupedMutationEntity;
  /** Every axis, already resolved by the row — scale, unit, name, group, steps. */
  axes: ResolvedGroupedAxes;
  /** The captioned runs the row broke those axes into. */
  runs: readonly GroupRun[];
  /** Whether ANY run is captioned — when none is, no caption line is drawn. */
  captioned: boolean;
  /** The height to draw the dials at, in px — already floored by the row. */
  height: number;
  /** Every word the column says on the consumer's behalf, already resolved. */
  labels: ResolvedGroupedLabels;
  /** The consumer's own one-line reading of the entity, or `null` for no line. */
  summary: string | null;
  /** Whether the name reads as selected. */
  selected: boolean;
  /** The name was clicked. */
  onSelect: () => void;
  /** A dial's box was measured — every dial in a row shares one height. */
  onMeasure: (height: number) => void;
  /** An intermediate value on one measure. Already settled onto range + grid. */
  onMove: (index: GroupedMeasureIndex, value: number) => void;
  /** A COMMITTED value on one measure — a released pointer, or one arrow key. */
  onCommit: (index: GroupedMeasureIndex, value: number) => void;
  /** The footer's action on a present entity. Omitted, no ⊗ is drawn. */
  onRemove?: () => void;
  /** The footer's action on a removed entity. Omitted, no ↺ is drawn. */
  onRestore?: () => void;
}

/**
 * One entity's column: its name, N dials in captioned runs with their own
 * readouts, the consumer's summary line and one footer slot.
 */
export const GroupedDial: Component<GroupedDialProps> = (props) => {
  const removed = (): boolean => isRemoved(props.entity);

  /** One measure's geometry, on that measure's own scale. `null` when this
   *  entity has no measure at that position — see `measureEntity`. */
  const dial = (index: GroupedMeasureIndex): DialGeometry | null => {
    const projected = measureEntity(props.entity, index);
    const axis = props.axes[index];
    if (projected === undefined || axis === undefined) return null;
    return dialGeometry(axis.domain, projected, props.height);
  };

  /** The required line under one dial: what this measure will be. */
  const valueReadout = (index: GroupedMeasureIndex): string => {
    const geometry = dial(index);
    const value = geometry?.clampedValue ?? null;
    if (value === null) return NO_VALUE;
    return (props.axes[index]?.format ?? String)(value);
  };

  /**
   * The muted line beneath it: what this measure IS — `#`, `$`, `%`.
   *
   * A measure with no prior amount says the consumer's `labels.new` in the same
   * slot instead, which is the one thing about this column worth more than its
   * name: an arrival is the state a reader most needs told, and the axis name
   * is the same on every other column in the row anyway.
   *
   * Empty when there is neither — always RENDERED and merely hidden, so a
   * labelled and an unlabelled column stand at exactly the same height.
   */
  const metaReadout = (index: GroupedMeasureIndex): string => {
    if (dial(index)?.isNew === true) return props.labels.new;
    return props.axes[index]?.label ?? "";
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
      {/* ONE name over EVERY dial — that is the shape this component is for.
          It is the SELECT control, a real button so Tab and Enter work without
          this component inventing key handling, and `aria-pressed` because it
          is a toggle rather than a command. `data-struck` is the removal, which
          the strike says a second time for anyone who cannot see the colour. */}
      <PressableLabelButton
        active={props.selected}
        aria-pressed={props.selected}
        data-struck={removed() ? "" : undefined}
        onClick={() => props.onSelect()}
      >
        <NowrapLabel>{props.entity.label}</NowrapLabel>
      </PressableLabelButton>
      {/* The runs. `FillStretchRow` is the same `sm`-gap (8px) fill chain the
          ROW uses, which is why `slotFor` is exactly N dial slots and not a
          second constant that can drift out of step with the Layout variant. */}
      <FillStretchRow role="group" aria-label={props.entity.label}>
        <Index each={props.runs}>
          {(run) => (
            <TightCenteredColumn>
              {/* The caption, centred over exactly the dials it names because
                  it is their column's header rather than a span across a grid.
                  Drawn only when SOME run in the row is captioned, and then on
                  every run — a row where one group had a header and its
                  neighbour silently did not would read as a missing word. */}
              <Show when={props.captioned}>
                <Dynamic
                  component={
                    run().caption === "" ? ReservedMonoMeta : SteadyMonoMeta
                  }
                >
                  {run().caption || NBSP}
                </Dynamic>
              </Show>
              <FillStretchRow
                role="group"
                aria-label={
                  run().caption === ""
                    ? props.entity.label
                    : `${props.entity.label} ${run().caption}`
                }
              >
                <Index each={run().indices}>
                  {(index) => (
                    <Show when={props.axes[index()] !== undefined}>
                      <TightCenteredColumn>
                        {/* ONE height feeds everything: the viewBox, the track
                            path AND every value→y mapping behind the range, the
                            arrows, the change line and the delta label.

                            The BASE `MarkedSlider`, not
                            `ContinuousMarkedSlider`: `snap` is the one override
                            a variant can lock, and this row forwards a
                            CONSUMER'S grid, which is data here rather than a
                            decision this file gets to make. */}
                        <MarkedSlider
                          domain={props.axes[index()]?.domain ?? [0, 1]}
                          range={
                            props.entity.measures[index()]?.range ?? [0, 1]
                          }
                          value={props.entity.measures[index()]?.value ?? null}
                          prior={props.entity.measures[index()]?.prior ?? null}
                          height={props.height}
                          snap={props.axes[index()]?.snap}
                          dragStep={props.axes[index()]?.dragStep}
                          keyStep={props.axes[index()]?.keyStep}
                          // The accessible name carries the entity, the GROUP
                          // and the measure, because "Starter #" said twice is
                          // two controls a screen-reader user cannot tell
                          // apart — and there really are two of them here, one
                          // monthly and one annual. That is the whole reason
                          // the caption is in the name.
                          label={dialLabel(
                            props.entity.label,
                            run().caption,
                            props.axes[index()]?.label,
                            index(),
                          )}
                          valueText={valueReadout(index())}
                          deltaLabel={deltaLabelOf(
                            props.axes[index()]?.format ?? String,
                            dial(index())?.delta ?? null,
                          )}
                          active={props.selected}
                          onMeasure={props.onMeasure}
                          onChange={(value) => props.onMove(index(), value)}
                          onChangeEnd={(value) => props.onCommit(index(), value)}
                        />
                        <SteadyMonoValue>
                          {valueReadout(index())}
                        </SteadyMonoValue>
                        {/* ALWAYS RENDERED and merely hidden when it has
                            nothing to say (Peter, 2026-09-16: "elements that
                            become invisible but don't hold their space … the
                            control moves around when you change it"). */}
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
                    </Show>
                  )}
                </Index>
              </FillStretchRow>
            </TightCenteredColumn>
          )}
        </Index>
      </FillStretchRow>
      {/* The consumer's own reading of the WHOLE entity — `$5.9k/mo` for 120
          monthly seats at $15 plus 60 annual ones at 85% of that. This
          component runs no arithmetic across the measures and could not: their
          units are unrelated by construction, so what they MEAN together is
          knowledge only the consumer has.

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
