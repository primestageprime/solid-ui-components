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
import { type Component, type JSX, Show, createSignal } from "solid-js";
import { Dynamic } from "solid-js/web";
import {
  GlyphSlotGhostButton,
  PressableLabelButton,
  ReservedGlyphSlotButton,
} from "../Button";
import { Icon } from "../Icon";
import { TightCenteredColumn, TightClusterRow } from "../Layout";
import { MarkedSlider } from "../MarkedSlider";
import { SliderField } from "../Slider";
import {
  type DialGeometry,
  type Domain,
  type Entity,
  dialGeometry,
} from "../MarkedSlider/geometry";
import {
  NowrapLabel,
  ReservedMonoMeta,
  SteadyMonoMeta,
  SteadyMonoValue,
} from "../Text";
import type { ResolvedLabels } from "./labels";
import { type DialReadouts, type ReadoutMode, readoutsOf } from "./readouts";

/**
 * The placeholder an empty text slot carries.
 *
 * A non-breaking space, not an empty string: an empty inline box collapses to
 * zero height and takes the row with it, which is the shift this exists to
 * prevent. `ReservedMonoMeta` hides it; the character keeps the line.
 */
const NBSP = " ";

/**
 * The remove affordance. Peter's sketch draws a circled cross, and this is
 * that character rather than an `Icon`: the closest glyph in the set is
 * `error`, whose NAME would misdescribe the action everywhere it was read.
 * Restore beside it IS an Icon (`undo`), because one exists that means it.
 */
const REMOVE_MARK = "⊗";

/**
 * The link affordance — the Icon set's `link` (Peter approved it 2026-09-24,
 * replacing the interim text chain). A function, not a const, so the hidden
 * placeholder and the live button each get their own node.
 */
const linkMark = (): JSX.Element => <Icon name="link" size="sm" />;

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
  /** Where the figures go. Default `"stacked"` — see readouts.ts. */
  readout?: ReadoutMode;
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
  /**
   * A figure was TYPED into the amount and committed. Supplied, the amount
   * under the dial is an editable field; omitted, it is the static readout it
   * always was. The raw text goes up — parsing belongs to the row.
   */
  onType?: (text: string) => void;
  /**
   * The footer's RESET on a present entity: put it back where it started.
   * Supplied together with `onRemove`, the footer becomes a split pair —
   * Reset | Delete — instead of the single ⊗. Omitted, the footer is exactly
   * the one slot it always was.
   */
  onReset?: () => void;
  /**
   * The link button was pressed. Omitted, the column has no link slot at all
   * and is exactly the shape it always was.
   */
  onLink?: () => void;
  /** Whether this dial is in the row's link group (of two or more). */
  linked?: boolean;
}

/**
 * One entity's column: its name, its dial, its two readouts and its one footer
 * slot.
 */
