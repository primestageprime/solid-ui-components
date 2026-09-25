// ============================================
// MutationSliders — Composite (Depth 3)
// Composes Layout (CenteredStack, FillStretchRow) + Button (SmallGhostButton)
// + Icon over the private `MutationDial` (dial.tsx), which is itself a
// Depth-2 Composite over the `MarkedSlider` Primitive. Depth 3 by the rule —
// 1 + the highest depth it contains — and it says 3 rather than the 2 it
// claimed before because the dial is now a real component boundary instead of
// a file that drew its own SVG.
//
// ZERO CSS, as of 2026-09-17 (Peter's axiom: no component above Depth 1
// contains anything but existing SUI components — no raw elements, no CSS, no
// third-party primitives). The stylesheet this folder used to own is now
// `MarkedSlider.css`, beside the Primitive that paints what it describes; the
// row's own fill chain is `FillStretchRow` (Layout/variants.ts); the readouts
// and the footer slot are Text and Button variants. Nothing here styles
// anything, and nothing here renders an intrinsic element.
//
// A row of VERTICAL dials, one per named entity. Each dial answers: what is
// this entity ALLOWED, where was it, and where is it going?
//
//   • The track runs the whole shared `domain`, so every dial in the row is on
//     ONE scale and two entities are comparable at a glance.
//   • The shaded box is that entity's ALLOWED RANGE — its min→max. It is NOT
//     the size of the change: two entities with the same allowance draw the
//     same box however far each of them moved.
//   • A muted PRIOR arrowhead marks where it was; an accent FUTURE arrowhead
//     marks where it will be. Both point AT the track from opposite sides, so
//     a pair at the same amount meets nose to nose.
//   • Between them, a wider line, GREEN for a rise and RED for a fall (Peter,
//     2026-09-16). Hue is never the only cue — future-above-prior says the
//     same thing by position, so the colourblind theme loses only the
//     reinforcement.
//   • Beside that line, the SIGNED delta as a figure — `+2.5k` in the same
//     tone, level with the line's midpoint. Peter's note of 2026-09-16 was
//     that "the levels are very close"; at close quarters an area is hard to
//     read and a number never is.
//   • Under the dial, the future amount through the caller's `format`, with
//     `was <prior>` muted beneath it — and nothing beneath it at all when the
//     amount did not move, so the figure is never printed twice.
//
// IT IS GENERIC BY CONSTRUCTION. The model is ENTITIES with a prior amount, a
// future amount, an allowed range and a PRESENCE — present, removed or new.
// Every word that carries a consumer's meaning is a `labels` prop with a
// neutral default (labels.ts), and every number is in the consumer's own
// units through the consumer's own `format`. There is nothing about money,
// staffing or any other domain in this folder.
//
// A NEW entity is `old: null` — one that was not in the old scenario. Its dial
// draws the range and the future arrow and no prior arrow, there is no change
// to colour, and the readout says `labels.new`. It is the mirror image of a
// removal, and the two are deliberately different shapes rather than one
// nullable "missing" flag.
//
// REMOVE AND RESTORE SHARE ONE SLOT under each dial: a present entity offers
// ⊗, a removed one offers ↺. A disabled ⊗ was the wrong shape — it said "you
// did this and there is nothing more to do", when what the reader wants is the
// way back.
//
// THE RANGE IS THE CLAMP. Both amounts are pulled onto the entity's allowed
// range before they are drawn, the dial announces the CLAMPED figure, and
// `onChange` never emits outside it — so the thumb stops dead at an edge. The
// raw figures survive in the geometry beside the clamped ones, because a value
// outside its range is usually a fact about the data rather than a rounding
// error.
//
// A removed entity is `value: null` — NOT a fall to the bottom of its range.
// Its name is struck through, its dial keeps the range and the prior arrow and
// loses the future one, and a ⊗ under it says so a second time for anyone who
// cannot see the strike.
//
// The TRACK's domain is DERIVED from the entities by default — lowest range
// floor to highest range ceiling — so the ranges fill the dial's full height
// rather than huddling in a corner of a caller-chosen scale. `domain` stays as
// an optional override for a track that must hold still.
//
// Everything a DIAL draws lives in MarkedSlider — its geometry in
// `MarkedSlider/geometry.ts`, its DOM and its CSS in the Primitive itself.
// Everything about the ROW lives in rows.ts, which is pure and prints as a
// table (rows.test.ts). Every WORD lives in labels.ts. One entity's COLUMN
// lives in dial.tsx. This file owns exactly what is left, and what is left is
// the ROW: how many dials fit, which window shows, which names are selected,
// and what a move means when more than one is pinned.
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
// WHEN IT DOES NOT ALL FIT, the row pages. It MEASURES ITSELF — how much room
// a row of dials has is a fact about the page it was dropped into, not
// something a consumer should have to re-measure and re-pass on every layout
// change — shows as many whole dials as fit, never fewer than ONE, and grows a
// chevron at each end. Paging moves the window by one dial rather than by a
// screenful: the row exists to be compared across, and a full-page jump means
// no two neighbours either side of a boundary are ever on screen together.
//
// A DRAG IS CONTINUOUS and a KEY PRESS IS NOT, and they need different steps.
// Kobalte's `step` governs both, so it gets the fine one — `dragStep`, the
// smallest unit the domain can express — and the arrow keys are intercepted in
// the capture phase and moved by `niceStep` instead. Handing Kobalte a keyboard
// -sized step made the thumb jump between rungs under the pointer (Peter,
// 2026-09-16: "they appear to snap to things").
//
// CURRIED. `format`, `labels` and `snap` are the presentational overrides a
// variant locks; everything else is data and callbacks. See
// `createMutationSliders` below and `variants.ts`.
// ============================================
import {
  type Component,
  Index,
  type JSX,
  Show,
  createMemo,
  createSignal,
  mergeProps,
  onCleanup,
} from "solid-js";
import { filter, map, some } from "../../fn";
import { clamp } from "../../internal/math/clamp";
import { observeSize } from "../../internal/dom/observeSize";
import { SmallGhostButton } from "../Button";
import { Icon } from "../Icon";
import {
  CenteredStack,
  FillStretchRow,
  GutteredFillStretchRow,
} from "../Layout";
import { Dynamic } from "solid-js/web";
import { MutationDial } from "./dial";
import {
  type MutationSliderLabels,
  type ResolvedLabels,
  resolveLabels,
} from "./labels";
import {
  type DialGeometry,
  type Domain,
  type Entity,
  dialHeightFor,
  dragStep,
  clampToRange,
  dialGeometry,
  rangeOf,
  niceStep,
  trackDomainOf,
} from "../MarkedSlider/geometry";
import type { ReadoutMode } from "./readouts";
import { applyLinkedMove, resetLinked } from "./links";
import { settleTyped } from "./typed";
import { type ItemRun, itemLayout, itemRuns } from "./items";
import {
  DIAL_SLOT,
  GUTTERED_DIAL_SLOT,
  GUTTER_GAP,
  ROW_GAP,
  moveTogether,
  pinTo,
  type RowLayout,
  rowLayout,
  windowLabel,
} from "./rows";

