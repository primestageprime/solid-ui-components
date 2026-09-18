// ============================================
// PairedMutationSliders — Composite (Depth 3)
// Composes Layout (CenteredStack, FillStretchRow) + Button (SmallGhostButton)
// + Icon over the private `PairedDial` (pair.tsx), which is itself a Depth-2
// Composite over the `MarkedSlider` Primitive. Depth 3 by the rule — 1 + the
// highest depth it contains — exactly as `MutationSliders` is, and for the
// same reason: the column is a real component boundary rather than a file that
// draws its own SVG.
//
// ZERO CSS AND ZERO INTRINSIC ELEMENTS (Peter's axiom: no component above
// Depth 1 contains anything but existing SUI components). Nothing in this
// folder styles anything, and nothing renders a raw element.
//
// A SIBLING OF `MutationSliders`, NOT A GENERALISATION OF IT (Peter,
// 2026-09-17). The row this component draws is the one that component's own
// `domain` prop forbids: `MutationSliders` documents its domain as "the shared
// [min, max] the TRACK runs… Every dial in the row uses it, which is what makes
// two dials comparable", and two measures in DIFFERENT UNITS — hours a week
// and dollars an hour — share no domain, no formatter and no snap grid. So the
// prop that is that component's whole reason for existing is the prop that
// disqualifies this shape. Widening it to N measures would re-shape `onChange`,
// `format`, `snap`, `selected` and the pinning maths for its two live
// consumers: a breaking change where a sibling is additive (add / deprecate /
// delete). Nothing here deprecates anything there.
//
// WHAT A PAIRED ROW ANSWERS. One named entity, two measures, and one question
// per measure: what is this entity ALLOWED on that measure, where was it, and
// where is it going? Under the pair, a line the CONSUMER computes — the two
// measures multiplied, added, or whatever the consumer's arithmetic is. This
// component never combines them and could not: their units are unrelated by
// construction.
//
// THE MEASURE INDEX IS THE NEW THING, and it is in every signature. `onChange`
// is `(id, measureIndex, value)`, and a PINNED move fans out across the SAME
// measure index of the selected peers and no other. That is not a branch: the
// row projects its paired entities down to single-measure `Entity` views, one
// projection per index (pairs.ts), and hands them to the pin arithmetic
// `MutationSliders/rows.ts` already owns. Measure 0 and measure 1 are two
// disjoint projections, so a pin on one cannot reach the other.
//
// IT ABSORBS ITS CONTAINER, in both directions, exactly as `MutationSliders`
// does. The WIDTH drives paging; the HEIGHT lengthens both tracks. One
// operational note on the measurement, because it will waste somebody's
// afternoon otherwise: `observeSize` defers through `requestAnimationFrame`,
// and a browser SUSPENDS rAF for a document that is not visible, so in a hidden
// tab the CSS box stretches while the viewBox holds at its last measured
// height and the drawing looks stretched. Check `document.visibilityState`
// FIRST from an automation harness — a hidden window makes a working component
// indistinguishable from a broken one.
//
// WHEN IT DOES NOT ALL FIT, the row pages by ONE ENTITY — which is TWO dials,
// because a page that split a pair would put an entity's hours on screen and
// its rate off it, which is precisely the comparison the pair exists to make.
// `rowLayout` takes the slot width as its last, optional argument for this
// (additive, 2026-09-17; every existing caller keeps `DIAL_SLOT`).
//
// CURRIED. `axes` and `labels` are the presentational overrides a variant
// locks — the two units, the two names, the two grids, the two scales, and the
// vocabulary. Everything else is data and callbacks. See
// `createPairedMutationSliders` below, and the barrel for why this component
// ships the FACTORY and no curried variant of its own.
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
import { filter } from "../../fn";
import { observeSize } from "../../internal/dom/observeSize";
import { clamp } from "../../internal/math/clamp";
import { SmallGhostButton } from "../Button";
import { Icon } from "../Icon";
import { CenteredStack, FillStretchRow } from "../Layout";
import {
  type DialGeometry,
  type Entity,
  dialGeometry,
  dialHeightFor,
} from "../MarkedSlider/geometry";
import {
  type RowLayout,
  moveTogether,
  pinTo,
  rowLayout,
  windowLabel,
} from "../MutationSliders/rows";
import { type PairedMeasureAxes, type ResolvedAxes, resolveAxis } from "./axes";
import {
  type PairedMutationSliderLabels,
  type ResolvedPairedLabels,
  resolvePairedLabels,
} from "./labels";
import { PairedDial } from "./pair";
import {
  MEASURE_INDICES,
  type MeasureIndex,
  PAIR_SLOT,
  type PairedMutationEntity,
  measureEntities,
  measureEntity,
} from "./pairs";

