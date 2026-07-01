/* Table cell renderers — text cells (Id, String, LongText). */
import {
  Component,
  JSX,
  Show,
  createSignal,
  createEffect,
  on,
  onMount,
  onCleanup,
} from "solid-js";
import { Tooltip } from "../Tooltip";
import { CellRendererProps } from "./cellStyle";

// ============================================
// ID Renderer
// ============================================
export const IdCell: Component<CellRendererProps<string | number | null | undefined>> = (props) => {
  return (
    <Show when={props.value != null && props.value !== ""} fallback={<span class="cell-empty">—</span>}>
      <span class="cell-id">{props.value}</span>
    </Show>
  );
};

// ============================================
// String Renderer
// ============================================
export const StringCell: Component<CellRendererProps<string | null | undefined>> = (props) => {
  return (
    <Show when={props.value != null && props.value !== ""} fallback={<span class="cell-empty">—</span>}>
      <span class="cell-string">{props.value}</span>
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

export interface LongTextCellProps extends CellRendererProps<string | null | undefined> {
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
  const [clampOverflow, setClampOverflow] = createSignal(false);

  const maxLen = () => props.maxLength || 50;
  const isClampMode = () => (props.clampLines ?? 0) > 0;
  const revealMode = (): LongTextReveal => props.reveal ?? "inline";

  // Char-count truncation (existing behavior).
  const isCharTruncated = () => {
    if (!props.value) return false;
    return props.value.length > maxLen();
  };

  // Combined truncation flag — char-count when clampLines unset, overflow
  // measurement when clampLines is set.
  const isTruncated = () => (isClampMode() ? clampOverflow() : isCharTruncated());

  // Display text: in clamp mode we always render the full value and let CSS
  // handle the visual truncation. In char-count mode we slice on truncation.
  const displayText = () => {
    if (!props.value) return null;
    if (isClampMode()) return props.value;
    if (expanded() || !isCharTruncated()) return props.value;
    return props.value.slice(0, maxLen());
  };

  // Overflow measurement for clamp mode. Runs on mount, after value/lines
  // changes, and on window resize. Kept cheap — single `getBoundingClientRect`
  // comparison is avoided in favour of intrinsic scroll vs. client metrics.
  const measureOverflow = () => {
    const el = clampEl();
    if (!el) return;
    const lines = props.clampLines ?? 0;
    if (lines <= 0) {
      setClampOverflow(false);
      return;
    }
    const overflowed = el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1;
    setClampOverflow(overflowed);
  };

  onMount(() => {
    if (!isClampMode()) return;
    measureOverflow();
    const onResize = () => measureOverflow();
    window.addEventListener("resize", onResize);
    onCleanup(() => window.removeEventListener("resize", onResize));
  });

  createEffect(
    on(
      () => [props.value, props.clampLines] as const,
      () => {
        // Re-measure when value or clampLines change. Defer to the next frame
        // so layout reflects the new text/styles.
        if (!isClampMode()) return;
        queueMicrotask(measureOverflow);
      },
    ),
  );

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
      class="cell-longtext__text"
      classList={{ "cell-longtext__text--clamped": isClampMode() }}
      style={clampStyle()}
    >
      {displayText()}
    </span>
  );

  return (
    <Show when={props.value != null && props.value !== ""} fallback={<span class="cell-empty">—</span>}>
      <Show
        when={revealMode() === "tooltip"}
        fallback={
          <span class="cell-longtext">
            {renderText()}
            <Show when={!isClampMode() && isTruncated() && !expanded()}>
              <button
                class="cell-longtext__more"
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
                class="cell-longtext__less"
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
          fallback={<span class="cell-longtext">{renderText()}</span>}
        >
          <Tooltip
            content={() => props.value ?? ""}
            placement={props.tooltipPlacement ?? "top"}
            class="cell-longtext cell-longtext--tooltip"
          >
            {renderText()}
          </Tooltip>
        </Show>
      </Show>
    </Show>
  );
};