export const MutationDial: Component<MutationDialProps> = (props) => {
  const dial = (): DialGeometry =>
    dialGeometry(props.domain, props.entity, props.height);

  /**
   * Every figure this column prints, decided in readouts.ts so each mode
   * prints as a table: the line under the dial, the muted one beneath it, and
   * the two labels on the drawing.
   */
  const readouts = (): DialReadouts =>
    readoutsOf(props.readout ?? "stacked", dial(), props.format, props.labels);
  /** The required line: what this entity will be. */
  const futureReadout = (): string => readouts().value;
  /** The muted line beneath it, or `""` when there is nothing to say. */
  const priorReadout = (): string => readouts().meta;

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
   * Whether the pointer is over the column or focus is inside it — the two
   * ways a reader can be "at" this dial, and the two that reveal its link
   * button. Focus counts so the keyboard can reach a button the mouse finds by
   * hovering: the slot sits right after the name, so tabbing onto the name
   * reveals the link and the next Tab lands on it.
   */
  const [hovered, setHovered] = createSignal(false);
  const [focused, setFocused] = createSignal(false);
  /** A linked dial always shows its link — it is the group's visible mark. */
  const showLink = (): boolean =>
    props.linked === true || hovered() || focused();

  /** The split footer's two actions, or `null` for the single slot. */
  const split = (): { reset: () => void; remove: () => void } | null => {
    const reset = props.onReset;
    const remove = props.onRemove;
    return reset && remove && !dial().removed ? { reset, remove } : null;
  };
  /** Whether there is anything for Reset to undo. */
  const changed = (): boolean =>
    dial().isNew || dial().clampedOld !== dial().clampedValue;

  /** ONE slot, three states — the footer every row had before the split. */
  const single = (): JSX.Element => (
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
  );

  return (
    <TightCenteredColumn
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusIn={() => setFocused(true)}
      onFocusOut={(event: FocusEvent) =>
        setFocused(
          event.currentTarget instanceof Node &&
            event.relatedTarget instanceof Node &&
            event.currentTarget.contains(event.relatedTarget),
        )
      }
    >
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
      {/* The LINK slot, directly UNDER the name, and only for a row that
          links. Under rather than above so the tab order is name → link →
          thumb: focusing the name reveals the link and the next Tab lands on
          it. It
          HOLDS ITS SPACE while hidden (the reserved button), so revealing it on
          hover moves nothing under the pointer. Linked, it stays shown and
          takes the accent: that is the group's mark on every member. */}
      <Show when={props.onLink}>
        {(onLink) => (
          <Show
            when={showLink()}
            fallback={
              <ReservedGlyphSlotButton disabled aria-hidden="true">
                {linkMark()}
              </ReservedGlyphSlotButton>
            }
          >
            <GlyphSlotGhostButton
              active={props.linked === true}
              aria-pressed={props.linked === true}
              aria-label={`${props.linked ? "Unlink" : "Link"} ${props.entity.label}`}
              title={props.linked ? "Unlink" : "Link"}
              onClick={() => onLink()()}
            >
              {linkMark()}
            </GlyphSlotGhostButton>
          </Show>
        )}
      </Show>
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
        deltaLabel={readouts().deltaLabel}
        priorLabel={readouts().priorLabel}
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
      {/* The amount. With a `precision` the row made it EDITABLE (Peter,
          2026-09-24): `SliderField` owns the typing — Enter and blur commit,
          Escape reverts — and hands the text to the row, which parses, rounds
          and clamps it (typed.ts). A removed entity has no amount to edit. */}
      <Show
        when={props.onType !== undefined && !dial().removed}
        fallback={<SteadyMonoValue>{futureReadout()}</SteadyMonoValue>}
      >
        <SliderField
          label={`${props.entity.label} amount`}
          value={futureReadout()}
          editValue={String(dial().clampedValue ?? "")}
          onCommit={(text) => props.onType?.(text)}
        />
      </Show>
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
      {/* SPLIT, when the consumer supplies both Reset and Delete: a present
          entity offers ⟳ Reset | ⊗ Delete side by side in the same 24px row
          the single slot occupies — so the column is the same height in every
          state. No divider between them: `VerticalDivider`'s 16px margins
          widened the pair to 118px, past the 88px dial it sits under, which
          widens the column and breaks the row's paging arithmetic (DIAL_SLOT). Reset is DISABLED when there is nothing to reset
          rather than hidden, so Delete never slides under the pointer. The
          confirm on Delete is the consumer's: this only reports the intent. */}
      <Show when={split()} fallback={single()}>
        {(pair) => (
          <TightClusterRow>
            <GlyphSlotGhostButton
              aria-label={`Reset ${props.entity.label}`}
              title="Reset"
              disabled={!changed()}
              onClick={() => pair().reset()}
            >
              <Icon name="refresh" size="sm" />
            </GlyphSlotGhostButton>
            <GlyphSlotGhostButton
              aria-label={`${props.labels.remove} ${props.entity.label}`}
              title={props.labels.remove}
              onClick={() => pair().remove()}
            >
              {REMOVE_MARK}
            </GlyphSlotGhostButton>
          </TightClusterRow>
        )}
      </Show>
    </TightCenteredColumn>
  );
};
