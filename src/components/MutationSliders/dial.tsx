// ============================================
// MutationDial — ONE entity's column. Composite (Depth 2), private to
// MutationSliders.
//
// ZERO CSS AND ZERO INTRINSIC ELEMENTS, as of 2026-09-17 (Peter's axiom: no
// component above Depth 1 contains anything but existing SUI components — no
// raw elements, no CSS, no third-party primitives). Everything this file used
// to draw by hand now comes from a component that owns it:
//
//   • the dial itself      → `MarkedSlider` (Depth 1, owns MarkedSlider.css,
//                            owns the Kobalte root and the SVG overlay)
//   • the name toggle      → `PressableLabelButton` + `NowrapLabel`
//   • the two readouts     → `SteadyMonoValue`, `SteadyMonoMeta` /
//                            `ReservedMonoMeta`
//   • the footer slot      → `GlyphSlotGhostButton` / `ReservedGlyphSlotButton`
//                            + `Icon`
//   • the column           → `TightCenteredColumn`
//
// Lowercase filename ON PURPOSE, the same disposition as geometry.ts and
// BandRail/bands.tsx: `isEntryPath` in scripts/render-coverage.mjs matches any
// PascalCase `.tsx` under src/components/, so a `MutationDial.tsx` here would
// register as a published component owing its own showcase, its own catalog
// entry and its own COMPONENTS.md section. Nobody has asked for a standalone
// column yet (SUI: start minimal, expand on demand), so the seam is real and
// the export is not.
//
// WHAT THIS OWNS: one entity's column — which words go in the two readouts,
// which of the two actions the one footer slot is offering, and the fact that
// the name is a toggle. It FORMATS: the consumer's `format` is applied here,
// and the Primitive below is handed finished strings, because a unit is not a
// Primitive's business.
//
// WHAT IT DOES NOT OWN: the row. Paging, selection, pinning and the shared
// domain all belong to the composite above, because each of them is a fact
// about the OTHER dials. This component is told whether it is selected; it
// never decides that, and it never sees its siblings.
//
// THE MOVE SEAM. `MarkedSlider` reports an intermediate value through
// `onChange` and a committed one through `onChangeEnd`, and this file passes
// both up unchanged so the pin fan-out stays in ONE place: a pinned dial must
// move its peers instead of itself, and that decision cannot be made here
// without this component knowing the row.
// ============================================
import { type Component, type JSX, Show } from "solid-js";
import { Dynamic } from "solid-js/web";
import {
  GlyphSlotGhostButton,
  PressableLabelButton,
  ReservedGlyphSlotButton,
} from "../Button";
import { Icon } from "../Icon";
import { TightCenteredColumn } from "../Layout";
import { MarkedSlider } from "../MarkedSlider";
import {
  type DialGeometry,
  type Domain,
  type Entity,
  deltaLabelOf,
  dialGeometry,
} from "../MarkedSlider/geometry";
import {
  NowrapLabel,
  ReservedMonoMeta,
  SteadyMonoMeta,
  SteadyMonoValue,
} from "../Text";
import type { ResolvedLabels } from "./labels";

/**
 * The placeholder an empty text slot carries.
 *
 * A non-breaking space, not an empty string: an empty inline box collapses to
 * zero height and takes the row with it, which is the shift this exists to
 * prevent. `ReservedMonoMeta` hides it; the character keeps the line.
 */
const NBSP = " ";

/** The removed entity's readout: there is no future amount to print. */
const NO_VALUE = "—";

/**
 * The remove affordance. Peter's sketch draws a circled cross, and this is
 * that character rather than an `Icon`: the closest glyph in the set is
 * `error`, whose NAME would misdescribe the action everywhere it was read.
 * Restore beside it IS an Icon (`undo`), because one exists that means it.
 */
const REMOVE_MARK = "⊗";

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
  /** An intermediate value. Already settled onto range + grid. */
  onMove: (value: number) => void;
  /** A COMMITTED value — a released pointer, or one arrow key. */
  onCommit: (value: number) => void;
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

  return (
    <TightCenteredColumn>
      {/* The name is the SELECT control — a real button, so Tab and Enter work
          without this component inventing key handling, and `aria-pressed`
          because it is a toggle rather than a command: a screen reader then
          says "Adlai, pressed" instead of leaving the state to the colour.
          `data-struck` is the removal, which the strike says a second time for
          anyone who cannot see the colour. */}
      <PressableLabelButton
        active={props.selected}
        aria-pressed={props.selected}
        data-struck={dial().removed ? "" : undefined}
        onClick={() => props.onSelect()}
      >
        <NowrapLabel>{props.entity.label}</NowrapLabel>
      </PressableLabelButton>
      {/* ONE height feeds everything: the viewBox, the track path, AND every
          value→y mapping behind the range, the arrows, the change line and the
          delta label. Omitting it left those five at the 260px default while
          the track and the viewBox were at the measured height, so the bands
          and arrows bunched into the top third of a tall dial and the pointer
          disagreed with all of them.

          The BASE `MarkedSlider`, not `ContinuousMarkedSlider`: `snap` is the
          one override a variant can lock, and this row forwards a CONSUMER's
          grid, which is data here rather than a decision this file gets to
          make. That is the same case the barrel already documents for
          `MutationSliders` itself. */}
      <MarkedSlider
        domain={props.domain}
        range={dial().range}
        value={props.entity.value}
        prior={props.entity.old}
        height={props.height}
        snap={props.snap}
        dragStep={props.dragStep}
        keyStep={props.keyStep}
        label={props.entity.label}
        valueText={futureReadout()}
        deltaLabel={deltaLabelOf(props.format, dial().delta)}
        active={props.selected}
        onMeasure={props.onMeasure}
        onChange={(value) => props.onMove(value)}
        onChangeEnd={(value) => props.onCommit(value)}
      />
      {/* The required line, then where it came from — if anywhere. The second
          line is ALWAYS RENDERED and merely hidden when it has nothing to say
          (Peter, 2026-09-16: "elements that become invisible but don't hold
          their space ... the control moves around when you change it").
          Dragging a value onto its prior amount used to delete this row, which
          jumped the big figure and the button up under the pointer
          mid-gesture. */}
      <SteadyMonoValue>{futureReadout()}</SteadyMonoValue>
      <Dynamic
        component={priorReadout() === "" ? ReservedMonoMeta : SteadyMonoMeta}
      >
        {priorReadout() || NBSP}
      </Dynamic>
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
