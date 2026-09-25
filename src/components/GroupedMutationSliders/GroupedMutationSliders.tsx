// ============================================
// GroupedMutationSliders — Composite (Depth 3)
//
// PUBLISHED, as of the 2026-09-19 promotion. It has a dedicated showcase
// (`dev/showcases/grouped-mutation-sliders.tsx`), a catalog entry, a
// COMPONENTS.md section, a CHANGELOG line and a `barrel.test.ts` pinning every
// name it publishes through the PACKAGE ROOT. Its bench is gone — the one
// deliberate step `/promote` exists to take, once an API has settled — and its
// first consumer, the License Board, now imports it from `../../../src` like
// any client.
//
// Composes Layout (CenteredStack, FillStretchRow) + Button (SmallGhostButton)
// + Icon over the private `GroupedDial` (dial.tsx), which is itself a Depth-2
// Composite over the `MarkedSlider` Primitive — and through that dial, the
// `PressableLabelButton`, the Steady/Reserved Mono Text variants and the
// `GlyphSlotGhostButton`. Depth 3 by the rule — 1 + the highest depth it
// contains — exactly as `PairedMutationSliders` is.
//
// ZERO CSS AND ZERO INTRINSIC ELEMENTS (Peter's axiom: no component above
// Depth 1 contains anything but existing SUI components). Nothing in this
// folder styles anything, and nothing renders a raw element.
//
// ── WHY IT EXISTS (the push-back protocol, answered) ───────────────────────
//
// Peter's licence sketch, 2026-09-18: one PRODUCT carries FOUR dials in two
// captioned groups — `mo` (#, $) and `yr` (#, %), where the annual price is a
// percentage transformation of the monthly one. No existing component renders
// N independently-scaled dials under one entity name:
//
//   • `MutationSliders` documents its `domain` as "the shared [min, max] the
//     TRACK runs… Every dial in the row uses it, which is what makes two dials
//     comparable". Four measures in four units share no domain.
//   • `PairedMutationSliders` is a PAIR by TYPE, not by policy:
//     `measures: readonly [PairedMeasure, PairedMeasure]` and
//     `MeasureIndex = 0 | 1`. Four dials under one name is unexpressible, and
//     no prop could express it — the pair is baked into the signatures.
//   • TWO PAIRED ROWS PER ENTITY was the composition to beat, and it loses on
//     the thing the entity IS: it duplicates the name button, the footer slot,
//     the selection and the paging, so one product becomes two things on
//     screen that happen to share a word. The row could then page them apart.
//
// A SIBLING, NOT A GENERALISATION (the same disposition
// `PairedMutationSliders` took toward `MutationSliders`, and for the same
// reason). Re-expressing the paired component over this one would re-shape its
// public types for two live consumers, where a sibling is additive — add /
// deprecate / delete. Nothing here deprecates anything there, and Paired is
// untouched in this pass. Collapsing the two is a LATER step, and only if its
// public types, behaviour and 39 tests survive it byte-identical.
//
// ── WHAT IT ADDS OVER A PAIRED ROW: EXACTLY ONE IDEA ───────────────────────
//
// The GROUP. `axes[i].group` names a caption, and CONSECUTIVE axes sharing a
// name are drawn under one — so four dials read as two pairs rather than four
// strangers. Everything else is the paired component's behaviour at N:
// per-measure scales and formatters, a pin that fans out across the SAME
// measure index and no other, one name, one summary line, one footer slot,
// paging by whole entities.
//
// THE MEASURE INDEX IS A NUMBER, not a union, and that is the type-level whole
// of the change: the count is the consumer's, so there is no finite set of
// positions to name. The pin arithmetic is unchanged and uncopied — the row
// projects its entities down to single-measure `Entity` views, one projection
// per index (groups.ts), and hands them to `MutationSliders/rows.ts`. Measure i
// and measure j are disjoint projections, so a pin on one cannot reach the
// other. That is structural, not a branch.
//
// IT ABSORBS ITS CONTAINER, in both directions, exactly as its two siblings do.
// The WIDTH drives paging; the HEIGHT lengthens every track. One operational
// note on the measurement, because it will waste somebody's afternoon
// otherwise: `observeSize` defers through `requestAnimationFrame`, and a
// browser SUSPENDS rAF for a document that is not visible, so in a hidden tab
// the CSS box stretches while the viewBox holds at its last measured height and
// the drawing looks stretched. Check `document.visibilityState` FIRST from an
// automation harness — a hidden window makes a working component
// indistinguishable from a broken one.
//
// WHEN IT DOES NOT ALL FIT, the row pages by ONE ENTITY — which is N dials,
// because a page that split an entity would put a product's monthly seats on
// screen and its annual ones off it, which is precisely the comparison the
// grouping exists to make. `rowLayout` takes the slot width as its last,
// optional argument for this; `slotFor(axes.length)` is what this row passes.
//
// CURRIED. `axes` and `labels` are the presentational overrides a variant
// locks — every unit, name, grid, scale and caption, plus the vocabulary.
// Everything else is data and callbacks. See `createGroupedMutationSliders`.
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
import { Dynamic } from "solid-js/web";
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
import {
  type GroupedMeasureAxes,
  type ResolvedGroupedAxes,
  resolveAxes,
} from "./axes";
import { GroupedDial } from "./dial";
import {
  type GroupRun,
  type GroupedMeasureIndex,
  type GroupedMutationEntity,
  hasCaptions,
  measureEntities,
  measureEntity,
  measureIndices,
  runsOf,
  slotFor,
} from "./groups";
import {
  type GroupedMutationSliderLabels,
  type ResolvedGroupedLabels,
  resolveGroupedLabels,
} from "./labels";