export type { MutationSliderLabels } from "./labels";
export type { ReadoutMode as MutationSlidersReadout } from "./readouts";

export interface MutationSlidersProps {
  /** One dial per entity, drawn in the order given — that order is the reading order. */
  entities: readonly Entity[];
  /**
   * The shared `[min, max]` the TRACK runs, in the consumer's own units. Every
   * dial in the row uses it, which is what makes two dials comparable.
   *
   * OPTIONAL. Left out, it is DERIVED from the entities — the lowest range
   * floor to the highest range ceiling — so the ranges fill the dial's full
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
   * amount. The value is already clamped into that entity's allowed range —
   * this never emits a figure the range does not permit.
   */
  onChange: (id: string, value: number) => void;
  /**
   * Called ONCE when a gesture COMMITS — the pointer is released, or an arrow
   * key has finished its step. The value is clamped into the range, exactly as
   * `onChange` is.
   *
   * `onChange` fires on every intermediate unit of a drag, which is what a
   * readout wants and what anything EXPENSIVE does not: a consumer that keys
   * derived state by the amount would rebuild it hundreds of times across one
   * drag, at amounts the reader never chose. Take this one for persistence,
   * derived state, or anything that recomputes.
   */
  onChangeEnd?: (id: string, value: number) => void;
  /**
   * Round every emitted amount onto a grid of this size — `1000` to land an
   * amount on whole thousands (Peter, 2026-09-16: "Do have the ... amount snap
   * to whole $k numbers").
   *
   * OPTIONAL, and omitted the drag stays continuous to the finest unit the
   * domain can express. This is NOT the `step` prop I declined earlier: that
   * one would have set how far a KEY moves, which is a property of the scale
   * and is derived. This sets which values EXIST, which is a property of the
   * consumer's domain — some quantities come in round units even though the
   * arithmetic does not care.
   *
   * The allowed range still wins at the edges: a ceiling that is not a
   * multiple of `snap` is emitted exactly as it stands rather than rounded
   * past itself. It also raises the arrow-key step when it is coarser, so the
   * keyboard cannot land between the rungs a drag is confined to.
   */
  snap?: number;
  /**
   * The words the dial says on the consumer's behalf — the two footer actions
   * and the readout for an entity with no prior amount.
   *
   * OPTIONAL, defaulting to `"Remove"` / `"Restore"` / `"New"`. This component
   * knows nothing about what its entities ARE, so it cannot know whether
   * taking one out is called terminating, cancelling or deleting. Supply the
   * consumer's own verbs here and the domain vocabulary stays at the call
   * site, where it belongs.
   */
  labels?: MutationSliderLabels;
  /**
   * Called when the ⊗ under a dial is pressed. Omitted, no ⊗ is drawn at all
   * and a removed entity still reads as removed by its struck-through name.
   */
  onRemove?: (id: string) => void;
  /**
   * Called when the ↺ under a REMOVED entity is pressed. Omitted, no ↺ is
   * drawn and a removed entity has no way back — which is the right shape for
   * a consumer whose scenarios are append-only.
   *
   * What "restore" MEANS is the consumer's: this component holds no memory of
   * what the entity was worth before it was removed, and inventing one would
   * put a second, stale copy of the truth inside the widget. The obvious
   * reading is `value = old` — put it back on the amount it came in at — and
   * the range floor for something that never had an `old` at all.
   */
  onRestore?: (id: string) => void;
  /**
   * Turns each present dial's footer into a split pair, Reset | Delete,
   * instead of the single ⊗ (Peter, 2026-09-24). Omitted, the footer is
   * exactly what it always was.
   *
   * RESET IS A MOVE, not a setter (Peter, 2026-09-24): a dial with a prior
   * amount goes back to it through `onChange` / `onChangeEnd`, exactly as a
   * drag would — so a LINKED group follows it to that level, and any member
   * that cannot stand there (outside its range, or removed) drops out of the
   * selection through `onSelectionChange` (links.ts, `resetLinked`). This
   * callback is called only for a dial with NO prior amount — a new entity —
   * whose reset means whatever the consumer says it means.
   *
   * Neither Reset nor Delete confirms here — a consumer that wants a confirm
   * on Delete wraps `onRemove` in its own dialog.
   */
  onReset?: (id: string) => void;
  /**
   * Which entities are SELECTED, by id. Controlled when supplied.
   *
   * Omitted, the component keeps the selection itself — a consumer who only
   * wants the pinning behaviour should not have to hold state to get it. Pass
   * it when the selection means something ELSEWHERE too: a board that
   * highlights the same entities on a chart beside the dials needs to be the
   * one holding the list.
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
   * most units in every case.
   */
  format?: (value: number) => string;
  /**
   * Where each dial prints its figures (readouts.ts). Default `"stacked"`:
   * the future amount under the dial, `was <prior>` beneath it, the signed
   * delta beside the change line. `"beside"` puts the OLD amount beside the
   * prior arrowhead and the difference under the new amount as `+$5K (4%)`
   * (Peter's payroll board, 2026-09-24).
   *
   * Presentational, so a variant locks it — see `CompactCurrencyMutationSliders`.
   */
  readout?: ReadoutMode;
  /**
   * How the SELECTION groups dials (Peter, 2026-09-24). Either way, two or
   * more selected dials snap to the highest amount among them and then move
   * together; the modes differ in how they are reached and how they move:
   *
   *   • `"pin"` (default) — the original: click names to select, and a move
   *     carries every selected dial by the same DELTA, so a group a ceiling
   *     split keeps its shape.
   *   • `"link"` — a link button too (under each name, shown on hover or
   *     focus, and always on a selected dial), and a move sends every selected
   *     dial to the same AMOUNT, so a group a ceiling split collapses back to
   *     level on the next move inside it (links.ts, `applyLinkedMove`).
   *
   * Presentational/behavioural, so a variant locks it — see
   * `CompactCurrencyMutationSliders`. The selection itself stays
   * `selected` / `onSelectionChange` in both modes: one group, two triggers.
   */
  grouping?: "pin" | "link";
  /**
   * Makes the amount under each dial EDITABLE IN PLACE, rounding what is
   * typed to this power of ten: `2` → 0.01, `0` → whole units, `-3` → the
   * thousand (Peter, 2026-09-24). Omitted, the amount is static text.
   *
   * No min, max or step of its own: a typed figure lands inside the entity's
   * own RANGE — the same clamp a drag obeys — and `snap` is already the
   * step. It is rounded FIRST and clamped second (typed.ts), so rounding can
   * never carry a figure past the range. A commit moves the dial exactly as
   * one key press does, so a linked or pinned group follows it.
   */
  precision?: number;
  /**
   * What an ITEM of several dials is drawn inside — a subtle background
   * behind one person's two positions (Peter, 2026-09-24). Only runs of two
   * or more dials sharing an `item` are framed; the frame's children are the
   * run's dials in a row with the row's own gap, so the pitch — and the
   * paging arithmetic — is unchanged. Omitted, items still page as whole
   * units but draw no background.
   *
   * A component rather than a colour, so the look stays a variant's business:
   * the consumer curries the frame it wants.
   */
  itemFrame?: Component<{ children?: JSX.Element }>;
}

