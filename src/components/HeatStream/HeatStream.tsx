// ============================================
// HeatStream — Atomic (Depth 1)
// Owns CSS (HeatStream.css), no component imports.
// Transposed stream: keys flow top-to-bottom (rows),
// items flow left-to-right (columns, earliest left, latest right).
// ============================================
import { Component, JSX, splitProps, For, Show, createSignal } from "solid-js";
import "./HeatStream.css";

export type HeatStreamStatus = "missing" | "partial" | "full" | "unknown";

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
    "class",
  ]);

  const keys = () => local.keys ?? DEFAULT_KEYS;

  const classes = () => {
    const list = ["jtf-heatstream"];
    list.push(`jtf-heatstream--${local.variant || "default"}`);
    if (local.showLabels !== false) list.push("jtf-heatstream--labeled");
    if (local.class) list.push(local.class);
    return list.join(" ");
  };

  // Items in chronological order (earliest left, latest right)
  const orderedItems = () => local.items;

  // Track position for fixed preview (compact only)
  const [previewStyle, setPreviewStyle] = createSignal<JSX.CSSProperties>({});
  let rootRef: HTMLDivElement | undefined;

  const updatePosition = () => {
    if (!rootRef) return;
    const rect = rootRef.getBoundingClientRect();
    setPreviewStyle({
      position: "fixed",
      top: `${rect.top}px`,
      left: `${rect.left}px`,
      transform: "translateY(-100%) translateY(-4px)",
    });
  };

  return (
    <div
      class={classes()}
      ref={rootRef}
      onMouseEnter={local.variant === "compact" ? updatePosition : undefined}
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
            {(item) => (
              <div class="jtf-heatstream__col-label">{item.name}</div>
            )}
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
                    const status = item.statuses[key] || "missing";
                    return (
                      <div
                        class={`jtf-heatstream__cell jtf-heatstream__cell--${status}`}
                        title={`${item.name} — ${key}: ${status}`}
                        onClick={() => local.onItemClick?.(item.name, key)}
                        style={local.onItemClick ? { cursor: "pointer" } : undefined}
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
          <div class="jtf-heatstream__preview-heading">{local.previewLabel ? `${local.previewLabel} — ` : ""}{local.items.length} vessel call{local.items.length !== 1 ? "s" : ""}</div>
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
                          <div class={`jtf-heatstream__cell jtf-heatstream__cell--${status}`} />
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
