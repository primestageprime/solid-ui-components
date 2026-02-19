// ============================================
// HeatStack — Atomic (Depth 1)
// Owns CSS (HeatStack.css), no component imports.
// Vertical stack of items with status cells per key.
// Earliest items at bottom, latest on top.
// ============================================
import { Component, JSX, splitProps, For, Show, createSignal } from "solid-js";
import "./HeatStack.css";

export type HeatStackStatus = "missing" | "partial" | "full" | "unknown";

export interface HeatStackItem {
  name: string;
  statuses: Record<string, HeatStackStatus>;
}

export interface HeatStackProps extends JSX.HTMLAttributes<HTMLDivElement> {
  items: HeatStackItem[];
  keys?: string[];
  showLegend?: boolean;
  showLabels?: boolean;
  variant?: "default" | "compact";
  onItemClick?: (name: string, key: string) => void;
}

const DEFAULT_KEYS = ["A", "B", "C", "D"];

export const HeatStack: Component<HeatStackProps> = (props) => {
  const [local, others] = splitProps(props, [
    "items",
    "keys",
    "showLegend",
    "showLabels",
    "variant",
    "onItemClick",
    "class",
  ]);

  const keys = () => local.keys ?? DEFAULT_KEYS;

  const classes = () => {
    const list = ["jtf-heatstack"];
    list.push(`jtf-heatstack--${local.variant || "default"}`);
    if (local.showLabels !== false) list.push("jtf-heatstack--labeled");
    if (local.class) list.push(local.class);
    return list.join(" ");
  };

  // Reverse so first item renders at bottom
  const reversedItems = () => [...local.items].reverse();

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
        <div class="jtf-heatstack__legend">
          <div class="jtf-heatstack__legend-item">
            <span class="jtf-heatstack__legend-color jtf-heatstack__legend-color--full" />
            <span class="jtf-heatstack__legend-label">Full</span>
          </div>
          <div class="jtf-heatstack__legend-item">
            <span class="jtf-heatstack__legend-color jtf-heatstack__legend-color--partial" />
            <span class="jtf-heatstack__legend-label">Partial</span>
          </div>
          <div class="jtf-heatstack__legend-item">
            <span class="jtf-heatstack__legend-color jtf-heatstack__legend-color--missing" />
            <span class="jtf-heatstack__legend-label">Missing</span>
          </div>
          <div class="jtf-heatstack__legend-item">
            <span class="jtf-heatstack__legend-color jtf-heatstack__legend-color--unknown" />
            <span class="jtf-heatstack__legend-label">Unknown</span>
          </div>
        </div>
      </Show>

      {/* Key headers */}
      <div class="jtf-heatstack__header">
        <Show when={local.showLabels !== false}>
          <div class="jtf-heatstack__row-label" />
        </Show>
        <div class="jtf-heatstack__cells">
          <For each={keys()}>
            {(key) => (
              <div class="jtf-heatstack__key-label">{key}</div>
            )}
          </For>
        </div>
      </div>

      {/* Rows: reversed so earliest is at bottom */}
      <div class="jtf-heatstack__rows">
        <For each={reversedItems()}>
          {(item) => (
            <div class="jtf-heatstack__row">
              <Show when={local.showLabels !== false}>
                <div class="jtf-heatstack__row-label">{item.name}</div>
              </Show>
              <div class="jtf-heatstack__cells">
                <For each={keys()}>
                  {(key) => {
                    const status = item.statuses[key] || "missing";
                    return (
                      <div
                        class={`jtf-heatstack__cell jtf-heatstack__cell--${status}`}
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

      {/* Hover preview for compact variant — shown via CSS :hover, positioned fixed via JS */}
      <Show when={local.variant === "compact" && local.items.length > 0}>
        <div class="jtf-heatstack__preview" style={previewStyle()}>
          <div class="jtf-heatstack__preview-header">
            <div class="jtf-heatstack__preview-label" />
            <div class="jtf-heatstack__preview-cells">
              <For each={keys()}>
                {(key) => <div class="jtf-heatstack__key-label">{key}</div>}
              </For>
            </div>
          </div>
          <div class="jtf-heatstack__preview-rows">
            <For each={reversedItems()}>
              {(item) => (
                <div class="jtf-heatstack__preview-row">
                  <div class="jtf-heatstack__preview-label">{item.name}</div>
                  <div class="jtf-heatstack__preview-cells">
                    <For each={keys()}>
                      {(key) => {
                        const status = item.statuses[key] || "missing";
                        return (
                          <div class={`jtf-heatstack__cell jtf-heatstack__cell--${status}`} />
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