export type { GroupedMutationSliderLabels } from "./labels";

/** The ids that are pinned together. Named so the signal below needs no inline
 *  generic — the adherence audit's intrinsic-element scan reads `<readonly ` as
 *  a raw HTML tag, and a component that claims zero intrinsic elements should
 *  not have to explain a false positive to every auditor who runs it. */
type Selection = readonly string[];

export interface GroupedMutationSlidersProps {
  /** One COLUMN of dials per entity, drawn in the order given — that order is
   *  the reading order. */
  entities: readonly GroupedMutationEntity[];
  /**
   * The measures, described ONCE for the whole row: each one's name, unit,
   * grid, scale and captioned group.
   *
   * At the COMPONENT rather than on every entity, because "the fourth dial is
   * an annual discount percentage" is a fact about the row. Repeating it per
   * entity would be a fact that can disagree with itself, and a row whose
   * columns disagreed about their own scale is a row that cannot be read
   * across — which is the only thing a row of dials is for.
   *
   * Position for position with each entity's `measures`.
   */
  axes: GroupedMeasureAxes;
  /**
   * Called when a drag or a thumb-moving key changes one MEASURE of one entity.
   * The value is already clamped into that measure's allowed range — this never
   * emits a figure the range does not permit.
   *
   * The index says WHICH measure, and it is the difference between this
   * component and a row of single dials: a consumer that ignored it would write
   * a seat count into a discount.
   */
  onChange: (id: string, measure: GroupedMeasureIndex, value: number) => void;
  /**
   * Called ONCE when a gesture COMMITS — the pointer is released, or an arrow
   * key has finished its step. Clamped exactly as `onChange` is.
   *
   * `onChange` fires on every intermediate unit of a drag, which is what a
   * readout wants and what anything EXPENSIVE does not. Take this one for
   * persistence, derived state, or anything that recomputes — including the
   * `summary` below, if computing it is not free.
   */
  onChangeEnd?: (
    id: string,
    measure: GroupedMeasureIndex,
    value: number,
  ) => void;
  /**
   * The CONSUMER'S one-line reading of a whole entity, printed under every
   * dial — `"$5.9k/mo"` for 120 monthly seats at $15 plus 60 annual ones at
   * 85% of that.
   *
   * This component runs no arithmetic across the measures and could not: their
   * units are unrelated by construction, so what they mean TOGETHER is
   * knowledge only the consumer has. Omitted, the line is not drawn at all
   * rather than drawn empty — that is a decision every column in the row makes
   * the same way, so it cannot cause a jump.
   *
   * Return `""` for an entity that has nothing to say and the space is kept.
   */
  summary?: (entity: GroupedMutationEntity) => string;
  /**
   * The words a column says on the consumer's behalf — the two footer actions
   * and the readout for a measure with no prior amount.
   *
   * OPTIONAL, defaulting to `"Remove"` / `"Restore"` / `"New"`. This component
   * knows nothing about what its entities ARE, so it cannot know whether taking
   * one out is called discontinuing, cancelling or terminating.
   *
   * The GROUP CAPTIONS are not here: they are nouns attached to particular
   * measures, so they ride on `axes` beside the measures they caption.
   */
  labels?: GroupedMutationSliderLabels;
  /**
   * Called when the ⊗ under a column is pressed. Omitted, no ⊗ is drawn and a
   * removed entity still reads as removed by its struck-through name.
   *
   * An entity is REMOVED when EVERY one of its measures has `value: null`;
   * there is no separate flag, because a flag beside N nullable values would be
   * a second copy of the same truth that can disagree with itself.
   */
  onRemove?: (id: string) => void;
  /**
   * Called when the ↺ under a REMOVED entity is pressed. Omitted, no ↺ is drawn
   * and a removed entity has no way back — the right shape for a consumer whose
   * scenarios are append-only.
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
   * Called when a name is clicked, with the WHOLE new selection rather than the
   * id that changed — a caller storing a list should not have to reimplement
   * the toggle to keep up with it.
   */
  onSelectionChange?: (ids: readonly string[]) => void;
  /** Called by the `+` at the end of the row. Omitted, no `+` is drawn. */
  onAdd?: () => void;
  /**
   * What each ENTITY's column — its name and all its dials — is drawn inside:
   * a light background that sets one license config apart from the next
   * (Peter, 2026-09-25). `MutationSliders`' `itemFrame`, one level up. Omitted,
   * the row renders exactly as before.
   *
   * A component rather than a colour, so the look stays a variant's business.
   * Use a borderless, padding-free frame (`ItemTintSurface`): the frame then
   * costs no width and the paging arithmetic is unchanged.
   */
  entityFrame?: Component<{ children?: JSX.Element }>;
}

