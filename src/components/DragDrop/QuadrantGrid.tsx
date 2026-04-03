// ============================================
// QuadrantGrid — Composite (Depth 2)
// Owns CSS (QuadrantGrid.css).
// Generic 2x2 grid with labeled, colored drop zones.
// ============================================
import { Component, For, JSX, splitProps } from "solid-js";
import "./QuadrantGrid.css";

export interface QuadrantCellConfig {
  /** Unique key for this cell (used as droppable ID). */
  key: string;
  /** Display label. */
  label: string;
  /** Accent color (CSS color value). */
  color: string;
  /** Cell content (rendered inside the drop zone). */
  children: JSX.Element;
}

export interface QuadrantGridProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Exactly 4 cell configs, rendered in order: top-left, top-right, bottom-left, bottom-right. */
  cells: [QuadrantCellConfig, QuadrantCellConfig, QuadrantCellConfig, QuadrantCellConfig];
}

export const QuadrantGrid: Component<QuadrantGridProps> = (props) => {
  const [local, others] = splitProps(props, ["cells", "class"]);

  const classes = () => {
    const classList = ["sui-quadrant-grid"];
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  return (
    <div class={classes()} {...others}>
      <For each={local.cells}>
        {(cell) => (
          <div class="sui-quadrant-grid__cell" style={{ "--sui-quadrant-color": cell.color }}>
            <div class="sui-quadrant-grid__label">{cell.label}</div>
            <div class="sui-quadrant-grid__content">{cell.children}</div>
          </div>
        )}
      </For>
    </div>
  );
};
