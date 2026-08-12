// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// HeatStream — Atomic (Depth 1)
// Owns CSS (HeatStream.css), no component imports.
// Transposed stream: keys flow top-to-bottom (rows),
// items flow left-to-right (columns, earliest left, latest right).
// ============================================
import {
  type Component,
  createSignal,
  For,
  type JSX,
  onCleanup,
  Show,
  splitProps,
} from "solid-js";
import { hoverPanelHeight } from "../../internal/geometry/hoverPanelHeight";
import { clickableCursor } from "../../internal/style/clickable";
import "./HeatStream.css";

export type HeatStreamStatus =
  | "missing"
  | "partial"
  | "full"
  | "unknown"
  | "empty"
  | "info";

export interface HeatStreamItem {
  name: string;
  statuses: Record<string, HeatStreamStatus>;
}

export interface HeatStreamProps extends JSX.HTMLAttributes<HTMLDivElement> {
  items: HeatStreamItem[];
  keys?: string[];
  showLegend?: boolean;
  showLabels?: boolean;
  variant?: "default" | "compact";
  previewLabel?: string;
  onItemClick?: (name: string, key: string) => void;
  /**
   * Compact auto-fill: the largest item count across the surrounding set of
   * streams (e.g. every cell in a HeatStreamGrid). When provided, compact
   * cells size so the fullest stream (this many items) exactly fills the
   * available width with a 1px gap between cells, and every cell uses that
   * same width so all marks are uniform. Omit for the default fixed 3px cell.
   */
  maxItems?: number;
}

const DEFAULT_KEYS = ["A", "B", "C", "D"];