export type { PairedMutationSliderLabels } from "./labels";

/** The ids that are pinned together. Named so the signal below needs no
 *  inline generic — see the note at its declaration. */
type Selection = readonly string[];

export interface PairedMutationSlidersProps {
  /** One PAIR of dials per entity, drawn in the order given — that order is the reading order. */
  entities: readonly PairedMutationEntity[];
  /**
   * The two measures, described ONCE for the whole row: each one's name, unit,
   * grid and scale.
   *
   * At the COMPONENT rather than on every entity, because "the second dial is
   * dollars an hour" is a fact about the row. Repeating it per entity would be
   * a fact that can disagree with itself, and a row whose columns disagreed
   * about their own scale is a row that cannot be read across — which is the
   * only thing a row of dials is for.
   *
   * Position for position with each entity's `measures`.
   */
  axes: PairedMeasureAxes;
  /**
   * Called when a drag or a thumb-moving key changes one MEASURE of one
   * entity. The value is already clamped into that measure's allowed range —
   * this never emits a figure the range does not permit.
   *
   * The index says WHICH measure, and it is the difference between this
   * component and a row of single dials: a consumer that ignored it would
   * write an hours figure into a rate.
   */
  onChange: (id: string, measure: MeasureIndex, value: number) => void;
  /**
   * Called ONCE when a gesture COMMITS — the pointer is released, or an arrow
   * key has finished its step. Clamped exactly as `onChange` is.
   *
   * `onChange` fires on every intermediate unit of a drag, which is what a
   * readout wants and what anything EXPENSIVE does not. Take this one for
   * persistence, derived state, or anything that recomputes — including the
   * `summary` below, if computing it is not free.
   */
  onChangeEnd?: (id: string, measure: MeasureIndex, value: number) => void;
  /**
   * The CONSUMER'S one-line reading of a pair, printed under both dials —
   * `"$15k"` for twenty hours a week at $75 an hour.
   *
   * This component runs no arithmetic across the two measures and could not:
   * their units are unrelated by construction, so what a pair means TOGETHER
   * is knowledge only the consumer has. Omitted, the line is not drawn at all
   * rather than drawn empty — that is a decision every column in the row makes
   * the same way, so it cannot cause a jump.
   *
   * Return `""` for an entity that has nothing to say and the space is kept.
   */
  summary?: (entity: PairedMutationEntity) => string;
  /**
   * The words a column says on the consumer's behalf — the two footer actions
   * and the readout for a measure with no prior amount.
   *
   * OPTIONAL, defaulting to `"Remove"` / `"Restore"` / `"New"`. This component
   * knows nothing about what its entities ARE, so it cannot know whether
   * taking one out is called dropping, cancelling or terminating.
   */
  labels?: PairedMutationSliderLabels;
  /**
   * Called when the ⊗ under a pair is pressed. Omitted, no ⊗ is drawn and a
   * removed entity still reads as removed by its struck-through name.
   *
   * An entity is REMOVED when BOTH its measures have `value: null`; there is
   * no separate flag, because a flag beside two nullable values would be a
   * second copy of the same truth that can disagree with itself.
   */
  onRemove?: (id: string) => void;
  /**
   * Called when the ↺ under a REMOVED entity is pressed. Omitted, no ↺ is
   * drawn and a removed entity has no way back — the right shape for a
   * consumer whose scenarios are append-only.
   *
   * What "restore" MEANS is the consumer's: this component holds no memory of
   * what the entity was worth before it was removed, and inventing one would
   * put a second, stale copy of the truth inside the widget.
   */
  onRestore?: (id: string) => void;
  /**
   * Which entities are SELECTED, by id. Controlled when supplied.
   *
   * Omitted, the component keeps the selection itself — a consumer who only
   * wants the pinning behaviour should not have to hold state to get it.
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
}

/**
 * What a curried variant locks: the two PRESENTATIONAL decisions.
 *
 * `axes` carries every per-measure style decision there is — the unit, the
 * name, the grid and the scale — and all four are properties of the CONSUMER'S
 * WORLD rather than of a given row. `labels` is the vocabulary. Everything
 * else — the entities, the selection, the summary and every callback — is DATA,
 * and stays at the call site.
 */
export type PairedMutationSlidersOverrides = Pick<
  PairedMutationSlidersProps,
  "axes" | "labels"
>;

/** What a curried variant exposes: everything except the curried overrides. */
export type PairedMutationSlidersDataProps = Omit<
  PairedMutationSlidersProps,
  keyof PairedMutationSlidersOverrides
>;

/**
 * A row of named entities, each with TWO differently-united range-banded
 * prior-vs-future dials under one name.
 *
 * @example
 *   <PairedMutationSliders
 *     entities={services()}
 *     axes={[
 *       { label: "Hrs/wk", domain: [0, 80], snap: 1, format: (n) => `${n}h` },
 *       { label: "$/hr", domain: [0, 300], snap: 5, format: (n) => `$${n}` },
 *     ]}
 *     summary={(e) => weekly(e)}
 *     onChange={(id, measure, value) => setMeasure(id, measure, value)}
 *   />
 */
export const PairedMutationSliders: Component<PairedMutationSlidersProps> = (
  props,
) => {
  const labels = (): ResolvedPairedLabels => resolvePairedLabels(props.labels);

  // ── the row, when it does not all fit ──────────────────────────────────
  // The row measures ITSELF rather than taking a width prop: how much room it
  // has is a fact about the page it was dropped into, and a consumer would
  // have to re-measure and re-pass it on every layout change.
  //
  // `0` means NOT MEASURED YET, and an unmeasured row shows EVERYTHING rather
  // than falling back to the one-entity minimum. `observeSize` returns a no-op
  // disposer wherever `ResizeObserver` is undefined — SSR, jsdom, older
  // engines — so a width that never arrives is a real and permanent state.
  // Unknown is not narrow: the minimum-of-one rule is about a container that
  // was MEASURED and found too small.
  const [width, setWidth] = createSignal(0);
  const [offset, setOffset] = createSignal(0);
  // Every dial in the row is the same height, so ONE signal serves all of
  // them — whichever reports first, and they agree thereafter.
  const [measuredDialHeight, setMeasuredDialHeight] = createSignal(0);
  /**
   * The selection, when the caller does not hold it. CONTROLLED wins: if
   * `selected` is supplied it is the truth and this is never read, so the two
   * can never drift apart.
   */
  // A NAMED type, not the inline `readonly string[]` generic: the adherence
  // audit's intrinsic-element scan reads `<readonly ` as a raw HTML tag, and a
  // component that claims zero intrinsic elements should not have to explain a
  // false positive to every auditor who runs it.
  const [ownSelection, setOwnSelection] = createSignal<Selection>([]);
  const selection = (): readonly string[] => props.selected ?? ownSelection();
  const isSelected = (id: string): boolean => selection().includes(id);
  /** Pinning needs TWO or more — one selected pair still drags alone. */
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

  /** Both axes, resolved against the data once per render pass. */
  const axes = createMemo(
    (): ResolvedAxes => [
      resolveAxis(props.axes[0], props.entities, 0),
      resolveAxis(props.axes[1], props.entities, 1),
    ],
  );

  /**
   * The row PROJECTED onto one measure — the single-measure view every piece
   * of existing row arithmetic is written against.
   *
   * This is what makes "a pin only moves the same measure" structural rather
   * than conditional: measure 0 and measure 1 are two disjoint projections,
   * and `pinTo` handed one of them cannot see the other.
   */
  const projection = (index: MeasureIndex): readonly Entity[] =>
    measureEntities(props.entities, index);

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
    index: MeasureIndex,
    moved: readonly { id: string; value: number }[],
    how: Emission,
  ): void => {
    for (const { id, value } of moved) {
      if (how !== "commit") props.onChange(id, index, value);
      if (how !== "change") props.onChangeEnd?.(id, index, value);
    }
  };

