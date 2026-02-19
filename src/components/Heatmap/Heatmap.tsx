// ============================================
// Heatmap + HeatmapMulti — Atomic (Depth 1)
// Owns CSS (Heatmap.css), no component imports.
// Grid cells with status colors, legends, tooltips.
// ============================================
import { Component, JSX, splitProps, For, Show, createMemo } from "solid-js";
import "./Heatmap.css";

export type HeatmapCellStatus = "full" | "partial" | "missing" | "empty";

export interface HeatmapCell {
  id: string;
  value: number;
  status: HeatmapCellStatus;
  label?: string;
}

export interface HeatmapRow {
  id: string;
  label: string;
  cells: HeatmapCell[];
}

export interface HeatmapProps extends JSX.HTMLAttributes<HTMLDivElement> {
  rows: HeatmapRow[];
  columnLabels?: string[];
  variant?: "default" | "compact" | "sparkline";
  showLegend?: boolean;
  showTooltips?: boolean;
  onCellClick?: (rowId: string, cellId: string) => void;
}

export const Heatmap: Component<HeatmapProps> = (props) => {
  const [local, others] = splitProps(props, [
    "rows",
    "columnLabels",
    "variant",
    "showLegend",
    "showTooltips",
    "onCellClick",
    "class",
  ]);

  const classes = () => {
    const classList = ["jtf-heatmap"];
    classList.push(`jtf-heatmap--${local.variant || "default"}`);
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  return (
    <div class={classes()} {...others}>
      <Show when={local.showLegend && local.variant !== "sparkline"}>
        <div class="jtf-heatmap__legend">
          <div class="jtf-heatmap__legend-item">
            <span class="jtf-heatmap__legend-color jtf-heatmap__legend-color--full" />
            <span class="jtf-heatmap__legend-label">Full</span>
          </div>
          <div class="jtf-heatmap__legend-item">
            <span class="jtf-heatmap__legend-color jtf-heatmap__legend-color--partial" />
            <span class="jtf-heatmap__legend-label">Partial</span>
          </div>
          <div class="jtf-heatmap__legend-item">
            <span class="jtf-heatmap__legend-color jtf-heatmap__legend-color--missing" />
            <span class="jtf-heatmap__legend-label">Missing</span>
          </div>
        </div>
      </Show>

      <Show when={local.columnLabels && local.variant !== "sparkline"}>
        <div class="jtf-heatmap__header">
          <div class="jtf-heatmap__row-label" />
          <div class="jtf-heatmap__header-cells">
            <For each={local.columnLabels}>
              {(label) => (
                <div class="jtf-heatmap__header-cell">{label}</div>
              )}
            </For>
          </div>
        </div>
      </Show>

      <div class="jtf-heatmap__body">
        <For each={local.rows}>
          {(row) => (
            <div class="jtf-heatmap__row">
              <Show when={local.variant !== "sparkline"}>
                <div class="jtf-heatmap__row-label">{row.label}</div>
              </Show>
              <div class="jtf-heatmap__cells">
                <For each={row.cells}>
                  {(cell) => (
                    <div
                      class={`jtf-heatmap__cell jtf-heatmap__cell--${cell.status}`}
                      title={local.showTooltips ? `${row.label}: ${cell.label || cell.value}` : undefined}
                      onClick={() => local.onCellClick?.(row.id, cell.id)}
                      style={local.onCellClick ? { cursor: "pointer" } : undefined}
                    />
                  )}
                </For>
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  );
};

// Multi-category heatmap cell (like the vessel call heatmap)
export interface HeatmapMultiCell {
  id: string;
  categories: Record<string, HeatmapCellStatus>;
}

export interface HeatmapMultiRow {
  id: string;
  label: string;
  cells: HeatmapMultiCell[];
}

export interface HeatmapMultiProps extends JSX.HTMLAttributes<HTMLDivElement> {
  rows: HeatmapMultiRow[];
  categoryLabels: string[];
  columnLabels?: string[];
  variant?: "default" | "compact" | "sparkline" | "expanded";
  showLegend?: boolean;
  onCellClick?: (rowId: string, cellId: string) => void;
}

export const HeatmapMulti: Component<HeatmapMultiProps> = (props) => {
  const [local, others] = splitProps(props, [
    "rows",
    "categoryLabels",
    "columnLabels",
    "variant",
    "showLegend",
    "onCellClick",
    "class",
  ]);

  const classes = () => {
    const classList = ["jtf-heatmap-multi"];
    classList.push(`jtf-heatmap-multi--${local.variant || "default"}`);
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  // Check if any category has non-full status (to dim the full bars)
  const hasErrors = (cell: HeatmapMultiCell) => {
    return local.categoryLabels.some(
      cat => cell.categories[cat] !== 'full' && cell.categories[cat] !== undefined
    );
  };

  return (
    <div class={classes()} {...others}>
      <Show when={local.showLegend && local.variant !== "sparkline"}>
        <div class="jtf-heatmap__legend">
          <div class="jtf-heatmap__legend-item">
            <span class="jtf-heatmap__legend-color jtf-heatmap__legend-color--full" />
            <span class="jtf-heatmap__legend-label">Full</span>
          </div>
          <div class="jtf-heatmap__legend-item">
            <span class="jtf-heatmap__legend-color jtf-heatmap__legend-color--partial" />
            <span class="jtf-heatmap__legend-label">Partial</span>
          </div>
          <div class="jtf-heatmap__legend-item">
            <span class="jtf-heatmap__legend-color jtf-heatmap__legend-color--missing" />
            <span class="jtf-heatmap__legend-label">Missing</span>
          </div>
        </div>
      </Show>

      <Show when={local.columnLabels && local.variant === "expanded"}>
        <div class="jtf-heatmap-multi__header">
          <div class="jtf-heatmap-multi__row-label" />
          <div class="jtf-heatmap-multi__header-cells">
            <For each={local.columnLabels}>
              {(label) => (
                <div class="jtf-heatmap-multi__header-cell">{label}</div>
              )}
            </For>
          </div>
        </div>
      </Show>

      <div class="jtf-heatmap-multi__body">
        <For each={local.rows}>
          {(row) => (
            <div class="jtf-heatmap-multi__row">
              <Show when={local.variant !== "sparkline"}>
                <div class="jtf-heatmap-multi__row-label">{row.label}</div>
              </Show>
              <div class="jtf-heatmap-multi__cells">
                <For each={row.cells}>
                  {(cell) => {
                    const cellHasErrors = hasErrors(cell);
                    return (
                      <div
                        class="jtf-heatmap-multi__cell"
                        onClick={() => local.onCellClick?.(row.id, cell.id)}
                        style={local.onCellClick ? { cursor: "pointer" } : undefined}
                      >
                        <For each={local.categoryLabels}>
                          {(category) => {
                            const status = cell.categories[category] || "empty";
                            // Dim full bars when there are errors to make error colors stand out
                            const opacity = status === 'full' && cellHasErrors ? 0.4 :
                                           status === 'missing' ? 0.9 : 1;
                            return (
                              <div
                                class={`jtf-heatmap-multi__bar jtf-heatmap-multi__bar--${status}`}
                                style={{ opacity }}
                              />
                            );
                          }}
                        </For>
                        {/* Tooltip - only for default variant */}
                        <Show when={!local.variant || local.variant === "default"}>
                          <div class="jtf-heatmap-multi__tooltip">
                            <div class="jtf-heatmap-multi__tooltip-arrow" />
                            <div class="jtf-heatmap-multi__tooltip-arrow-inner" />
                            <div class="jtf-heatmap-multi__tooltip-header">
                              {cell.id}
                            </div>
                            <table class="jtf-heatmap-multi__tooltip-table">
                              <tbody>
                                <For each={local.categoryLabels}>
                                  {(category) => {
                                    const status = cell.categories[category] || "empty";
                                    return (
                                      <tr>
                                        <td class="jtf-heatmap-multi__tooltip-label">{category}:</td>
                                        <td class={`jtf-heatmap-multi__tooltip-value jtf-heatmap-multi__tooltip-value--${status}`}>
                                          {status}
                                        </td>
                                      </tr>
                                    );
                                  }}
                                </For>
                              </tbody>
                            </table>
                          </div>
                        </Show>
                      </div>
                    );
                  }}
                </For>
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  );
};
