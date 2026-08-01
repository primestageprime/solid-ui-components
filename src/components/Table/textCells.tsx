/* Text value renderers (Id, String, LongText). Container-agnostic — render
 * equally in a table cell, a definition-list <dd>, or a card slot; each owns
 * its styling via the co-located CSS below. */
import { type Component, type JSX, Show, createSignal } from "solid-js";
import { Tooltip } from "../Tooltip";
import { EllipsisText } from "./EllipsisText";
import { createTruncationObserver } from "../../hooks/createTruncationObserver";
import type { CellRendererProps } from "./cellStyle";
import "./textCells.css";
import "./cellEmpty.css";

// ============================================
// ID Renderer
// ============================================
export const IdCell: Component<
  CellRendererProps<string | number | null | undefined>
> = (props) => {
  return (
    <Show
      when={props.value != null && props.value !== ""}
      fallback={<span class="sui-value-empty">—</span>}
    >
      <EllipsisText class="sui-value-id" tooltip={String(props.value)} />
    </Show>
  );
};

// ============================================
// String Renderer
// ============================================
export const StringCell: Component<
  CellRendererProps<string | null | undefined>
> = (props) => {
  return (
    <Show
      when={props.value != null && props.value !== ""}
      fallback={<span class="sui-value-empty">—</span>}
    >
      <EllipsisText class="sui-value-string" tooltip={String(props.value)} />
    </Show>
  );
};

// ============================================
// Long Text Renderer (with "more..." truncation)
// ============================================
/**
 * Truncation reveal strategy.
 *
 * - `"inline"` (default) — preserves existing behavior: show an inline
 *   "more..." / "less" toggle button to expand/collapse within the cell.
 * - `"tooltip"` — show the full value on hover in a floating tooltip
 *   (composes the library's Kobalte-backed `Tooltip`, which handles
 *   viewport-aware positioning automatically).
 */
export type LongTextReveal = "inline" | "tooltip";

export interface LongTextCellProps
  extends CellRendererProps<string | null | undefined> {
  /**
   * Character-count truncation threshold. Applies only when `clampLines` is
   * not set. Defaults to 50.
   */
  maxLength?: number;
  /**
   * When `true` (default) the inline reveal button is interactive. Set to
   * `false` to disable expansion while still showing the truncated text
   * and "more..." affordance.
   */
  expandable?: boolean;
  /**
   * Line-count truncation via CSS `-webkit-line-clamp`. When set, overrides
   * `maxLength`: the full value is rendered and truncation is detected at
   * runtime by comparing `scrollHeight`/`scrollWidth` to client dimensions.
   * Use this when the available cell width is dynamic and char-count
   * truncation is too coarse.
   */
  clampLines?: number;
  /**
   * Reveal strategy for the full value when truncated. Defaults to
   * `"inline"` to preserve existing behavior.
   */
  reveal?: LongTextReveal;
  /** Preferred tooltip placement; Kobalte flips automatically when it would overflow. */
  tooltipPlacement?: "top" | "bottom" | "left" | "right";
}

export const LongTextCell: Component<LongTextCellProps> = (props) => {
  const [expanded, setExpanded] = createSignal(false);
  const [clampEl, setClampEl] = createSignal<HTMLSpanElement | undefined>();

  const maxLen = () => props.maxLength || 50;
  const isClampMode = () => (props.clampLines ?? 0) > 0;
  const revealMode = (): LongTextReveal => props.reveal ?? "inline";

  // Char-count truncation (existing behavior).
  const isCharTruncated = () => {
    if (!props.value) return false;
    return props.value.length > maxLen();
  };

  // Clamp-mode truncation is measured, not assumed: the observer tracks the
  // rendered box and reports overflow exactly when CSS paints the ellipsis —
  // re-measuring on every column reflow, not just at mount (see
  // createTruncationObserver). This keeps the tooltip in lockstep with the
  // ellipsis: shown iff the value is actually clipped.
  const clampTruncated = createTruncationObserver(
    clampEl,
    () => [props.value, props.clampLines] as const,
  );

  // Combined truncation flag — char-count when clampLines unset, measured
  // overflow when clampLines is set.
  const isTruncated = () =>
    isClampMode() ? clampTruncated() : isCharTruncated();

  // Display text: in clamp mode we always render the full value and let CSS
  // handle the visual truncation. In char-count mode we slice on truncation.
  const displayText = () => {
    if (!props.value) return null;
    if (isClampMode()) return props.value;
    if (expanded() || !isCharTruncated()) return props.value;
    return props.value.slice(0, maxLen());
  };

  const clampStyle = (): JSX.CSSProperties | undefined => {
    if (!isClampMode()) return undefined;
    return {
      display: "-webkit-box",
      "-webkit-box-orient": "vertical",
      "-webkit-line-clamp": String(props.clampLines),
      "line-clamp": String(props.clampLines),
      overflow: "hidden",
      "word-break": "break-word",
      "white-space": "normal",
    };
  };

  const renderText = () => (
    <span
      ref={setClampEl}
      class="sui-value-longtext__text"
      classList={{ "sui-value-longtext__text--clamped": isClampMode() }}
      style={clampStyle()}
    >
      {displayText()}
    </span>
  );

  return (
    <Show
      when={props.value != null && props.value !== ""}
      fallback={<span class="sui-value-empty">—</span>}
    >
      <Show
        when={revealMode() === "tooltip"}
        fallback={
          <span class="sui-value-longtext">
            {renderText()}
            <Show when={!isClampMode() && isTruncated() && !expanded()}>
              <button
                type="button"
                class="sui-value-longtext__more"
                onClick={(e) => {
                  e.stopPropagation();
                  if (props.expandable !== false) setExpanded(true);
                }}
              >
                more...
              </button>
            </Show>
            <Show when={!isClampMode() && expanded()}>
              <button
                type="button"
                class="sui-value-longtext__less"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(false);
                }}
              >
                less
              </button>
            </Show>
          </span>
        }
      >
        <Show
          when={isTruncated()}
          fallback={<span class="sui-value-longtext">{renderText()}</span>}
        >
          <Tooltip
            content={() => props.value ?? ""}
            placement={props.tooltipPlacement ?? "top"}
            class="sui-value-longtext sui-value-longtext--tooltip"
          >
            {renderText()}
          </Tooltip>
        </Show>
      </Show>
    </Show>
  );
};