  /**
   * Toggle a name. When the toggle FORMS a group of two or more, every member
   * snaps to the highest amount among them straight away — ON BOTH MEASURES
   * INDEPENDENTLY, each against its own projection, so the hours level up
   * against the hours and the rates against the rates.
   *
   * That is the moment the pin means something, and waiting for a drag would
   * leave the reader looking at a group that says it is pinned and is not.
   */
  const toggleSelection = (id: string): void => {
    const next = isSelected(id)
      ? filter((other: string) => other !== id, selection())
      : [...selection(), id];
    if (props.selected === undefined) setOwnSelection(next);
    props.onSelectionChange?.(next);
    if (next.length > 1 && next.includes(id)) {
      for (const index of MEASURE_INDICES) {
        emitAll(index, pinTo(projection(index), next), "both");
      }
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
    return rowLayout(
      width(),
      count,
      offset(),
      props.onAdd !== undefined,
      // A PAIR is the unit that pages. Splitting one would put an entity's
      // first measure on screen and its second off it, which is exactly the
      // comparison the pair exists to make.
      PAIR_SLOT,
    );
  });

  /**
   * Page by ONE entity, not by a screenful.
   *
   * The row exists to be COMPARED across, and a full-page jump means no two
   * neighbours either side of a boundary are ever on screen together — the
   * reader loses exactly the adjacency they were reading.
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
   * WHAT A MOVE MEANS, resolved in one place because it is a fact about the
   * ROW: an unpinned pair moves the measure that was dragged, a pinned one
   * moves that SAME measure across its whole selection by the delta it
   * travelled. The other measure is never touched.
   *
   * A pinned move fans out either way: `moveTogether` is a group decision, and
   * leaving the peers uncommitted would persist the dragged dial alone.
   */
  const move = (
    entity: PairedMutationEntity,
    index: MeasureIndex,
    next: number,
    commit: boolean,
  ): void => {
    if (isPinned(entity.id)) {
      const current: DialGeometry = dialGeometry(
        axes()[index].domain,
        measureEntity(entity, index),
        dialHeight(),
      );
      // The delta THIS dial travelled, applied to every pinned peer on the
      // SAME measure — each clamped to its own range, so one hitting a ceiling
      // stops there while the rest carry on.
      const delta = next - (current.clampedValue ?? next);
      if (commit) {
        emitAll(
          index,
          moveTogether(projection(index), selection(), delta),
          "commit",
        );
        return;
      }
      if (delta !== 0) {
        emitAll(
          index,
          moveTogether(projection(index), selection(), delta),
          "change",
        );
      }
      return;
    }
    if (commit) props.onChangeEnd?.(entity.id, index, next);
    else props.onChange(entity.id, index, next);
  };

