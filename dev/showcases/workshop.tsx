import { Component } from "solid-js";
import { SectionTitle } from "../../src/components/Text";

// ─── Workshop ────────────────────────────────────────────────────────────
// Scratch bench for in-progress components. Currently empty — DateAxis
// graduated to the catalog (see dev/showcases/date-axis.tsx) and no next
// component is queued. Drop a work-in-progress component here to iterate on
// it in isolation before promoting it via the /promote process.

export const WorkshopShowcase: Component = () => (
  <div class="component-section component-section--full">
    <SectionTitle>Workshop</SectionTitle>
    <p
      style={{
        "font-size": "12px",
        color: "var(--sui-text-secondary)",
        margin: "8px 0 0",
      }}
    >
      The bench is empty. Drop an in-progress component here to iterate on it in
      isolation, then promote it to the catalog when its look is approved.
    </p>
  </div>
);
