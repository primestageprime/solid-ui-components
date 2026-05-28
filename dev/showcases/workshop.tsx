import { type Component } from "solid-js";
import { SectionTitle } from "../../src/components/Text";

// Workshop bench is intentionally empty. Drop the next prototype here while
// iterating on its API, then `/promote` it into a real component folder +
// dedicated showcase, which also clears this bench for the next one.

export const WorkshopShowcase: Component = () => (
  <div class="component-section component-section--full">
    <SectionTitle>Workshop</SectionTitle>
    <p
      style={{
        "font-size": "13px",
        color: "var(--sui-text-secondary)",
        margin: "12px 0 0",
        "max-width": "72ch",
      }}
    >
      Empty — drop a prototype here while you iterate on its API. Once the
      shape is settled, run <code>/promote</code> to move it into{" "}
      <code>src/components/</code> with its own showcase and clear this bench
      for the next one.
    </p>
  </div>
);