/**
 * What a curried variant locks: the two PRESENTATIONAL decisions.
 *
 * `axes` carries every per-measure style decision there is — the unit, the
 * name, the grid, the scale and the caption — and all five are properties of
 * the CONSUMER'S WORLD rather than of a given row. `labels` is the vocabulary.
 * Everything else — the entities, the selection, the summary and every
 * callback — is DATA, and stays at the call site.
 */
export type GroupedMutationSlidersOverrides = Pick<
  GroupedMutationSlidersProps,
  "axes" | "labels" | "entityFrame"
>;

/** What a curried variant exposes: everything except the curried overrides. */
export type GroupedMutationSlidersDataProps = Omit<
  GroupedMutationSlidersProps,
  keyof GroupedMutationSlidersOverrides
>;

/**
 * A row of named entities, each with N differently-united range-banded
 * prior-vs-future dials under one name, in captioned groups.
 *
 * @example
 *   <GroupedMutationSliders
 *     entities={products()}
 *     axes={[
 *       { label: "#", group: "mo", domain: [0, 500], snap: 1 },
 *       { label: "$", group: "mo", domain: [0, 600], snap: 1 },
 *       { label: "#", group: "yr", domain: [0, 500], snap: 1 },
 *       { label: "%", group: "yr", domain: [50, 100], snap: 1 },
 *     ]}
 *     summary={(e) => monthlyEquivalent(e)}
 *     onChange={(id, measure, value) => setMeasure(id, measure, value)}
 *   />
 */
