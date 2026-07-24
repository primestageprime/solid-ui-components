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
// The measured span is `display: inline-block; max-width: 100%`, so it hugs its
// content when the value fits (no clip, no tooltip) and caps at its bounding box
// when it doesn't (ellipsis + tooltip). The tooltip trigger is `display: inline`
// so it never forms a width containing block: the span's `max-width: 100%`
// resolves against the SAME bounded parent in both the plain and tooltip
// branches, so the clip state — and thus the branch — is stable (no
// measure/re-render flip-flop). That bounded parent is the host's business —
// the `<td>` in a table, the `min-width: 0` flex slot in a card, the `<dd>`'s
// box in a definition list; this primitive assumes none of them, only that
// SOME ancestor caps the width.
import { type Component, type JSX, Show, createSignal } from "solid-js";
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

export const EllipsisText: Component<EllipsisTextProps> = (props) => {
  const [el, setEl] = createSignal<HTMLElement | undefined>();
  const truncated = createTruncationObserver(el, () => props.children ?? props.tooltip);
  const show = () => truncated() || (props.alsoWhen?.() ?? false);

  const spanClass = () =>
    props.class ? `sui-ellipsis-text ${props.class}` : "sui-ellipsis-text";

  const text = () => (
    <span ref={setEl} class={spanClass()}>
      {props.children ?? props.tooltip}
    </span>
  );

  return (
    <Show when={show()} fallback={text()}>
      <Tooltip content={() => props.tooltip} class="sui-ellipsis-text__trigger">
        {text()}
      </Tooltip>
    </Show>
  );
};
