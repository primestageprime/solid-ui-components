// ============================================
// MutationSliders move resolution — pure, headless, no Solid, no DOM.
//
// WHAT A MOVE MEANS is a fact about the ROW, decided here so the component
// only has to EMIT what this returns. An unpinned dial moves itself; a pinned
// one moves its whole selection by the delta it travelled; a linked one moves
// its whole selection to the SAME amount. The dial reports an intermediate
// value (under the pointer, or one arrow key) and a committed one (pointer
// released, key step finished), and the two carry different promises:
//
//   • `change` — intermediate. `onChange` only.
//   • `commit` — the same value already went out as intermediate, so this says
//                only `onChangeEnd`.
//   • `both`   — one whole gesture that was never dragged: a group forming, or
//                a reset.
//
// Lowercase filename on purpose — see rows.ts for why a PascalCase module here
// would register as a component owing a showcase.
//
// Everything here prints as a table (moves.test.ts).
// ============================================
import {
  type Domain,
  type Entity,
  clampToRange,
  rangeOf,
} from "../MarkedSlider/geometry";
import { applyLinkedMove, resetLinked } from "./links";
import { type PinnedValue, moveTogether } from "./rows";

/** Which of the two callbacks a fan-out speaks through. */
export type Emission = "change" | "commit" | "both";

/** What the row emits for one gesture: who moves where, and through which
 *  callback. `null` means nothing is said at all. */
export interface Fanout {
  readonly moved: readonly PinnedValue[];
  readonly how: Emission;
}

/** The row-level facts one move needs. */
export interface MoveContext {
  readonly entities: readonly Entity[];
  readonly selection: readonly string[];
  /** `"pin"` (the default) moves a group by delta; `"link"` levels it. */
  readonly grouping?: "pin" | "link";
}

/** Pinning needs TWO or more — one selected dial still drags alone. */
export const isPinned = (ctx: MoveContext, id: string): boolean =>
  ctx.selection.length > 1 && ctx.selection.includes(id);

/**
 * Resolve one dial's move to `next`.
 *
 * @param ctx The row.
 * @param entity The dial that moved.
 * @param clampedValue The amount that dial showed BEFORE the move, already
 *   clamped to its band — the delta a pinned group follows is measured from
 *   here, never from the raw `value`.
 * @param next The amount it moved to.
 * @param commit True on a release or a finished key step.
 */
export const resolveMove = (
  ctx: MoveContext,
  entity: Entity,
  clampedValue: number | null,
  next: number,
  commit: boolean,
): Fanout | null => {
  const how: Emission = commit ? "commit" : "change";
  if (isPinned(ctx, entity.id) && ctx.grouping === "link") {
    // LINKED: every selected dial to the SAME amount this one reached.
    return { moved: applyLinkedMove(ctx.entities, ctx.selection, next), how };
  }
  if (isPinned(ctx, entity.id)) {
    // The delta THIS dial travelled, applied to every pinned peer — each
    // clamped to its own range, so one hitting a ceiling stops there while
    // the rest carry on. A commit always reaches the group, even for a zero
    // delta: leaving the peers uncommitted would persist the dragged dial
    // alone. An intermediate zero says nothing.
    const delta = next - (clampedValue ?? next);
    if (!commit && delta === 0) return null;
    return { moved: moveTogether(ctx.entities, ctx.selection, delta), how };
  }
  return { moved: [{ id: entity.id, value: next }], how };
};

/** What a per-dial Reset does. */
export type ResetPlan =
  | { readonly kind: "consumer" }
  | {
      readonly kind: "linked";
      readonly moved: readonly PinnedValue[];
      readonly unlink: readonly string[];
    }
  | { readonly kind: "move"; readonly target: number };

/**
 * Resolve a Reset on `entity`. No prior amount: the consumer's own `onReset`.
 * Linked: `resetLinked` decides who follows and who unlinks. Pinned or alone:
 * a move to the prior amount, clamped onto the dial's range — the same path a
 * key press takes, intermediate then committed.
 */
export const resolveReset = (
  ctx: MoveContext,
  domain: Domain,
  entity: Entity,
): ResetPlan => {
  if (entity.old === null) return { kind: "consumer" };
  if (ctx.grouping === "link") {
    const { moves, unlink } = resetLinked(
      ctx.entities,
      ctx.selection,
      entity.id,
    );
    return { kind: "linked", moved: moves, unlink };
  }
  return {
    kind: "move",
    target: clampToRange(rangeOf(domain, entity), entity.old),
  };
};
