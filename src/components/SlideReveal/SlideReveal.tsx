// ============================================
// SlideReveal — Atomic (Depth 1)
// Owns CSS (SlideReveal.css), no component imports.
// Slides its children in and out HORIZONTALLY: the box animates between zero
// width and the children's own intrinsic width (a 0fr ↔ 1fr grid column, so
// nothing is measured in JS) while they fade. 180ms; instant under
// `prefers-reduced-motion`. The children stay MOUNTED while collapsed, marked
// `inert` + `aria-hidden`, so a hidden button can be neither tabbed to nor
// clicked. First caller: DirtyComboBox's save segment and reset button.
// ============================================
import type { Component, JSX } from "solid-js";
import "./SlideReveal.css";

export interface SlideRevealProps {
  /** Shown (slid out to full width) when true; collapsed to nothing when false. */
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
    <span class="sui-slide-reveal__inner">{props.children}</span>
  </span>
);
