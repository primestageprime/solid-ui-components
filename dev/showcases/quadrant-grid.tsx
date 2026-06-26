import { Component } from "solid-js";
import { QuadrantGrid } from "../../src/components/DragDrop";

export const QuadrantGridShowcase: Component = () => (
  <div class="component-section">
    <h2>QuadrantGrid — Primitive (Depth 0)</h2>
    <p class="text-meta">
      2×2 drop-zone grid. Each cell has a key, label, color, and child
      content. Use for prioritization matrices (Eisenhower, RICE, etc.).
    </p>
    <div class="example-group" style={{ "max-width": "600px" }}>
      <QuadrantGrid
        cells={[
          { key: "do", label: "Do",       color: "var(--sui-success, #2a6)", children: <p>1 item</p> },
          { key: "plan", label: "Plan",   color: "var(--sui-accent)",    children: <p>4 items</p> },
          { key: "delegate", label: "Delegate", color: "var(--sui-warning, #b80)", children: <p>2 items</p> },
          { key: "drop", label: "Drop",   color: "var(--sui-danger, #b33)",  children: <p>0 items</p> },
        ]}
      />
    </div>
  </div>
);
