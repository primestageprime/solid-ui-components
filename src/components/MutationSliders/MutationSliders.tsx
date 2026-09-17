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
// TERMINATE AND RESTORE SHARE ONE SLOT under each dial: an active person
// offers ⊗, a terminated one offers ↺. A disabled ⊗ was the wrong shape —
// it said "you did this and there is nothing more to do", when what the
// reader wants is the way back.
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
// A DRAG IS CONTINUOUS and a KEY PRESS IS NOT, and they need different steps.
// Kobalte's `step` governs both, so it gets the fine one — `dragStep`, the
// smallest unit the domain can express — and the arrow keys are intercepted in
// the capture phase and moved by `niceStep` instead. Handing Kobalte a keyboard
// -sized step made the thumb jump between rungs under the pointer (Peter,
// 2026-09-16: "they appear to snap to things").
//
// The values are in the CONSUMER'S OWN UNITS. The component formats nothing
// itself — `format` is the caller's, exactly as on Slider.
//
// IT ABSORBS ITS CONTAINER, in both directions (Peter, 2026-09-16: "I want the
// charts to naturally absorb the height and width of their containers"). The
// WIDTH drives paging, below. The HEIGHT lengthens the track: `height: 100%`
// computes to `auto` against a parent of indefinite height, so ONE declaration
// serves a card with a height and a content-sized column alike, with no `fill`
// prop and no branch — the trick RateGauge uses (41135a3).
//
// ONE OPERATIONAL NOTE on that measurement, because it will waste somebody's
// afternoon otherwise. `observeSize` defers its callback through
// `requestAnimationFrame` (its documented defence against ResizeObserver
// loops), and a browser SUSPENDS rAF for a document that is not visible. So in
// a hidden or backgrounded tab the dial's CSS box stretches — that is plain
// layout — while the viewBox stays at its last measured height, and the
// drawing looks stretched. Nothing is wrong: no frame is being presented to
// anyone, and the first frame after the tab becomes visible delivers the size
// and corrects it. If you are measuring `viewBox` from an automation harness,
// check `document.visibilityState` FIRST — a hidden window makes a working
// component indistinguishable from a broken one.
//
// What the dial does NOT do is stretch a fixed viewBox to fit. The overlay is
// `preserveAspectRatio="none"`, which scales TEXT along with geometry, so a
// stretched viewBox would magnify the 11px delta labels into something
// distorted. Instead the viewBox GROWS with the box and every y is computed
// against the measured height, so the track lengthens while the arrowheads and
// the figures stay exactly the size they were. Below `MIN_DIAL_HEIGHT` the dial
// stops shrinking: the labels collide before anything else does.
//
// WHEN IT DOES NOT ALL FIT, the row pages. It MEASURES ITSELF — how much room
// a row of dials has is a fact about the page it was dropped into, not
// something a consumer should have to re-measure and re-pass on every layout
// change — shows as many whole dials as fit, never fewer than ONE, and grows a
// chevron at each end. Paging moves the window by one dial rather than by a
// screenful: the row exists to be compared across, and a full-page jump means
// no two neighbours either side of a boundary are ever on screen together.
//
// LAYOUT PURITY — the ROW, each entity's COLUMN and the readout are composed
// from Layout and Text variants. The only geometry this component owns is the
// dial's own interior: a fixed canvas with an SVG overlay and a percentage-
// placed thumb, which is data-driven placement rather than an arrangement
// vocabulary — the same disposition as Slider's notches.
//
// No override props and no factory: `entities`, `domain`, `onChange`,
// `onRemove`, `onRestore`, `onAdd`, `onChangeEnd` and `format` are all DATA. There is no size, no variant
// and no tone to curry.
// ============================================
import { Slider as KobalteSlider } from "@kobalte/core/slider";
import {
  type Component,
  Index,
  type JSX,
  Show,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js";
import { filter } from "../../fn";
import { clamp } from "../../internal/math/clamp";
import { observeSize } from "../../internal/dom/observeSize";
import { SmallGhostButton } from "../Button";
import { Icon } from "../Icon";
import { CenteredStack, StretchRow, TightCenteredColumn } from "../Layout";
import { MonoMeta, MonoValue, NowrapLabel } from "../Text";
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
  moveTogether,
  pinTo,
  settle,
  dialHeightFor,
  dragStep,
  dialGeometry,
  niceStep,
  type RowLayout,
  rowLayout,
  trackDomainOf,
  trackPath,
  windowLabel,
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
  /**
   * Called ONCE when a gesture COMMITS — the pointer is released, or an arrow
   * key has finished its step. The value is clamped into the band, exactly as
   * `onChange` is.
   *
   * `onChange` fires on every intermediate dollar of a drag, which is what a
   * readout wants and what anything EXPENSIVE does not: the scenario board
   * keys timeline rails by pay amount, so following `onChange` would rebuild
   * its rails hundreds of times across one drag and key them by amounts the
   * reader never chose. Take this one for persistence, derived state, or
   * anything that recomputes.
   */
  onChangeEnd?: (id: string, value: number) => void;
  /**
   * Round every emitted amount onto a grid of this size — `1000` to land pay
   * on whole thousands (Peter, 2026-09-16: "Do have the pay amount snap to
   * whole $k numbers").
   *
   * OPTIONAL, and omitted the drag stays continuous to the finest unit the
   * domain can express. This is NOT the `step` prop I declined earlier: that
   * one would have set how far a KEY moves, which is a property of the scale
   * and is derived. This sets which values EXIST, which is a property of the
   * consumer's domain — dollars come in whole thousands on a pay review even
   * though the arithmetic does not care.
   *
   * The band still wins at the edges: a ceiling that is not a multiple of
   * `snap` is emitted exactly as it stands rather than rounded past itself.
   * It also raises the arrow-key step when it is coarser, so the keyboard
   * cannot land between the rungs a drag is confined to.
   */
  snap?: number;
  /**
   * Called when the ⊗ under a dial is pressed. Omitted, no ⊗ is drawn at all
   * and a removed entity still reads as removed by its struck-through name.
   */
  onRemove?: (id: string) => void;
  /**
   * Called when the ↺ under a TERMINATED entity is pressed. Omitted, no ↺ is
   * drawn and a terminated entity has no way back — which is the right shape
   * for a consumer whose scenarios are append-only.
   *
   * What "restore" MEANS is the consumer's: this component holds no memory of
   * what the entity was worth before it was terminated, and inventing one
   * would put a second, stale copy of the truth inside the widget. The obvious
   * reading is `value = old` — put them back on the amount they came in at —
   * and the band floor for someone who never had an `old` at all.
   */
  onRestore?: (id: string) => void;
  /**
   * Which entities are SELECTED, by id. Controlled when supplied.
   *
   * Omitted, the component keeps the selection itself — a consumer who only
   * wants the pinning behaviour should not have to hold state to get it. Pass
   * it when the selection means something ELSEWHERE too: a board that
   * highlights the same people on a chart beside the dials needs to be the one
   * holding the list.
   */
  selected?: readonly string[];
  /**
   * Called when a name is clicked, with the WHOLE new selection rather than
   * the id that changed — a caller storing a list should not have to
   * reimplement the toggle to keep up with it.
   */
  onSelectionChange?: (ids: readonly string[]) => void;
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

/** The new hire's readout: there is no prior amount to compare against. */
const NEW_HIRE = "new";

/**
 * The terminate affordance. Peter's sketch draws a circled cross, and this is
 * that character rather than an `Icon`: the closest glyph in the set is
 * `error`, whose NAME would misdescribe the action everywhere it was read.
 * Restore beside it IS an Icon (`undo`), because one exists that means it.
 */
const TERMINATE_MARK = "⊗";

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

  // ── the row, when it does not all fit ──────────────────────────────────
  // The row measures ITSELF rather than taking a width prop: how much room a
  // row of dials has is a fact about the page it was dropped into, and a
  // consumer would have to re-measure and re-pass it on every layout change.
  //
  // `0` means NOT MEASURED YET, and an unmeasured row shows EVERYTHING rather
  // than falling back to the one-dial minimum. The distinction matters well
  // beyond the first frame: `observeSize` returns a no-op disposer wherever
  // `ResizeObserver` is undefined — SSR, jsdom, older engines — so a width that
  // never arrives is a real and permanent state, not a transient one. Reading
  // it as "one dial" would leave those environments showing a single entity
  // for ever, which looks like a broken component rather than a narrow one.
  //
  // Unknown is not narrow. The minimum-of-one rule is about a container that
  // was MEASURED and found too small.
  const [width, setWidth] = createSignal(0);
  const [offset, setOffset] = createSignal(0);
  // Every dial in a row is the same height, so ONE signal serves them all —
  // whichever reports first, and they agree thereafter.
  const [measuredDialHeight, setMeasuredDialHeight] = createSignal(0);
  /**
   * The selection, when the caller does not hold it. CONTROLLED wins: if
   * `selected` is supplied it is the truth and this is never read, so the two
   * can never drift apart.
   */
  const [ownSelection, setOwnSelection] = createSignal<readonly string[]>([]);
  const selection = (): readonly string[] => props.selected ?? ownSelection();
  const isSelected = (id: string): boolean => selection().includes(id);
  /** Pinning needs TWO or more — one selected dial still drags alone. */
  const isPinned = (id: string): boolean =>
    selection().length > 1 && isSelected(id);

  /** The height to DRAW at: the container's, floored, or the fixed default. */
  const dialHeight = (): number => dialHeightFor(measuredDialHeight());

  /** Emit one change per entity a pin or a group move actually moved. */
  const emitAll = (
    moved: readonly { id: string; value: number }[],
    commit: boolean,
  ): void => {
    for (const { id, value } of moved) {
      props.onChange(id, value);
      if (commit) props.onChangeEnd?.(id, value);
    }
  };

  /**
   * Toggle a name. When the toggle FORMS a group of two or more, every member
   * snaps to the highest amount among them straight away — that is the moment
   * the pin means something, and waiting for a drag would leave the reader
   * looking at a group that says it is pinned and is not.
   */
  const toggleSelection = (id: string): void => {
    const next = isSelected(id)
      ? filter((other: string) => other !== id, selection())
      : [...selection(), id];
    if (props.selected === undefined) setOwnSelection(next);
    props.onSelectionChange?.(next);
    if (next.length > 1 && next.includes(id)) {
      emitAll(pinTo(props.entities, next), true);
    }
  };

  const measure = (el: HTMLDivElement): void => {
    setWidth(el.clientWidth);
    onCleanup(observeSize(el, (size) => setWidth(size.width)));
  };

  const layout = createMemo((): RowLayout => {
    const count = props.entities.length;
    if (width() <= 0) {
      return { start: 0, end: count, capacity: count, paging: false };
    }
    return rowLayout(width(), count, offset(), props.onAdd !== undefined);
  });

  /**
   * Page by ONE dial, not by a screenful.
   *
   * The row exists to be COMPARED across, and a full-page jump means no two
   * neighbours either side of a boundary are ever on screen together — the
   * reader loses exactly the adjacency they were reading. Stepping by one
   * keeps every pair reachable, at the cost of more presses on a long row.
   */
  const page = (delta: number): void => {
    const { capacity } = layout();
    setOffset((current) =>
      clamp(current + delta, 0, Math.max(props.entities.length - capacity, 0)),
    );
  };

  // The window is derived, so it CANNOT disagree with the arrows' disabled
  // state: both read the same memo.
  const atStart = (): boolean => layout().start === 0;
  const atEnd = (): boolean => layout().end >= props.entities.length;

  const visible = createMemo(() =>
    props.entities.slice(layout().start, layout().end),
  );

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

  /**
   * What a POINTER drag moves by: the finest unit the domain can express, so
   * the thumb tracks the pointer instead of jumping between rungs. Kobalte's
   * `step` governs the drag as well as the keyboard, which is why this is not
   * `niceStep` — see `dragStep` in geometry.ts.
   */
  const step = (): number => props.snap ?? dragStep(domain());

  /**
   * What an ARROW KEY moves by. Ten of these for a page key.
   *
   * `snap` raises it when it is coarser: a grid of whole thousands with a
   * finer key step would let the keyboard land between the rungs a drag is
   * confined to, so two ways of moving the same thumb would disagree about
   * which values exist.
   */
  const keyStep = (): number => Math.max(niceStep(domain()), props.snap ?? 0);

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

  /**
   * What the one footer slot does right now, or `null` when the consumer has
   * given it nothing to do.
   *
   * Resolved in ONE place so the label, the glyph, the disabled state and the
   * click can never disagree about which state the button is in — the failure
   * that shape prevents is a ⊗ that says Terminate and calls restore.
   */
  const footerAction = (
    dial: DialGeometry,
    id: string,
    label: string,
  ): { label: string; glyph: JSX.Element; act: () => void } | null => {
    if (dial.removed) {
      const onRestore = props.onRestore;
      return onRestore
        ? {
            label: `Restore ${label}`,
            glyph: <Icon name="undo" size="sm" />,
            act: () => onRestore(id),
          }
        : null;
    }
    const onRemove = props.onRemove;
    return onRemove
      ? {
          label: `Terminate ${label}`,
          glyph: TERMINATE_MARK,
          act: () => onRemove(id),
        }
      : null;
  };

  return (
    <StretchRow
      ref={measure}
      class="sui-mutation-sliders"
      // A group rather than a bare div, so the window is ANNOUNCED. Without
      // it a screen-reader user paging the row hears five dials change names
      // and nothing telling them where in the seven they now are.
      role="group"
      aria-label={windowLabel(
        layout().start,
        layout().end,
        props.entities.length,
      )}
    >
      {/* The chevrons exist only when the row pages. A permanently-present
          pair, greyed out on a row that fits, would be two controls promising
          something the row cannot do. */}
      {/* The row STRETCHES its children now, so each button sits in a column
          that centres it — otherwise a chevron would be drawn as tall as the
          dial beside it. */}
      <Show when={layout().paging}>
        <CenteredStack>
          <SmallGhostButton
            aria-label="Previous dial"
            disabled={atStart()}
            onClick={() => page(-1)}
          >
            <Icon name="chevron-left" size="sm" />
          </SmallGhostButton>
        </CenteredStack>
      </Show>
      {/* `Index`, not `For`. The row is POSITIONAL and its entities change
          value in place, so keying by item identity would replace the whole
          column — and the thumb's DOM node with it — on every step of a drag,
          which drops the pointer capture mid-gesture. Keying by position keeps
          each dial's node and updates only what it draws. */}
      <Index each={visible()}>
        {(entity) => {
          // ONE height feeds everything: the viewBox, the track path, AND
          // every value→y mapping behind the band, the arrows, the change
          // line and the delta label. Omitting it here left those five at the
          // 260px default while the track and the viewBox were at the
          // measured height, so the bands and arrows bunched into the top
          // third of a tall dial and the pointer disagreed with all of them.
          const dial = (): DialGeometry =>
            dialGeometry(domain(), entity(), dialHeight());

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
          /**
           * Arrow and page keys, intercepted in the CAPTURE phase.
           *
           * Kobalte's own thumb handler steps by its `step`, which is now the
           * drag unit — one pound on a salary scale, which no keyboard user
           * wants. Its handler runs unconditionally and does not check
           * `defaultPrevented`, so the only way to replace it is to stop the
           * event before it arrives: a capture listener on the dial fires
           * ahead of Solid's delegated one, and `stopPropagation` there means
           * Kobalte never sees the key at all.
           *
           * Home and End are deliberately left to Kobalte: they run to the
           * domain's ends, and `handleChange` clamps them onto the band.
           */
          const bindDial = (el: HTMLElement): void => {
            // FIRST MEASUREMENT, SYNCHRONOUSLY, on mount.
            //
            // The ref runs before the element is in the document, so
            // `clientHeight` here is 0 and the dial would paint its first
            // frame at the fallback height while the box is already tall. That
            // frame is not cosmetic: the drawn track and Kobalte's track
            // element only line up when the viewBox height EQUALS the dial's
            // pixel height, so until the measurement lands, a pointer maps
            // over one extent while the reader aims at another — which is
            // exactly "my mouse appears to be changing proportionate to the
            // whole slider rather than dragging the handle".
            //
            // `onMount` + `getBoundingClientRect` forces layout and returns
            // the real height with NO animation frame in between. That also
            // makes the dial correct in a hidden tab, where the browser
            // suspends rAF and `observeSize`'s deferred delivery never runs.
            onMount(() => {
              const measured = el.getBoundingClientRect().height;
              // A ZERO height is no information, not a measurement — the same
              // rule the signal itself uses. Writing it would CLOBBER a real
              // size the observer had already delivered, which is exactly what
              // happens under jsdom, where nothing lays out and every rect is
              // zero.
              if (measured > 0) setMeasuredDialHeight(measured);
            });
            onCleanup(
              observeSize(el, (size) => setMeasuredDialHeight(size.height)),
            );
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
                  ? keyStep() * PAGE_MULTIPLE
                  : keyStep();
              const sign = paging !== 0 ? paging : direction;
              const from = current.clampedValue ?? current.range[0];
              const next = settle(
                current.range,
                from + sign * magnitude,
                props.snap,
              );
              if (next !== current.clampedValue) {
                if (isPinned(entity().id)) {
                  emitAll(
                    moveTogether(
                      props.entities,
                      selection(),
                      next - (current.clampedValue ?? next),
                    ),
                    true,
                  );
                  return;
                }
                props.onChange(entity().id, next);
                // Fired right after the step rather than on keyup: a held
                // arrow key repeats keydown without an intervening keyup, so
                // waiting for one would commit once at the END of a long
                // press instead of once per step. Each step IS a completed
                // gesture for the keyboard.
                props.onChangeEnd?.(entity().id, next);
              }
            };
            el.addEventListener("keydown", onKeyDown, true);
            onCleanup(() => el.removeEventListener("keydown", onKeyDown, true));
          };

          const footer = () =>
            footerAction(dial(), entity().id, entity().label);

          /**
           * The drag's COMMIT. Kobalte fires this once on pointer release; it
           * does not fire for the arrow keys, because those are intercepted
           * above before Kobalte sees them, so that path emits its own.
           */
          const handleChangeEnd = (values: number[]): void => {
            const current = dial();
            const next = settle(current.range, values[0], props.snap);
            if (isPinned(entity().id)) {
              const delta = next - (current.clampedValue ?? next);
              emitAll(moveTogether(props.entities, selection(), delta), true);
              return;
            }
            props.onChangeEnd?.(entity().id, next);
          };

          const handleChange = (values: number[]): void => {
            const current = dial();
            // `settle`, not a bare clamp: the grid is this component's promise
            // too, not only Kobalte's. Kobalte snaps to its OWN min-relative
            // grid, which is not the same grid when a band floor is not a
            // multiple of `snap`.
            const next = settle(current.range, values[0], props.snap);
            if (isPinned(entity().id)) {
              // The delta THIS dial travelled, applied to every pinned peer —
              // each clamped to its own band, so one hitting a ceiling stops
              // there while the rest carry on.
              const delta = next - (current.clampedValue ?? next);
              if (delta !== 0) {
                emitAll(
                  moveTogether(props.entities, selection(), delta),
                  false,
                );
              }
              return;
            }
            props.onChange(entity().id, next);
          };

          return (
            <TightCenteredColumn>
              {/* The name is the SELECT control. A real <button>, so Tab and
                  Enter work without this component inventing key handling, and
                  `aria-pressed` because it is a toggle rather than a command —
                  a screen reader then says "Peter, pressed" instead of leaving
                  the state to the colour. */}
              <button
                type="button"
                class="sui-mutation-sliders__name"
                classList={{
                  "sui-mutation-sliders__name--removed": dial().removed,
                  "sui-mutation-sliders__name--selected": isSelected(
                    entity().id,
                  ),
                }}
                aria-pressed={isSelected(entity().id)}
                onClick={() => toggleSelection(entity().id)}
              >
                <NowrapLabel>{entity().label}</NowrapLabel>
              </button>
              <KobalteSlider
                ref={bindDial}
                class="sui-mutation-sliders__dial"
                classList={{
                  "sui-mutation-sliders__dial--selected": isSelected(
                    entity().id,
                  ),
                }}
                orientation="vertical"
                value={[dial().clampedValue ?? dial().range[0]]}
                onChange={handleChange}
                onChangeEnd={handleChangeEnd}
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
                  height={dialHeight()}
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
              {/* The required line, then where they came from — if anywhere.
                  The second line is ALWAYS RENDERED and merely hidden when it
                  has nothing to say (Peter, 2026-09-16: "elements that become
                  invisible but don't hold their space ... the control moves
                  around when you change it"). Dragging a value onto its prior
                  amount used to delete this row, which jumped the big figure
                  and the button up under the pointer mid-gesture. */}
              <MonoValue class="sui-mutation-sliders__figure">
                {futureReadout(dial())}
              </MonoValue>
              <MonoMeta
                class={`sui-mutation-sliders__prior${
                  priorReadout(dial()) === ""
                    ? " sui-mutation-sliders__reserved"
                    : ""
                }`}
              >
                {priorReadout(dial()) || NBSP}
              </MonoMeta>
              {/* ONE slot, three states. An active person offers ⊗ Terminate; a
                  terminated one offers ↺ Restore in the same place; and where
                  the consumer supplies neither callback the button still holds
                  its space, hidden. A disabled ⊗ was the wrong shape: it said
                  "you did this and there is nothing more to do", when what the
                  reader wants is the way back. */}
              <SmallGhostButton
                class={`sui-mutation-sliders__footer${
                  footer() ? "" : " sui-mutation-sliders__reserved"
                }`}
                aria-label={footer()?.label}
                aria-hidden={footer() ? undefined : "true"}
                disabled={!footer()}
                onClick={() => footer()?.act()}
              >
                {footer()?.glyph ?? TERMINATE_MARK}
              </SmallGhostButton>
            </TightCenteredColumn>
          );
        }}
      </Index>
      <Show when={layout().paging}>
        <CenteredStack>
          <SmallGhostButton
            aria-label="Next dial"
            disabled={atEnd()}
            onClick={() => page(1)}
          >
            <Icon name="chevron-right" size="sm" />
          </SmallGhostButton>
        </CenteredStack>
      </Show>
      {/* The `+` stays past the last page ON PURPOSE: hiding the only way to
          add someone whenever the row happens to be scrolled is a dead end the
          reader has to guess their way out of. */}
      <Show when={props.onAdd}>
        {(onAdd) => (
          <CenteredStack>
            <SmallGhostButton aria-label="Add entity" onClick={() => onAdd()()}>
              +
            </SmallGhostButton>
          </CenteredStack>
        )}
      </Show>
    </StretchRow>
  );
};
