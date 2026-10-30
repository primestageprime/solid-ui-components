// ============================================
// NumberPickGrid — Primitive (Depth 1)
// Tags: shows:grid, shows:number, does:pick, does:select, does:hotkey, data:range, role:control
// Owns NumberPickGrid.css; no component imports.
//
// PICK ONE NUMBER FROM A RUN, AND SEE WHERE THE RUN IS HEADING. A grid of
// numbered cells, `from` to `to`, in rows of ten. `value` is the picked number
// (filled). `target` ends a highlighted run (value+1 … target tinted, target
// itself heavily outlined): the next stop. `marker` calls out one more number
// with a dashed outline (the last saved one, say) without picking it.
// Tapping a cell calls `onPick(n)`; the caller decides what that means.
//
// Built for "tap the last chapter you finished", but it is any bounded
// integer pick where position in the run matters: an episode, a lesson, a
// page of a checklist.
//
// KEYBOARD. One tab stop (roving tabindex on the picked cell, else the
// first). Arrows move focus a cell or a row, Home/End jump to the ends, and
// Enter/Space pick — moving focus never picks, because a pick usually saves.
// ============================================
import { type Component, For, createSignal, mergeProps } from "solid-js";
import { gridMove, numberGridCells } from "./numberGrid";
import "./NumberPickGrid.css";

export interface NumberPickGridProps {
  readonly from: number;
  readonly to: number;
  /** The picked number. */
  readonly value?: number;
  /** End of the highlighted run (value+1 … target). */
  readonly target?: number;
  /** One more number to call out, dashed, without picking it. */
  readonly marker?: number;
  readonly onPick?: (n: number) => void;
  /** Accessible name of the group. Default "Pick a number". */
  readonly label?: string;
  /** Describes one cell for assistive tech. Default: the number, plus ", end of run" on the target. */
  readonly cellLabel?: (n: number) => string;
}

/** Visual override: cells per row. */
export interface NumberPickGridOverrides {
  readonly columns?: 10 | 5;
}

export const NumberPickGrid: Component<
  NumberPickGridProps & NumberPickGridOverrides
> = (props) => {
  const cols = () => props.columns ?? 10;
  const cells = () =>
    numberGridCells(props.from, props.to, {
      value: props.value,
      target: props.target,
      marker: props.marker,
    });
  const [focusIndex, setFocusIndex] = createSignal<number | null>(null);
  const tabIndexOf = () => {
    const f = focusIndex();
    if (f !== null && f < cells().length) return f;
    const picked = props.value === undefined ? -1 : props.value - props.from;
    return picked >= 0 && picked < cells().length ? picked : 0;
  };
  let root: HTMLDivElement | undefined;
  const focusCell = (i: number) => {
    setFocusIndex(i);
    root?.querySelectorAll<HTMLButtonElement>("button")[i]?.focus();
  };
  const onKeyDown = (e: KeyboardEvent, i: number) => {
    const next = gridMove(i, e.key, cells().length, cols());
    if (next === null) return;
    e.preventDefault();
    focusCell(next);
  };
  const describe = (n: number, isTarget: boolean) =>
    props.cellLabel?.(n) ?? `${n}${isTarget ? ", end of run" : ""}`;
  return (
    // biome-ignore lint/a11y/useSemanticElements: a fieldset would add a legend and form semantics to a grid of picks; a labelled group is the WAI-ARIA shape here
    <div
      ref={root}
      class={`sui-number-pick-grid sui-number-pick-grid--cols-${cols()}`}
      role="group"
      aria-label={props.label ?? "Pick a number"}
    >
      <For each={cells()}>
        {(c, i) => (
          <button
            type="button"
            class="sui-number-pick-grid__cell"
            classList={{
              "sui-number-pick-grid__cell--picked": c.picked,
              "sui-number-pick-grid__cell--marked": c.marked,
              "sui-number-pick-grid__cell--run": c.inRun,
              "sui-number-pick-grid__cell--target": c.isTarget,
            }}
            tabindex={i() === tabIndexOf() ? 0 : -1}
            aria-pressed={c.picked}
            aria-label={describe(c.n, c.isTarget)}
            onClick={() => {
              setFocusIndex(i());
              props.onPick?.(c.n);
            }}
            onKeyDown={(e) => onKeyDown(e, i())}
          >
            {c.n}
          </button>
        )}
      </For>
    </div>
  );
};

/** Props that remain available to consumers of a curried NumberPickGrid variant. */
export type NumberPickGridDataProps = NumberPickGridProps;

export function createNumberPickGrid(
  defaults: NumberPickGridOverrides = {},
): Component<NumberPickGridDataProps> {
  return (props) => <NumberPickGrid {...mergeProps(defaults, props)} />;
}
