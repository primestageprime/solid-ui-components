/* Table cell primitive — ellipsis-aware text with an iff tooltip.
 *
 * Peter's ruling (2026-07-20): "Whatever component does ellipsising should know
 * that if and only if the ellipsis appears, there should be a tooltip with the
 * full value." A table `<td>` clips overflowing content with `text-overflow:
 * ellipsis` (BaseTable `cellStyle`), but the `<td>` itself can't carry a
 * tooltip — the cell renderer must. `EllipsisText` takes over the single-line
 * clipping from the `<td>` onto an element it owns, measures whether that
 * element is actually clipped (`createTruncationObserver`, re-evaluated on every
 * reflow), and reveals the full value in the SUI `Tooltip` exactly when — and
 * only when — the ellipsis is painted.
 *
 * The measured span is `display: inline-block; max-width: 100%`, so it hugs its
 * content when the value fits (no clip, no tooltip) and caps at the cell width
 * when it doesn't (ellipsis + tooltip). The tooltip trigger is `display: inline`
 * so it never forms a width containing block: the span's `max-width: 100%`
 * resolves against the `<td>` in BOTH the plain and tooltip branches, so the
 * clip state — and thus the branch — is stable (no measure/re-render flip-flop).
 */
import { type Component, type JSX, Show, createSignal } from "solid-js";
import { Tooltip, type TooltipContent } from "../Tooltip";
import { createTruncationObserver } from "../../hooks/createTruncationObserver";

export interface EllipsisTextProps {
  /** The full value, surfaced in the tooltip when the visible text is clipped. */
  tooltip: TooltipContent;
  /** Extra class on the measured span (e.g. the cell class `cell-string`). */
  class?: string;
  /**
   * Force the tooltip on independently of measured clipping — for cells whose
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
