import { Component } from "solid-js";
import { ResultPanel } from "../../src/components/DataDisplay";

export const ResultPanelShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>ResultPanel — Depth 4 (zero CSS)</h2>
      <p class="text-meta">Composes ResultDisplay (Depth 3) + FormulaProvider (Atomic). Layout shell for result + formula content.</p>
      <div class="depth2-layout">
        <div class="depth2-composed">
          <h3>Composed — NOx Result</h3>
          <ResultPanel
            label="NOx Emission"
            sublabel="Limit: 2.8 g/kWh"
            value="1.42"
            units="g/kWh"
            valueColor="#00ff88"
          >
            <div style={{ padding: "12px", border: "1px solid var(--hud-border)", "border-radius": "4px", color: "var(--hud-text-dim)", "font-size": "13px" }}>
              [Formula + variables table slot]
            </div>
          </ResultPanel>

          <h3 style={{ "margin-top": "24px" }}>Composed — Warning Result</h3>
          <ResultPanel
            label="ROG Result"
            value="0.95"
            units="ratio"
            valueColor="#ffcc00"
            formulaProvider={false}
          >
            <div style={{ padding: "12px", border: "1px solid var(--hud-border)", "border-radius": "4px", color: "var(--hud-text-dim)", "font-size": "13px" }}>
              [Variables table — no formula provider]
            </div>
          </ResultPanel>
        </div>
        <div class="depth2-atoms">
          <h3>Sub-Components</h3>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">ResultDisplay (Depth 3)</div>
            <div class="depth2-atom"><div class="depth2-atom__label">Large value + units + badge row</div></div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">FormulaProvider (Atomic)</div>
            <div class="depth2-atom"><div class="depth2-atom__label">Interactive formula highlighting context</div></div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">NarrowStack (curried)</div>
            <div class="depth2-atom"><div class="depth2-atom__label">Vertical layout wrapper</div></div>
          </div>
          <h3>Props</h3>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">formulaProvider</div>
            <div class="depth2-atom"><div class="depth2-atom__label">boolean (default: true) — wrap in FormulaProvider</div></div>
          </div>
        </div>
      </div>
    </div>
  );
};