export const GroupedMutationSliders: Component<GroupedMutationSlidersProps> = (
  props,
) => {
  const labels = (): ResolvedGroupedLabels =>
    resolveGroupedLabels(props.labels);

  // ── the row, when it does not all fit ──────────────────────────────────
  // The row measures ITSELF rather than taking a width prop: how much room it
  // has is a fact about the page it was dropped into, and a consumer would have
  // to re-measure and re-pass it on every layout change.
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
  const [ownSelection, setOwnSelection] = createSignal<Selection>([]);
  const selection = (): readonly string[] => props.selected ?? ownSelection();
  const isSelected = (id: string): boolean => selection().includes(id);
  /** Pinning needs TWO or more — one selected column still drags alone. */
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

  /** Every axis, resolved against the data once per render pass. */
  const axes = createMemo(
    (): ResolvedGroupedAxes => resolveAxes(props.axes, props.entities),
  );

  /** The captioned runs those axes break into, and whether any is captioned. */
  const runs = createMemo((): readonly GroupRun[] => runsOf(props.axes));
  const captioned = createMemo((): boolean => hasCaptions(props.axes));

  /** Every measure position, in reading order — what a fan-out walks. */
  const indices = createMemo((): readonly number[] =>
    measureIndices(props.axes.length),
  );

  /**
   * The row PROJECTED onto one measure — the single-measure view every piece of
   * existing row arithmetic is written against.
   *
   * This is what makes "a pin only moves the same measure" structural rather
   * than conditional: measure i and measure j are disjoint projections, and
   * `pinTo` handed one of them cannot see the other.
   */
  const projection = (index: GroupedMeasureIndex): readonly Entity[] =>
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
    index: GroupedMeasureIndex,
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
   * snaps to the highest amount among them straight away — ON EVERY MEASURE
   * INDEPENDENTLY, each against its own projection, so the seat counts level up
   * against the seat counts and the fees against the fees.
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
      for (const index of indices()) {
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
      // A WHOLE ENTITY is the unit that pages. Splitting one would put a
      // product's monthly seats on screen and its annual ones off it, which is
      // exactly the comparison the grouping exists to make.
      slotFor(props.axes.length),
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
   * ROW: an unpinned column moves the measure that was dragged, a pinned one
   * moves that SAME measure across its whole selection by the delta it
   * travelled. Every other measure is untouched.
   *
   * A pinned move fans out either way: `moveTogether` is a group decision, and
   * leaving the peers uncommitted would persist the dragged dial alone.
   */
  const move = (
    entity: GroupedMutationEntity,
    index: GroupedMeasureIndex,
    next: number,
    commit: boolean,
  ): void => {
    if (isPinned(entity.id)) {
      const projected = measureEntity(entity, index);
      const axis = axes()[index];
      // A dial that does not exist cannot have been dragged, so this is a
      // guard rather than a case: it exists because `measures` is a LIST and
      // an entity may be shorter than the axes.
      if (projected === undefined || axis === undefined) return;
      const current: DialGeometry = dialGeometry(
        axis.domain,
        projected,
        dialHeight(),
      );
      // The delta THIS dial travelled, applied to every pinned peer on the SAME
      // measure — each clamped to its own range, so one hitting a ceiling stops
      // there while the rest carry on.
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

  /** The consumer's line under one column, or `null` when they supplied none. */
  const summaryOf = (entity: GroupedMutationEntity): string | null =>
    props.summary ? props.summary(entity) : null;

  return (
    <FillStretchRow
      ref={measure}
      // A group rather than a bare div, so the window is ANNOUNCED. Without it
      // a screen-reader user paging the row hears the names change and nothing
      // telling them where in the set they now are.
      role="group"
      // "products 1–3 of 9", not "dials": the count is ENTITIES, and the
      // dials on screen number N times it. `windowLabel`'s noun is the last,
      // optional argument for exactly this.
      aria-label={windowLabel(
        layout().start,
        layout().end,
        props.entities.length,
        "column",
      )}
    >
      {/* The chevrons exist only when the row pages. A permanently-present pair,
          greyed out on a row that fits, would be two controls promising
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
      {/* `Index`, not `For`. The row is POSITIONAL and its entities change value
          in place, so keying by item identity would replace the whole column —
          and the thumb's DOM node with it — on every step of a drag, which
          drops the pointer capture mid-gesture. */}
      <Index each={visible()}>
        {(entity) => {
          const dial = () => (
            <GroupedDial
              entity={entity()}
              axes={axes()}
              runs={runs()}
              captioned={captioned()}
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
                props.onRestore
                  ? () => props.onRestore?.(entity().id)
                  : undefined
              }
            />
          );
          return (
            <Show when={props.entityFrame} fallback={dial()}>
              {(Frame) => <Dynamic component={Frame()}>{dial()}</Dynamic>}
            </Show>
          );
        }}
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
      {/* The `+` stays past the last page ON PURPOSE: hiding the only way to add
          an entity whenever the row happens to be scrolled is a dead end the
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
    </FillStretchRow>
  );
};

/**
 * Curry a grouped row: lock the axes and the vocabulary once, and the call site
 * is left with data and callbacks.
 *
 * @example
 *   const LicenseSliders = createGroupedMutationSliders({
 *     axes: [
 *       { label: "#", group: "mo", domain: [0, 500], snap: 1 },
 *       { label: "$", group: "mo", domain: [0, 600], snap: 1, format: fee },
 *       { label: "#", group: "yr", domain: [0, 500], snap: 1 },
 *       { label: "%", group: "yr", domain: [50, 100], snap: 1, format: pct },
 *     ],
 *     labels: { remove: "Discontinue", restore: "Relaunch", new: "new" },
 *   });
 */
export function createGroupedMutationSliders(
  defaults: GroupedMutationSlidersOverrides,
): Component<GroupedMutationSlidersDataProps> {
  return (props): JSX.Element => (
    <GroupedMutationSliders {...mergeProps(defaults, props)} />
  );
}
