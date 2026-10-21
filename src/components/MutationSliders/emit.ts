// How a fan-out speaks to the consumer: which callbacks it calls, and in what
// grouping. Pure of any signal — it only reads the callbacks off the props.
import { batch } from "solid-js";
import type { MutationSlidersProps } from "./props";

/**
 * Which of the two callbacks a fan-out speaks through.
 *
 *   • `change` — intermediate, so `onChange` only.
 *   • `commit` — the value already went out through `onChange`, so this says
 *                only `onChangeEnd`.
 *   • `both`   — one whole gesture that was never dragged: a group forming,
 *                or an arrow key.
 */
export type Emission = "change" | "commit" | "both";

export interface Emitters {
  /** Emit one change per entity a pin or a group move actually moved. */
  readonly emitAll: (
    moved: readonly { id: string; value: number }[],
    how: Emission,
  ) => void;
  /** Emit a role group's member moves as ONE batch. */
  readonly emitGroup: (
    moved: readonly { id: string; value: number }[],
    how: Emission,
  ) => void;
}

export const createEmitters = (props: MutationSlidersProps): Emitters => {
  const emitAll: Emitters["emitAll"] = (moved, how) => {
    for (const { id, value } of moved) {
      if (how !== "commit") props.onChange(id, value);
      if (how !== "change") props.onChangeEnd?.(id, value);
    }
  };
  const emitGroup: Emitters["emitGroup"] = (moved, how) =>
    batch(() => emitAll(moved, how));
  return { emitAll, emitGroup };
};
