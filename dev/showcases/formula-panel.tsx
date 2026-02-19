import { Component } from "solid-js";
import { createFormulaPanel, FormulaConfig } from "../../src/components/DataDisplay";

interface Depth3Props {
  onNavigate?: (id: string) => void;
}

const noxConfig: FormulaConfig = {
  label: "NOx Emission",
  resultUnits: "g/kWh",
  threshold: 2.8,
  comparison: "lte",
  resultPrecision: 4,
  vars: [
    { id: "nox", label: "NOx (ppm)", units: "ppm", precision: 2 },
    { id: "f2", label: "Flow Rate", units: "scfm", precision: 1 },
    { id: "kw", label: "Engine Power", units: "kW", precision: 0 },
  ],
  compute: (v) => (v.nox * v.f2 * 2760) / (836200 * v.kw),
  latex: (resultStr) =>
    `\\var{result}{${resultStr}} = \\frac{\\var{nox}{NOx} \\times \\var{f2}{F_2} \\times 2760}{836200 \\times \\var{kw}{kW}}`,
};

const violationConfig: FormulaConfig = {
  label: "High NOx Emission",
  resultUnits: "g/kWh",
  threshold: 2.8,
  comparison: "lte",
  resultPrecision: 4,
  vars: [
    { id: "nox", label: "NOx (ppm)", units: "ppm", precision: 2 },
    { id: "f2", label: "Flow Rate", units: "scfm", precision: 1 },
    { id: "kw", label: "Engine Power", units: "kW", precision: 0 },
  ],
  compute: (v) => (v.nox * v.f2 * 2760) / (836200 * v.kw),
  latex: (resultStr) =>
    `\\var{result}{${resultStr}} = \\frac{\\var{nox}{NOx} \\times \\var{f2}{F_2} \\times 2760}{836200 \\times \\var{kw}{kW}}`,
};

const NoxPanel = createFormulaPanel(noxConfig);
const ViolationPanel = createFormulaPanel(violationConfig);

export const FormulaPanelShowcase: Component<Depth3Props> = (props) => {
  const compliantValues = { nox: 8.42, f2: 2841.3, kw: 1200 };
  const violationValues = { nox: 45.0, f2: 3200, kw: 800 };

  return (
    <div class="component-section">
      <h2>createFormulaPanel — Depth 3 (zero CSS)</h2>
      <p class="text-meta">
        Factory function producing composed panels using ResultDisplay, DTable,
        MathFormula, and StatusBadge. Hover a variable row or the result to see
        interactive highlighting.
      </p>
      <div class="depth2-layout">
        <div class="depth2-composed">
          <h3>Composed — Compliant Result</h3>
          <NoxPanel.Panel values={compliantValues} />

          <h3 style={{ "margin-top": "24px" }}>Composed — Violation Result</h3>
          <ViolationPanel.Panel values={violationValues} />

          <h3 style={{ "margin-top": "24px" }}>Individual Sub-Components</h3>
          <p class="text-meta">Result, Givens, and Formula can be used separately.</p>
          <NoxPanel.Result values={compliantValues} />
        </div>
        <div class="depth2-atoms">
          <h3>Sub-Components</h3>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Depth 3</div>
            <div class="depth2-atom depth2-atom--link" onClick={() => props.onNavigate?.("result-display")}>
              <div class="depth2-atom__label">ResultDisplay</div>
              <div class="text-meta">Large value + units + badge row</div>
            </div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Depth 2</div>
            <div class="depth2-atom depth2-atom--link" onClick={() => props.onNavigate?.("data-list")}>
              <div class="depth2-atom__label">DTable / DT / DD</div>
              <div class="text-meta">Key-value givens table</div>
            </div>
            <div class="depth2-atom depth2-atom--link" onClick={() => props.onNavigate?.("number-with-units")}>
              <div class="depth2-atom__label">NumberWithUnits</div>
              <div class="text-meta">Monospace value + sans-serif units</div>
            </div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Atomic</div>
            <div class="depth2-atom depth2-atom--link" onClick={() => props.onNavigate?.("math-formula")}>
              <div class="depth2-atom__label">MathFormula</div>
              <div class="text-meta">KaTeX renderer with \var highlighting</div>
            </div>
            <div class="depth2-atom depth2-atom--link" onClick={() => props.onNavigate?.("status-badge")}>
              <div class="depth2-atom__label">StatusBadge</div>
              <div class="text-meta">COMPLIANT / VIOLATION badge</div>
            </div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Context</div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">FormulaProvider</div>
              <div class="text-meta">Shared hover state for interactive highlighting</div>
            </div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Layout</div>
            <div class="depth2-atom depth2-atom--link" onClick={() => props.onNavigate?.("stack")}>
              <div class="depth2-atom__label">NarrowStack (curried)</div>
              <div class="text-meta">Vertical layout wrapper</div>
            </div>
          </div>
          <h3>Bundle API</h3>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">createFormulaPanel(config)</div>
            <div class="depth2-atom"><div class="depth2-atom__label">.Panel — Full composed panel</div></div>
            <div class="depth2-atom"><div class="depth2-atom__label">.Result — ResultDisplay with compliance</div></div>
            <div class="depth2-atom"><div class="depth2-atom__label">.Givens — DTable with variable rows</div></div>
            <div class="depth2-atom"><div class="depth2-atom__label">.Formula — MathFormula with computed LaTeX</div></div>
          </div>
        </div>
      </div>
    </div>
  );
};
