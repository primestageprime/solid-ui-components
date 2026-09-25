// ============================================
// ReservedWidth — Atomic (Depth 1)
// Owns CSS (ReservedWidth.css), no component imports.
//
// THE RULE (Peter, 2026-09-24): "When there's an animation like the slide
// out, ensure that the component always holds enough space that it doesn't
// shift the layout of other components" — and hold it INVISIBLY, "with an
// outer element": the visible thing keeps hugging its content.
//
// So this is that outer element. It lays `children` (the live render) and
// `widest` (the same thing drawn in its WIDEST state) into ONE grid cell. The
// cell takes the wider of the two, so the box never changes size whatever
// state the children animate through, and neighbours never move. `widest` is
// invisible (`visibility: hidden`), inert and hidden from assistive tech —
// it only reserves; nothing of it is drawn or reachable. The live children
// sit at the start of the cell, so they hug their own content; the live
// WRAPPER spans the cell, so a child that asks to fill (EditableTitle's
// `fill`) can take the reserved width.
//
// Pair it with anything whose own box animates (SlideReveal): the animation
// happens INSIDE the reservation. First caller: DirtyComboBox.
// ============================================
import type { Component, JSX } from "solid-js";
import "./ReservedWidth.css";

export interface ReservedWidthProps {
  /** The live content. */
  children: JSX.Element;
  /** The same content in its widest state — rendered only to reserve space. */
  widest: JSX.Element;
}

export const ReservedWidth: Component<ReservedWidthProps> = (props) => (
  <span class="sui-reserved-width">
    <span class="sui-reserved-width__live">{props.children}</span>
    <span class="sui-reserved-width__widest" inert aria-hidden="true">
      {props.widest}
    </span>
  </span>
);
