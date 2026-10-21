// ============================================
// MutationSliders — Composite (Depth 3)
// Tags: shows:field, shows:number, shows:diff, does:drag, does:edit, data:list, data:pair, role:panel
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
// lives in dial.tsx. The ROW is split by concern into sibling modules, and this
// file composes them and owns the frame: props.ts (types), scale.ts (domain,
// steps, height), selection.ts, roleGroups.ts, rowWindow.ts (paging),
// rowMoves.ts (what a move means when more than one is pinned), emit.ts and
// dialRenderers.tsx.
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
import { type Component, Index, type JSX, Show, mergeProps } from "solid-js";
import { Dynamic } from "solid-js/web";
import { SmallGhostButton } from "../Button";
import { Icon } from "../Icon";
import {
  CenteredStack,
  FillStretchRow,
  GutteredFillStretchRow,
} from "../Layout";
import { createDialRenderer } from "./dialRenderers";
import { createEmitters } from "./emit";
import { type ResolvedLabels, resolveLabels } from "./labels";
import type {
  MutationSlidersDataProps,
  MutationSlidersOverrides,
  MutationSlidersProps,
} from "./props";
import { createRoleGroups } from "./roleGroups";
import { createRowMoves } from "./rowMoves";
import { createRowWindow } from "./rowWindow";
import { windowLabel } from "./rows";
import { createRowScale } from "./scale";
import { createSelection } from "./selection";

export type { MutationSliderLabels } from "./labels";
export type { SliderGroup as MutationSliderGroup } from "./groups";
export type { ReadoutMode as MutationSlidersReadout } from "./readouts";
export type {
  MutationSlidersDataProps,
  MutationSlidersOverrides,
  MutationSlidersProps,
} from "./props";

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

  // The row's concerns, each in its own module (see the imports). They are
  // built in dependency order: emitters first, then what speaks through them.
  const emitters = createEmitters(props);
  const selection = createSelection(props, emitters);
  const roles = createRoleGroups(props, emitters);
  const { shown } = roles;
  const win = createRowWindow(props, shown);
  const scale = createRowScale(props);
  const moves = createRowMoves(props, scale, selection, emitters);
  const renderDial = createDialRenderer({
    props,
    format,
    labels,
    scale,
    selection,
    roles,
    moves,
    emitGroup: emitters.emitGroup,
  });
  const { layout, guttered, itemized, visible, visibleRuns, page } = win;
  const { slotById } = roles;

  return (
    <Dynamic
      component={guttered() ? GutteredFillStretchRow : FillStretchRow}
      ref={win.measure}
      // A group rather than a bare div, so the window is ANNOUNCED. Without
      // it a screen-reader user paging the row hears five dials change names
      // and nothing telling them where in the seven they now are.
      role="group"
      aria-label={windowLabel(layout().start, layout().end, shown().length)}
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
            disabled={win.atStart()}
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
              when={
                (run().length > 1 ||
                  slotById().get(run()[0]?.id ?? "")?.kind !== "plain") &&
                props.itemFrame
              }
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
            disabled={win.atEnd()}
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