export const HeatStream: Component<HeatStreamProps> = (props) => {
  const [local, others] = splitProps(props, [
    "items",
    "keys",
    "showLegend",
    "showLabels",
    "variant",
    "previewLabel",
    "onItemClick",
    "maxItems",
    "class",
    "style",
  ]);

  const keys = () => local.keys ?? DEFAULT_KEYS;

  const classes = () => {
    const list = ["jtf-heatstream"];
    list.push(`jtf-heatstream--${local.variant || "default"}`);
    if (local.showLabels !== false) list.push("jtf-heatstream--labeled");
    if (local.maxItems != null) list.push("jtf-heatstream--fill");
    if (showPreview()) list.push("jtf-heatstream--preview-open");
    if (local.class) list.push(local.class);
    return list.join(" ");
  };

  // Expose the surrounding max item count so the stylesheet can size compact
  // cells via calc() — no JS-time measurement needed (see HeatStream.css).
  const rootStyle = (): JSX.CSSProperties => ({
    ...((typeof local.style === "object" && local.style) || {}),
    ...(local.maxItems != null
      ? { "--jtf-hs-max-count": String(Math.max(1, local.maxItems)) }
      : {}),
  });

  // Items in chronological order (earliest left, latest right)
  const orderedItems = () => local.items;

  // Track position for fixed preview (compact only)
  const [previewStyle, setPreviewStyle] = createSignal<JSX.CSSProperties>({});
  let rootRef: HTMLDivElement | undefined;

  // Preview row metrics. The label is 11px/1 (see .jtf-heatstream__preview-
  // label), so 14px of row plus the 2px inter-row gap is the least a row can
  // take and stay readable; chrome is the 12px padding either side plus the
  // heading and its 8px margin.
  const PREVIEW_ROW_PX = 16;
  const PREVIEW_CHROME_PX = 46;
  const PREVIEW_MIN_PX = 200;

  const updatePosition = () => {
    if (!rootRef) return;
    const rect = rootRef.getBoundingClientRect();
    // Preview width is ~1/4 of the viewport (see .jtf-heatstream__preview).
    const margin = 8;
    const pw = Math.max(280, window.innerWidth * 0.25);
    // Height is content-driven — one legible row per key — so a long key list
    // gets a taller panel rather than thinner rows. Set inline below; the
    // stylesheet deliberately declares no height for this element.
    const ph = hoverPanelHeight({
      rowCount: keys().length,
      rowPx: PREVIEW_ROW_PX,
      chromePx: PREVIEW_CHROME_PX,
      minPx: PREVIEW_MIN_PX,
      viewportPx: window.innerHeight,
      marginPx: margin,
    });
    // Prefer above the cell; flip below when there isn't room, then clamp.
    let top = rect.top - ph - 4;
    if (top < margin) top = rect.bottom + 4;
    top = Math.min(top, window.innerHeight - ph - margin);
    top = Math.max(top, margin);
    // Align left to the cell, clamp so the wide box stays on-screen.
    let left = Math.min(rect.left, window.innerWidth - pw - margin);
    left = Math.max(left, margin);
    setPreviewStyle({
      position: "fixed",
      top: `${top}px`,
      left: `${left}px`,
      height: `${ph}px`,
    });
  };

  // Hover-intent debounce: reveal the preview only after the pointer has rested
  // on an actual mark for HOVER_DELAY_MS. The timer arms only while a grid mark
  // is under the pointer (not the empty part of a sparse row), so this also
  // enforces "marks only". Moving off the marks cancels it and hides the panel.
  const HOVER_DELAY_MS = 700;
  const [showPreview, setShowPreview] = createSignal(false);
  let hoverTimer: ReturnType<typeof setTimeout> | undefined;

  const clearHoverTimer = () => {
    if (hoverTimer !== undefined) {
      clearTimeout(hoverTimer);
      hoverTimer = undefined;
    }
  };

  const markHovered = () =>
    !!rootRef?.querySelector(
      ".jtf-heatstream__rows .jtf-heatstream__cell:hover",
    );

  const handleMouseMove = () => {
    if (markHovered()) {
      if (!showPreview() && hoverTimer === undefined) {
        hoverTimer = setTimeout(() => {
          hoverTimer = undefined;
          updatePosition();
          setShowPreview(true);
        }, HOVER_DELAY_MS);
      }
    } else {
      clearHoverTimer();
      if (showPreview()) setShowPreview(false);
    }
  };

  const handleMouseLeave = () => {
    clearHoverTimer();
    setShowPreview(false);
  };

  onCleanup(clearHoverTimer);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: hover-intent tooltip affordance; no activating action
    <div
      class={classes()}
      ref={rootRef}
      style={rootStyle()}
      onMouseMove={local.variant === "compact" ? handleMouseMove : undefined}
      onMouseLeave={local.variant === "compact" ? handleMouseLeave : undefined}
      {...others}
    >
      <Show when={local.showLegend}>
        <div class="jtf-heatstream__legend">
          <div class="jtf-heatstream__legend-item">
            <span class="jtf-heatstream__legend-color jtf-heatstream__legend-color--full" />
            <span class="jtf-heatstream__legend-label">Full</span>
          </div>
          <div class="jtf-heatstream__legend-item">
            <span class="jtf-heatstream__legend-color jtf-heatstream__legend-color--partial" />
            <span class="jtf-heatstream__legend-label">Partial</span>
          </div>
          <div class="jtf-heatstream__legend-item">
            <span class="jtf-heatstream__legend-color jtf-heatstream__legend-color--missing" />
            <span class="jtf-heatstream__legend-label">Missing</span>
          </div>
          <div class="jtf-heatstream__legend-item">
            <span class="jtf-heatstream__legend-color jtf-heatstream__legend-color--unknown" />
            <span class="jtf-heatstream__legend-label">Unknown</span>
          </div>
        </div>
      </Show>

      {/* Item name headers across top */}
      <div class="jtf-heatstream__header">
        <Show when={local.showLabels !== false}>
          <div class="jtf-heatstream__row-label" />
        </Show>
        <div class="jtf-heatstream__cells">
          <For each={orderedItems()}>
            {(item) => <div class="jtf-heatstream__col-label">{item.name}</div>}
          </For>
        </div>
      </div>

      {/* Rows: one per key, cells = items left-to-right */}
      <div class="jtf-heatstream__rows">
        <For each={keys()}>
          {(key) => (
            <div class="jtf-heatstream__row">
              <Show when={local.showLabels !== false}>
                <div class="jtf-heatstream__row-label">{key}</div>
              </Show>
              <div class="jtf-heatstream__cells">
                <For each={orderedItems()}>
                  {(item) => {
                    // Unset keys render as `empty` (transparent) — a sparse
                    // stream where each item lights only the keys it sets.
                    const status = item.statuses[key] || "empty";
                    return (
                      // biome-ignore lint/a11y/noStaticElementInteractions: conditionally interactive — role/tabIndex/onKeyDown added when onItemClick is provided; static usage stays non-interactive
                      <div
                        class={`jtf-heatstream__cell jtf-heatstream__cell--${status}`}
                        title={`${item.name} — ${key}: ${status}`}
                        role={local.onItemClick ? "button" : undefined}
                        tabIndex={local.onItemClick ? 0 : undefined}
                        onClick={() => local.onItemClick?.(item.name, key)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            local.onItemClick?.(item.name, key);
                          }
                        }}
                        style={clickableCursor(!!local.onItemClick)}
                      />
                    );
                  }}
                </For>
              </div>
            </div>
          )}
        </For>
      </div>

      {/* Hover preview for compact variant */}
      <Show when={local.variant === "compact" && local.items.length > 0}>
        <div class="jtf-heatstream__preview" style={previewStyle()}>
          <div class="jtf-heatstream__preview-heading">
            {local.previewLabel ? `${local.previewLabel} — ` : ""}
            {local.items.length} vessel call
            {local.items.length !== 1 ? "s" : ""}
          </div>
          <div class="jtf-heatstream__preview-rows">
            <For each={keys()}>
              {(key) => (
                <div class="jtf-heatstream__preview-row">
                  <div class="jtf-heatstream__preview-label">{key}</div>
                  <div class="jtf-heatstream__preview-cells">
                    <For each={orderedItems()}>
                      {(item) => {
                        const status = item.statuses[key] || "missing";
                        return (
                          <div
                            class={`jtf-heatstream__cell jtf-heatstream__cell--${status}`}
                          />
                        );
                      }}
                    </For>
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>
    </div>
  );
};
