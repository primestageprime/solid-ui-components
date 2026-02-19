import { Component } from "solid-js";
import { FormulaProvider, FormulaVarRow, MathFormula } from "../../src/components/MathFormula";
import { NumberWithUnits } from "../../src/components/DataDisplay";
import { DTable, DT, DD } from "../../src/components/DataList";
import { Stack } from "../../src/components/Layout";

interface Depth3Props {
  onNavigate?: (id: string) => void;
}

export const InteractiveFormulaShowcase: Component<Depth3Props> = (props) => {
  return (
    <div class="component-section">
      <h2>InteractiveFormula — Depth 4 (zero CSS)</h2>
      <p class="text-meta">Composes MathFormula (Atomic) + DataList (Depth 3) + NumberWithUnits (Depth 2). Hover-linked formula + variable table.</p>
      <div class="depth2-layout">
        <div class="depth2-composed">
          <h3>Composed</h3>
          <div class="text-meta" style={{ "margin-bottom": "12px" }}>
            Hover a variable in the formula or a table row — both highlight together.
          </div>
          <FormulaProvider>
            <Stack gap="sm">
              <DTable>
                <FormulaVarRow varId="nox">
                  <DT>NOx</DT>
                  <DD highlight><NumberWithUnits value={8.42} units="ppm" /></DD>
                </FormulaVarRow>
                <FormulaVarRow varId="f2">
                  <DT>F&#x2082;</DT>
                  <DD><NumberWithUnits value={2841.3} units="scfm" precision={1} /></DD>
                </FormulaVarRow>
                <FormulaVarRow varId="kw">
                  <DT>Engine</DT>
                  <DD><NumberWithUnits value={1200} units="kW" /></DD>
                </FormulaVarRow>
              </DTable>
              <MathFormula latex={"\\frac{\\var{nox}{NOx} \\times \\var{f2}{F_2} \\times 2760}{836200 \\times \\var{kw}{kW}}"} />
            </Stack>
          </FormulaProvider>
        </div>
        <div class="depth2-atoms">
          <h3>Atomic</h3>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Atomic</div>
            <div class="depth2-atom depth2-atom--link" onClick={() => props.onNavigate?.("math-formula")}>
              <div class="depth2-atom__label">MathFormula</div>
              <div class="text-meta">KaTeX renderer with \var{"{id}"}{"{content}"} syntax</div>
            </div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Context</div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">FormulaProvider</div>
              <div class="text-meta">Shared hover state between formula + rows</div>
            </div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">FormulaVarRow</div>
              <div class="text-meta">Table row that highlights on formula var hover</div>
            </div>
          </div>
          <h3>Depth 2</h3>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Data Display</div>
            <div class="depth2-atom depth2-atom--link" onClick={() => props.onNavigate?.("number-with-units")}>
              <div class="depth2-atom__label">NumberWithUnits</div>
              <div class="text-meta">monospace number + sans-serif units</div>
            </div>
            <div class="depth2-atom depth2-atom--link" onClick={() => props.onNavigate?.("data-list")}>
              <div class="depth2-atom__label">DTable / DT / DD</div>
              <div class="text-meta">key-value table layout</div>
            </div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Layout</div>
            <div class="depth2-atom depth2-atom--link" onClick={() => props.onNavigate?.("stack")}>
              <div class="depth2-atom__label">Stack</div>
              <div class="text-meta">gap: sm</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
