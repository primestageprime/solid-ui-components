// ============================================
// SlideReveal — Atomic (Depth 1)
// Owns CSS (SlideReveal.css), no component imports.
// Slides its children in and out: they are uncovered from the left edge
// (a clip-path) while they fade, in 180ms; instant under
// `prefers-reduced-motion`.
//
// THE RULE (Peter, 2026-09-24): "When there's an animation like the slide
// out, ensure that the component always holds enough space that it doesn't
// shift the layout of other components." So the reveal RESERVES its
// children's full width at all times and animates only what is visible inside
// that box — never its size. A first version animated a 0fr ↔ 1fr grid
// column, which grew the box and pushed every neighbour; that is exactly what
// the rule forbids. Every caller gets the reservation for free.
//
// The children stay MOUNTED while hidden, marked `inert` + `aria-hidden`, so a
// hidden button can be neither tabbed to nor clicked. First caller:
// DirtyComboBox's save segment and reset button.
// ============================================
import type { Component, JSX } from "solid-js";
import "./SlideReveal.css";

export interface SlideRevealProps {
  /** Shown when true; hidden (its space still reserved) when false. */
  when: boolean;
  children: JSX.Element;
}

export const SlideReveal: Component<SlideRevealProps> = (props) => (
  <span
    class={
      props.when
        ? "sui-slide-reveal sui-slide-reveal--open"
        : "sui-slide-reveal"
    }
    // Solid sets `inert` as the DOM PROPERTY, so `false` genuinely un-inerts.
    inert={!props.when}
    aria-hidden={props.when ? undefined : "true"}
  >
    {props.children}
  </span>
);