/**
 * What a curried variant locks: the PRESENTATIONAL decisions.
 *
 * `format` is here for the same reason it is on `Slider` and `BandRail` — the
 * unit a row reads in is a static style decision of the surface it sits on,
 * not per-instance content. `labels` is the vocabulary, and `snap` is which
 * values the consumer's domain admits at all. All three are properties of the
 * CONSUMER'S WORLD rather than of a given row, which is exactly the set a
 * variant should carry.
 *
 * Everything else — the entities, the domain, the selection and every
 * callback — is DATA, and stays at the call site.
 */
export type MutationSlidersOverrides = Pick<
  MutationSlidersProps,
  | "format"
  | "labels"
  | "snap"
  | "readout"
  | "grouping"
  | "precision"
  | "itemFrame"
>;

/** What a curried variant exposes: everything except the curried overrides. */
export type MutationSlidersDataProps = Omit<
  MutationSlidersProps,
  keyof MutationSlidersOverrides
>;

/**
 * A row of range-banded prior-vs-future dials, one per named entity.
 *
 * @example
 *   <MutationSliders
 *     entities={rows()}            // each with `range: [min, max]`
 *     onChange={(id, value) => setAmount(id, value)}
 *     onRemove={(id) => setAmount(id, null)}
 *     onAdd={append}
 *     format={(n) => n.toLocaleString()}
 *   />
 */
