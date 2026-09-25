// ============================================
// SlideReveal — Atomic (Depth 1)
// Owns CSS (SlideReveal.css), no component imports.
// Slides its children in and out HORIZONTALLY: its box grows from zero to
// the children's own width (a 0fr ↔ 1fr grid column, nothing measured in JS)
// while they fade, in 180ms; instant under `prefers-reduced-motion`. Because
// the BOX grows, a frame drawn around it grows with it — DirtyComboBox's
// combo border widens as its save segment slides out.
//
// THE RULE (Peter, 2026-09-24): an animation must hold enough space that it
// never shifts the layout of other components — and hold it INVISIBLY, with
// an outer element, so the visible thing has no blank padding. SlideReveal's
// own box moves whatever follows it INSIDE its container, so the container
// must reserve its widest state: wrap it in `ReservedWidth` (outer, invisible)
// and the animation happens inside that reservation. (A clip-only version
// that always held its own width kept neighbours still but left a blank area
// inside the frame — the "padding on the right" Peter rejected.)
//
// The children stay MOUNTED while collapsed, marked `inert` + `aria-hidden`,
// so a hidden button can be neither tabbed to nor clicked.
// ============================================
import type { Component, JSX } from "solid-js";
import "./SlideReveal.css";

export interface SlideRevealProps {
  /** Slid out to full width when true; collapsed to nothing when false. */
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