  /** The consumer's line under one pair, or `null` when they supplied none. */
  const summaryOf = (entity: PairedMutationEntity): string | null =>
    props.summary ? props.summary(entity) : null;

  return (
    <FillStretchRow
      ref={measure}
      // A group rather than a bare div, so the window is ANNOUNCED. Without it
      // a screen-reader user paging the row hears the names change and nothing
      // telling them where in the set they now are.
      role="group"
      aria-label={windowLabel(
        layout().start,
        layout().end,
        props.entities.length,
      )}
    >
      {/* The chevrons exist only when the row pages. A permanently-present
          pair, greyed out on a row that fits, would be two controls promising
          something the row cannot do. Each sits in a column that CENTRES it,
          because the row stretches its children and a chevron drawn as tall as
          the dials beside it is not a button anybody aims at. */}
      <Show when={layout().paging}>
        <CenteredStack>
          <SmallGhostButton
            aria-label="Previous entity"
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
          which drops the pointer capture mid-gesture. */}
      <Index each={visible()}>
        {(entity) => (
          <PairedDial
            entity={entity()}
            axes={axes()}
            height={dialHeight()}
            labels={labels()}
            summary={summaryOf(entity())}
            selected={isSelected(entity().id)}
            onSelect={() => toggleSelection(entity().id)}
            onMeasure={measureDial}
            onMove={(index, value) => move(entity(), index, value, false)}
            onCommit={(index, value) => move(entity(), index, value, true)}
            onRemove={
              props.onRemove ? () => props.onRemove?.(entity().id) : undefined
            }
            onRestore={
              props.onRestore ? () => props.onRestore?.(entity().id) : undefined
            }
          />
        )}
      </Index>
      <Show when={layout().paging}>
        <CenteredStack>
          <SmallGhostButton
            aria-label="Next entity"
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
    </FillStretchRow>
  );
};

/**
 * Curry a paired row: lock the two axes and the vocabulary once, and the call
 * site is left with data and callbacks.
 *
 * @example
 *   const HourlyMutationSliders = createPairedMutationSliders({
 *     axes: [
 *       { label: "Hrs/wk", domain: [0, 80], snap: 1, format: (n) => `${n}` },
 *       { label: "$/hr", domain: [0, 300], snap: 5, format: (n) => `$${n}` },
 *     ],
 *     labels: { remove: "Drop", restore: "Reinstate", new: "added" },
 *   });
 */
export function createPairedMutationSliders(
  defaults: PairedMutationSlidersOverrides,
): Component<PairedMutationSlidersDataProps> {
  return (props): JSX.Element => (
    <PairedMutationSliders {...mergeProps(defaults, props)} />
  );
}
