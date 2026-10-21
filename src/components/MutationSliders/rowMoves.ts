// What a move, a typed figure and a Reset mean for ONE entity's dial, and how
// each is emitted. The decisions live in moves.ts (`resolveMove`,
// `resolveReset`); this only emits what they return.
import { filter, some } from "../../fn";
import { type Entity, dialGeometry } from "../MarkedSlider/geometry";
import type { Emitters } from "./emit";
import { type MoveContext, resolveMove, resolveReset } from "./moves";
import type { MutationSlidersProps } from "./props";
import type { RowScale } from "./scale";
import type { RowSelection } from "./selection";
import { settleTyped } from "./typed";

export interface RowMoves {
  readonly move: (entity: Entity, next: number, commit: boolean) => void;
  readonly typeIn: (entity: Entity, text: string) => void;
  readonly resetDial: (entity: Entity) => void;
}

export const createRowMoves = (
  props: MutationSlidersProps,
  scale: RowScale,
  { selection, setSelection }: Pick<RowSelection, "selection" | "setSelection">,
  { emitAll }: Pick<Emitters, "emitAll">,
): RowMoves => {
  const { domain, dialHeight } = scale;

  /** The row-level facts `resolveMove` and `resolveReset` read. */
  const moveContext = (): MoveContext => ({
    entities: props.entities,
    selection: selection(),
    grouping: props.grouping,
  });

  /**
   * WHAT A MOVE MEANS is decided in moves.ts (`resolveMove`); this only emits
   * what it returns. An arrow key calls it twice — intermediate, then
   * committed — which is what makes one key press a whole gesture: it moves
   * AND it persists.
   */
  const move = (entity: Entity, next: number, commit: boolean): void => {
    const shown = dialGeometry(domain(), entity, dialHeight()).clampedValue;
    const fanout = resolveMove(moveContext(), entity, shown, next, commit);
    if (fanout) emitAll(fanout.moved, fanout.how);
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

  /** A per-dial Reset, as `resolveReset` plans it. */
  const resetDial = (entity: Entity): void => {
    const plan = resolveReset(moveContext(), domain(), entity);
    if (plan.kind === "consumer") {
      props.onReset?.(entity.id);
      return;
    }
    if (plan.kind === "linked") {
      emitAll(plan.moved, "both");
      if (plan.unlink.length > 0) {
        setSelection(
          filter(
            (id: string) =>
              !some((gone: string) => gone === id, plan.unlink),
            selection(),
          ),
        );
      }
      return;
    }
    move(entity, plan.target, false);
    move(entity, plan.target, true);
  };

  return { move, typeIn, resetDial };
};