export const MutationSliders: Component<MutationSlidersProps> = (props) => {
  const format = (value: number): string => (props.format ?? String)(value);
  const labels = (): ResolvedLabels => resolveLabels(props.labels);

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

  /**
   * A zero reading is no information, not a measurement — writing it would
   * clobber a real size the observer already delivered (under jsdom every rect
   * is zero).
   */
  const measureDial = (height: number): void => {
    if (height > 0) setMeasuredDialHeight(height);
  };

  /**
   * Which of the two callbacks a fan-out speaks through.
   *
   *   • `change` — intermediate, so `onChange` only.
   *   • `commit` — the value already went out through `onChange`, so this says
   *                only `onChangeEnd`.
   *   • `both`   — one whole gesture that was never dragged: a group forming,
   *                or an arrow key.
   */
  type Emission = "change" | "commit" | "both";

  /** Emit one change per entity a pin or a group move actually moved. */
  const emitAll = (
    moved: readonly { id: string; value: number }[],
    how: Emission,
  ): void => {
    for (const { id, value } of moved) {
      if (how !== "commit") props.onChange(id, value);
      if (how !== "change") props.onChangeEnd?.(id, value);
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
      emitAll(pinTo(props.entities, next), "both");
    }
  };

  const measure = (el: HTMLDivElement): void => {
    setWidth(el.clientWidth);
    onCleanup(observeSize(el, (size) => setWidth(size.width)));
  };

  /**
   * The `"beside"` readout's change figure runs right of each bar into the gap,
   * so that row takes the 24px GUTTER (`GutteredFillStretchRow`) and pages by
   * the matching slot. Every other row is exactly the 8px row it was.
   */
  const guttered = (): boolean => props.readout === "beside";

  /** Whether any dial names an ITEM — the row then groups and pages by item. */
  const itemized = (): boolean =>
    some((entity: Entity) => entity.item !== undefined, props.entities);
  /** The row's item runs (items.ts), over every entity, in reading order. */
  const runs = createMemo((): readonly ItemRun[] =>
    itemRuns(map((entity: Entity) => entity.item, props.entities)),
  );

  const layout = createMemo((): RowLayout => {
    const count = props.entities.length;
    if (width() <= 0) {
      return { start: 0, end: count, capacity: count, paging: false };
    }
    if (itemized()) {
      // BY WHOLE ITEMS: a page never shows one of a person's dials without
      // the other. `offset` counts RUNS in this mode.
      const out = itemLayout(
        width(),
        runs(),
        offset(),
        props.onAdd !== undefined,
        guttered() ? GUTTERED_DIAL_SLOT : DIAL_SLOT,
        guttered() ? GUTTER_GAP : ROW_GAP,
      );
      return {
        start: out.start,
        end: out.end,
        capacity: out.end - out.start,
        paging: out.paging,
      };
    }
    return guttered()
      ? rowLayout(
          width(),
          count,
          offset(),
          props.onAdd !== undefined,
          GUTTERED_DIAL_SLOT,
          GUTTER_GAP,
        )
      : rowLayout(width(), count, offset(), props.onAdd !== undefined);
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
    if (itemized()) {
      // One RUN at a time — a whole person, whatever their dial count.
      setOffset((current) =>
        clamp(current + delta, 0, Math.max(runs().length - 1, 0)),
      );
      return;
    }
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
  /** The runs inside the visible window, each as its entities. */
  const visibleRuns = createMemo((): readonly (readonly Entity[])[] =>
    map(
      (run: ItemRun) =>
        map((index: number) => props.entities[index], run.indices),
      filter(
        (run: ItemRun) =>
          run.indices[0] >= layout().start && run.indices[0] < layout().end,
        runs(),
      ),
    ),
  );

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
   * `snap` raises it when it is coarser: a grid of round units with a finer
   * key step would let the keyboard land between the rungs a drag is confined
   * to, so two ways of moving the same thumb would disagree about which values
   * exist.
   */
  const keyStep = (): number => Math.max(niceStep(domain()), props.snap ?? 0);

  /**
   * WHAT A MOVE MEANS, resolved in one place because it is a fact about the
   * ROW: an unpinned dial moves itself, a pinned one moves its whole selection
   * by the delta it travelled.
   *
   * The dial reports an intermediate value through `onChange` and a committed
   * one through `onChangeEnd`, and the two carry different promises:
   *
   *   • intermediate — under the pointer, or one arrow key. `onChange` only.
   *   • committed    — the pointer was released, or the key step finished. The
   *                    same value already went out as intermediate, so this
   *                    says only `onChangeEnd`.
   *
   * An arrow key therefore emits both, in that order, which is what makes one
   * key press a whole gesture: it moves AND it persists.
   *
   * A pinned move fans out to the whole selection either way: `moveTogether`
   * is a group decision, and leaving the peers uncommitted would persist the
   * dragged dial alone.
   */
  const move = (entity: Entity, next: number, commit: boolean): void => {
    if (isPinned(entity.id) && props.grouping === "link") {
      // LINKED: every selected dial to the SAME amount this one reached.
      emitAll(
        applyLinkedMove(props.entities, selection(), next),
        commit ? "commit" : "change",
      );
      return;
    }
    if (isPinned(entity.id)) {
      const current: DialGeometry = dialGeometry(
        domain(),
        entity,
        dialHeight(),
      );
      // The delta THIS dial travelled, applied to every pinned peer — each
      // clamped to its own range, so one hitting a ceiling stops there while
      // the rest carry on.
      const delta = next - (current.clampedValue ?? next);
      if (commit) {
        emitAll(moveTogether(props.entities, selection(), delta), "commit");
        return;
      }
      if (delta !== 0) {
        emitAll(moveTogether(props.entities, selection(), delta), "change");
      }
      return;
    }
    if (commit) props.onChangeEnd?.(entity.id, next);
    else props.onChange(entity.id, next);
  };

  /**
   * A typed figure committed under a dial: settled onto the dial's own range
   * and grid, then moved exactly as one key press moves — intermediate and
   * committed — so a group fans out and a consumer persists it. Nothing that
   * parses to nothing, and nothing that does not move, is emitted.
   */
  const typeIn = (entity: Entity, text: string): void => {
    const precision = props.precision;
    if (precision === undefined) return;
    const current = dialGeometry(domain(), entity, dialHeight());
    const next = settleTyped(text, {
      min: current.range[0],
      max: current.range[1],
      precision,
    });
    if (next === null || next === current.clampedValue) return;
    move(entity, next, false);
    move(entity, next, true);
  };

  /**
   * A per-dial Reset, through the MOVE path. Linked: `resetLinked` decides
   * who follows and who unlinks. Pinned or alone: the same `move` a key
   * press takes. No prior amount: the consumer's `onReset`.
   */
  const resetDial = (entity: Entity): void => {
    if (entity.old === null) {
      props.onReset?.(entity.id);
      return;
    }
    if (props.grouping === "link") {
      const { moves, unlink } = resetLinked(
        props.entities,
        selection(),
        entity.id,
      );
      emitAll(moves, "both");
      if (unlink.length > 0) {
        const next = filter(
          (id: string) => !some((gone: string) => gone === id, unlink),
          selection(),
        );
        if (props.selected === undefined) setOwnSelection(next);
        props.onSelectionChange?.(next);
      }
      return;
    }
    const target = clampToRange(rangeOf(domain(), entity), entity.old);
    move(entity, target, false);
    move(entity, target, true);
  };

  /** One dial of the row. `Index` keys by position — see the render below. */
  const renderDial = (entity: () => Entity): JSX.Element => (
          <MutationDial
            entity={entity()}
            domain={domain()}
            // ONE height feeds everything: the viewBox, the track path, AND
            // every value→y mapping behind the range, the arrows, the change
            // line and the delta label. Omitting it left those five at the
            // 260px default while the track and the viewBox were at the
            // measured height, so the bands and arrows bunched into the top
            // third of a tall dial and the pointer disagreed with all of them.
            height={dialHeight()}
            format={format}
            labels={labels()}
            readout={props.readout}
            snap={props.snap}
            dragStep={step()}
            keyStep={keyStep()}
            selected={isSelected(entity().id)}
            onSelect={() => toggleSelection(entity().id)}
            onMeasure={measureDial}
            onMove={(value) => move(entity(), value, false)}
            onCommit={(value) => move(entity(), value, true)}
            onRemove={
              props.onRemove ? () => props.onRemove?.(entity().id) : undefined
            }
            onRestore={
              props.onRestore ? () => props.onRestore?.(entity().id) : undefined
            }
            onType={
              props.precision === undefined
                ? undefined
                : (text) => typeIn(entity(), text)
            }
            onReset={
              props.onReset ? () => resetDial(entity()) : undefined
            }
            onLink={
              props.grouping === "link"
                ? () => toggleSelection(entity().id)
                : undefined
            }
            linked={props.grouping === "link" && isSelected(entity().id)}
          />
  );

  return (
    <Dynamic
      component={guttered() ? GutteredFillStretchRow : FillStretchRow}
      ref={measure}
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
      <Show
        when={itemized()}
        fallback={<Index each={visible()}>{renderDial}</Index>}
      >
        {/* ITEMS: a run of two or more dials sharing an `item` sits inside
            the consumer's `itemFrame`, in a row with the row's own gap, so the
            pitch — and the paging — is the same as unframed dials. */}
        <Index each={visibleRuns()}>
          {(run) => (
            <Show
              when={run().length > 1 && props.itemFrame}
              fallback={<Index each={run()}>{renderDial}</Index>}
            >
              {(Frame) => (
                <Dynamic component={Frame()}>
                  <Dynamic
                    component={
                      guttered() ? GutteredFillStretchRow : FillStretchRow
                    }
                  >
                    <Index each={run()}>{renderDial}</Index>
                  </Dynamic>
                </Dynamic>
              )}
            </Show>
          )}
        </Index>
      </Show>
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
          add an entity whenever the row happens to be scrolled is a dead end
          the reader has to guess their way out of. */}
      <Show when={props.onAdd}>
        {(onAdd) => (
          <CenteredStack>
            <SmallGhostButton aria-label="Add entity" onClick={() => onAdd()()}>
              +
            </SmallGhostButton>
          </CenteredStack>
        )}
      </Show>
    </Dynamic>
  );
};

/**
 * Curry a row: lock the unit, the vocabulary and the grid once, and the call
 * site is left with data and callbacks.
 *
 * @example
 *   const PayReviewSliders = createMutationSliders({
 *     format: (n) => `$${Math.round(n / 1000)}k`,
 *     labels: { remove: "Terminate", restore: "Reinstate", new: "new hire" },
 *     snap: 1_000,
 *   });
 */
export function createMutationSliders(
  defaults: Partial<MutationSlidersOverrides>,
): Component<MutationSlidersDataProps> {
  return (props): JSX.Element => (
    <MutationSliders {...mergeProps(defaults, props)} />
  );
}
