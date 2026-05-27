import { Component } from "solid-js";
import { SectionTitle } from "../../src/components/Text";

// ─── Workshop ────────────────────────────────────────────────────────────
// Scratch bench for in-progress components. Currently empty — the bench
// is clear and ready for the next prototype.

export const WorkshopShowcase: Component = () => (
  <div class="component-section component-section--full">
    <SectionTitle>Workshop</SectionTitle>
    <p
      style={{
        "font-size": "12px",
        color: "var(--sui-text-secondary)",
        margin: "8px 0 24px",
      }}
    >
      Empty bench — the last prototype (DnDHierarchySortBar) has graduated to
      the catalog. Drop the next component here to begin.
    </p>
  </div>
);
