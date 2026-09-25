// ============================================
// EllipsisText — Composite display Primitive (Depth 2, composes Tooltip)
// Owns CSS (EllipsisText.css). Container-agnostic: renders equally in a
// table <td>, a definition-list <dd>, or a card slot.
// ============================================
//
// Peter's ruling (2026-07-20): "Whatever component does ellipsising should know
// that if and only if the ellipsis appears, there should be a tooltip with the
// full value." This primitive takes the single-line clip onto an element it
// owns, measures whether that element is actually clipped
// (`createTruncationObserver`, re-evaluated on every reflow), and reveals the
// full value in the SUI `Tooltip` exactly when — and only when — the ellipsis
// is painted.
//
// ONE STABLE HOST (G23, 2026-09-25). The measured span is always there and is
// always the element the host lays out — the flex item in a row, the inline
// box in a cell: `display: inline-block; max-width: 100%; min-width: 0`, so it
// hugs its content when the value fits and caps at its bounding box when it
// doesn't. The tooltip trigger lives INSIDE it, as an inline span (never a
// button, which is an atomic box that hugs its content), so mounting the
// tooltip changes nothing about the host's box, and the clip state it was
// mounted for cannot flip.
//
// It used to be the other way round: `<Show>` swapped the span for a
// `<Tooltip>` whose `<button>` then WRAPPED the span. As a direct child of a
// flex row the button became the flex item, hugged its content and stopped
// being clipped — so the tooltip unmounted, the bare span was clipped again,
// and the swap nested effect flushes until "Maximum call stack size exceeded"
// (thorcasting Coverage, prod Roofer). It fired only when the text was
// clipped by a flex SIBLING's share, so it depended on the width at mount.
//
// A span trigger is not focusable by default, so it takes `tabindex="0"`
// while the tooltip is on: a clipped value stays reachable by keyboard, and an
// unclipped one adds no tab stop. The bounded parent is still the host's
// business — the `<td>`, a `min-width: 0` slot, a `<dd>`; this primitive only
// requires that SOME ancestor caps the width.
import { type Component, type JSX, Show, createSignal, splitProps } from "solid-js";
import { Tooltip, type TooltipContent } from "../Tooltip";
import { createTruncationObserver } from "../../hooks/createTruncationObserver";
import "./EllipsisText.css";

export interface EllipsisTextProps {
  /** The full value, surfaced in the tooltip when the visible text is clipped. */
  tooltip: TooltipContent;
  /** Extra class on the measured span (e.g. a host cell class `sui-value-string`). */
  class?: string;
  /**
   * Force the tooltip on independently of measured clipping — for hosts whose
   * inline text is a lossy summary of richer content (e.g. a list's "+N more").
   * OR-ed with the measured truncation; the iff still holds against "is the full
   * value hidden", which such a summary always hides.
   */
  alsoWhen?: () => boolean;
  /** Visible inline content (defaults to the tooltip value for plain strings). */
  children?: JSX.Element;
}

/** The tooltip trigger: an inline span that a keyboard can reach. */
const FocusableSpan: Component<JSX.HTMLAttributes<HTMLSpanElement>> = (props) => {
  const [local, rest] = splitProps(props, ["children"]);
  return (
    // biome-ignore lint/a11y/noNoninteractiveTabindex: a tooltip trigger must be focusable so the full value is reachable by keyboard; a <button> here is an atomic box that hugs its content and re-creates the G23 flex loop
    <span tabIndex={0} {...rest}>
      {local.children}
    </span>
  );
};

export const EllipsisText: Component<EllipsisTextProps> = (props) => {
  const [el, setEl] = createSignal<HTMLElement | undefined>();
  const truncated = createTruncationObserver(el, () => props.children ?? props.tooltip);
  const show = () => truncated() || (props.alsoWhen?.() ?? false);

  const spanClass = () =>
    props.class ? `sui-ellipsis-text ${props.class}` : "sui-ellipsis-text";

  const content = () => props.children ?? props.tooltip;

  return (
    <span ref={setEl} class={spanClass()}>
      <Show when={show()} fallback={content()}>
        <Tooltip
          content={() => props.tooltip}
          class="sui-ellipsis-text__trigger"
          triggerAs={FocusableSpan}
        >
          {content()}
        </Tooltip>
      </Show>
    </span>
  );
};
