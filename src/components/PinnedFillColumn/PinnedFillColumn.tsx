// ============================================
// PinnedFillColumn — Composite (Depth 2)
// Tags: shows:panel, shows:header, does:scroll, does:view, data:scalar, role:container, role:rail
// Owns zero CSS files and zero inline style={} (STYLE_GUIDE Layout Purity —
// composes curried Layout Primitives only).
// A column that fills its parent: an optional pinned `header`, a middle that
// takes the leftover height and scrolls, and an optional pinned `footer`. Each
// pinned bar keeps its height and rests on the 1px theme divider. The middle
// is a ScrollFillColumn, so children space themselves (list items sit flush).
//   <PinnedFillColumn header={<SearchInput … />}> …list… </PinnedFillColumn>
// Data-only (header / footer / children) — nothing presentational to freeze,
// so it is exported directly, like CountChip. A pinned bar's own height comes
// from what is put in it.
// ============================================
import { type Component, type JSX, Show } from "solid-js";
import {
  FillColumnFlush,
  PinnedFooterBox,
  PinnedHeaderBox,
  ScrollFillColumn,
} from "../Layout";

export interface PinnedFillColumnProps {
  /** Pinned above the scrolling middle. Omitted = no bar, no divider. */
  header?: JSX.Element;
  /** Pinned below the scrolling middle. Omitted = no bar, no divider. */
  footer?: JSX.Element;
  /** The scrolling middle. */
  children?: JSX.Element;
}

export const PinnedFillColumn: Component<PinnedFillColumnProps> = (props) => (
  <FillColumnFlush>
    <Show when={props.header}>
      <PinnedHeaderBox data-pinned="header">{props.header}</PinnedHeaderBox>
    </Show>
    <ScrollFillColumn>{props.children}</ScrollFillColumn>
    <Show when={props.footer}>
      <PinnedFooterBox data-pinned="footer">{props.footer}</PinnedFooterBox>
    </Show>
  </FillColumnFlush>
);
