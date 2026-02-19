import { Component } from "solid-js";
import { ThemedInput, ThemedTextarea } from "../../src/components/Inputs";

export const InputsShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>Inputs — Atomic (Depth 1)</h2>
      <p class="text-meta">Owns CSS (ThemedInputs.css), no component imports. Styled text input and textarea with labels.</p>

      <div class="example-group">
        <h3>ThemedInput</h3>
        <div style={{ display: "flex", "flex-direction": "column", gap: "16px", "max-width": "400px" }}>
          <ThemedInput label="Vessel Name" placeholder="Enter vessel name..." />
          <ThemedInput label="Engine Power (kW)" placeholder="1200" type="number" />
          <ThemedInput placeholder="Without label..." />
        </div>
      </div>

      <div class="example-group">
        <h3>ThemedTextarea</h3>
        <div style={{ display: "flex", "flex-direction": "column", gap: "16px", "max-width": "500px" }}>
          <ThemedTextarea label="Note (optional)" placeholder="Add a note explaining the approval..." />
          <ThemedTextarea placeholder="Without label..." />
        </div>
      </div>
    </div>
  );
};
