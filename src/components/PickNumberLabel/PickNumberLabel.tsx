// ============================================
// PickNumberLabel — Atomic (Depth 1)
// Owns CSS (PickNumberLabel.css), no component imports.
// Renders "N)" — a numbered-choice label (the "press 1" / "press 2" key
// hint) for pick-one-of-N UIs, e.g. a pairwise comparison. `pulse` is a
// value that changes each time the pick registers (an incrementing
// counter, a timestamp — anything that's !== its previous value); each
// change replays a one-shot scale-bounce, confirming the press without
// remounting the label.
// ============================================
import { type Component, type JSX, splitProps, createEffect, on } from "solid-js";
import "./PickNumberLabel.css";

export interface PickNumberLabelProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  number: number;
  /** Bump this (e.g. a counter) to replay the pop animation. Undefined —
   *  and the first defined value — render inert; only a CHANGE pulses. */
  pulse?: number;
}

export const PickNumberLabel: Component<PickNumberLabelProps> = (props) => {
  const [local, others] = splitProps(props, ["number", "pulse", "class"]);
  let ref: HTMLSpanElement | undefined;

  // Toggling a boolean prop true->true wouldn't retrigger a CSS animation —
  // this removes and re-adds the animating class on every actual change,
  // forcing a reflow in between so the browser treats it as a fresh run.
  // Stays entirely internal (classList, never a call-site `class=` prop).
  createEffect(
    on(
      () => local.pulse,
      (value, prev) => {
        if (value === undefined || prev === undefined || !ref) return;
        ref.classList.remove("sui-pick-number--pop");
        void ref.offsetWidth;
        ref.classList.add("sui-pick-number--pop");
      },
    ),
  );

  const cls = () => (local.class ? `sui-pick-number ${local.class}` : "sui-pick-number");

  return (
    <span ref={ref} class={cls()} {...others}>
      {local.number})
    </span>
  );
};
